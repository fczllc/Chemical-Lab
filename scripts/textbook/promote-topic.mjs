import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { TEXTBOOK_RUNTIME_TARGET_MAP } from '../../src/data/textbookIngestion/runtimeTargetMap.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const ingestionRoot = path.join(projectRoot, 'src', 'data', 'textbookIngestion');
const reviewedRoot = path.join(ingestionRoot, 'reviewed');
const generatedRoot = path.join(ingestionRoot, 'generated');

const knownTextbookBatches = new Map([
  ['rj-chemistry-grade9-2024-vol1', buildTextbookPaths('rj-chemistry-grade9-2024-vol1')],
  ['rj-chemistry-grade9-2024-vol2', buildTextbookPaths('rj-chemistry-grade9-2024-vol2')],
  ['rj-chemistry-g12-selective-3-organic-2019', buildTextbookPaths('rj-chemistry-g12-selective-3-organic-2019')],
  ['rj-chemistry-grade8-54-2024-full', buildTextbookPaths('rj-chemistry-grade8-54-2024-full')]
]);

const candidateFiles = new Map([
  ['quizCandidate', { fileName: 'quiz-candidates.json', idField: 'candidateId' }],
  ['gameChallengeCandidate', { fileName: 'game-candidates.json', idField: 'candidateId' }],
  ['achievementCandidate', { fileName: 'achievement-candidates.json', idField: 'candidateId' }],
  ['learningPathCandidate', { fileName: 'learning-path-candidates.json', idField: 'candidateId' }],
  ['experimentCandidate', { fileName: 'experiment-candidates.json', idField: 'candidateId' }],
  ['curriculumTopic', { fileName: 'knowledge-topics.json', idField: 'topicId' }],
  ['labCandidate', { fileName: 'lab-candidates.json', idField: 'candidateId' }],
  ['storyCandidate', { fileName: 'story-candidates.json', idField: 'candidateId' }]
]);

const promotableReviewStatuses = new Set(['reviewed', 'promoted']);
const textbookIdPrefix = `${TEXTBOOK_RUNTIME_TARGET_MAP.namespaceRule.prefix}-`;
const supportedDestinations = new Map(
  TEXTBOOK_RUNTIME_TARGET_MAP.supportedDestinations.map((destination) => [destination.targetRuntimeFile, destination])
);
const supportedCandidateTypes = new Set(
  TEXTBOOK_RUNTIME_TARGET_MAP.supportedDestinations.map((destination) => destination.candidateType)
);
const unsupportedArtifactTypes = new Map(
  TEXTBOOK_RUNTIME_TARGET_MAP.unsupportedArtifactTypes.map((artifact) => [artifact.candidateType, artifact.classification])
);
const runtimeAdapters = new Map([
  ['src/data/quizData.json', adaptQuizRecord],
  ['src/data/contentMeta.js', adaptContentMetadataRecord],
  ['src/data/achievementsData.json', adaptAchievementRecord],
  ['src/data/learningPath.json', adaptLearningPathRecord],
  ['src/data/reactions.json', adaptReactionRecord]
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

  const selectedTextbooks = await selectTextbookIds(options);
  await validateReviewedManifests(options);
  const manifests = await loadSelectedManifests(selectedTextbooks, options);
  const unsupportedArtifacts = await collectUnsupportedArtifacts(selectedTextbooks);
  const plan = await buildPromotionPlan(manifests, options);
  validateStagedOutputs(plan);
  printPromotionPlan(plan, unsupportedArtifacts, options);

  if (!options.dryRun) {
    await writePromotionPlan(plan, options);
  }
}

function buildTextbookPaths(volumeId) {
  return {
    promotionManifestPath: path.join(reviewedRoot, volumeId, 'promotion-manifest.json'),
    generatedDraftRoot: path.join(generatedRoot, volumeId)
  };
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      textbook: { type: 'string' },
      topic: { type: 'string' },
      'all-reviewed': { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      json: { type: 'boolean' },
      'simulate-write-failure': { type: 'boolean' }
    },
    strict: true
  });

  if (values.textbook && values['all-reviewed']) {
    throw new Error('--textbook and --all-reviewed cannot be used together');
  }

  return {
    help: values.help === true,
    textbook: values.textbook ?? null,
    topic: values.topic ?? null,
    allReviewed: values['all-reviewed'] === true,
    dryRun: values['dry-run'] === true,
    json: values.json === true,
    simulateWriteFailure: values['simulate-write-failure'] === true
  };
}

