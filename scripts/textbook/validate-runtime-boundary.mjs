import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const srcRoot = path.join(projectRoot, 'src');
const runtimeFiles = (await collectJavaScriptFiles(srcRoot))
  .filter((filePath) => !isInDirectory(filePath, path.join(projectRoot, 'src', 'data', 'textbookIngestion')))
  .filter((filePath) => !isInDirectory(filePath, path.join(projectRoot, 'src', 'data', 'textbooks')))
  .sort(compareText);
const reactionsPath = path.join(projectRoot, 'src', 'data', 'reactions.json');
const generatedRoot = path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated');
const reviewedRoot = path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'reviewed');
const textbookSourceRoot = path.join(projectRoot, 'src', 'data', 'textbooks');
const generatedIngestionRoot = path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated');
const reviewedIngestionRoot = path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'reviewed');

const knownFixtures = new Map([
  ['raw-textbook-import', { type: 'source', path: path.join(projectRoot, 'scripts', 'textbook', 'fixtures', 'raw-textbook-import.mjs') }],
  ['deferred-reaction-leak', { type: 'reactions', path: path.join(projectRoot, 'scripts', 'textbook', 'fixtures', 'deferred-reaction-leak.json') }]
]);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const options = parseCli(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (options.fixture) {
    const fixture = knownFixtures.get(options.fixture);
    if (!fixture) {
      throw new Error(`Unknown runtime boundary fixture: ${options.fixture}`);
    }

    const result = await validateFixture(fixture, options.fixture);
    finishValidation(result);
    return;
  }

  const result = await validateRuntimeBoundary();
  finishValidation(result);
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      fixture: { type: 'string' }
    },
    strict: true
  });

  return {
    help: values.help === true,
    fixture: values.fixture ?? null
  };
}

function printHelp() {
  console.log(`Textbook runtime boundary validator / 教材运行时边界校验器

Usage:
  node scripts/textbook/validate-runtime-boundary.mjs
  node scripts/textbook/validate-runtime-boundary.mjs --fixture <fixtureName>

Options:
  --fixture <fixtureName>              Validate a fixture by stable fixture name.
  --help                               Show this help.`);
}

async function validateRuntimeBoundary() {
  const errors = [];

  for (const filePath of runtimeFiles) {
    const source = await readTextFile(filePath, 'runtime module', errors);
    if (!source) {
      continue;
    }

    errors.push(...findForbiddenPathMentions(source, filePath));
    errors.push(...findForbiddenPathConstructs(source, filePath));
    errors.push(...findForbiddenImportSpecifiers(source, filePath));
  }

  const promotedExperimentIds = await collectPromotedExperimentIds(reviewedRoot, errors);
  const generatedExperimentIds = await collectGeneratedExperimentIds(generatedRoot, errors);
  const reactions = await readJsonFile(reactionsPath, 'runtime reactions', errors);

  if (reactions) {
    errors.push(...findDraftExperimentLeaks(reactions, generatedExperimentIds, promotedExperimentIds, reactionsPath));
  }

  return {
    label: 'runtime boundary',
    checked: [
      ...runtimeFiles.map(relativeProjectPath),
      relativeProjectPath(reactionsPath),
      relativeProjectPath(generatedRoot),
      relativeProjectPath(reviewedRoot)
    ],
    errors
  };
}

async function validateFixture(fixture, fixtureName) {
  const errors = [];
  const source = await readTextFile(fixture.path, 'fixture', errors);

  if (fixture.type === 'source') {
    if (source) {
      errors.push(...findForbiddenPathMentions(source, fixture.path));
      errors.push(...findForbiddenPathConstructs(source, fixture.path));
      errors.push(...findForbiddenImportSpecifiers(source, fixture.path));
    }
  } else if (fixture.type === 'reactions') {
    const payload = source ? parseJson(source, 'fixture reactions') : null;
    if (payload) {
      const promotedExperimentIds = collectPromotedExperimentIdsFromPayload(payload);
      const generatedExperimentIds = collectGeneratedExperimentIdsFromPayload(payload);
      errors.push(...findDraftExperimentLeaks(payload, generatedExperimentIds, promotedExperimentIds, fixture.path));
    }
  } else {
    errors.push(`Unknown fixture type: ${fixture.type}`);
  }

  return {
    label: fixtureName,
    checked: [relativeProjectPath(fixture.path)],
    errors
  };
}

