import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { TEXTBOOK_RUNTIME_TARGET_MAP } from '../../src/data/textbookIngestion/runtimeTargetMap.js';
import { validatePromotionManifest } from '../../src/data/textbookIngestion/schemas/draftSchemas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const ingestionRoot = path.join(projectRoot, 'src', 'data', 'textbookIngestion');
const generatedRoot = path.join(ingestionRoot, 'generated');
const reviewedRoot = path.join(ingestionRoot, 'reviewed');
const batchesRoot = path.join(ingestionRoot, 'batches');

const reviewer = {
  reviewedBy: 'mechanical-trace-review',
  reviewedAt: '2026-05-09T00:00:00.000Z'
};

const candidateFiles = [
  { candidateType: 'curriculumTopic', fileName: 'knowledge-topics.json', idField: 'topicId', surface: 'contentMetadata' },
  { candidateType: 'quizCandidate', fileName: 'quiz-candidates.json', idField: 'candidateId', surface: 'quiz' },
  { candidateType: 'achievementCandidate', fileName: 'achievement-candidates.json', idField: 'candidateId', surface: 'achievement' },
  { candidateType: 'gameChallengeCandidate', fileName: 'game-candidates.json', idField: 'candidateId', surface: 'gameChallenge' },
  { candidateType: 'learningPathCandidate', fileName: 'learning-path-candidates.json', idField: 'candidateId', surface: 'learningPath' },
  { candidateType: 'experimentCandidate', fileName: 'experiment-candidates.json', idField: 'candidateId', surface: 'reaction' },
  { candidateType: 'labCandidate', fileName: 'lab-candidates.json', idField: 'candidateId', surface: 'labOrReaction' },
  { candidateType: 'storyCandidate', fileName: 'story-candidates.json', idField: 'candidateId', surface: 'story' }
];

const supportedDestinations = new Map(
  TEXTBOOK_RUNTIME_TARGET_MAP.supportedDestinations.map((destination) => [destination.candidateType, destination])
);
const unsupportedArtifactTypes = new Map(
  TEXTBOOK_RUNTIME_TARGET_MAP.unsupportedArtifactTypes.map((artifact) => [artifact.candidateType, artifact.classification])
);

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

  const volumeIds = options.allReviewed ? await discoverVolumeIds() : [options.textbook].filter(Boolean);
  if (volumeIds.length === 0) {
    throw new Error('--textbook <volumeId> or --all-reviewed is required');
  }

  const report = { schemaVersion: 1, mode: options.write ? 'write' : 'dry-run', volumes: [], totals: emptyCounts() };
  const blockedArtifacts = { schemaVersion: 1, generatedAt: reviewer.reviewedAt, volumes: [] };

  for (const volumeId of volumeIds.sort((left, right) => left.localeCompare(right))) {
    const result = await buildVolumeCandidatePlan(volumeId);
    report.volumes.push(result.summary);
    blockedArtifacts.volumes.push({ volumeId, blocked: result.blocked });
    addCounts(report.totals, result.summary);

    if (options.write && result.changed) {
      await mkdir(path.dirname(result.reviewedManifestPath), { recursive: true });
      await writeJsonFile(result.reviewedManifestPath, result.manifest);
    }
  }

  printSummary(report);
  if (options.blockedJson) {
    await writeJsonFile(projectPath(options.blockedJson), blockedArtifacts);
  }
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      textbook: { type: 'string' },
      'all-reviewed': { type: 'boolean' },
      write: { type: 'boolean' },
      'blocked-json': { type: 'string' }
    },
    strict: true
  });

  if (values.textbook && values['all-reviewed']) {
    throw new Error('--textbook and --all-reviewed cannot be used together');
  }

  return {
    help: values.help === true,
    textbook: values.textbook ?? null,
    allReviewed: values['all-reviewed'] === true,
    write: values.write === true,
    blockedJson: values['blocked-json'] ?? null
  };
}

function printHelp() {
  console.log(`Reviewed promotion candidate generator / 已审核推广候选清单生成器

Usage:
  node scripts/textbook/generate-reviewed-candidates.mjs --textbook <volumeId>
  node scripts/textbook/generate-reviewed-candidates.mjs --all-reviewed
  node scripts/textbook/generate-reviewed-candidates.mjs --all-reviewed --write

Options:
  --textbook <volumeId>                 Generate candidates for one textbook volume.
  --all-reviewed                        Generate candidates for every reviewed volume.
  --write                               Write reviewed promotion manifests. Omit for dry-run.
  --blocked-json <path>                 Write blocked artifact report JSON.
  --help                                Show this help.`);
}

async function discoverVolumeIds() {
  const names = new Set();
  for (const root of [generatedRoot, reviewedRoot]) {
    for (const name of await listDirectoryNames(root)) {
      names.add(name);
    }
  }

  return [...names];
}

