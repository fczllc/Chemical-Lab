import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const knownTextbookBatches = new Map([
  [
    'rj-chemistry-grade9-2024-vol1',
    buildTextbookPaths('rj-chemistry-grade9-2024-vol1')
  ],
  [
    'rj-chemistry-grade9-2024-vol2',
    buildTextbookPaths('rj-chemistry-grade9-2024-vol2')
  ],
  [
    'rj-chemistry-g12-selective-3-organic-2019',
    buildTextbookPaths('rj-chemistry-g12-selective-3-organic-2019')
  ],
  [
    'rj-chemistry-grade8-54-2024-full',
    buildTextbookPaths('rj-chemistry-grade8-54-2024-full')
  ]
]);

function buildTextbookPaths(volumeId) {
  const generatedVolumeRoot = path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', volumeId);

  return {
    batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', `${volumeId}.json`),
    candidatesPath: path.join(generatedVolumeRoot, 'experiment-candidates.json'),
    backlogPath: path.join(generatedVolumeRoot, 'experiment-backlog.json'),
    reactionsPath: path.join(projectRoot, 'src', 'data', 'reactions.json')
  };
}

const knownFixtures = new Map([
  ['deferred-in-reactions', path.join(projectRoot, 'scripts', 'textbook', 'fixtures', 'deferred-in-reactions.json')]
]);

const allowedFutureImplementationTypes = new Set([
  'labSimulation',
  'threeAnimation',
  'gsapAnimation',
  'staticGuide',
  'notSuitable'
]);
const allowedAnimationStatuses = new Set(['deferred']);
const allowedSafetyClassifications = new Set(['low', 'medium', 'high']);
const requiredProvenanceFields = [
  'sourceVolumeId',
  'sourcePath',
  'sourceHeading',
  'sourceLineStart',
  'sourceLineEnd',
  'sourceHash',
  'sectionHash',
  'sourceSectionId',
  'assets',
  'reviewStatus'
];
const requiredBacklogItemFields = [
  'backlogId',
  'candidateId',
  'title',
  'summary',
  'learningGoal',
  'animationStatus',
  'futureImplementationType',
  'runtimeEligible',
  'currentRuntimeEligibility',
  'safetyClassification',
  'safetyNotes',
  'materials',
  'observedPhenomena',
  'deferredReason',
  ...requiredProvenanceFields
];

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
    const fixturePath = knownFixtures.get(options.fixture);
    if (!fixturePath) {
      throw new Error(`Unknown experiment backlog fixture: ${options.fixture}`);
    }

    const result = await validateFixture(fixturePath, options.fixture);
    finishValidation(result);
    return;
  }

  if (!options.textbook) {
    throw new Error('--textbook is required unless --fixture is provided');
  }

  const paths = knownTextbookBatches.get(options.textbook);
  if (!paths) {
    throw new Error(`Unknown textbook batch: ${options.textbook}`);
  }

  const result = await validateTextbook(paths, options.textbook, options);
  finishValidation(result);
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      textbook: { type: 'string' },
      fixture: { type: 'string' },
      write: { type: 'boolean' }
    },
    strict: true
  });

  return {
    help: values.help === true,
    textbook: values.textbook ?? null,
    fixture: values.fixture ?? null,
    write: values.write === true
  };
}

function printHelp() {
  console.log(`Experiment backlog validator / 实验动画积压清单校验器

Usage:
  node scripts/textbook/validate-experiment-backlog.mjs --textbook <volumeId>
  node scripts/textbook/validate-experiment-backlog.mjs --textbook <volumeId> --write
  node scripts/textbook/validate-experiment-backlog.mjs --fixture <fixtureName>

Options:
  --textbook <volumeId>                Validate generated experiment-backlog.json for a known textbook.
  --fixture <fixtureName>              Validate a deterministic negative fixture by stable fixture name.
  --write                              Regenerate experiment-backlog.json from experiment-candidates.json before validation.
  --help                               Show this help.`);
}

