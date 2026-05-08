import { readFile, writeFile } from 'node:fs/promises';
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
  ]
]);

function buildTextbookPaths(volumeId) {
  return {
    promotionManifestPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'reviewed', volumeId, 'promotion-manifest.json'),
    generatedDraftRoot: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', volumeId)
  };
}

const candidateFiles = new Map([
  ['quizCandidate', { fileName: 'quiz-candidates.json', idField: 'candidateId' }],
  ['gameChallengeCandidate', { fileName: 'game-candidates.json', idField: 'candidateId' }],
  ['achievementCandidate', { fileName: 'achievement-candidates.json', idField: 'candidateId' }],
  ['learningPathCandidate', { fileName: 'learning-path-candidates.json', idField: 'candidateId' }]
]);
const promotableReviewStatuses = new Set(['reviewed', 'promoted']);

const allowedTargetFiles = new Set([
  'src/data/quizData.json',
  'src/data/contentMeta.js',
  'src/data/achievementsData.json',
  'src/data/learningPath.json'
]);

const reviewedSourceVolumeIdByIngestionVolumeId = new Map([
  ['rj-chemistry-grade9-2024-vol1', 'pep-chemistry-g9-2024']
]);

const pilotTopicAdapters = new Map([
  [
    'g9-carbon-allotropes-comparison',
    {
      quiz: promoteCarbonAllotropeQuiz,
      gameChallenge: promoteCarbonAllotropeGameChallenge,
      achievement: promoteCarbonAllotropeAchievement,
      learningPath: promoteCarbonAllotropeLearningPath
    }
  ]
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

  if (!options.textbook) {
    throw new Error('--textbook is required');
  }

  if (!options.topic) {
    throw new Error('--topic is required');
  }

  const paths = knownTextbookBatches.get(options.textbook);
  if (!paths) {
    throw new Error(`Unknown textbook batch: ${options.textbook}`);
  }

  const manifest = await readJsonFile(paths.promotionManifestPath, 'reviewed promotion manifest');
  const entries = selectReviewedTopicEntries(manifest, options);

  if (entries.length === 0) {
    blockPromotion(`No reviewed manifest entries target curriculumTagId ${options.topic}`);
  }

  const adapter = pilotTopicAdapters.get(options.topic);
  if (!adapter) {
    blockPromotion(`No runtime adapter is registered for curriculumTagId ${options.topic}`);
  }

  validateManifestEntries(entries, options.topic);
  const candidatesById = await loadApprovedCandidates(paths.generatedDraftRoot, entries);
  const context = { textbook: options.textbook, topic: options.topic, entries, candidatesById };
  const promotedFiles = [];
  let manifestChanged = false;

  for (const entry of entries.sort((left, right) => left.entryId.localeCompare(right.entryId))) {
    const promoteSurface = adapter[entry.surface];
    if (!promoteSurface) {
      blockPromotion(`No runtime adapter for reviewed surface ${entry.surface}`);
    }

    const changedFile = await promoteSurface(entry, context);
    promotedFiles.push(changedFile);
    if (entry.reviewStatus !== 'promoted') {
      entry.reviewStatus = 'promoted';
      manifestChanged = true;
    }
  }

  if (manifestChanged) {
    await writeJsonFile(paths.promotionManifestPath, manifest);
    promotedFiles.push(relativeProjectPath(paths.promotionManifestPath));
  }

  console.log(`Textbook topic promoted: ${options.textbook} / ${options.topic}`);
  for (const filePath of [...new Set(promotedFiles)].sort()) {
    console.log(`updated: ${filePath}`);
  }
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      textbook: { type: 'string' },
      topic: { type: 'string' }
    },
    strict: true
  });

  return {
    help: values.help === true,
    textbook: values.textbook ?? null,
    topic: values.topic ?? null
  };
}

function printHelp() {
  console.log(`Reviewed textbook topic promotion / 已审核教材主题推广器

Usage:
  node scripts/textbook/promote-topic.mjs --textbook <volumeId> --topic <curriculumTagId>

Options:
  --textbook <volumeId>                Promote reviewed topic entries for a known textbook.
  --topic <curriculumTagId>            Promote one reviewed curriculum topic only.
  --help                               Show this help.`);
}

function selectReviewedTopicEntries(manifest, options) {
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.entries)) {
    throw new Error('reviewed promotion manifest must include entries');
  }

  if (manifest.volumeId !== options.textbook) {
    throw new Error(`reviewed promotion manifest volumeId mismatch: ${manifest.volumeId}`);
  }

  return manifest.entries.filter((entry) =>
    entry
    && typeof entry === 'object'
    && entry.promoteScope === 'topic'
    && entry.curriculumTagId === options.topic
    && promotableReviewStatuses.has(entry.reviewStatus)
  );
}

