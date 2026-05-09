import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  draftCollections,
  validateDraftInventory,
  validatePromotionManifest
} from '../../src/data/textbookIngestion/schemas/draftSchemas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const ingestionRoot = path.join(projectRoot, 'src', 'data', 'textbookIngestion');
const generatedRoot = path.join(ingestionRoot, 'generated');
const reviewedRoot = path.join(ingestionRoot, 'reviewed');
const batchesRoot = path.join(ingestionRoot, 'batches');

const knownVolumeIds = [
  'rj-chemistry-g12-selective-3-organic-2019',
  'rj-chemistry-grade8-54-2024-full',
  'rj-chemistry-grade9-2024-vol1',
  'rj-chemistry-grade9-2024-vol2'
];

const generatedArtifactFiles = [
  { key: 'sourceSections', fileName: 'source-inventory.json', shape: 'sourceInventory' },
  { key: 'curriculumTopics', fileName: 'knowledge-topics.json', shape: 'array' },
  { key: 'experimentCandidates', fileName: 'experiment-candidates.json', shape: 'array' },
  { key: 'labCandidates', fileName: 'lab-candidates.json', shape: 'array' },
  { key: 'gameChallengeCandidates', fileName: 'game-candidates.json', shape: 'array' },
  { key: 'storyCandidates', fileName: 'story-candidates.json', shape: 'array' },
  { key: 'achievementCandidates', fileName: 'achievement-candidates.json', shape: 'array' },
  { key: 'quizCandidates', fileName: 'quiz-candidates.json', shape: 'array' },
  { key: 'learningPathCandidates', fileName: 'learning-path-candidates.json', shape: 'array' },
  { key: 'experimentBacklog', fileName: 'experiment-backlog.json', shape: 'array' },
  { key: 'coverageRows', fileName: 'coverage-matrix.json', shape: 'coverageMatrix' }
];

const readinessStatuses = [
  'generated-only',
  'review-scaffold-only',
  'reviewed-non-empty',
  'promotable',
  'not-ready'
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

  const report = await buildInventoryReport();
  const json = `${JSON.stringify(report, null, 2)}\n`;

  if (!options.jsonOnly) {
    printSummary(report, console.error);
  }

  if (!options.summaryOnly) {
    process.stdout.write(json);
  }
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      'json-only': { type: 'boolean' },
      'summary-only': { type: 'boolean' }
    },
    strict: true
  });

  if (values['json-only'] && values['summary-only']) {
    throw new Error('--json-only and --summary-only cannot be used together');
  }

  return {
    help: values.help === true,
    jsonOnly: values['json-only'] === true,
    summaryOnly: values['summary-only'] === true
  };
}

function printHelp() {
  console.log(`Processed textbook inventory / 已处理教材库存报告

Usage:
  node scripts/textbook/inventory-processed-volumes.mjs
  node scripts/textbook/inventory-processed-volumes.mjs --json-only
  node scripts/textbook/inventory-processed-volumes.mjs --summary-only

Options:
  --json-only                         Emit only machine-readable JSON to stdout.
  --summary-only                      Emit only the readable readiness summary to stderr.
  --help                              Show this help.`);
}

async function buildInventoryReport() {
  const volumeIds = await discoverVolumeIds();
  const volumes = [];

  for (const volumeId of volumeIds) {
    volumes.push(await inspectVolume(volumeId));
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    readinessStatuses,
    roots: {
      generated: relativeProjectPath(generatedRoot),
      reviewed: relativeProjectPath(reviewedRoot),
      batches: relativeProjectPath(batchesRoot)
    },
    knownVolumeIds,
    totals: buildTotals(volumes),
    volumes
  };
}

async function discoverVolumeIds() {
  const discovered = new Set(knownVolumeIds);

  for (const directory of [generatedRoot, reviewedRoot]) {
    for (const name of await listDirectoryNames(directory)) {
      discovered.add(name);
    }
  }

  for (const name of await listJsonBasenames(batchesRoot)) {
    discovered.add(name);
  }

  return [...discovered].sort((left, right) => left.localeCompare(right));
}