function printHelp() {
  console.log(`Reviewed textbook promotion / 已审核教材推广器

Usage:
  node scripts/textbook/promote-topic.mjs --textbook <volumeId> [--topic <curriculumTagId>] [--dry-run]
  node scripts/textbook/promote-topic.mjs --all-reviewed [--dry-run]

Options:
  --textbook <volumeId>                Promote reviewed entries for one known textbook.
  --topic <curriculumTagId>            Limit promotion to one reviewed curriculum topic.
  --all-reviewed                       Promote every known reviewed manifest.
  --dry-run                            Print planned writes without mutating runtime or reviewed files.
  --json                               Also print a machine-readable promotion report.
  --simulate-write-failure             Validate and stage, then fail before writing for rollback QA.
  --help                               Show this help.`);
}

async function selectTextbookIds(options) {
  if (options.allReviewed) {
    return [...knownTextbookBatches.keys()].sort(compareText);
  }

  if (!options.textbook) {
    throw new Error('--textbook is required unless --all-reviewed is provided');
  }

  if (!knownTextbookBatches.has(options.textbook)) {
    throw new Error(`Unknown textbook batch: ${options.textbook}`);
  }

  return [options.textbook];
}

async function loadSelectedManifests(textbookIds, options) {
  const manifests = [];

  for (const textbookId of textbookIds) {
    const paths = knownTextbookBatches.get(textbookId);
    const manifest = await readJsonFile(paths.promotionManifestPath, 'reviewed promotion manifest');
    if (manifest.volumeId !== textbookId) {
      throw new Error(`reviewed promotion manifest volumeId mismatch: ${manifest.volumeId}`);
    }

    const entries = selectReviewedEntries(manifest, options);
    manifests.push({ textbookId, paths, manifest, entries });
  }

  return manifests;
}

async function validateReviewedManifests(options) {
  const validatorArgs = [path.join('scripts', 'textbook', 'validate-promotion-manifest.mjs')];
  if (options.allReviewed) {
    validatorArgs.push('--all-reviewed');
  } else {
    validatorArgs.push('--textbook', options.textbook);
  }

  try {
    await execFileAsync(process.execPath, validatorArgs, { cwd: projectRoot, windowsHide: true });
  } catch (error) {
    const output = [error.stdout, error.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`Reviewed promotion manifest validation failed before promotion${output ? `:\n${output}` : ''}`);
  }
}

function selectReviewedEntries(manifest, options) {
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.entries)) {
    throw new Error('reviewed promotion manifest must include entries');
  }

  return manifest.entries
    .filter((entry) => entry
      && typeof entry === 'object'
      && entry.promoteScope === 'topic'
      && promotableReviewStatuses.has(entry.reviewStatus)
      && (!options.topic || entry.curriculumTagId === options.topic))
    .sort(compareEntries);
}

async function buildPromotionPlan(manifests, options) {
  const stagedFiles = new Map();
  const summaries = [];
  const skipped = [];
  let selectedEntries = 0;

  for (const manifestContext of manifests) {
    selectedEntries += manifestContext.entries.length;
    const candidatesById = await loadApprovedCandidates(manifestContext.paths.generatedDraftRoot, manifestContext.entries, skipped);

    for (const entry of manifestContext.entries) {
      const targetRuntimeFile = entry.targetRuntimeFile;
      const adapter = runtimeAdapters.get(targetRuntimeFile);
      const candidate = candidatesById.get(entry.candidateId);
      const context = { ...manifestContext, candidate, options };

      if (!adapter) {
        skipped.push(skipRecord(entry, `unsupported target runtime file ${targetRuntimeFile}`));
        continue;
      }

      if (!supportedCandidateTypes.has(entry.candidateType)) {
        skipped.push(skipRecord(entry, `unsupported candidate type ${entry.candidateType}`));
        continue;
      }

      const destination = supportedDestinations.get(targetRuntimeFile);
      if (!destination || destination.candidateType !== entry.candidateType) {
        skipped.push(skipRecord(entry, `candidate type ${entry.candidateType} is not mapped to ${targetRuntimeFile}`));
        continue;
      }

      ensureEntryTargets(entry, targetRuntimeFile);
      const adapted = adapter(entry, candidate, context);
      if (adapted.skipReason) {
        skipped.push(skipRecord(entry, adapted.skipReason));
        continue;
      }

      const staged = await getStagedFile(stagedFiles, targetRuntimeFile);
      adapted.apply(staged);
      summaries.push({
        textbookId: manifestContext.textbookId,
        topicId: entry.topicId,
        entryId: entry.entryId,
        candidateId: entry.candidateId,
        candidateType: entry.candidateType,
        targetRuntimeFile,
        runtimeId: adapted.runtimeId
      });

      if (!options.dryRun && entry.reviewStatus !== 'promoted') {
        entry.reviewStatus = 'promoted';
        manifestContext.manifestChanged = true;
      }
    }
  }

  for (const staged of stagedFiles.values()) {
    finalizeStagedFile(staged);
  }

  for (const manifestContext of manifests) {
    if (manifestContext.manifestChanged) {
      stagedFiles.set(relativeProjectPath(manifestContext.paths.promotionManifestPath), {
        runtimePath: relativeProjectPath(manifestContext.paths.promotionManifestPath),
        kind: 'manifest',
        payload: manifestContext.manifest,
        originalText: await readFile(manifestContext.paths.promotionManifestPath, 'utf8'),
        nextText: `${JSON.stringify(manifestContext.manifest, null, 2)}\n`,
        plannedWrites: 1,
        existingRecords: manifestContext.manifest.entries.length,
        textbookRecords: 0,
        handAuthoredRecords: manifestContext.manifest.entries.length
      });
    }
  }

  if (selectedEntries === 0 && !options.allReviewed) {
    throw new Error(options.topic
      ? `No reviewed manifest entries target curriculumTagId ${options.topic}`
      : 'No reviewed manifest entries selected');
  }

  return { stagedFiles, summaries, skipped, selectedEntries, manifests };
}