function validateManifestEntries(entries, topic) {
  for (const entry of entries) {
    if (entry.topicId !== topic) {
      blockPromotion(`Reviewed entry ${entry.entryId} topicId does not match curriculumTagId ${topic}`);
    }

    if (!candidateFiles.has(entry.candidateType)) {
      blockPromotion(`Reviewed entry ${entry.entryId} has unsupported candidateType ${entry.candidateType}`);
    }

    const targets = normalizeArray(entry.targetRuntimeFiles);
    if (targets.length === 0 || !targets.includes(entry.targetRuntimeFile)) {
      blockPromotion(`Reviewed entry ${entry.entryId} must list explicit targetRuntimeFiles`);
    }

    for (const targetRuntimeFile of targets) {
      if (!allowedTargetFiles.has(targetRuntimeFile)) {
        blockPromotion(`Reviewed entry ${entry.entryId} targets unapproved runtime file ${targetRuntimeFile}`);
      }
    }

    if (!hasText(entry.reviewedBy) || !hasText(entry.reviewedAt)) {
      blockPromotion(`Reviewed entry ${entry.entryId} is missing reviewer metadata`);
    }
  }
}

async function loadApprovedCandidates(generatedDraftRoot, entries) {
  const candidatesById = new Map();

  for (const entry of entries) {
    const candidateFile = candidateFiles.get(entry.candidateType);
    const candidatePath = path.join(generatedDraftRoot, candidateFile.fileName);
    const candidates = await readJsonFile(candidatePath, candidateFile.fileName);
    if (!Array.isArray(candidates)) {
      throw new Error(`${candidateFile.fileName} must be an array`);
    }

    const candidate = candidates.find((item) => item?.[candidateFile.idField] === entry.candidateId);
    if (!candidate) {
      blockPromotion(`Reviewed entry ${entry.entryId} references missing candidate ${entry.candidateId}`);
    }

    candidatesById.set(entry.candidateId, candidate);
  }

  return candidatesById;
}

async function promoteCarbonAllotropeQuiz(entry, context) {
  const runtimePath = 'src/data/quizData.json';
  ensureEntryTargets(entry, runtimePath);
  const filePath = projectPath(runtimePath);
  const payload = await readJsonFile(filePath, runtimePath);
  const quizData = Array.isArray(payload.quizData) ? payload.quizData : null;
  if (!quizData) {
    throw new Error(`${runtimePath} must include quizData array`);
  }

  const sourceReferences = buildReviewedSourceReferences(entry, context.candidatesById.get(entry.candidateId), context.topic);
  const records = [
    {
      id: 'quiz-carbon-allotropes-comparison-1',
      question: '金刚石和石墨都是由碳元素组成的单质，物理性质差异明显的主要原因是什么？',
      options: ['碳原子排列方式不同', '构成原子的种类不同', '都含有金属元素', '都能溶于水'],
      correctIndex: 0,
      category: 'comparison-topic',
      relatedElement: 6,
      explanation: '同为碳单质时，结构中碳原子的排列方式不同，会让金刚石和石墨表现出不同的物理性质。',
      curriculumTags: [context.topic],
      difficulty: '初中',
      sourceVolumeId: entry.sourceVolumeId,
      sourceReviewStatus: 'reviewed',
      sourceReferences
    },
    {
      id: 'quiz-carbon-allotropes-comparison-2',
      question: '把石墨电极或 6B 铅笔芯接入电路时，灯泡发光说明石墨具有什么性质？',
      options: ['导电性', '强氧化性', '挥发性', '可溶性'],
      correctIndex: 0,
      category: 'comparison-topic',
      relatedElement: 6,
      explanation: '石墨能让电路中的灯泡发光，说明石墨具有导电性，这也是它能用作电极材料的原因之一。',
      curriculumTags: [context.topic],
      difficulty: '初中',
      sourceVolumeId: entry.sourceVolumeId,
      sourceReviewStatus: 'reviewed',
      sourceReferences
    },
    {
      id: 'quiz-carbon-allotropes-comparison-3',
      question: '金刚石、石墨和 C60 之间的共同点是什么？',
      options: ['都属于碳的单质', '都属于金属', '都属于盐类', '都属于氧化物'],
      correctIndex: 0,
      category: 'comparison-topic',
      relatedElement: 6,
      explanation: '金刚石、石墨和 C60 都由碳元素组成，属于碳的不同单质形态。',
      curriculumTags: [context.topic],
      difficulty: '初中',
      sourceVolumeId: entry.sourceVolumeId,
      sourceReviewStatus: 'reviewed',
      sourceReferences,
      formulaText: 'C60',
      notationReviewStatus: 'reviewed'
    }
  ];

  upsertById(quizData, records);
  await writeJsonFile(filePath, payload);
  return runtimePath;
}

