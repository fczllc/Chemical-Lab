import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const evidenceRoot = path.join(projectRoot, '.sisyphus', 'evidence');
const labModulePath = path.join(projectRoot, 'src', 'modules', 'lab.js');
const runtimeTargetMapPath = path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'runtimeTargetMap.js');

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  const options = parseCli(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const result = options.selfCheck
    ? runSelfCheck(options.selfCheck)
    : await validateBoundary(options);

  await maybeWriteReport(options.report, result);
  printResult(result);
  if (result.status !== 'pass') {
    process.exitCode = 1;
  }
}

function parseCli(args) {
  const options = {
    help: false,
    report: null,
    selfCheck: null,
    checkRuntimeTargetMap: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--report') {
      const reportPath = args[index + 1];
      if (!reportPath || reportPath.startsWith('--')) {
        throw new Error('--report requires a path');
      }
      options.report = reportPath;
      index += 1;
      continue;
    }
    if (arg === '--self-check') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--self-check requires a check name');
      }
      options.selfCheck = value;
      index += 1;
      continue;
    }
    if (arg === '--check-runtime-target-map') {
      options.checkRuntimeTargetMap = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Lab data boundary validator / 实验室数据边界校验器

Usage:
  node scripts/validate-lab-data-boundary.mjs [--check-runtime-target-map] [--self-check <name>] [--report <path>]

Default checks:
  - src/modules/lab.js imports/uses labExperiments as the lab card source instead of reactions.
  - src/data/textbookIngestion/runtimeTargetMap.js does not map experimentCandidate to src/data/reactions.json.

Self-check names:
  lab-imports-reactions  Verify the lab module boundary check rejects reactions as the card source.

Options:
  --check-runtime-target-map  Run only the runtime target map boundary check.
  --report <path>            Write JSON validation report under .sisyphus/evidence/.
  --help                     Show this help.`);
}

async function validateBoundary(options) {
  const checks = [];
  const labSource = await readTextFile(labModulePath, 'src/modules/lab.js');
  const targetMapSource = await readTextFile(runtimeTargetMapPath, 'src/data/textbookIngestion/runtimeTargetMap.js');

  if (!options.checkRuntimeTargetMap) {
    checks.push(checkLabModuleUsesLabExperiments(labSource));
  }
  checks.push(checkRuntimeTargetMap(targetMapSource));

  const failures = checks.filter((check) => check.status !== 'pass');
  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-data-boundary.mjs',
    status: failures.length === 0 ? 'pass' : 'fail',
    mode: options.checkRuntimeTargetMap ? 'runtime-target-map' : 'default',
    counters: {
      checks: checks.length,
      failures: failures.length
    },
    errors: failures.map((check) => check.message),
    checks
  };
}

function runSelfCheck(checkName) {
  switch (checkName) {
    case 'lab-imports-reactions': {
      const fixture = `import { reactions as importedReactions } from '../data/index.js';\nconst reactions = importedReactions;\nconst filteredReactions = reactions.filter((reaction) => reaction.id);\n`;
      const check = checkLabModuleUsesLabExperiments(fixture);
      const status = check.status === 'fail' ? 'pass' : 'fail';
      return {
        schemaVersion: 1,
        validator: 'scripts/validate-lab-data-boundary.mjs',
        check: checkName,
        status,
        rejectedFixture: check.status === 'fail',
        errors: status === 'pass' ? [] : ['Expected lab module fixture importing reactions to fail boundary validation']
      };
    }
    default:
      throw new Error(`Unknown self-check: ${checkName}`);
  }
}

function checkLabModuleUsesLabExperiments(source) {
  const importsLabExperiments = /import\s*\{[^}]*\blabExperiments\b[^}]*\}\s*from\s*['"]\.\.\/data\/index\.js['"]/su.test(source)
    || /import\s*\{[^}]*\blabExperiments\b[^}]*\}\s*from\s*['"]\.\.\/data\/labExperiments\.js['"]/su.test(source);
  const importsReactionsAlias = /import\s*\{[^}]*\breactions\s+as\s+importedReactions\b[^}]*\}\s*from\s*['"]\.\.\/data\/index\.js['"]/su.test(source);
  const usesReactionsCards = /\b(?:filteredReactions|activeReaction|reactions)\b/su.test(source)
    && /\breactions\.filter\s*\(|\breactions\.find\s*\(|\breactions\[0\]/su.test(source);
  const usesLabExperimentCards = /\blabExperiments\s*\.\s*(?:filter|find)\s*\(/su.test(source);

  if (!importsLabExperiments || !usesLabExperimentCards || importsReactionsAlias || usesReactionsCards) {
    return {
      name: 'lab-module-card-source',
      status: 'fail',
      message: 'src/modules/lab.js must import/use labExperiments as the card source and must not use reactions for lab cards',
      details: {
        importsLabExperiments,
        usesLabExperimentCards,
        importsReactionsAlias,
        usesReactionsCards
      }
    };
  }

  return {
    name: 'lab-module-card-source',
    status: 'pass',
    message: 'src/modules/lab.js uses labExperiments as lab card source',
    details: {
      importsLabExperiments,
      usesLabExperimentCards,
      importsReactionsAlias,
      usesReactionsCards
    }
  };
}

function checkRuntimeTargetMap(source) {
  const supportedDestinationBlocks = extractArrayObjectBlocks(source, 'supportedDestinations');
  const experimentCandidateDestinations = supportedDestinationBlocks.filter((block) => hasPropertyValue(block, 'candidateType', 'experimentCandidate'));
  const labCandidateDestinations = supportedDestinationBlocks.filter((block) => hasPropertyValue(block, 'candidateType', 'labCandidate'));
  const experimentCandidateMapsToReactions = experimentCandidateDestinations.some((block) => hasPropertyValue(block, 'targetRuntimeFile', 'src/data/reactions.json'));
  const experimentCandidateMapsToLabExperiments = experimentCandidateDestinations.some((block) => hasPropertyValue(block, 'targetRuntimeFile', 'src/data/labExperiments.json')
    && hasPropertyValue(block, 'targetField', 'labExperiments'));
  const labCandidateMapsToRuntime = labCandidateDestinations.some((block) => /targetRuntimeFile\s*:/u.test(block));

  if (experimentCandidateMapsToReactions) {
    return {
      name: 'runtime-target-map-experiment-boundary',
      status: 'fail',
      message: 'runtimeTargetMap.js must not map experimentCandidate to src/data/reactions.json; lab experiments belong in src/data/labExperiments.json',
      details: { experimentCandidateMapsToReactions, experimentCandidateMapsToLabExperiments, labCandidateMapsToRuntime }
    };
  }

  if (!experimentCandidateMapsToLabExperiments) {
    return {
      name: 'runtime-target-map-experiment-boundary',
      status: 'fail',
      message: 'runtimeTargetMap.js must map experimentCandidate to src/data/labExperiments.json with targetField labExperiments',
      details: { experimentCandidateMapsToReactions, experimentCandidateMapsToLabExperiments, labCandidateMapsToRuntime }
    };
  }

  if (labCandidateMapsToRuntime) {
    return {
      name: 'runtime-target-map-experiment-boundary',
      status: 'fail',
      message: 'runtimeTargetMap.js must keep generic labCandidate records unsupported unless filtered by explicit experiment rules',
      details: { experimentCandidateMapsToReactions, experimentCandidateMapsToLabExperiments, labCandidateMapsToRuntime }
    };
  }

  return {
    name: 'runtime-target-map-experiment-boundary',
    status: 'pass',
    message: 'runtimeTargetMap.js routes experimentCandidate to labExperiments and keeps generic labCandidate unsupported',
    details: { experimentCandidateMapsToReactions, experimentCandidateMapsToLabExperiments, labCandidateMapsToRuntime }
  };
}

function extractArrayObjectBlocks(source, propertyName) {
  const propertyIndex = source.indexOf(`${propertyName}:`);
  if (propertyIndex === -1) {
    return [];
  }

  const arrayStart = source.indexOf('[', propertyIndex);
  if (arrayStart === -1) {
    return [];
  }

  const arrayEnd = findMatchingDelimiter(source, arrayStart, '[', ']');
  if (arrayEnd === -1) {
    return [];
  }

  const arraySource = source.slice(arrayStart + 1, arrayEnd);
  const blocks = [];
  for (let index = 0; index < arraySource.length; index += 1) {
    if (arraySource[index] !== '{') {
      continue;
    }

    const blockEnd = findMatchingDelimiter(arraySource, index, '{', '}');
    if (blockEnd === -1) {
      break;
    }

    blocks.push(arraySource.slice(index, blockEnd + 1));
    index = blockEnd;
  }

  return blocks;
}

function findMatchingDelimiter(source, startIndex, openDelimiter, closeDelimiter) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '\'' || char === '"') {
      quote = char;
      continue;
    }

    if (char === openDelimiter) {
      depth += 1;
    } else if (char === closeDelimiter) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function hasPropertyValue(source, propertyName, expectedValue) {
  const escapedValue = expectedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${propertyName}\\s*:\\s*['"]${escapedValue}['"]`, 'u').test(source);
}