async function loadApprovedCandidates(generatedDraftRoot, entries, skipped) {
  const candidatesById = new Map();
  const entriesByType = groupBy(entries, 'candidateType');

  for (const [candidateType, typedEntries] of entriesByType) {
    const candidateFile = candidateFiles.get(candidateType);
    if (!candidateFile) {
      for (const entry of typedEntries) {
        skipped.push(skipRecord(entry, `unsupported candidate type ${candidateType}`));
      }
      continue;
    }

    const candidatePath = path.join(generatedDraftRoot, candidateFile.fileName);
    const candidates = await readJsonFile(candidatePath, candidateFile.fileName);
    if (!Array.isArray(candidates)) {
      throw new Error(`${candidateFile.fileName} must be an array`);
    }

    const candidateById = new Map(candidates.map((item) => [item?.[candidateFile.idField], item]));
    for (const entry of typedEntries) {
      const candidate = candidateById.get(entry.candidateId);
      if (!candidate) {
        skipped.push(skipRecord(entry, `missing generated candidate ${entry.candidateId}`));
        continue;
      }

      candidatesById.set(entry.candidateId, candidate);
    }
  }

  return candidatesById;
}

async function collectUnsupportedArtifacts(textbookIds) {
  const artifacts = [];

  for (const textbookId of textbookIds) {
    const paths = knownTextbookBatches.get(textbookId);
    for (const [candidateType, reason] of unsupportedArtifactTypes) {
      const candidateFile = candidateFiles.get(candidateType);
      if (!candidateFile) {
        continue;
      }

      const candidatePath = path.join(paths.generatedDraftRoot, candidateFile.fileName);
      const candidates = await readOptionalJsonArray(candidatePath);
      if (candidates.length === 0) {
        continue;
      }

      artifacts.push({ textbookId, candidateType, count: candidates.length, reason });
    }
  }

  return artifacts.sort((left, right) => compareText(`${left.textbookId}:${left.candidateType}`, `${right.textbookId}:${right.candidateType}`));
}

function adaptQuizRecord(entry, candidate, context) {
  const runtimeId = runtimeIdForEntry(entry, context.textbookId);
  if (!hasText(candidate?.prompt) || !hasText(candidate?.answer)) {
    return { skipReason: 'quiz candidate is missing prompt or answer' };
  }

  return {
    runtimeId,
    apply(staged) {
      const quizData = requireArray(staged.payload.quizData, staged.runtimePath, 'quizData');
      upsertTextbookRecord(quizData, {
        id: runtimeId,
        question: candidate.prompt,
        options: [candidate.answer],
        correctIndex: 0,
        category: candidate.questionType || 'textbook-reviewed',
        relatedElement: null,
        explanation: candidate.answer,
        curriculumTags: [entry.curriculumTagId],
        difficulty: difficultyForSource(entry),
        sourceVolumeId: entry.sourceVolumeId,
        sourceReviewStatus: 'reviewed',
        sourceReferences: buildReviewedSourceReferences(entry, candidate)
      });
      staged.plannedWrites += 1;
    }
  };
}