async function buildVolumeCandidatePlan(volumeId) {
  const paths = buildTextbookPaths(volumeId);
  const batch = await readJsonFile(paths.batchPath, 'batch metadata');
  const reviewedManifest = await readJsonFile(paths.reviewedManifestPath, 'reviewed promotion manifest');
  const topicsBySourceSection = await loadTopicsBySourceSection(paths.generatedRoot);
  const existingEntries = Array.isArray(reviewedManifest.entries) ? reviewedManifest.entries : [];
  const existingCandidateIds = new Set(existingEntries.map((entry) => entry?.candidateId).filter(hasText));
  const generatedEntries = [];
  const blocked = [];

  for (const candidateFile of candidateFiles) {
    const items = await readCandidateArray(paths.generatedRoot, candidateFile);
    for (const item of items) {
      const candidateId = item?.[candidateFile.idField];
      if (!hasText(candidateId)) {
        blocked.push(blockedArtifact(candidateFile, item, 'missing stable candidate id'));
        continue;
      }

      if (existingCandidateIds.has(candidateId)) {
        continue;
      }

      const destination = supportedDestinations.get(candidateFile.candidateType);
      if (!destination) {
        blocked.push(blockedArtifact(candidateFile, item, unsupportedArtifactTypes.get(candidateFile.candidateType) ?? 'not-promotable: unsupported target'));
        continue;
      }

      const traceError = findTraceabilityError(item, batch, volumeId);
      if (traceError) {
        blocked.push(blockedArtifact(candidateFile, item, traceError));
        continue;
      }

      const topicId = topicIdForCandidate(item, topicsBySourceSection);
      generatedEntries.push(buildReviewedEntry({ candidateFile, destination, item, candidateId, topicId }));
    }
  }

  const entries = [...existingEntries, ...generatedEntries].sort(compareEntries);
  const manifest = {
    schemaVersion: reviewedManifest.schemaVersion,
    volumeId: reviewedManifest.volumeId,
    sourceHash: reviewedManifest.sourceHash,
    generatedAt: reviewedManifest.generatedAt ?? batch.generatedAt ?? reviewer.reviewedAt,
    entries
  };
  const validationErrors = validatePromotionManifest(manifest, { expectedVolumeId: volumeId, expectedSourceHash: batch.sourceHash });
  if (validationErrors.length > 0) {
    throw new Error(`${relativeProjectPath(paths.reviewedManifestPath)} candidate manifest failed schema validation:\n${validationErrors.map((error) => `- ${error}`).join('\n')}`);
  }

  return {
    reviewedManifestPath: paths.reviewedManifestPath,
    manifest,
    blocked,
    changed: generatedEntries.length > 0 || entries.length !== existingEntries.length,
    summary: buildSummary(volumeId, existingEntries, generatedEntries, blocked, paths.reviewedManifestPath)
  };
}

function buildReviewedEntry({ candidateFile, destination, item, candidateId, topicId }) {
  const entryId = `promote-${topicId}-${candidateFile.candidateType.replace(/Candidate$/, '').replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}-${machineId(candidateId)}`;

  return {
    entryId,
    promoteScope: 'topic',
    topicId,
    curriculumTagId: topicId,
    surface: destination.contentType,
    contentType: destination.contentType,
    candidateType: candidateFile.candidateType,
    candidateId,
    runtimeId: `textbook-${item.sourceVolumeId}-${topicId}-${entryId}`,
    surfaceRequirements: [
      {
        surface: destination.contentType,
        requirement: `mechanically-traceable-${destination.contentType}`,
        status: 'covered',
        candidateIds: [candidateId],
        targetRuntimeFiles: [destination.targetRuntimeFile]
      }
    ],
    targetRuntimeFile: destination.targetRuntimeFile,
    targetRuntimeFiles: [destination.targetRuntimeFile],
    sourceVolumeId: item.sourceVolumeId,
    sourcePath: item.sourcePath,
    sourceHeading: item.sourceHeading,
    sourceLineStart: item.sourceLineStart,
    sourceLineEnd: item.sourceLineEnd,
    sourceHash: item.sourceHash,
    reviewStatus: 'reviewed',
    reviewedBy: reviewer.reviewedBy,
    reviewedAt: reviewer.reviewedAt
  };
}

function buildSummary(volumeId, existingEntries, generatedEntries, blocked, reviewedManifestPath) {
  return {
    volumeId,
    reviewedManifest: relativeProjectPath(reviewedManifestPath),
    existingReviewedEntries: existingEntries.length,
    generatedCandidateEntries: generatedEntries.length,
    reviewedEntriesAfterWrite: existingEntries.length + generatedEntries.length,
    blockedArtifacts: blocked.length,
    byCandidateType: countBy(generatedEntries, 'candidateType'),
    byTargetRuntimeFile: countBy(generatedEntries, 'targetRuntimeFile')
  };
}