async function inspectVolume(volumeId) {
  const paths = buildTextbookPaths(volumeId);
  const generatedDirectoryExists = await pathExists(paths.generatedRoot);
  const reviewedDirectoryExists = await pathExists(paths.reviewedRoot);
  const batchExists = await pathExists(paths.batchPath);
  const generatedDraftExists = await pathExists(paths.draftInventoryPath);
  const generatedManifestExists = await pathExists(paths.generatedManifestPath);
  const reviewedManifestExists = await pathExists(paths.reviewedManifestPath);

  const readinessErrors = [];
  const warnings = [];

  if (!generatedDirectoryExists) {
    readinessErrors.push(`Missing generated directory: ${relativeProjectPath(paths.generatedRoot)}`);
  }

  if (!generatedDraftExists) {
    readinessErrors.push(`Missing generated draft inventory: ${relativeProjectPath(paths.draftInventoryPath)}`);
  }

  if (!generatedManifestExists) {
    readinessErrors.push(`Missing generated promotion scaffold: ${relativeProjectPath(paths.generatedManifestPath)}`);
  }

  if (!reviewedDirectoryExists) {
    readinessErrors.push(`Missing reviewed directory: ${relativeProjectPath(paths.reviewedRoot)}`);
  }

  if (!reviewedManifestExists) {
    readinessErrors.push(`Missing reviewed promotion manifest: ${relativeProjectPath(paths.reviewedManifestPath)}`);
  }

  if (!batchExists) {
    readinessErrors.push(`Missing batch metadata: ${relativeProjectPath(paths.batchPath)}`);
  }

  const batch = await readJsonIfPresent(paths.batchPath, warnings, 'batch metadata');
  const draftInventory = await readJsonIfPresent(paths.draftInventoryPath, warnings, 'generated draft inventory');
  const generatedManifest = await readJsonIfPresent(paths.generatedManifestPath, warnings, 'generated promotion scaffold');
  const reviewedManifest = await readJsonIfPresent(paths.reviewedManifestPath, warnings, 'reviewed promotion manifest');
  const expectedSourceHash = readTextField(batch, 'sourceHash');
  const identity = { expectedVolumeId: volumeId, expectedSourceHash };

  if (draftInventory) {
    readinessErrors.push(...prefixErrors('Generated draft inventory', validateDraftInventory(draftInventory, identity)));
  }

  if (generatedManifest) {
    readinessErrors.push(...prefixErrors('Generated promotion scaffold', validatePromotionManifest(generatedManifest, identity)));
  }

  if (reviewedManifest) {
    readinessErrors.push(...prefixErrors('Reviewed promotion manifest', validatePromotionManifest(reviewedManifest, identity)));
  }

  const generatedCounts = await countGeneratedArtifacts(paths.generatedRoot, draftInventory, warnings);
  const reviewedEntries = Array.isArray(reviewedManifest?.entries) ? reviewedManifest.entries : [];
  const reviewedCounts = countReviewedEntries(reviewedEntries);
  const classification = classifyVolume({
    generatedDirectoryExists,
    reviewedManifestExists,
    batchExists,
    generatedDraftExists,
    generatedManifestExists,
    readinessErrors,
    reviewedCounts
  });

  return {
    volumeId,
    isKnownVolume: knownVolumeIds.includes(volumeId),
    classification,
    displayName: readTextField(batch, 'displayName'),
    sourceHash: expectedSourceHash,
    paths: {
      generatedRoot: relativeProjectPath(paths.generatedRoot),
      reviewedManifest: relativeProjectPath(paths.reviewedManifestPath),
      batch: relativeProjectPath(paths.batchPath)
    },
    counterparts: {
      generatedDirectory: generatedDirectoryExists,
      generatedDraftInventory: generatedDraftExists,
      generatedPromotionManifest: generatedManifestExists,
      reviewedDirectory: reviewedDirectoryExists,
      reviewedPromotionManifest: reviewedManifestExists,
      batchMetadata: batchExists
    },
    artifactCounts: {
      generated: generatedCounts,
      reviewed: reviewedCounts
    },
    readinessErrors,
    warnings
  };
}

function classifyVolume(volume) {
  const hasGenerated = volume.generatedDirectoryExists && volume.generatedDraftExists && volume.generatedManifestExists;
  const hasReviewed = volume.reviewedManifestExists;
  const hasCompleteCounterparts = hasGenerated && hasReviewed && volume.batchExists;

  if (!hasReviewed && hasGenerated) {
    return 'generated-only';
  }

  if (!hasCompleteCounterparts) {
    return 'not-ready';
  }

  if (volume.reviewedCounts.totalEntries === 0) {
    return volume.readinessErrors.length === 0 ? 'review-scaffold-only' : 'not-ready';
  }

  if (volume.reviewedCounts.promotableEntries > 0 && volume.readinessErrors.length === 0) {
    return 'promotable';
  }

  if (volume.readinessErrors.length === 0) {
    return 'reviewed-non-empty';
  }

  return 'not-ready';
}