function adaptContentMetadataRecord(entry, candidate, context) {
  const runtimeId = runtimeIdForEntry(entry, context.textbookId);
  if (!hasText(candidate?.title) || !hasText(candidate?.summary)) {
    return { skipReason: 'game challenge candidate is missing title or summary' };
  }

  return {
    runtimeId,
    apply(staged) {
      const records = staged.contentMetaTextbookRecords;
      upsertTextbookRecord(records, {
        id: runtimeId,
        challengeId: runtimeId,
        title: candidate.title,
        summary: candidate.summary,
        curriculumTags: [entry.curriculumTagId],
        challengeGoals: [
          { id: `${runtimeId}-review`, label: candidate.title, target: 1, metric: 'reviewedTextbookTopic' }
        ],
        scoringThresholds: { s: 1, a: 1, b: 1 },
        unlockMetadata: { stageIds: [], requiresTags: [entry.curriculumTagId], minimumLearnedElements: 0 },
        sourceVolumeId: entry.sourceVolumeId,
        sourceReviewStatus: 'reviewed',
        sourceReferences: buildReviewedSourceReferences(entry, candidate)
      });
      staged.plannedWrites += 1;
    }
  };
}

function adaptAchievementRecord(entry, candidate, context) {
  const runtimeId = runtimeIdForEntry(entry, context.textbookId);
  if (!hasText(candidate?.title) || !hasText(candidate?.summary)) {
    return { skipReason: 'achievement candidate is missing title or summary' };
  }

  return {
    runtimeId,
    apply(staged) {
      const achievementsData = requireArray(staged.payload.achievementsData, staged.runtimePath, 'achievementsData');
      upsertTextbookRecord(achievementsData, {
        id: runtimeId,
        category: 'learning',
        title: candidate.title,
        description: candidate.summary,
        unlockText: candidate.triggerDraft || '完成已审核教材主题学习',
        icon: '📚',
        rarity: 'common',
        condition: { type: 'manualReviewAfterPromotion', count: 1 },
        curriculumTags: [entry.curriculumTagId],
        difficulty: difficultyForSource(entry),
        sourceVolumeId: entry.sourceVolumeId,
        sourceReviewStatus: 'reviewed',
        sourceReferences: buildReviewedSourceReferences(entry, candidate)
      });
      staged.plannedWrites += 1;
    }
  };
}

function adaptLearningPathRecord(entry, candidate, context) {
  const runtimeId = runtimeIdForEntry(entry, context.textbookId);
  if (!hasText(candidate?.title) || !hasText(candidate?.summary) || !Number.isInteger(candidate?.sequenceIndex)) {
    return { skipReason: 'learning path candidate is missing title, summary, or sequenceIndex' };
  }

  return {
    runtimeId,
    apply(staged) {
      const stages = requireArray(staged.payload.learningPath?.stages, staged.runtimePath, 'learningPath.stages');
      upsertTextbookRecord(stages, {
        id: runtimeId,
        name: candidate.title,
        description: candidate.summary,
        requiredCount: Math.max(0, Number(candidate.sequenceIndex)),
        focusElements: [],
        unlockedGames: [],
        unlockedExperiments: [],
        unlockedFeatures: [],
        curriculumTags: [entry.curriculumTagId],
        difficulty: difficultyForSource(entry),
        sourceVolumeId: entry.sourceVolumeId,
        sourceReviewStatus: 'reviewed',
        sourceReferences: buildReviewedSourceReferences(entry, candidate)
      });
      staged.plannedWrites += 1;
    }
  };
}