function findForbiddenImportSpecifiers(source, filePath) {
  const errors = [];
  const importSpecifiers = extractImportSpecifiers(source);

  for (const specifier of importSpecifiers) {
    if (!specifier.startsWith('.')) {
      continue;
    }

    const resolvedPath = path.resolve(path.dirname(filePath), specifier);
    if (isForbiddenPath(resolvedPath)) {
      errors.push(`Raw textbook import forbidden: ${relativeProjectPath(filePath)} -> ${specifier}`);
    }
  }

  return errors;
}

function findForbiddenPathMentions(source, filePath) {
  const errors = [];
  const forbiddenMentions = [
    'src/data/textbookIngestion/generated/',
    'src/data/textbookIngestion/reviewed/'
  ];

  for (const forbiddenMention of forbiddenMentions) {
    if (source.includes(forbiddenMention)) {
      errors.push(`Raw textbook read path forbidden: ${relativeProjectPath(filePath)} -> ${forbiddenMention}`);
    }
  }

  return errors;
}

function findForbiddenPathConstructs(source, filePath) {
  const errors = [];
  const patterns = [
    /path\.(?:join|resolve)\([\s\S]*?textbookIngestion[\s\S]*?(?:generated|reviewed)[\s\S]*?\)/g,
    /new\s+URL\([\s\S]*?(?:\.\.[/\\]data[/\\]textbookIngestion[/\\](?:generated|reviewed)|src[/\\]data[/\\]textbookIngestion[/\\](?:generated|reviewed))[\s\S]*?\)/g
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      errors.push(`Raw textbook read path forbidden: ${relativeProjectPath(filePath)} -> ${normalizeWhitespace(match[0])}`);
    }
  }

  return errors;
}

function findDraftExperimentLeaks(reactionsPayload, generatedExperimentIds, promotedExperimentIds, sourcePath) {
  const errors = [];
  const reactions = Array.isArray(reactionsPayload?.reactions) ? reactionsPayload.reactions : [];

  for (const reaction of reactions) {
    if (!reaction || typeof reaction !== 'object') {
      continue;
    }

    const experimentId = reaction.experimentId;
    if (typeof experimentId !== 'string') {
      continue;
    }

    const isDeferredDraft = experimentId.startsWith('draft-') || generatedExperimentIds.has(experimentId);
    if (isDeferredDraft && !promotedExperimentIds.has(experimentId)) {
      errors.push(`Deferred draft experiment forbidden in runtime reactions: ${experimentId} (${relativeProjectPath(sourcePath)})`);
    }
  }

  return errors;
}

async function collectPromotedExperimentIds(rootDirectory, errors) {
  const promotedExperimentIds = new Set();
  const manifestFiles = await collectJsonFiles(rootDirectory, 'promotion-manifest.json');

  for (const manifestPath of manifestFiles) {
    const manifest = await readJsonFile(manifestPath, 'promotion manifest', errors);
    const payload = manifest && manifest.entries ? manifest : null;
    if (!payload) {
      continue;
    }

    for (const entry of payload.entries) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }

      if (entry.candidateType !== 'experimentCandidate') {
        continue;
      }

      if (entry.targetRuntimeFile !== 'src/data/reactions.json') {
        continue;
      }

      if (entry.reviewStatus === 'reviewed' || entry.reviewStatus === 'promoted') {
        promotedExperimentIds.add(entry.candidateId);
      }
    }
  }

  return promotedExperimentIds;
}