async function validateTextbook(paths, expectedVolumeId, options) {
  const errors = [];
  const batch = await readJsonFile(paths.batchPath, 'batch contract', errors);
  const candidates = await readJsonFile(paths.candidatesPath, 'experiment candidates', errors);
  const identity = {
    expectedVolumeId,
    expectedSourceHash: batch?.sourceHash ?? null
  };

  if (options.write && Array.isArray(candidates) && hasText(identity.expectedSourceHash)) {
    const generatedBacklog = buildBacklogDocument(candidates, identity);
    await writeJsonFile(paths.backlogPath, generatedBacklog);
  }

  const backlog = await readJsonFile(paths.backlogPath, 'experiment backlog', errors);
  const reactions = await readJsonFile(paths.reactionsPath, 'runtime reactions', errors);

  if (Array.isArray(candidates)) {
    errors.push(...validateCandidateIds(candidates));
  }

  errors.push(...validateBacklogDocument(backlog, Array.isArray(candidates) ? candidates : [], identity, paths.backlogPath));

  if (reactions && backlog) {
    const backlogItems = getBacklogItems(backlog);
    errors.push(...findDeferredExperimentRuntimeReactions(reactions, backlogItems, paths.reactionsPath));
  }

  return {
    errors,
    label: expectedVolumeId,
    checked: [
      relativeProjectPath(paths.candidatesPath),
      relativeProjectPath(paths.backlogPath),
      relativeProjectPath(paths.reactionsPath)
    ]
  };
}

async function validateFixture(fixturePath, fixtureName) {
  const errors = [];
  const fixture = await readJsonFile(fixturePath, 'experiment backlog fixture', errors);

  if (!isRecord(fixture)) {
    errors.push('fixture top level must be an object');
    return { errors, label: fixtureName, checked: [relativeProjectPath(fixturePath)] };
  }

  const backlogItems = Array.isArray(fixture.experimentBacklog) ? fixture.experimentBacklog : [];
  if (backlogItems.length === 0) {
    errors.push('fixture.experimentBacklog must include at least one deferred backlog item');
  }

  errors.push(...findDeferredExperimentRuntimeReactions(fixture, backlogItems, fixturePath));

  return { errors, label: fixtureName, checked: [relativeProjectPath(fixturePath)] };
}

function validateCandidateIds(candidates) {
  const errors = [];
  const seenIds = new Set();

  for (const [index, candidate] of candidates.entries()) {
    const itemPath = `experiment-candidates[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${itemPath} must be an object`);
      continue;
    }

    if (!hasText(candidate.candidateId)) {
      errors.push(`${itemPath}.candidateId must be a non-empty string`);
      continue;
    }

    if (seenIds.has(candidate.candidateId)) {
      errors.push(`${itemPath}.candidateId must be unique: ${candidate.candidateId}`);
    }
    seenIds.add(candidate.candidateId);

    if (candidate.candidateId.startsWith('draft-')) {
      errors.push(`${itemPath}.candidateId must use the generated experiment-* id, not a draft-* placeholder`);
    }
  }

  return errors;
}

function validateBacklogDocument(value, candidates, identity, backlogPath) {
  const errors = [];
  const backlog = ensureRecord(value, 'experiment backlog top level must be an object', errors);

  if (!backlog) {
    return errors;
  }

  const expectedBacklog = buildBacklogDocument(candidates, identity);
  compareField(backlog, expectedBacklog, 'schemaVersion', 'experiment backlog', errors);
  compareField(backlog, expectedBacklog, 'volumeId', 'experiment backlog', errors);
  compareField(backlog, expectedBacklog, 'sourceHash', 'experiment backlog', errors);
  compareField(backlog, expectedBacklog, 'status', 'experiment backlog', errors);
  compareField(backlog, expectedBacklog, 'generatedFrom', 'experiment backlog', errors);

  if (!Array.isArray(backlog.experimentBacklog)) {
    errors.push('experimentBacklog must be an array');
    return errors;
  }

  if (candidates.length > 0 && backlog.experimentBacklog.length === 0) {
    errors.push('experimentBacklog must exist even when no experiment is promoted to runtime lab');
  }

  const actualByCandidateId = new Map();
  for (const [index, item] of backlog.experimentBacklog.entries()) {
    const itemPath = `experimentBacklog[${index}]`;
    if (!isRecord(item)) {
      errors.push(`${itemPath} must be an object`);
      continue;
    }

    if (!hasText(item.candidateId)) {
      errors.push(`${itemPath}.candidateId must be a non-empty string`);
      continue;
    }

    if (actualByCandidateId.has(item.candidateId)) {
      errors.push(`${itemPath}.candidateId must be unique: ${item.candidateId}`);
    }
    actualByCandidateId.set(item.candidateId, { item, itemPath });
  }

  for (const candidate of candidates) {
    if (!isRecord(candidate) || !hasText(candidate.candidateId)) {
      continue;
    }

    const actual = actualByCandidateId.get(candidate.candidateId);
    if (!actual) {
      errors.push(`experimentBacklog missing candidateId from experiment-candidates.json: ${candidate.candidateId}`);
      continue;
    }

    const expectedItem = buildBacklogItem(candidate);
    validateBacklogItem(actual.item, expectedItem, actual.itemPath, errors);
  }

  const expectedIds = new Set(candidates.filter((candidate) => isRecord(candidate) && hasText(candidate.candidateId)).map((candidate) => candidate.candidateId));
  for (const [candidateId, actual] of actualByCandidateId) {
    if (!expectedIds.has(candidateId)) {
      errors.push(`${actual.itemPath}.candidateId is not present in experiment-candidates.json: ${candidateId}`);
    }
  }

  if (errors.length > 0) {
    errors.push(`Experiment backlog file checked: ${relativeProjectPath(backlogPath)}`);
  }

  return errors;
}