function adaptReactionRecord(entry, candidate, context) {
  const runtimeId = runtimeIdForEntry(entry, context.textbookId);
  if (!hasText(candidate?.title) || !hasText(candidate?.summary)) {
    return { skipReason: 'reaction candidate is missing title or summary' };
  }

  return {
    runtimeId,
    apply(staged) {
      const reactions = requireArray(staged.payload.reactions, staged.runtimePath, 'reactions');
      upsertTextbookRecord(reactions, {
        id: runtimeId,
        name: candidate.title,
        description: candidate.summary,
        reactants: [],
        products: [],
        experimentId: `${runtimeId}-experiment`,
        safetyLevel: safetyLevelForCandidate(candidate),
        visualDescription: candidate.observations?.[0] || candidate.summary,
        steps: normalizeArray(candidate.observations).length > 0 ? normalizeArray(candidate.observations) : [candidate.summary],
        safetyNotes: normalizeArray(candidate.safetyNotes),
        curriculumTags: [entry.curriculumTagId],
        difficulty: difficultyForSource(entry),
        unlockRequirements: {
          curriculumTags: [entry.curriculumTagId],
          safetyLevels: [safetyLevelForCandidate(candidate)],
          stageIds: [],
          minimumLearnedElements: 0,
          grade: gradeForSource(entry),
          chapter: entry.sourceHeading
        },
        sourceVolumeId: entry.sourceVolumeId,
        sourceReviewStatus: 'reviewed',
        sourceReferences: buildReviewedSourceReferences(entry, candidate)
      });
      staged.plannedWrites += 1;
    }
  };
}

async function getStagedFile(stagedFiles, runtimePath) {
  if (stagedFiles.has(runtimePath)) {
    return stagedFiles.get(runtimePath);
  }

  const filePath = projectPath(runtimePath);
  const originalText = await readFile(filePath, 'utf8');
  const staged = {
    runtimePath,
    originalText,
    plannedWrites: 0,
    existingRecords: 0,
    handAuthoredRecords: 0,
    textbookRecords: 0
  };

  if (runtimePath === 'src/data/contentMeta.js') {
    staged.kind = 'contentMeta';
    staged.contentMetaTextbookRecords = parseTextbookChallengeMetadata(originalText);
    staged.existingRecords = staged.contentMetaTextbookRecords.length;
    staged.textbookRecords = staged.contentMetaTextbookRecords.filter((record) => isTextbookId(record?.id)).length;
    staged.handAuthoredRecords = 0;
  } else {
    staged.kind = 'json';
    staged.payload = JSON.parse(originalText);
    const records = recordsForJsonRuntimePath(staged.payload, runtimePath);
    staged.existingRecords = records.length;
    staged.textbookRecords = records.filter((record) => isTextbookId(record?.id)).length;
    staged.handAuthoredRecords = staged.existingRecords - staged.textbookRecords;
  }

  stagedFiles.set(runtimePath, staged);
  return staged;
}

function finalizeStagedFile(staged) {
  if (staged.kind === 'contentMeta') {
    staged.contentMetaTextbookRecords = sortTextbookRecords(staged.contentMetaTextbookRecords);
    staged.nextText = replaceTextbookChallengeMetadata(staged.originalText, staged.contentMetaTextbookRecords);
    staged.textbookRecordsAfter = staged.contentMetaTextbookRecords.length;
    return;
  }

  if (staged.kind === 'json') {
    const records = recordsForJsonRuntimePath(staged.payload, staged.runtimePath);
    sortRuntimeRecords(records);
    staged.nextText = `${JSON.stringify(staged.payload, null, 2)}\n`;
    staged.textbookRecordsAfter = records.filter((record) => isTextbookId(record?.id)).length;
  }

  if (staged.kind === 'manifest') {
    staged.nextText = `${JSON.stringify(staged.payload, null, 2)}\n`;
    staged.textbookRecordsAfter = staged.textbookRecords;
  }
}

function validateStagedOutputs(plan) {
  const runtimeIds = new Map();
  for (const staged of sortedStagedFiles(plan)) {
    if (!hasText(staged.nextText)) {
      throw new Error(`Staged output ${staged.runtimePath} was not finalized before validation`);
    }

    const records = staged.kind === 'contentMeta'
      ? parseTextbookChallengeMetadata(staged.nextText)
      : staged.kind === 'manifest'
        ? validateStagedManifest(staged)
        : recordsForJsonRuntimePath(JSON.parse(staged.nextText), staged.runtimePath);

    const ids = new Set();
    for (const record of records) {
      if (!record || typeof record !== 'object' || Array.isArray(record) || !hasText(record.id)) {
        throw new Error(`Staged output ${staged.runtimePath} contains a record without a stable id`);
      }

      if (ids.has(record.id)) {
        throw new Error(`Staged output ${staged.runtimePath} contains duplicate id ${record.id}`);
      }
      ids.add(record.id);

      if (isTextbookId(record.id)) {
        const previousPath = runtimeIds.get(record.id);
        if (previousPath) {
          throw new Error(`Textbook runtime id ${record.id} appears in both ${previousPath} and ${staged.runtimePath}`);
        }
        runtimeIds.set(record.id, staged.runtimePath);
      }
    }
  }
}