async function countGeneratedArtifacts(generatedDirectory, draftInventory, warnings) {
  const counts = Object.fromEntries(draftCollections.map((collection) => [collection.key, countArray(draftInventory?.[collection.key])]));

  for (const artifact of generatedArtifactFiles) {
    const filePath = path.join(generatedDirectory, artifact.fileName);
    const value = await readJsonIfPresent(filePath, warnings, artifact.fileName);
    counts[artifact.key] = countArtifact(value, artifact.shape);
  }

  return counts;
}

function countArtifact(value, shape) {
  if (shape === 'array') {
    return countArray(value);
  }

  if (shape === 'sourceInventory') {
    return countArray(value?.sections) || countArray(value?.sourceSections);
  }

  if (shape === 'coverageMatrix') {
    return countArray(value?.rows);
  }

  return 0;
}

function countReviewedEntries(entries) {
  const byCandidateType = {};
  const byTargetRuntimeFile = {};
  let reviewedEntries = 0;
  let promotedEntries = 0;
  let promotableEntries = 0;

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    if (typeof entry.candidateType === 'string' && entry.candidateType.length > 0) {
      byCandidateType[entry.candidateType] = (byCandidateType[entry.candidateType] ?? 0) + 1;
    }

    for (const targetRuntimeFile of normalizeArray(entry.targetRuntimeFiles ?? entry.targetRuntimeFile)) {
      byTargetRuntimeFile[targetRuntimeFile] = (byTargetRuntimeFile[targetRuntimeFile] ?? 0) + 1;
    }

    if (entry.reviewStatus === 'reviewed') {
      reviewedEntries += 1;
    }

    if (entry.reviewStatus === 'promoted') {
      promotedEntries += 1;
    }

    if ((entry.reviewStatus === 'reviewed' || entry.reviewStatus === 'promoted') && normalizeArray(entry.targetRuntimeFiles ?? entry.targetRuntimeFile).length > 0) {
      promotableEntries += 1;
    }
  }

  return {
    totalEntries: entries.length,
    reviewedEntries,
    promotedEntries,
    promotableEntries,
    byCandidateType: sortRecord(byCandidateType),
    byTargetRuntimeFile: sortRecord(byTargetRuntimeFile)
  };
}

function buildTotals(volumes) {
  const byClassification = Object.fromEntries(readinessStatuses.map((status) => [status, 0]));
  let readinessErrorCount = 0;

  for (const volume of volumes) {
    byClassification[volume.classification] = (byClassification[volume.classification] ?? 0) + 1;
    readinessErrorCount += volume.readinessErrors.length;
  }

  return {
    volumes: volumes.length,
    byClassification,
    readinessErrorCount
  };
}

function printSummary(report, writeLine) {
  writeLine('Processed textbook inventory / 已处理教材库存报告');
  writeLine(`volumes: ${report.totals.volumes}`);

  for (const status of readinessStatuses) {
    writeLine(`${status}: ${report.totals.byClassification[status] ?? 0}`);
  }

  for (const volume of report.volumes) {
    const generatedTotal = sumRecord(volume.artifactCounts.generated);
    const reviewedTotal = volume.artifactCounts.reviewed.totalEntries;
    writeLine(`- ${volume.volumeId}: ${volume.classification} (generated items: ${generatedTotal}, reviewed entries: ${reviewedTotal})`);

    for (const error of volume.readinessErrors) {
      writeLine(`  error: ${error}`);
    }
  }
}

function buildTextbookPaths(volumeId) {
  return {
    generatedRoot: path.join(generatedRoot, volumeId),
    reviewedRoot: path.join(reviewedRoot, volumeId),
    batchPath: path.join(batchesRoot, `${volumeId}.json`),
    draftInventoryPath: path.join(generatedRoot, volumeId, 'draft-inventory.json'),
    generatedManifestPath: path.join(generatedRoot, volumeId, 'promotion-manifest.json'),
    reviewedManifestPath: path.join(reviewedRoot, volumeId, 'promotion-manifest.json')
  };
}

async function listDirectoryNames(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function listJsonBasenames(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name.slice(0, -'.json'.length));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function readJsonIfPresent(filePath, warnings, label) {
  try {
    const source = await readFile(filePath, 'utf8');
    return JSON.parse(source);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    warnings.push(`${label} cannot be read or parsed: ${error.message}`);
    return null;
  }
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

function prefixErrors(label, errors) {
  return errors.map((error) => `${label}: ${error}`);
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }

  return typeof value === 'string' && value.trim().length > 0 ? [value] : [];
}

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function readTextField(value, field) {
  return typeof value?.[field] === 'string' ? value[field] : null;
}

function sortRecord(record) {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}

function sumRecord(record) {
  return Object.values(record).reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}