function validateBacklogItem(item, expectedItem, itemPath, errors) {
  for (const field of requiredBacklogItemFields) {
    if (!(field in item)) {
      errors.push(`${itemPath} missing required field: ${field}`);
    }
  }

  if (!allowedAnimationStatuses.has(item.animationStatus)) {
    errors.push(`${itemPath}.animationStatus must be deferred; actual: ${String(item.animationStatus)}`);
  }

  if (!allowedFutureImplementationTypes.has(item.futureImplementationType)) {
    errors.push(`${itemPath}.futureImplementationType must be one of: ${[...allowedFutureImplementationTypes].join(', ')}; actual: ${String(item.futureImplementationType)}`);
  }

  if (!allowedSafetyClassifications.has(item.safetyClassification)) {
    errors.push(`${itemPath}.safetyClassification must be one of: ${[...allowedSafetyClassifications].join(', ')}; actual: ${String(item.safetyClassification)}`);
  }

  if (!Array.isArray(item.safetyNotes) || item.safetyNotes.length === 0) {
    errors.push(`${itemPath}.safetyNotes must include at least one note`);
  }

  if (!Array.isArray(item.materials)) {
    errors.push(`${itemPath}.materials must be an array`);
  }

  if (!Array.isArray(item.observedPhenomena)) {
    errors.push(`${itemPath}.observedPhenomena must be an array`);
  }

  if (item.runtimeEligible !== false) {
    errors.push(`${itemPath}.runtimeEligible must remain false until reviewed promotion`);
  }

  if (!isRecord(item.currentRuntimeEligibility)) {
    errors.push(`${itemPath}.currentRuntimeEligibility must be an object`);
  } else if (item.currentRuntimeEligibility.runtimeEligible !== false) {
    errors.push(`${itemPath}.currentRuntimeEligibility.runtimeEligible must be false`);
  }

  for (const field of Object.keys(expectedItem)) {
    compareField(item, expectedItem, field, itemPath, errors);
  }
}

function buildBacklogDocument(candidates, identity) {
  return {
    schemaVersion: 1,
    volumeId: identity.expectedVolumeId,
    sourceHash: identity.expectedSourceHash,
    status: 'deferred',
    generatedFrom: 'experiment-candidates.json',
    experimentBacklog: candidates.map((candidate) => buildBacklogItem(candidate))
  };
}