function validateStagedManifest(staged) {
  const manifest = JSON.parse(staged.nextText);
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.entries)) {
    throw new Error(`Staged manifest ${staged.runtimePath} must include entries array`);
  }
  return [];
}

async function writePromotionPlan(plan, options) {
  const stagedFiles = sortedStagedFiles(plan);

  if (options.simulateWriteFailure) {
    throw new Error('--simulate-write-failure requested after staged-output validation; no runtime files were written');
  }

  const written = [];
  try {
    for (const staged of stagedFiles) {
      if (staged.nextText === staged.originalText) {
        continue;
      }

      await writeFile(projectPath(staged.runtimePath), staged.nextText, 'utf8');
      written.push(staged);
    }
  } catch (error) {
    for (const staged of written.reverse()) {
      await writeFile(projectPath(staged.runtimePath), staged.originalText, 'utf8');
    }
    throw new Error(`Promotion write failed and written files were restored: ${error.message}`);
  }
}

function sortedStagedFiles(plan) {
  return [...plan.stagedFiles.values()].sort((left, right) => compareText(left.runtimePath, right.runtimePath));
}

function recordsForJsonRuntimePath(payload, runtimePath) {
  if (runtimePath === 'src/data/quizData.json') {
    return requireArray(payload.quizData, runtimePath, 'quizData');
  }
  if (runtimePath === 'src/data/achievementsData.json') {
    return requireArray(payload.achievementsData, runtimePath, 'achievementsData');
  }
  if (runtimePath === 'src/data/learningPath.json') {
    return requireArray(payload.learningPath?.stages, runtimePath, 'learningPath.stages');
  }
  if (runtimePath === 'src/data/reactions.json') {
    return requireArray(payload.reactions, runtimePath, 'reactions');
  }

  throw new Error(`Unsupported JSON runtime path ${runtimePath}`);
}

function upsertTextbookRecord(target, record) {
  if (!isTextbookId(record.id)) {
    throw new Error(`Refusing to upsert non-textbook runtime id ${record.id}`);
  }

  const index = target.findIndex((item) => item?.id === record.id);
  if (index === -1) {
    target.push(record);
    return;
  }

  if (!isTextbookId(target[index]?.id)) {
    throw new Error(`Refusing to overwrite hand-authored runtime id ${record.id}`);
  }

  target[index] = record;
}

function sortRuntimeRecords(records) {
  const handAuthored = records.filter((record) => !isTextbookId(record?.id));
  const textbook = sortTextbookRecords(records.filter((record) => isTextbookId(record?.id)));
  records.splice(0, records.length, ...handAuthored, ...textbook);
}

function sortTextbookRecords(records) {
  return [...records].sort((left, right) => compareText(left.id, right.id));
}

function parseTextbookChallengeMetadata(source) {
  const match = source.match(/export const TEXTBOOK_CHALLENGE_METADATA = (\[[\s\S]*?\n\]);/);
  if (!match) {
    return [];
  }

  const jsonSource = match[1]
    .replace(/'/g, '"')
    .replace(/,\s*]/g, ']')
    .replace(/,\s*}/g, '}');
  return JSON.parse(jsonSource);
}

function replaceTextbookChallengeMetadata(source, records) {
  const formatted = `export const TEXTBOOK_CHALLENGE_METADATA = ${JSON.stringify(records, null, 2)};`;
  if (/export const TEXTBOOK_CHALLENGE_METADATA = [\s\S]*?\n\];/.test(source)) {
    return source.replace(/export const TEXTBOOK_CHALLENGE_METADATA = [\s\S]*?\n\];/, formatted);
  }

  const insertionPoint = source.indexOf('export const GAME_LABELS =');
  if (insertionPoint === -1) {
    throw new Error('Cannot find insertion point for TEXTBOOK_CHALLENGE_METADATA in src/data/contentMeta.js');
  }

  return `${source.slice(0, insertionPoint)}${formatted}\n\n${source.slice(insertionPoint)}`;
}