async function collectGeneratedExperimentIds(rootDirectory, errors) {
  const generatedExperimentIds = new Set();
  const experimentCandidateFiles = await collectJsonFiles(rootDirectory, 'experiment-candidates.json');
  const draftInventoryFiles = await collectJsonFiles(rootDirectory, 'draft-inventory.json');

  for (const filePath of experimentCandidateFiles) {
    const candidates = await readJsonFile(filePath, 'experiment candidates', errors);
    if (Array.isArray(candidates)) {
      addCandidateIds(generatedExperimentIds, candidates);
    }
  }

  for (const filePath of draftInventoryFiles) {
    const inventory = await readJsonFile(filePath, 'draft inventory', errors);
    const candidates = inventory?.experimentCandidates;
    if (Array.isArray(candidates)) {
      addCandidateIds(generatedExperimentIds, candidates);
    }
  }

  return generatedExperimentIds;
}

function collectPromotedExperimentIdsFromPayload(payload) {
  const promotedExperimentIds = new Set();
  const manifests = Array.isArray(payload?.promotionManifests) ? payload.promotionManifests : [];

  for (const manifest of manifests) {
    if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.entries)) {
      continue;
    }

    for (const entry of manifest.entries) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }

      if (entry.candidateType !== 'experimentCandidate') {
        continue;
      }

      if (entry.targetRuntimeFile !== 'src/data/reactions.json') {
        continue;
      }

      if (entry.reviewStatus === 'reviewed' || entry.reviewStatus === 'promoted') {
        promotedExperimentIds.add(entry.candidateId);
      }
    }
  }

  return promotedExperimentIds;
}

function collectGeneratedExperimentIdsFromPayload(payload) {
  const generatedExperimentIds = new Set();
  const candidates = Array.isArray(payload?.experimentCandidates) ? payload.experimentCandidates : [];
  addCandidateIds(generatedExperimentIds, candidates);
  return generatedExperimentIds;
}

function addCandidateIds(targetSet, candidates) {
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && typeof candidate.candidateId === 'string') {
      targetSet.add(candidate.candidateId);
    }
  }
}

async function collectJavaScriptFiles(directoryPath) {
  let entries;

  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const filePaths = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      filePaths.push(...await collectJavaScriptFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
}

async function collectJsonFiles(directoryPath, fileName) {
  let entries;

  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const filePaths = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      filePaths.push(...await collectJsonFiles(entryPath, fileName));
      continue;
    }

    if (entry.isFile() && entry.name === fileName) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
}

function extractImportSpecifiers(source) {
  const matches = [];
  const patterns = [
    /import\s+(?:[\s\S]*?\s+from\s+)?['\"]([^'\"]+)['\"]/g,
    /export\s+(?:\*|\{[\s\S]*?\})\s+from\s+['\"]([^'\"]+)['\"]/g,
    /import\s*\(\s*['\"]([^'\"]+)['\"]\s*\)/g
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      matches.push(match[1]);
    }
  }

  return [...new Set(matches)];
}

function isForbiddenPath(filePath) {
  const normalizedPath = path.normalize(filePath);
  return normalizedPath.startsWith(textbookSourceRoot) || normalizedPath.startsWith(generatedIngestionRoot) || normalizedPath.startsWith(reviewedIngestionRoot);
}

function isInDirectory(filePath, directoryPath) {
  const relativePath = path.relative(directoryPath, filePath);
  return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function compareText(left, right) {
  return left.localeCompare(right, 'en');
}

async function readTextFile(filePath, label, errors) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    errors.push(`${label} cannot be read: ${relativeProjectPath(filePath)}: ${error.message}`);
    return null;
  }
}

async function readJsonFile(filePath, label, errors) {
  const source = await readTextFile(filePath, label, errors);
  if (!source) {
    return null;
  }

  return parseJson(source, label, filePath, errors);
}

function parseJson(source, label, filePath = null, errors = []) {
  try {
    return JSON.parse(source);
  } catch (error) {
    const suffix = filePath ? `: ${relativeProjectPath(filePath)}` : '';
    errors.push(`${label} cannot be parsed${suffix}: ${error.message}`);
    return null;
  }
}

function finishValidation(result) {
  if (result.errors.length > 0) {
    console.error('Textbook runtime boundary validation failed:');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Textbook runtime boundary valid');
  for (const checkedPath of result.checked) {
    console.log(`checked: ${checkedPath}`);
  }
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}