async function promoteCarbonAllotropeGameChallenge(entry, context) {
  const runtimePath = 'src/data/contentMeta.js';
  ensureEntryTargets(entry, runtimePath);
  const filePath = projectPath(runtimePath);
  const source = await readFile(filePath, 'utf8');
  const sourceReferences = buildReviewedSourceReferences(entry, context.candidatesById.get(entry.candidateId), context.topic);
  const replacement = formatJsObject({
    challengeId: 'challenge-carbon-allotropes-comparison',
    curriculumTags: [context.topic],
    challengeGoals: [
      { id: 'complete-comparison-quiz-set', label: '完成碳单质比较主题测验记录', target: 3, metric: 'comparisonQuestionIds' },
      { id: 'recognize-graphite-conductivity', label: '识别石墨导电性与用途之间的关系', target: 1, metric: 'reviewedGraphiteProperty' }
    ],
    scoringThresholds: { s: 90, a: 60, b: 30 },
    unlockMetadata: { stageIds: ['stage-3'], requiresTags: ['intro-element-symbols', context.topic], minimumLearnedElements: 50 },
    sourceVolumeId: entry.sourceVolumeId,
    sourceReviewStatus: 'reviewed',
    sourceReferences
  }, 6);

  const updatedSource = replaceObjectProperty(source, 'comparisonChallengeMetadata', replacement);
  await writeFile(filePath, updatedSource, 'utf8');
  return runtimePath;
}

async function promoteCarbonAllotropeLearningPath(entry, context) {
  const runtimePath = 'src/data/learningPath.json';
  ensureEntryTargets(entry, runtimePath);
  const filePath = projectPath(runtimePath);
  const payload = await readJsonFile(filePath, runtimePath);
  const stages = Array.isArray(payload.learningPath?.stages) ? payload.learningPath.stages : null;
  if (!stages) {
    throw new Error(`${runtimePath} must include learningPath.stages array`);
  }

  const sourceReferences = buildReviewedSourceReferences(entry, context.candidatesById.get(entry.candidateId), context.topic);
  upsertById(stages, [
    {
      id: 'relation-carbon-allotropes-comparison',
      name: '碳单质比较进度',
      description: '通过金刚石、石墨与 C60 的比较，建立碳单质结构与性质的联系。',
      requiredCount: 50,
      focusElements: [6],
      unlockedGames: ['game-collector'],
      unlockedExperiments: ['exp-salt-formation'],
      unlockedFeatures: ['compare-view'],
      curriculumTags: [context.topic],
      difficulty: '初中',
      sourceVolumeId: entry.sourceVolumeId,
      sourceReviewStatus: 'reviewed',
      sourceReferences
    }
  ]);

  await writeJsonFile(filePath, payload);
  return runtimePath;
}

async function promoteCarbonAllotropeAchievement(entry, context) {
  const runtimePath = 'src/data/achievementsData.json';
  ensureEntryTargets(entry, runtimePath);
  const filePath = projectPath(runtimePath);
  const payload = await readJsonFile(filePath, runtimePath);
  const achievementsData = Array.isArray(payload.achievementsData) ? payload.achievementsData : null;
  if (!achievementsData) {
    throw new Error(`${runtimePath} must include achievementsData array`);
  }

  const sourceReferences = buildReviewedSourceReferences(entry, context.candidatesById.get(entry.candidateId), context.topic);
  upsertById(achievementsData, [
    {
      id: 'achievement-carbon-allotrope-comparison',
      category: 'quiz',
      title: '碳单质比较家',
      description: '完成金刚石、石墨与 C60 的比较主题学习，能说出结构、性质与用途之间的联系。',
      unlockText: '完成碳单质比较主题测验',
      icon: '💎',
      rarity: 'rare',
      condition: {
        type: 'curriculumQuizComplete',
        curriculumTagId: context.topic,
        count: 3
      },
      curriculumTags: [context.topic],
      difficulty: '初中',
      sourceVolumeId: entry.sourceVolumeId,
      sourceReviewStatus: 'reviewed',
      sourceReferences
    }
  ]);

  await writeJsonFile(filePath, payload);
  return runtimePath;
}

function buildReviewedSourceReferences(entry, candidate, topic) {
  const assetReferences = normalizeArray(candidate?.assets)
    .filter((asset) => hasText(asset.assetId))
    .map((asset) => ({
      assetId: asset.assetId,
      sourceLineNumber: asset.sourceLineNumber
    }));
  const reviewedVolumeId = reviewedSourceVolumeIdByIngestionVolumeId.get(entry.sourceVolumeId) ?? entry.sourceVolumeId;

  if (topic === 'g9-carbon-allotropes-comparison') {
    return buildComparisonReviewedSourceReferences(entry, assetReferences, reviewedVolumeId);
  }

  return [
    {
      sourceVolumeId: entry.sourceVolumeId,
      volumeId: reviewedVolumeId,
      sourcePath: entry.sourcePath,
      sourceHeading: entry.sourceHeading,
      lineRange: `${entry.sourceLineStart}-${entry.sourceLineEnd}`,
      sourceHash: entry.sourceHash,
      candidateId: entry.candidateId,
      reviewedBy: entry.reviewedBy,
      reviewedAt: entry.reviewedAt,
      assetReferences,
      note: `Reviewed promotion manifest entry ${entry.entryId}`
    }
  ];
}