function buildReviewedSourceReferences(entry, candidate) {
  const assetReferences = normalizeArray(candidate?.assets)
    .filter((asset) => hasText(asset.assetId))
    .map((asset) => ({
      assetId: asset.assetId,
      sourceLineNumber: Number.isInteger(asset.sourceLineNumber) ? asset.sourceLineNumber : undefined
    }));

  return [stripUndefined({
    sourceVolumeId: entry.sourceVolumeId,
    volumeId: entry.sourceVolumeId,
    sourcePath: entry.sourcePath,
    sourceHeading: entry.sourceHeading,
    lineRange: `${entry.sourceLineStart}-${entry.sourceLineEnd}`,
    sourceHash: entry.sourceHash,
    candidateId: entry.candidateId,
    reviewedBy: entry.reviewedBy,
    reviewedAt: entry.reviewedAt,
    assetReferences: assetReferences.length > 0 ? assetReferences : undefined,
    note: `Reviewed promotion manifest entry ${entry.entryId}`
  })];
}

function ensureEntryTargets(entry, runtimePath) {
  if (entry.targetRuntimeFile !== runtimePath || !normalizeArray(entry.targetRuntimeFiles).includes(runtimePath)) {
    throw new Error(`Reviewed entry ${entry.entryId} is not approved for ${runtimePath}`);
  }
}

function runtimeIdForEntry(entry, textbookId) {
  const runtimeId = hasText(entry.runtimeId)
    ? entry.runtimeId
    : `${TEXTBOOK_RUNTIME_TARGET_MAP.namespaceRule.prefix}-${textbookId}-${entry.topicId}-${entry.entryId}`;

  if (!isTextbookId(runtimeId) || !runtimeId.includes(textbookId) || !runtimeId.includes(entry.topicId) || !runtimeId.includes(entry.entryId)) {
    throw new Error(`Reviewed entry ${entry.entryId} has invalid textbook runtime id ${runtimeId}`);
  }

  return runtimeId;
}

function safetyLevelForCandidate(candidate) {
  const hazard = String(candidate?.hazardLevel || '').toLowerCase();
  if (hazard === 'high') return 'dangerous';
  if (hazard === 'medium') return 'caution';
  if (hazard === 'low') return 'safe';
  return 'caution';
}

function difficultyForSource(entry) {
  if (entry.sourceVolumeId.includes('g12')) return '高中基础';
  if (entry.sourceVolumeId.includes('grade9')) return '初中';
  if (entry.sourceVolumeId.includes('grade8')) return '入门';
  return '初中';
}

function gradeForSource(entry) {
  if (entry.sourceVolumeId.includes('g12')) return '高三';
  if (entry.sourceVolumeId.includes('grade9')) return '九年级';
  if (entry.sourceVolumeId.includes('grade8')) return '八年级';
  return '';
}

function printPromotionPlan(plan, unsupportedArtifacts, options) {
  const mode = options.dryRun ? 'dry-run' : 'write';
  console.log(`Textbook promotion: ${mode}`);
  console.log(`selected reviewed entries: ${plan.selectedEntries}`);
  console.log(`planned promoted records: ${plan.summaries.length}`);
  console.log(`skipped reviewed entries: ${plan.skipped.length}`);

  for (const staged of [...plan.stagedFiles.values()].sort((left, right) => compareText(left.runtimePath, right.runtimePath))) {
    const changed = staged.nextText !== staged.originalText;
    console.log(`planned write: ${staged.runtimePath} records=${staged.plannedWrites} existing=${staged.existingRecords} preserved=${staged.handAuthoredRecords} textbookBefore=${staged.textbookRecords} textbookAfter=${staged.textbookRecordsAfter ?? staged.textbookRecords} changed=${changed}`);
  }

  for (const [targetRuntimeFile, rows] of groupBy(plan.summaries, 'targetRuntimeFile')) {
    console.log(`destination ${targetRuntimeFile}: ${rows.length} reviewed records`);
  }

  for (const skipped of plan.skipped.slice(0, 50)) {
    console.log(`skipped reviewed: ${skipped.textbookId}/${skipped.entryId} ${skipped.candidateType} -> ${skipped.reason}`);
  }
  if (plan.skipped.length > 50) {
    console.log(`skipped reviewed: ${plan.skipped.length - 50} more entries omitted from console detail`);
  }

  for (const artifact of unsupportedArtifacts) {
    console.log(`unsupported generated: ${artifact.textbookId}/${artifact.candidateType} count=${artifact.count} reason=${artifact.reason}`);
  }

  if (options.dryRun) {
    console.log('dry-run: no runtime or reviewed manifest files written');
  }

  if (options.json) {
    console.log(`PROMOTION_REPORT_JSON ${JSON.stringify(buildPromotionReport(plan, unsupportedArtifacts, options))}`);
  }
}