function printSummary(report) {
  console.log(`Reviewed candidate generation: ${report.mode}`);
  console.log(`volumes: ${report.volumes.length}`);
  console.log(`generated candidate entries: ${report.totals.generatedCandidateEntries}`);
  console.log(`reviewed entries after write: ${report.totals.reviewedEntriesAfterWrite}`);
  console.log(`blocked artifacts: ${report.totals.blockedArtifacts}`);

  for (const volume of report.volumes) {
    console.log(`- ${volume.volumeId}: existing=${volume.existingReviewedEntries} generated=${volume.generatedCandidateEntries} reviewedAfterWrite=${volume.reviewedEntriesAfterWrite} blocked=${volume.blockedArtifacts}`);
  }
}

function blockedArtifact(candidateFile, item, reason) {
  return {
    candidateType: candidateFile.candidateType,
    candidateId: item?.[candidateFile.idField] ?? null,
    sourceVolumeId: item?.sourceVolumeId ?? null,
    sourcePath: item?.sourcePath ?? null,
    sourceHeading: item?.sourceHeading ?? null,
    sourceLineStart: Number.isInteger(item?.sourceLineStart) ? item.sourceLineStart : null,
    sourceLineEnd: Number.isInteger(item?.sourceLineEnd) ? item.sourceLineEnd : null,
    reason
  };
}

function findTraceabilityError(item, batch, volumeId) {
  for (const field of ['sourceVolumeId', 'sourcePath', 'sourceHeading', 'sourceHash']) {
    if (!hasText(item?.[field])) {
      return `missing source traceability field ${field}`;
    }
  }

  for (const field of ['sourceLineStart', 'sourceLineEnd']) {
    if (!Number.isInteger(item?.[field])) {
      return `missing source traceability field ${field}`;
    }
  }

  if (item.sourceVolumeId !== volumeId) {
    return `sourceVolumeId does not match volume ${volumeId}`;
  }

  if (item.sourceHash !== batch.sourceHash) {
    return 'sourceHash does not match batch sourceHash';
  }

  return null;
}

function topicIdForCandidate(item, topicsBySourceSection) {
  if (hasText(item.topicId)) {
    return machineId(item.topicId);
  }

  const matchedTopic = topicsBySourceSection.get(item.sourceSectionId);
  if (hasText(matchedTopic?.topicId)) {
    return machineId(matchedTopic.topicId);
  }

  return machineId(item.sourceSectionId ?? `${item.sourceHeading}-${item.sourceLineStart}-${item.sourceLineEnd}`);
}

async function loadTopicsBySourceSection(generatedDirectory) {
  const topics = await readJsonFile(path.join(generatedDirectory, 'knowledge-topics.json'), 'knowledge topics');
  const topicsBySourceSection = new Map();
  if (!Array.isArray(topics)) {
    return topicsBySourceSection;
  }

  for (const topic of topics) {
    if (hasText(topic?.sourceSectionId)) {
      topicsBySourceSection.set(topic.sourceSectionId, topic);
    }
  }

  return topicsBySourceSection;
}

async function readCandidateArray(generatedDirectory, candidateFile) {
  const items = await readJsonFile(path.join(generatedDirectory, candidateFile.fileName), candidateFile.fileName);
  if (!Array.isArray(items)) {
    throw new Error(`${candidateFile.fileName} must be an array`);
  }

  return items;
}

function buildTextbookPaths(volumeId) {
  return {
    generatedRoot: path.join(generatedRoot, volumeId),
    reviewedManifestPath: path.join(reviewedRoot, volumeId, 'promotion-manifest.json'),
    batchPath: path.join(batchesRoot, `${volumeId}.json`)
  };
}

async function listDirectoryNames(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function readJsonFile(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} cannot be read or parsed at ${relativeProjectPath(filePath)}: ${error.message}`);
  }
}

async function writeJsonFile(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function compareEntries(left, right) {
  return compareText(left.targetRuntimeFile, right.targetRuntimeFile)
    || compareText(left.sourceVolumeId, right.sourceVolumeId)
    || compareText(left.topicId, right.topicId)
    || compareText(left.entryId, right.entryId)
    || compareText(left.candidateId, right.candidateId);
}

function countBy(items, field) {
  const counts = {};
  for (const item of items) {
    counts[item[field]] = (counts[item[field]] ?? 0) + 1;
  }

  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function emptyCounts() {
  return { generatedCandidateEntries: 0, reviewedEntriesAfterWrite: 0, blockedArtifacts: 0 };
}

function addCounts(totals, summary) {
  totals.generatedCandidateEntries += summary.generatedCandidateEntries;
  totals.reviewedEntriesAfterWrite += summary.reviewedEntriesAfterWrite;
  totals.blockedArtifacts += summary.blockedArtifacts;
}

function machineId(value) {
  return String(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'untitled';
}

function projectPath(relativePath) {
  return path.join(projectRoot, ...relativePath.split('/'));
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