function buildBacklogItem(candidate) {
  const materials = normalizeStringArray(candidate.materials);
  const observedPhenomena = normalizeStringArray(candidate.observations);
  const safetyNotes = normalizeSafetyNotes(candidate.safetyNotes);
  const safetyClassification = candidate.hazardLevel;
  const deferredReason = candidate.deferredReason || 'Runtime use is deferred until a human reviewer confirms safety, materials, observations, and animation requirements.';

  return {
    backlogId: `experiment-backlog-${candidate.candidateId.replace(/^experiment-/, '')}`,
    candidateId: candidate.candidateId,
    title: candidate.title,
    summary: candidate.summary,
    learningGoal: buildLearningGoal(candidate.title),
    animationStatus: 'deferred',
    futureImplementationType: recommendFutureImplementationType({
      title: candidate.title,
      summary: candidate.summary,
      safetyClassification,
      materials,
      observedPhenomena
    }),
    runtimeEligible: false,
    currentRuntimeEligibility: {
      runtimeEligible: false,
      reviewedSafeByManifest: false,
      reason: deferredReason
    },
    safetyClassification,
    safetyNotes,
    materials,
    observedPhenomena,
    deferredReason,
    sourceVolumeId: candidate.sourceVolumeId,
    sourcePath: candidate.sourcePath,
    sourceHeading: candidate.sourceHeading,
    sourceLineStart: candidate.sourceLineStart,
    sourceLineEnd: candidate.sourceLineEnd,
    sourceHash: candidate.sourceHash,
    sectionHash: candidate.sectionHash,
    sourceSectionId: candidate.sourceSectionId,
    assets: Array.isArray(candidate.assets) ? candidate.assets : [],
    reviewStatus: candidate.reviewStatus
  };
}

function buildLearningGoal(title) {
  return `Review the textbook experiment "${title}" for safe animated learning before runtime promotion.`;
}

function recommendFutureImplementationType({ title, summary, safetyClassification, materials, observedPhenomena }) {
  const combinedText = `${title ?? ''}\n${summary ?? ''}\n${materials.join(' ')}\n${observedPhenomena.join(' ')}`;

  if (/实验用品|实验目的|实验探究|实验室规则|取用规则/.test(String(title ?? ''))) {
    return 'staticGuide';
  }

  if (materials.length === 0 && observedPhenomena.length === 0) {
    return 'notSuitable';
  }

  if (/硫|氢气|高锰酸钾|燃烧|氧气|火柴|酒精灯|加热|盐酸|氢氧化钠/.test(combinedText) || safetyClassification === 'high') {
    return 'threeAnimation';
  }

  if (/数字化|传感器|扩散|分子|原子/.test(combinedText)) {
    return 'gsapAnimation';
  }

  if (safetyClassification === 'low' && materials.length > 0 && observedPhenomena.length > 0) {
    return 'labSimulation';
  }

  if (observedPhenomena.length > 0) {
    return 'gsapAnimation';
  }

  return 'staticGuide';
}

function normalizeSafetyNotes(value) {
  const notes = normalizeStringArray(value);
  if (notes.length > 0) {
    return notes;
  }

  return ['No explicit safety note was extracted; keep deferred until a human reviewer verifies classroom safety.'];
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function findDeferredExperimentRuntimeReactions(reactionsPayload, backlogItems, sourcePath) {
  const errors = [];
  const reactions = Array.isArray(reactionsPayload?.reactions) ? reactionsPayload.reactions : [];
  const deferredExperimentIds = new Set(
    backlogItems
      .filter((item) => isRecord(item) && item.animationStatus === 'deferred' && item.runtimeEligible !== true)
      .map((item) => item.candidateId)
      .filter(hasText)
  );

  for (const reaction of reactions) {
    if (!isRecord(reaction) || typeof reaction.experimentId !== 'string') {
      continue;
    }

    if (deferredExperimentIds.has(reaction.experimentId)) {
      errors.push(`Deferred experiment cannot be runtime reaction: ${reaction.experimentId} (${relativeProjectPath(sourcePath)})`);
    }
  }

  return errors;
}

function getBacklogItems(backlog) {
  if (Array.isArray(backlog?.experimentBacklog)) {
    return backlog.experimentBacklog;
  }

  return [];
}

async function readJsonFile(filePath, label, errors) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${label} cannot be read or parsed: ${relativeProjectPath(filePath)}: ${error.message}`);
    return null;
  }
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function compareField(actual, expected, field, itemPath, errors) {
  if (!deepEqual(actual?.[field], expected?.[field])) {
    errors.push(`${itemPath}.${field} must match deterministic experiment backlog value`);
  }
}

function ensureRecord(value, message, errors) {
  if (!isRecord(value)) {
    errors.push(message);
    return null;
  }

  return value;
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function finishValidation(result) {
  if (result.errors.length > 0) {
    console.error('Experiment backlog validation failed:');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Experiment backlog valid: ${result.label}`);
  for (const checkedPath of result.checked) {
    console.log(`checked: ${checkedPath}`);
  }
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