function buildPromotionReport(plan, unsupportedArtifacts, options) {
  const destinations = {};
  const textbooks = {};
  const changedFiles = [];

  for (const staged of sortedStagedFiles(plan)) {
    const destination = getCountBucket(destinations, staged.runtimePath);
    destination.changed = staged.nextText !== staged.originalText;
    destination.plannedWrites = staged.plannedWrites;
    destination.existingRecords = staged.existingRecords;
    destination.textbookRecordsBefore = staged.textbookRecords;
    destination.textbookRecordsAfter = staged.textbookRecordsAfter ?? staged.textbookRecords;
    if (staged.nextText !== staged.originalText) {
      changedFiles.push(staged.runtimePath);
    }
  }

  for (const manifestContext of plan.manifests) {
    getCountBucket(textbooks, manifestContext.textbookId).selected += manifestContext.entries.length;
  }

  for (const summary of plan.summaries) {
    const textbook = getCountBucket(textbooks, summary.textbookId);
    const destination = getCountBucket(destinations, summary.targetRuntimeFile);
    textbook.promoted += 1;
    destination.promoted += 1;
    getCountBucket(textbook.destinations, summary.targetRuntimeFile).promoted += 1;
    getCountBucket(destination.textbooks, summary.textbookId).promoted += 1;
  }

  for (const skipped of plan.skipped) {
    const textbook = getCountBucket(textbooks, skipped.textbookId);
    const destination = getCountBucket(destinations, skipped.targetRuntimeFile || '<unknown>');
    textbook.skipped += 1;
    destination.skipped += 1;
    getCountBucket(textbook.destinations, skipped.targetRuntimeFile || '<unknown>').skipped += 1;
    getCountBucket(destination.textbooks, skipped.textbookId).skipped += 1;
  }

  for (const artifact of unsupportedArtifacts) {
    const textbook = getCountBucket(textbooks, artifact.textbookId);
    textbook.blocked += artifact.count;
    getCountBucket(textbook.destinations, 'unsupported-generated').blocked += artifact.count;
  }

  return {
    schemaVersion: 1,
    mode: options.dryRun ? 'dry-run' : 'write',
    selectedReviewedEntries: plan.selectedEntries,
    totals: {
      promoted: plan.summaries.length,
      skipped: plan.skipped.length,
      blocked: unsupportedArtifacts.reduce((total, artifact) => total + artifact.count, 0),
      changedFiles: changedFiles.length
    },
    changedFiles,
    textbooks: sortObject(textbooks),
    destinations: sortObject(destinations)
  };
}

function getCountBucket(container, key) {
  if (!container[key]) {
    container[key] = ensureCountBucket();
  }
  return container[key];
}

function ensureCountBucket(bucket) {
  if (!bucket) {
    return {
      selected: 0,
      promoted: 0,
      skipped: 0,
      blocked: 0,
      destinations: {},
      textbooks: {}
    };
  }
  return bucket;
}

function sortObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  return Object.fromEntries(Object.entries(value)
    .sort(([left], [right]) => compareText(left, right))
    .map(([key, item]) => [key, sortObject(item)]));
}

function skipRecord(entry, reason) {
  return {
    textbookId: entry.sourceVolumeId,
    entryId: entry.entryId,
    candidateId: entry.candidateId,
    candidateType: entry.candidateType,
    targetRuntimeFile: entry.targetRuntimeFile,
    reason
  };
}

function groupBy(items, field) {
  const groups = new Map();
  for (const item of items) {
    const key = item?.[field];
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  }
  return groups;
}

function compareEntries(left, right) {
  return compareText([
    left.targetRuntimeFile,
    left.sourceVolumeId,
    left.topicId,
    left.entryId,
    left.candidateId
  ].join(':'), [
    right.targetRuntimeFile,
    right.sourceVolumeId,
    right.topicId,
    right.entryId,
    right.candidateId
  ].join(':'));
}

function compareText(left, right) {
  return String(left).localeCompare(String(right));
}

function requireArray(value, runtimePath, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`${runtimePath} must include ${fieldName} array`);
  }
  return value;
}

function isTextbookId(value) {
  return hasText(value) && value.startsWith(textbookIdPrefix);
}

async function readJsonFile(filePath, label) {
  try {
    const source = await readFile(filePath, 'utf8');
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${label} cannot be read or parsed: ${error.message}`);
  }
}

async function readOptionalJsonArray(filePath) {
  try {
    const value = await readJsonFile(filePath, relativeProjectPath(filePath));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function projectPath(relativePath) {
  return path.join(projectRoot, ...relativePath.split('/'));
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