async function readTextFile(filePath, label) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read ${label}: ${error.message}`);
  }
}

function printResult(result) {
  console.log(`${result.check || 'labDataBoundaryValidationStatus'}=${result.status}`);
  if (result.mode) {
    console.log(`mode=${result.mode}`);
  }
  for (const [name, value] of Object.entries(result.counters ?? {})) {
    console.log(`${name}=${value}`);
  }
  for (const error of result.errors ?? []) {
    console.error(`ERROR ${error}`);
  }
}

async function maybeWriteReport(reportPath, result) {
  if (!reportPath) {
    return;
  }
  const absolutePath = resolveReportPath(reportPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

function resolveReportPath(reportPath) {
  if (path.isAbsolute(reportPath)) {
    throw new Error('--report must be a repository-relative path under .sisyphus/evidence/');
  }

  const normalizedPath = path.normalize(reportPath);
  if (normalizedPath.split(path.sep).includes('..')) {
    throw new Error('--report must not contain parent-directory traversal');
  }

  const absolutePath = path.resolve(projectRoot, normalizedPath);
  const relativeToEvidence = path.relative(evidenceRoot, absolutePath);
  if (relativeToEvidence === '' || relativeToEvidence.startsWith('..') || path.isAbsolute(relativeToEvidence)) {
    throw new Error('--report must be under .sisyphus/evidence/');
  }

  return absolutePath;
}