function buildComparisonReviewedSourceReferences(entry, assetReferences, reviewedVolumeId) {
  return [
    {
      sourceVolumeId: entry.sourceVolumeId,
      volumeId: reviewedVolumeId,
      sourcePath: entry.sourcePath,
      sourceHeading: entry.sourceHeading,
      lineRange: '3432-3462',
      sourceHash: entry.sourceHash,
      candidateId: entry.candidateId,
      reviewedBy: entry.reviewedBy,
      reviewedAt: entry.reviewedAt,
      assetReferences,
      note: `Reviewed promotion manifest entry ${entry.entryId}`
    },
    {
      sourceVolumeId: entry.sourceVolumeId,
      volumeId: reviewedVolumeId,
      sourcePath: entry.sourcePath,
      sourceHeading: entry.sourceHeading,
      lineRange: '3494-3504',
      sourceHash: entry.sourceHash,
      candidateId: entry.candidateId,
      reviewedBy: entry.reviewedBy,
      reviewedAt: entry.reviewedAt,
      assetReferences: assetReferences.length > 0 ? assetReferences : undefined,
      assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
      note: `Reviewed promotion manifest entry ${entry.entryId} supplemental C60 evidence`
    }
  ];
}

function ensureEntryTargets(entry, runtimePath) {
  if (entry.targetRuntimeFile !== runtimePath || !normalizeArray(entry.targetRuntimeFiles).includes(runtimePath)) {
    blockPromotion(`Reviewed entry ${entry.entryId} is not approved for ${runtimePath}`);
  }
}

function upsertById(target, records) {
  for (const record of records) {
    const index = target.findIndex((item) => item?.id === record.id);
    if (index === -1) {
      target.push(record);
      continue;
    }

    target[index] = record;
  }
}

function replaceObjectProperty(source, propertyName, replacementObject) {
  const propertyIndex = source.indexOf(`${propertyName}:`);
  if (propertyIndex === -1) {
    throw new Error(`Cannot find ${propertyName} in src/data/contentMeta.js`);
  }

  const objectStart = source.indexOf('{', propertyIndex);
  if (objectStart === -1) {
    throw new Error(`Cannot find object start for ${propertyName}`);
  }

  const objectEnd = findMatchingBrace(source, objectStart);
  const prefix = source.slice(0, objectStart);
  const suffix = source.slice(objectEnd + 1);
  return `${prefix}${replacementObject}${suffix}`;
}

function findMatchingBrace(source, startIndex) {
  let depth = 0;
  let quote = null;

  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];
    const previous = source[index - 1];

    if (quote) {
      if (character === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (character === '\'' || character === '"' || character === '`') {
      quote = character;
      continue;
    }

    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error('Cannot find matching object brace');
}

function formatJsObject(value, indentLevel) {
  return formatJsValue(value, indentLevel);
}

function formatJsValue(value, indentLevel) {
  const indent = ' '.repeat(indentLevel);
  const childIndent = ' '.repeat(indentLevel + 2);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }

    if (value.every((item) => typeof item !== 'object' || item === null)) {
      return `[${value.map(formatJsPrimitive).join(', ')}]`;
    }

    return `[
${value.map((item) => `${childIndent}${formatJsValue(item, indentLevel + 2)}`).join(',\n')}
${indent}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }

    return `{
${entries.map(([key, item]) => `${childIndent}${formatJsKey(key)}: ${formatJsValue(item, indentLevel + 2)}`).join(',\n')}
${indent}}`;
  }

  return formatJsPrimitive(value);
}

function formatJsKey(key) {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}

function formatJsPrimitive(value) {
  if (typeof value === 'string') {
    return `'${value.replaceAll('\\', '\\\\').replaceAll('\'', '\\\'')}'`;
  }

  return String(value);
}

async function readJsonFile(filePath, label) {
  try {
    const source = await readFile(filePath, 'utf8');
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${label} cannot be read or parsed: ${error.message}`);
  }
}

async function writeJsonFile(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function projectPath(relativePath) {
  return path.join(projectRoot, ...relativePath.split('/'));
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

function blockPromotion(reason) {
  console.error(`Promotion blocked: ${reason}`);
  process.exit(1);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
