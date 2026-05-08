import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const knownTextbookBatches = new Set(['rj-chemistry-grade9-2024-vol1', 'rj-chemistry-grade9-2024-vol2']);

const generatorScripts = [
  'scripts/textbook/extract-textbook.mjs',
  'scripts/textbook/generate-drafts.mjs',
  'scripts/textbook/generate-coverage.mjs'
];

const runtimeDataFiles = [
  'src/data/quizData.json',
  'src/data/contentMeta.js',
  'src/data/achievementsData.json',
  'src/data/curriculum.js',
  'src/data/learningPath.json',
  'src/data/reactions.json'
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

  if (!options.textbook) {
    throw new Error('--textbook is required');
  }

  if (!knownTextbookBatches.has(options.textbook)) {
    throw new Error(`Unknown textbook batch: ${options.textbook}`);
  }

  const errors = [];

  // Verify generator scripts do not write to reviewed/ directory
  for (const scriptName of generatorScripts) {
    const scriptPath = path.join(projectRoot, scriptName);
    const source = await readScriptSource(scriptPath, errors);
    if (source) {
      errors.push(...checkGeneratorDoesNotWriteReviewed(source, scriptName));
      errors.push(...checkGeneratorDoesNotWriteRuntime(source, scriptName));
    }
  }

  // Verify reviewed manifest exists and is separate from generated
  const reviewedManifestPath = path.join(
    projectRoot,
    'src',
    'data',
    'textbookIngestion',
    'reviewed',
    options.textbook,
    'promotion-manifest.json'
  );

  const manifestExists = await fileExists(reviewedManifestPath);
  if (!manifestExists) {
    errors.push(`Reviewed promotion manifest not found: ${relativeProjectPath(reviewedManifestPath)}`);
  }

  // Verify runtime data files exist and are not in generated paths
  for (const runtimeFile of runtimeDataFiles) {
    const runtimePath = path.join(projectRoot, runtimeFile);
    const exists = await fileExists(runtimePath);
    if (!exists) {
      // Some runtime files may not exist yet; that's okay
      continue;
    }

    // Runtime files must not be inside generated/ or reviewed/
    if (runtimePath.includes('textbookIngestion/generated/') || runtimePath.includes('textbookIngestion/reviewed/')) {
      errors.push(`Runtime file must not live in ingestion generated/reviewed: ${runtimeFile}`);
    }
  }

  if (errors.length > 0) {
    console.error('Regeneration guard validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Reviewed manifest protected from generator overwrite');
  console.log(`checked: ${generatorScripts.length} generator scripts`);
  console.log(`checked: ${relativeProjectPath(reviewedManifestPath)}`);
  console.log(`checked: ${runtimeDataFiles.length} runtime data file paths`);
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      textbook: { type: 'string' }
    },
    strict: true
  });

  return {
    help: values.help === true,
    textbook: values.textbook ?? null
  };
}

function printHelp() {
  console.log(`Regeneration guard validator / 重生成保护校验器

Usage:
  node scripts/textbook/validate-regeneration-guard.mjs --textbook <volumeId>

Options:
  --textbook <volumeId>                Validate regeneration guard for a known textbook.
  --help                               Show this help.`);
}

async function readScriptSource(scriptPath, errors) {
  try {
    return await readFile(scriptPath, 'utf8');
  } catch (error) {
    errors.push(`Cannot read generator script: ${relativeProjectPath(scriptPath)}: ${error.message}`);
    return null;
  }
}

function checkGeneratorDoesNotWriteReviewed(source, scriptName) {
  const errors = [];
  const reviewedPathPattern = /textbookIngestion[\/]reviewed/;

  // Check for writeFile or mkdir calls targeting reviewed/
  const writePatterns = [
    /writeFile\s*\([^)]*textbookIngestion[\/\\]reviewed[^)]*\)/g,
    /mkdir\s*\([^)]*textbookIngestion[\/\\]reviewed[^)]*\)/g
  ];

  for (const pattern of writePatterns) {
    for (const match of source.matchAll(pattern)) {
      errors.push(`Generator ${scriptName} must not write to reviewed/: ${match[0]}`);
    }
  }

  // Also check string literals that reference reviewed/ in write contexts
  if (reviewedPathPattern.test(source)) {
    // If the script mentions reviewed/, ensure it's only in read contexts
    const writeContextPattern = /(?:writeFile|writeJson|mkdir|writeFileSync|mkdirSync)\s*\(/g;
    for (const match of source.matchAll(writeContextPattern)) {
      const afterWrite = source.slice(match.index);
      if (reviewedPathPattern.test(afterWrite.slice(0, 400))) {
        // Already caught by the more specific pattern above, or flag it
        const alreadyFlagged = errors.some((e) => e.includes(scriptName));
        if (!alreadyFlagged) {
          errors.push(`Generator ${scriptName} may write near reviewed/ path`);
        }
      }
    }
  }

  return errors;
}

function checkGeneratorDoesNotWriteRuntime(source, scriptName) {
  const errors = [];

  for (const runtimeFile of runtimeDataFiles) {
    const escapedFile = runtimeFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const writePattern = new RegExp(`(?:writeFile|writeJson|writeFileSync)\\s*\\([^)]*${escapedFile}[^)]*\\)`, 'g');

    for (const match of source.matchAll(writePattern)) {
      errors.push(`Generator ${scriptName} must not write runtime file: ${match[0]}`);
    }
  }

  return errors;
}

async function fileExists(filePath) {
  try {
    await readFile(filePath, 'utf8');
    return true;
  } catch {
    return false;
  }
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}
