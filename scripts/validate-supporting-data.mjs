import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  achievementsData,
  allowedSafetyLevels,
  curriculumTags,
  elements,
  labExperiments,
  learningPath,
  learningSegmentTextbookContent,
  quizData,
  reactions,
  textbookAssetManifest
} from '../src/data/index.js';
import { equationToLatex, formulaToLatex } from '../src/modules/chemNotation.js';
import { GAME_KEYS, GAME_META } from '../src/data/contentMeta.js';
import textbookPilotContent from '../src/data/textbookPilotContent.js';
import { isFormulaText } from './textbook/reaction-equation-normalizer.mjs';

const topicConfigs = [
  {
    topicId: 'g9-carbon-c60-allotrope',
    topicLabel: 'C60 runtime pilot',
    topicTag: 'g9-carbon-c60-allotrope',
    inventory: {
      exactIds: [
        'challenge-c60-carbon-topic',
        'draft-exp-c60-model-observation',
        'quiz-c60-carbon-allotrope',
        'quiz-c60-reviewed-formula-application',
        'quiz-c60-structure-source'
      ],
      challengeIds: [],
      draftIds: ['draft-exp-c60-model-observation'],
      sourceValidator: validateC60ReviewedSource
    },
    runtime: {
      quizIds: [
        'quiz-c60-structure-source',
        'quiz-c60-carbon-allotrope',
        'quiz-c60-reviewed-formula-application'
      ],
      progressIds: ['stage-3'],
      challengeIds: [],
      sourceValidator: validateC60ReviewedSource
    },
    legacyQuizIds: ['quiz-c60-reviewed-formula']
  },
  {
    topicId: 'g9-carbon-allotropes-comparison',
    topicLabel: 'carbon allotrope comparison',
    topicTag: 'g9-carbon-allotropes-comparison',
    inventory: {
      exactIds: [
        'challenge-carbon-allotropes-comparison',
        'draft-exp-carbon-allotropes-observation'
      ],
      challengeIds: [],
      draftIds: ['draft-exp-carbon-allotropes-observation'],
      sourceValidator: validateComparisonReviewedSource,
      requiredLineRanges: ['3432-3462', '3494-3504'],
      forbiddenLineRanges: ['3463-3489', '3483'],
      reservedIds: [
        'g9-carbon-c60-allotrope',
        'stage-3',
        'challenge-c60-carbon-topic',
        'quiz-11',
        'pep-g9-2024-up-figure-6-4-c60-formula'
      ]
    },
    runtime: {
      quizIds: [
        'quiz-carbon-allotropes-comparison-1',
        'quiz-carbon-allotropes-comparison-2',
        'quiz-carbon-allotropes-comparison-3'
      ],
      progressIds: ['relation-carbon-allotropes-comparison'],
      challengeIds: [],
      sourceValidator: validateComparisonReviewedSource,
      requiredLineRanges: ['3432-3462', '3494-3504'],
      forbiddenLineRanges: ['3463-3489', '3483']
    }
  }
];

const selfCheckModes = new Set([
  'unreviewed-formula-reference',
  'unreviewed-image-reference',
  'unreviewed-notation-field',
  'missing-reviewed-source-reference',
  'unreviewed-runtime-source-reference',
  'missing-allotropes-reviewed-source',
  'reused-carbon-existing-id',
  'allotropes-active-carbon-source-contamination',
  'allotropes-draft-runtime-leak',
  'missing-learning-segment-textbook-content',
  'empty-learning-segment-textbook-content',
  'invalid-learning-segment-textbook-content-block'
]);
const selfCheckInvalid = parseSelfCheckMode(process.argv.slice(2));
const errors = [];
const elementIds = new Set(elements.map((element) => element.atomicNumber));
const elementSymbols = new Set(elements.map((element) => element.symbol));
const validCurriculumTagIds = new Set(Object.keys(curriculumTags));
const validDifficultyBands = new Set(['入门', '初中', '高中基础', '高中进阶', '基础', '挑战', '进阶']);
const validGrades = new Set(['入门', '七年级', '八年级', '九年级', '高一', '高二', '高三']);
const validFormulas = new Set(['H2', 'O2', 'Cl2', 'H2O', 'Fe2O3', 'NaOH', 'NaCl', 'CO2']);
const expectedGameMetaIds = ['drag', 'memory', 'reaction'];
const validGameIds = new Set(Object.values(GAME_KEYS));
const expectedPersistedGameIds = ['game-drag', 'game-memory', 'game-reaction'];
const minimumGameUsableReactionCount = 5;
const c60PilotCurriculumTag = 'g9-carbon-c60-allotrope';
const c60PilotChallengeId = 'challenge-c60-carbon-topic';
const legacyC60QuizId = 'quiz-c60-reviewed-formula';
const expectedC60PilotQuizIds = [
  'quiz-c60-structure-source',
  'quiz-c60-carbon-allotrope',
  'quiz-c60-reviewed-formula-application'
];
const validGameMetaIds = new Set(expectedGameMetaIds);
const validAchievementConditionTypes = new Set([
  'learnedElements',
  'completedExperiments',
  'quizCorrectAnswers',
  'quizAttempts',
  'quizPerfectScore',
  'curriculumQuizComplete',
  'gamePlays',
  'gameScore',
  'manualReviewAfterPromotion'
]);
const countBasedAchievementTypes = new Set([
  'learnedElements',
  'completedExperiments',
  'quizCorrectAnswers',
  'quizAttempts',
  'gamePlays',
  'gameScore',
  'manualReviewAfterPromotion'
]);
const safeQuizData = ensureArray(buildQuizDataset(quizData, selfCheckInvalid), 'quizData 顶层必须是数组');
const safeReactions = ensureArray(buildReactionDataset(reactions, selfCheckInvalid), 'reactions 顶层必须是数组');
const safeLabExperiments = ensureArray(labExperiments, 'labExperiments 顶层必须是数组');
const safeAchievementsData = ensureArray(achievementsData, 'achievementsData 顶层必须是数组');
const safeLearningPath = ensureObject(buildLearningPathDataset(learningPath, selfCheckInvalid), 'learningPath 顶层必须是对象');
const safeTextbookPilotContent = ensureArray(buildTextbookPilotDataset(textbookPilotContent, selfCheckInvalid), 'textbookPilotContent 顶层必须是数组');
const safeStages = ensureArray(safeLearningPath?.stages, 'learningPath.stages 必须是数组');
const runtimeCurriculumTagIds = new Set([
  ...validCurriculumTagIds,
  ...safeStages.flatMap((stage) => Array.isArray(stage?.curriculumTags) ? stage.curriculumTags : [])
]);
const safeGameMeta = ensureObject(buildGameMetaDataset(GAME_META, selfCheckInvalid), 'GAME_META 顶层必须是对象');
const textbookAssetsById = new Map((textbookAssetManifest.assets || []).map((asset) => [asset.id, asset]));
const textbookVolumesById = new Map((textbookAssetManifest.volumes || []).map((volume) => [volume.volumeId, volume]));
const stableIngestionVolumeId = 'rj-chemistry-grade9-2024-vol1';
const allowedAssetReferenceUsages = new Set(['formula', 'equation', 'diagram', 'experiment-flow', 'apparatus-diagram', 'photo', 'other']);
const referenceUsagesRequiringReviewedAsset = new Set(['formula', 'equation', 'diagram', 'experiment-flow', 'apparatus-diagram']);
const assetTypesRequiringReviewWhenReferenced = new Set(['formula', 'experiment-flow', 'apparatus-diagram']);
const notationFields = new Map([['formulaText', formulaToLatex], ['equationText', equationToLatex]]);
const rawNotationFieldPattern = /(?:raw|ocr|machine|extracted).*(?:formula|equation)text|(?:formula|equation).*(?:raw|ocr|machine|extracted)text/i;
let curriculumReferenceCount = 0;
let reviewedSourceReferenceCount = 0;
validateExactStringSet(Object.keys(GAME_KEYS), expectedGameMetaIds, 'GAME_KEYS 对象 key');
validateExactStringSet(Object.values(GAME_KEYS), expectedPersistedGameIds, 'GAME_KEYS 持久化游戏 ID');

if (safeQuizData.length < 20) {
  errors.push(`测验题数量不足：至少需要 20 题，实际 ${safeQuizData.length}`);
}

if (safeReactions.length < 5) {
  errors.push(`反应数量不足：至少需要 5 个，实际 ${safeReactions.length}`);
}

const quizIds = new Set();
for (const quiz of safeQuizData) {
  if (!isRecord(quiz)) {
    errors.push('测验题目条目必须是对象');
    continue;
  }

  if (!quiz.id || !quiz.question || !quiz.category) {
    errors.push(`测验题目存在空字段：${quiz.id || 'unknown-quiz'}`);
  }

  if (quizIds.has(quiz.id)) {
    errors.push(`重复的测验题目 ID：${quiz.id}`);
  }
  quizIds.add(quiz.id);

  if (!isPromotedTextbookRecord(quiz) && !elementIds.has(quiz.relatedElement)) {
    errors.push(`测验题目 ${quiz.id} 引用了不存在的元素 atomicNumber：${quiz.relatedElement}`);
  }

  if (!Array.isArray(quiz.options) || (isPromotedTextbookRecord(quiz) ? quiz.options.length < 1 : quiz.options.length !== 4)) {
    errors.push(`测验题目 ${quiz.id} 必须包含${isPromotedTextbookRecord(quiz) ? '至少 1 个' : ' 4 个'}选项`);
  }

  if (!Number.isInteger(quiz.correctIndex) || quiz.correctIndex < 0 || quiz.correctIndex >= (Array.isArray(quiz.options) ? quiz.options.length : 4)) {
    errors.push(`测验题目 ${quiz.id} 的 correctIndex 非法：${quiz.correctIndex}`);
  }

  if (Array.isArray(quiz.options) && !quiz.options.every((option) => typeof option === 'string' && option.trim())) {
    errors.push(`测验题目 ${quiz.id} 的选项必须全部为非空字符串`);
  }

  curriculumReferenceCount += validateRequiredCurriculumMetadata(quiz, `测验题目 ${quiz.id || 'unknown-quiz'}`);
  validateRuntimeNotationConventions(quiz, `测验题目 ${quiz.id || 'unknown-quiz'}`);
  reviewedSourceReferenceCount += validateReviewedSourceContract(quiz, `测验题目 ${quiz.id || 'unknown-quiz'}`);
}

const reactionIds = new Set();
const experimentIds = new Set();
const gameUsableReactions = [];
const learningStageIds = new Set(safeStages.map((stage) => stage.id).filter((id) => typeof id === 'string'));
for (const labExperiment of safeLabExperiments) {
  if (!isRecord(labExperiment)) {
    errors.push('实验条目必须是对象');
    continue;
  }

  if (!labExperiment.experimentId) {
    errors.push(`实验数据存在空 experimentId：${labExperiment.id || 'unknown-experiment'}`);
    continue;
  }

  if (experimentIds.has(labExperiment.experimentId)) {
    errors.push(`重复的 experimentId：${labExperiment.experimentId}`);
  }
  experimentIds.add(labExperiment.experimentId);
}

for (const reaction of safeReactions) {
  if (!isRecord(reaction)) {
    errors.push('反应条目必须是对象');
    continue;
  }

  const isTextbookReaction = isPromotedTextbookRecord(reaction);

  if (!reaction.id || !reaction.name || !reaction.description || (!isTextbookReaction && (!reaction.experimentId || !reaction.visualDescription))) {
    errors.push(`反应数据存在空字段：${reaction.id || 'unknown-reaction'}`);
  }

  if (reactionIds.has(reaction.id)) {
    errors.push(`重复的反应 ID：${reaction.id}`);
  }
  reactionIds.add(reaction.id);

  const reactants = ensureArray(reaction.reactants, `反应 ${reaction.id || 'unknown-reaction'} 的 reactants 必须是数组`);
  const products = ensureArray(reaction.products, `反应 ${reaction.id || 'unknown-reaction'} 的 products 必须是数组`);
  const isGameUsableReaction = isReactionGameUsableCandidate(reaction, reactants, products);
  if (isGameUsableReaction) {
    gameUsableReactions.push(reaction);
    validateGameUsableReactionContract(reaction, reactants, products);
  }

  for (const symbol of [...reactants, ...products]) {
    if (typeof symbol !== 'string' || !symbol.trim()) {
      errors.push(`反应 ${reaction.id || 'unknown-reaction'} 包含非法 reactant/product 条目：${String(symbol)}`);
      continue;
    }

    if (!elementSymbols.has(symbol) && !validFormulas.has(symbol) && !(isTextbookReaction && isFormulaText(symbol))) {
      errors.push(`反应 ${reaction.id} 引用了未知的元素符号或化学式：${symbol}`);
    }
  }

  if ((!isTextbookReaction || reaction.safetyLevel !== undefined) && !allowedSafetyLevels.includes(reaction.safetyLevel)) {
    errors.push(`反应 ${reaction.id} 的 safetyLevel 非法：${reaction.safetyLevel}`);
  }

  validateExperimentUnlockRequirements(reaction, learningStageIds);

  if (!isPromotedTextbookRecord(reaction) && (reactants.length === 0 || products.length === 0)) {
    errors.push(`反应 ${reaction.id} 必须包含非空的 reactants/products 数组`);
  }

  curriculumReferenceCount += validateRequiredCurriculumMetadata(reaction, `反应 ${reaction.id || 'unknown-reaction'}`);
  validateRuntimeNotationConventions(reaction, `反应 ${reaction.id || 'unknown-reaction'}`);
  reviewedSourceReferenceCount += validateReviewedSourceContract(reaction, `反应 ${reaction.id || 'unknown-reaction'}`);
}

if (gameUsableReactions.length < minimumGameUsableReactionCount) {
  errors.push(`反应配对游戏可用反应数量不足：至少需要 ${minimumGameUsableReactionCount} 个，实际 ${gameUsableReactions.length}`);
}

const achievementIds = new Set();
for (const achievement of safeAchievementsData) {
  if (!isRecord(achievement)) {
    errors.push('成就条目必须是对象');
    continue;
  }

  if (!achievement.id || !achievement.title || !achievement.description || !achievement.condition || !achievement.icon || !achievement.rarity) {
    errors.push(`成就数据存在空字段：${achievement.id || 'unknown-achievement'}`);
  }

  if (achievementIds.has(achievement.id)) {
    errors.push(`重复的成就 ID：${achievement.id}`);
  }
  achievementIds.add(achievement.id);

  if (achievement.relatedElements) {
    if (!Array.isArray(achievement.relatedElements)) {
      errors.push(`成就 ${achievement.id} 的 relatedElements 必须是数组`);
    } else {
      for (const atomicNumber of achievement.relatedElements) {
        if (!elementIds.has(atomicNumber)) {
          errors.push(`成就 ${achievement.id} 引用了不存在的元素 atomicNumber：${atomicNumber}`);
        }
      }
    }
  }

  if (typeof achievement.condition === 'string') {
    errors.push(`成就 ${achievement.id} 的条件格式已过时，必须使用对象条件`);
  } else if (typeof achievement.condition === 'object' && achievement.condition !== null) {
    if (!achievement.condition.type) {
      errors.push(`成就 ${achievement.id} 的条件对象缺少 type 字段`);
    } else if (!validAchievementConditionTypes.has(achievement.condition.type)) {
      errors.push(`成就 ${achievement.id} 的条件类型非法：${achievement.condition.type}`);
    }

    if (countBasedAchievementTypes.has(achievement.condition.type)) {
      const count = Number(achievement.condition.count);
      if (!Number.isInteger(count) || count < 1) {
        errors.push(`成就 ${achievement.id} 的 count 非法：${achievement.condition.count}`);
      }
    }

    if (achievement.condition.type === 'curriculumQuizComplete') {
      validateRequiredText(achievement.condition.curriculumTagId, `成就 ${achievement.id} 的 curriculumTagId`);
      const count = Number(achievement.condition.count);
      if (!Number.isInteger(count) || count < 1) {
        errors.push(`成就 ${achievement.id} 的 count 非法：${achievement.condition.count}`);
      }
    }

    if (achievement.condition.type === 'gameScore') {
      if (typeof achievement.condition.gameKey !== 'string' || !achievement.condition.gameKey.trim()) {
        errors.push(`成就 ${achievement.id} 的 gameScore 条件缺少 gameKey`);
      } else if (!validGameIds.has(achievement.condition.gameKey)) {
        errors.push(`成就 ${achievement.id} 引用了不存在的游戏 ID：${achievement.condition.gameKey}`);
      }
    }

    if (achievement.condition.type === 'manualReviewAfterPromotion') {
      validateManualReviewAfterPromotionAchievement(achievement, `成就 ${achievement.id}`);
    }
  } else {
    errors.push(`成就 ${achievement.id} 的条件格式非法`);
  }

  curriculumReferenceCount += validateRequiredCurriculumMetadata(achievement, `成就 ${achievement.id || 'unknown-achievement'}`);
  reviewedSourceReferenceCount += validateReviewedSourceContract(achievement, `成就 ${achievement.id || 'unknown-achievement'}`);
}

const stageIds = new Set();
for (const stage of safeStages) {
  if (!isRecord(stage)) {
    errors.push('学习阶段条目必须是对象');
    continue;
  }

  if (!stage.id || !stage.name || !stage.description) {
    errors.push(`学习阶段存在空字段：${stage.id || 'unknown-stage'}`);
  }

  if (stageIds.has(stage.id)) {
    errors.push(`重复的学习阶段 ID：${stage.id}`);
  }
  stageIds.add(stage.id);

  const requiredElements = ensureArray(
    stage.focusElements || stage.requiredElements || [],
    `学习阶段 ${stage.id || 'unknown-stage'} 的 focusElements/requiredElements 必须是数组`
  );
  for (const atomicNumber of requiredElements) {
    if (!elementIds.has(atomicNumber)) {
      errors.push(`学习阶段 ${stage.id} 引用了不存在的元素 atomicNumber：${atomicNumber}`);
    }
  }

  for (const experimentId of ensureArray(stage.unlockedExperiments, `学习阶段 ${stage.id || 'unknown-stage'} 的 unlockedExperiments 必须是数组`)) {
    if (!experimentIds.has(experimentId)) {
      errors.push(`学习阶段 ${stage.id} 引用了不存在的 experimentId：${experimentId}`);
    }
  }

  for (const gameId of ensureArray(stage.unlockedGames, `学习阶段 ${stage.id || 'unknown-stage'} 的 unlockedGames 必须是数组`)) {
    if (!validGameIds.has(gameId)) {
      errors.push(`学习阶段 ${stage.id} 引用了不存在的游戏 ID：${gameId}`);
    }
  }

  if (!Array.isArray(stage.unlockedFeatures) || !stage.unlockedFeatures.every((feature) => typeof feature === 'string' && feature.trim())) {
    errors.push(`学习阶段 ${stage.id} 的 unlockedFeatures 必须为非空字符串数组`);
  }

  curriculumReferenceCount += validateRequiredCurriculumMetadata(stage, `学习阶段 ${stage.id || 'unknown-stage'}`);
  reviewedSourceReferenceCount += validateReviewedSourceContract(stage, `学习阶段 ${stage.id || 'unknown-stage'}`);
}

validateExactStringSet(Object.keys(safeGameMeta ?? {}), expectedGameMetaIds, 'GAME_META 游戏 ID');
for (const [gameId, gameMeta] of Object.entries(safeGameMeta ?? {})) {
  if (!validGameMetaIds.has(gameId)) {
    continue;
  }
  if (!isRecord(gameMeta)) {
    errors.push(`游戏元数据 ${gameId} 必须是对象`);
    continue;
  }

  if (!gameMeta.title || !gameMeta.kicker || !gameMeta.description) {
    errors.push(`游戏元数据 ${gameId} 存在空字段`);
  }

  curriculumReferenceCount += validateRequiredCurriculumMetadata(gameMeta, `游戏元数据 ${gameId}`);
    curriculumReferenceCount += validateGameChallengeMetadata(gameMeta.challengeMetadata, `游戏元数据 ${gameId}.challengeMetadata`);
    if (gameMeta.comparisonChallengeMetadata !== undefined) {
      curriculumReferenceCount += validateGameChallengeMetadata(gameMeta.comparisonChallengeMetadata, `游戏元数据 ${gameId}.comparisonChallengeMetadata`);
    }
  reviewedSourceReferenceCount += validateReviewedSourceContract(gameMeta, `游戏元数据 ${gameId}`);
    reviewedSourceReferenceCount += validateReviewedSourceContract(gameMeta.challengeMetadata, `游戏元数据 ${gameId}.challengeMetadata`);
    if (gameMeta.comparisonChallengeMetadata !== undefined) {
      reviewedSourceReferenceCount += validateReviewedSourceContract(gameMeta.comparisonChallengeMetadata, `游戏元数据 ${gameId}.comparisonChallengeMetadata`);
    }
}

validateSupportingTopicConfigs(selfCheckInvalid);
validateRuntimeSourceImportBoundary();
validateLearningSegmentTextbookContentLinkage(selfCheckInvalid);

if (selfCheckInvalid) {
  const strictSelfCheckModes = new Set(['missing-allotropes-reviewed-source', 'reused-carbon-existing-id', 'allotropes-active-carbon-source-contamination', 'allotropes-draft-runtime-leak', 'missing-learning-segment-textbook-content', 'empty-learning-segment-textbook-content', 'invalid-learning-segment-textbook-content-block']);
  if (errors.length === 0) {
    console.error(`支持数据非法夹具自检失败：${selfCheckInvalid} 未被拒绝`);
    process.exit(1);
  }

  console.log(`selfCheckInvalid: rejected ${selfCheckInvalid}`);
  for (const error of errors) {
    console.log(`- ${error}`);
  }
  process.exit(strictSelfCheckModes.has(selfCheckInvalid) ? 1 : 0);
}

if (errors.length > 0) {
  console.error('支持数据校验失败：');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`支持数据校验通过：${safeQuizData.length} 道题、${safeReactions.length} 个反应、${safeAchievementsData.length} 个成就、${safeStages.length} 个学习阶段。`);
console.log(`反应配对游戏内容校验通过：${gameUsableReactions.length} 个可用反应。`);
console.log(`课程引用校验通过：${validCurriculumTagIds.size} 个可用标签、${validDifficultyBands.size} 个难度档、${curriculumReferenceCount} 个支持数据引用。`);
console.log(`教材来源审核校验通过：${reviewedSourceReferenceCount} 个 reviewed source references。`);
console.log(`游戏元数据校验通过：${expectedGameMetaIds.join(', ')}。`);

function validateSupportingTopicConfigs(mode) {
  for (const topic of topicConfigs) {
    if (topic.topicId === 'g9-carbon-allotropes-comparison' && mode !== 'missing-allotropes-reviewed-source' && mode !== 'reused-carbon-existing-id' && mode !== 'allotropes-active-carbon-source-contamination' && mode !== 'allotropes-draft-runtime-leak' && !topicHasSignals(topic)) {
      continue;
    }
    validateTopicInventoryManifest(topic);
    validateTopicRuntimeScope(topic);
  }
}

function topicHasSignals(topic) {
  if (topic.topicId === 'g9-carbon-c60-allotrope') {
    return safeQuizData.some((quiz) => Array.isArray(quiz?.curriculumTags) && quiz.curriculumTags.includes(topic.topicTag))
      || safeStages.some((stage) => Array.isArray(stage?.curriculumTags) && stage.curriculumTags.includes(topic.topicTag))
      || Object.entries(safeGameMeta ?? {}).some(([, gameMeta]) => Array.isArray(gameMeta?.challengeMetadata?.curriculumTags) && gameMeta.challengeMetadata.curriculumTags.includes(topic.topicTag));
  }
  return safeQuizData.some((quiz) => ['quiz-carbon-allotropes-comparison-1', 'quiz-carbon-allotropes-comparison-2', 'quiz-carbon-allotropes-comparison-3'].includes(quiz?.id))
    || safeStages.some((stage) => stage?.id === 'relation-carbon-allotropes-comparison')
    || Object.entries(safeGameMeta ?? {}).some(([, gameMeta]) => gameMeta?.comparisonChallengeMetadata?.challengeId === 'challenge-carbon-allotropes-comparison')
    || safeTextbookPilotContent.some((item) => item?.id === 'draft-exp-carbon-allotropes-observation');
}

function validateC60PilotRuntimeScope() {
  validateSupportingTopicConfigs();
}

function validateC60ReviewedSource(record, label, options = {}) {

  if (record?.sourceReviewStatus !== 'reviewed') {
    errors.push(`${label}.sourceReviewStatus 必须为 reviewed`);
  }
  if (!Array.isArray(record?.sourceReferences) || record.sourceReferences.length === 0) {
    errors.push(`${label}.sourceReferences 必须包含已审核 C60 来源`);
    return;
  }
  const hasRequiredReference = record.sourceReferences.some((reference) => (
    reference?.volumeId === 'pep-chemistry-g9-2024'
    && reference?.sourcePath === 'src/data/textbooks/2024版人教版九年级化学上册/book.md'
    && reference?.lineRange === '3494-3504'
    && reference?.assetId === 'pep-g9-2024-up-figure-6-4-c60-formula'
    && (!options.requireReviewedTextField || reference.reviewedTextField === 'formulaText')
  ));
  if (!hasRequiredReference) {
    errors.push(`${label}.sourceReferences 必须引用 C60 已审核教材来源 pep-chemistry-g9-2024 book.md:3494-3504 与图6-4 资产`);
  }
}

function parseSelfCheckMode(args) {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Supporting data validator / 支持数据校验器\n\nUsage:\n  node scripts/validate-supporting-data.mjs [--self-check=<mode>]\n\nInvalid fixture modes:\n  ${[...selfCheckModes].join('|')}`);
    process.exit(0);
  }

  const selfCheckArg = args.find(arg => arg.startsWith('--self-check=') || arg === '--self-check' || arg === '--self-check-invalid');
  if (!selfCheckArg) {
    return null;
  }

  let mode;
  if (selfCheckArg.startsWith('--self-check=')) {
    mode = selfCheckArg.split('=')[1];
  } else {
    const index = args.indexOf(selfCheckArg);
    mode = args[index + 1];
  }

  if (!selfCheckModes.has(mode)) {
    throw new Error(`--self-check must be one of: ${[...selfCheckModes].join(', ')}`);
  }

  return mode;
}

function buildQuizDataset(sourceQuizData, mode) {
  const items = structuredClone(sourceQuizData);

  if (mode === 'unreviewed-formula-reference') {
    items.push({
      id: 'invalid-unreviewed-formula-reference',
      question: 'Invalid fixture: formula source must be reviewed.',
      options: ['H2O', 'O2', 'NaCl', 'CO2'],
      correctIndex: 0,
      category: '非法夹具',
      relatedElement: 1,
      explanation: 'Invalid fixture only.',
      curriculumTags: ['g9-carbon-allotropes-comparison'],
      difficulty: '入门',
      formulaText: 'H2O',
      notationReviewStatus: 'reviewed',
      textbookAssetReferences: [{
        assetId: 'pep-g9-2024-up-figure-1-1-water-boiling',
        usage: 'formula',
        reviewedTextField: 'formulaText',
        note: 'Invalid self-check fixture: referenced formula asset is unreviewed.'
      }]
    });
  }

  if (mode === 'unreviewed-notation-field') {
    items.push({
      id: 'invalid-unreviewed-notation-field',
      question: 'Invalid fixture: notation text must be reviewed.',
      options: ['H2O', 'O2', 'NaCl', 'CO2'],
      correctIndex: 0,
      category: '非法夹具',
      relatedElement: 1,
      explanation: 'Invalid fixture only.',
      curriculumTags: ['g9-carbon-allotropes-comparison'],
      difficulty: '入门',
      formulaText: 'H2O',
      notationReviewStatus: 'unreviewed'
    });
  }

  if (mode === 'missing-reviewed-source-reference') {
    const c60Fixture = items.find((item) => item.id === 'quiz-c60-structure-source');
    if (c60Fixture) {
      c60Fixture.sourceReviewStatus = 'reviewed';
      c60Fixture.sourceReferences = [];
    }
  }

  if (mode === 'missing-allotropes-reviewed-source' || mode === 'reused-carbon-existing-id' || mode === 'allotropes-active-carbon-source-contamination' || mode === 'allotropes-draft-runtime-leak') {
    items.push(...createComparisonQuizFixtures({
      sourceMode: mode === 'missing-allotropes-reviewed-source' ? 'missing-reviewed-source' : mode === 'allotropes-active-carbon-source-contamination' ? 'contaminated' : 'valid',
      invalidQuizId: mode === 'reused-carbon-existing-id' ? 'quiz-11' : null
    }));
  }

  if (mode === 'unreviewed-runtime-source-reference') {
    const c60Fixture = items.find((item) => item.id === 'quiz-c60-structure-source');
    if (c60Fixture) {
      c60Fixture.sourceReviewStatus = 'reviewed';
      c60Fixture.sourceReferences = [
        {
          volumeId: 'pep-chemistry-g9-2024',
          sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
          lineRange: '3494-3504',
          assetId: 'pep-g9-2024-up-figure-1-1-water-boiling',
          reviewedTextField: 'formulaText',
          note: 'Invalid self-check fixture: runtime source references must use reviewed textbook assets.'
        }
      ];
    }
  }

  return items;
}

function buildReactionDataset(sourceReactions, mode) {
  const items = structuredClone(sourceReactions);

  if (mode === 'unreviewed-image-reference') {
    items.push({
      id: 'invalid-unreviewed-image-reference',
      name: '非法图片引用夹具',
      description: 'Invalid fixture only.',
      reactants: ['H2'],
      products: ['H2O'],
      experimentId: 'invalid-image-fixture',
      safetyLevel: 'caution',
      visualDescription: 'Invalid fixture only.',
      steps: ['Invalid fixture only.'],
      safetyNotes: ['Invalid fixture only.'],
      curriculumTags: ['g10-redox-valence-change'],
      difficulty: '高中基础',
      textbookAssetReferences: [{
        assetId: 'pep-g9-2024-up-figure-1-1-water-boiling',
        usage: 'apparatus-diagram',
        note: 'Invalid self-check fixture: referenced image asset is unreviewed.'
      }]
    });
  }

  if (mode === 'allotropes-draft-runtime-leak') {
    items.push({
      id: 'draft-exp-carbon-allotropes-observation',
      name: 'Comparison draft leak fixture',
      description: 'Invalid runtime leak fixture.',
      reactants: ['C'],
      products: ['C'],
      experimentId: 'draft-exp-carbon-allotropes-observation',
      safetyLevel: 'caution',
      visualDescription: 'Invalid runtime leak fixture.',
      steps: ['Invalid runtime leak fixture.'],
      safetyNotes: ['Invalid runtime leak fixture.'],
      curriculumTags: ['g9-carbon-allotropes-comparison'],
      difficulty: '初中'
    });
  }

  return items;
}

function buildTextbookPilotDataset(sourcePilotContent, mode) {
  const items = structuredClone(sourcePilotContent);

  if (mode === 'missing-allotropes-reviewed-source' || mode === 'reused-carbon-existing-id' || mode === 'allotropes-active-carbon-source-contamination' || mode === 'allotropes-draft-runtime-leak') {
    items.push(...createComparisonQuizFixtures({
      sourceMode: mode === 'missing-allotropes-reviewed-source' ? 'missing-reviewed-source' : mode === 'allotropes-active-carbon-source-contamination' ? 'contaminated' : 'valid',
      invalidQuizId: mode === 'reused-carbon-existing-id' ? 'quiz-11' : null
    }));
    items.push(...createComparisonPilotFixtures({ sourceMode: mode === 'allotropes-active-carbon-source-contamination' ? 'contaminated' : 'valid' }));
  }

  return items;
}

function buildLearningPathDataset(sourceLearningPath, mode) {
  const pathData = structuredClone(sourceLearningPath);
  if (mode === 'missing-allotropes-reviewed-source' || mode === 'reused-carbon-existing-id' || mode === 'allotropes-active-carbon-source-contamination' || mode === 'allotropes-draft-runtime-leak') {
    pathData.stages = [...ensureArray(pathData.stages, 'learningPath.stages 必须是数组'), createComparisonStageFixture({ sourceMode: mode === 'allotropes-active-carbon-source-contamination' ? 'contaminated' : 'valid' })];
  }
  return pathData;
}

function buildGameMetaDataset(sourceGameMeta, mode) {
  const gameMeta = structuredClone(sourceGameMeta);
  if (mode === 'missing-allotropes-reviewed-source' || mode === 'reused-carbon-existing-id' || mode === 'allotropes-active-carbon-source-contamination' || mode === 'allotropes-draft-runtime-leak') {
    gameMeta.collector = {
      ...(gameMeta.collector || {}),
      comparisonChallengeMetadata: createComparisonChallengeFixture({ sourceMode: mode === 'allotropes-active-carbon-source-contamination' ? 'contaminated' : 'valid' })
    };
  }
  return gameMeta;
}

function validateGameChallengeMetadata(challenge, label) {


  if (!isRecord(challenge)) {
    errors.push(`${label} 必须是对象`);
    return 0;
  }

  const allowedKeys = new Set(['challengeId', 'curriculumTags', 'challengeGoals', 'scoringThresholds', 'unlockMetadata', 'sourceVolumeId', 'sourceReviewStatus', 'sourceReferences']);
  for (const key of Object.keys(challenge)) {
    if (!allowedKeys.has(key)) {
      errors.push(`${label}.${key} is not allowed`);
    }
  }
  validateNoDifficultyRuleMutation(challenge, label);

  if (typeof challenge.challengeId !== 'string' || !challenge.challengeId.trim()) {
    errors.push(`${label}.challengeId 必须是非空字符串`);
  }

  let referenceCount = validateRequiredCurriculumTags(challenge.curriculumTags, `${label}.curriculumTags`);
  validateChallengeGoals(challenge.challengeGoals, `${label}.challengeGoals`);
  validateScoringThresholds(challenge.scoringThresholds, `${label}.scoringThresholds`);
  referenceCount += validateUnlockMetadata(challenge.unlockMetadata, `${label}.unlockMetadata`);
  return referenceCount;
}

function validateChallengeGoals(goals, label) {
  if (!Array.isArray(goals) || goals.length === 0) {
    errors.push(`${label} 必须是非空数组`);
    return;
  }

  const seenGoalIds = new Set();
  const allowedGoalKeys = new Set(['id', 'label', 'target', 'metric']);
  for (const [index, goal] of goals.entries()) {
    const goalLabel = `${label}[${index}]`;
    if (!isRecord(goal)) {
      errors.push(`${goalLabel} 必须是对象`);
      continue;
    }
    for (const key of Object.keys(goal)) {
      if (!allowedGoalKeys.has(key)) {
        errors.push(`${goalLabel}.${key} is not allowed`);
      }
    }
    if (typeof goal.id !== 'string' || !goal.id.trim()) {
      errors.push(`${goalLabel}.id 必须是非空字符串`);
    }
    if (seenGoalIds.has(goal.id)) {
      errors.push(`${label} 包含重复目标 id：${String(goal.id)}`);
    }
    seenGoalIds.add(goal.id);
    if (typeof goal.label !== 'string' || !goal.label.trim()) {
      errors.push(`${goalLabel}.label 必须是非空字符串`);
    }
    if (typeof goal.metric !== 'string' || !goal.metric.trim()) {
      errors.push(`${goalLabel}.metric 必须是非空字符串`);
    }
    if (!Number.isFinite(goal.target) || goal.target < 0) {
      errors.push(`${goalLabel}.target 必须是非负数字`);
    }
  }
}

function validateScoringThresholds(thresholds, label) {
  if (!isRecord(thresholds)) {
    errors.push(`${label} 必须是对象`);
    return;
  }

  const allowedThresholdKeys = new Set(['s', 'a', 'b']);
  for (const key of Object.keys(thresholds)) {
    if (!allowedThresholdKeys.has(key)) {
      errors.push(`${label}.${key} is not allowed`);
    }
  }
  for (const tier of allowedThresholdKeys) {
    if (!Number.isFinite(thresholds[tier]) || thresholds[tier] < 0) {
      errors.push(`${label}.${tier} 必须是非负数字`);
    }
  }
  if (Number(thresholds.s) < Number(thresholds.a) || Number(thresholds.a) < Number(thresholds.b)) {
    errors.push(`${label} 必须保持 s >= a >= b`);
  }
}

function validateUnlockMetadata(unlockMetadata, label) {
  if (!isRecord(unlockMetadata)) {
    errors.push(`${label} 必须是对象`);
    return 0;
  }

  const allowedUnlockKeys = new Set(['stageIds', 'requiresTags', 'minimumLearnedElements', 'achievementIds']);
  for (const key of Object.keys(unlockMetadata)) {
    if (!allowedUnlockKeys.has(key)) {
      errors.push(`${label}.${key} is not allowed`);
    }
  }

  validateRequiredStageIds(unlockMetadata.stageIds, `${label}.stageIds`);
  const referenceCount = validateRequiredCurriculumTags(unlockMetadata.requiresTags, `${label}.requiresTags`);
  if (!Number.isInteger(unlockMetadata.minimumLearnedElements) || unlockMetadata.minimumLearnedElements < 0) {
    errors.push(`${label}.minimumLearnedElements 必须是非负整数`);
  }
  if (unlockMetadata.achievementIds !== undefined) {
    validateNonEmptyTextArray(unlockMetadata.achievementIds, `${label}.achievementIds`);
  }
  return referenceCount;
}

function validateRequiredStageIds(stageIds, label) {
  if (!Array.isArray(stageIds) || stageIds.length === 0) {
    errors.push(`${label} 必须是非空数组`);
    return;
  }

  const stageIdsFromData = new Set(safeStages.map((stage) => stage.id).filter((id) => typeof id === 'string'));
  const seenStageIds = new Set();
  for (const [index, stageId] of stageIds.entries()) {
    if (typeof stageId !== 'string' || !stageId.trim()) {
      errors.push(`${label}[${index}] 必须是非空字符串`);
    } else if (!stageIdsFromData.has(stageId)) {
      errors.push(`${label}[${index}] 引用了未知学习阶段：${stageId}`);
    }
    if (seenStageIds.has(stageId)) {
      errors.push(`${label} 包含重复值：${String(stageId)}`);
    }
    seenStageIds.add(stageId);
  }
}

function validateNonEmptyTextArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label} 必须是非空数组`);
    return;
  }

  for (const [index, item] of value.entries()) {
    if (typeof item !== 'string' || !item.trim()) {
      errors.push(`${label}[${index}] 必须是非空字符串`);
    }
  }
}

function validateNoDifficultyRuleMutation(value, label) {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      validateNoDifficultyRuleMutation(item, `${label}[${index}]`);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }

  const keys = Object.keys(value);
  const difficultyKeys = keys.filter((key) => validDifficultyBands.has(key));
  if (difficultyKeys.length > 0 && difficultyKeys.length === keys.length) {
    errors.push(`${label} 不能以 difficulty 分支改变挑战或核心规则`);
  }

  for (const key of keys) {
    if (/rulesByDifficulty|coreRulesByDifficulty|difficultyRules|ruleOverrides|ruleOverridesByDifficulty|(?:rules?|overrides?)ByDifficulty/i.test(key)) {
      errors.push(`${label}.${key} 不能按 difficulty 改变核心游戏规则`);
    }
    validateNoDifficultyRuleMutation(value[key], `${label}.${key}`);
  }
}

function validateExactStringSet(actualValues, expectedValues, label) {
  const actual = new Set(actualValues);
  const expected = new Set(expectedValues);
  for (const expectedValue of expected) {
    if (!actual.has(expectedValue)) {
      errors.push(`${label} 缺少：${expectedValue}`);
    }
  }
  for (const actualValue of actual) {
    if (!expected.has(actualValue)) {
      errors.push(`${label} 包含未知值：${actualValue}`);
    }
  }
  if (actual.size !== expected.size) {
    errors.push(`${label} 必须恰好包含 ${expectedValues.join(', ')}`);
  }
}

function validateRuntimeNotationConventions(record, label) {
  for (const key of Object.keys(record)) {
    if (rawNotationFieldPattern.test(key)) {
      errors.push(`${label}.${key} 不能保存未审核或机器提取的公式/方程文本；请使用 formulaText/equationText 并标记 notationReviewStatus=reviewed`);
    }
  }

  const presentNotationFields = [...notationFields.keys()].filter((fieldName) => record[fieldName] !== undefined);
  if (presentNotationFields.length > 0 && record.notationReviewStatus !== 'reviewed') {
    errors.push(`${label}.notationReviewStatus 必须为 reviewed，才能使用 formulaText/equationText`);
  }

  for (const fieldName of presentNotationFields) {
    const value = record[fieldName];
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(`${label}.${fieldName} 必须是非空字符串`);
      continue;
    }

    const converter = notationFields.get(fieldName);
    if (!converter(value)) {
      errors.push(`${label}.${fieldName} 不能由增强化学标记渲染器解析：${value}`);
    }
  }

  validateTextbookAssetReferences(record, label, new Set(presentNotationFields));
}

function validateTextbookAssetReferences(record, label, presentNotationFields) {
  if (record.textbookAssetReferences === undefined) {
    return;
  }

  if (!Array.isArray(record.textbookAssetReferences)) {
    errors.push(`${label}.textbookAssetReferences 必须是数组`);
    return;
  }

  for (const [index, reference] of record.textbookAssetReferences.entries()) {
    const referenceLabel = `${label}.textbookAssetReferences[${index}]`;
    if (!isRecord(reference)) {
      errors.push(`${referenceLabel} 必须是对象`);
      continue;
    }

    validateRequiredText(reference.assetId, `${referenceLabel}.assetId`);
    validateRequiredText(reference.usage, `${referenceLabel}.usage`);
    if (!allowedAssetReferenceUsages.has(reference.usage)) {
      errors.push(`${referenceLabel}.usage 非法：${String(reference.usage)}`);
    }

    if (reference.reviewedTextField !== undefined) {
      validateRequiredText(reference.reviewedTextField, `${referenceLabel}.reviewedTextField`);
      if (!presentNotationFields.has(reference.reviewedTextField)) {
        errors.push(`${referenceLabel}.reviewedTextField 必须指向当前记录中已声明的 formulaText/equationText：${String(reference.reviewedTextField)}`);
      }
    }

    const asset = textbookAssetsById.get(reference.assetId);
    if (!asset) {
      errors.push(`${referenceLabel}.assetId 未在 textbookAssetManifest.assets 中定义：${String(reference.assetId)}`);
      continue;
    }

    const requiresReviewedAsset = referenceUsagesRequiringReviewedAsset.has(reference.usage)
      || assetTypesRequiringReviewWhenReferenced.has(asset.assetType)
      || Boolean(reference.reviewedTextField);
    if (requiresReviewedAsset && asset.extractionStatus !== 'reviewed') {
      errors.push(`${referenceLabel} 引用公式/方程/教材图片内容时必须使用 reviewed 资产：${asset.id} 当前为 ${asset.extractionStatus}`);
    }
  }
}

function validateReviewedSourceContract(record, label) {
  const hasReviewStatus = record.sourceReviewStatus !== undefined;
  const hasReferences = record.sourceReferences !== undefined;
  if (!hasReviewStatus && !hasReferences) {
    return 0;
  }

  if (record.sourceReviewStatus !== 'reviewed') {
    errors.push(`${label}.sourceReviewStatus 必须为 reviewed，才能声明教材来源`);
  }

  if (!Array.isArray(record.sourceReferences) || record.sourceReferences.length === 0) {
    errors.push(`${label}.sourceReferences 必须是非空数组`);
    return 0;
  }

  const presentReviewedTextFields = new Set([...notationFields.keys()].filter((fieldName) => record[fieldName] !== undefined));
  let referenceCount = 0;
  for (const [index, reference] of record.sourceReferences.entries()) {
    const referenceLabel = `${label}.sourceReferences[${index}]`;
    if (!isRecord(reference)) {
      errors.push(`${referenceLabel} 必须是对象`);
      continue;
    }

    validateReviewedSourceReference(reference, referenceLabel, presentReviewedTextFields);
    referenceCount += 1;
  }

  return referenceCount;
}

function validateReviewedSourceReference(reference, label, presentReviewedTextFields) {
  const allowedKeys = new Set(['volumeId', 'sourceVolumeId', 'sourcePath', 'sourceHeading', 'lineRange', 'sourceHash', 'candidateId', 'reviewedBy', 'reviewedAt', 'assetReferences', 'assetId', 'reviewedTextField', 'note']);
  for (const key of Object.keys(reference)) {
    if (!allowedKeys.has(key)) {
      errors.push(`${label}.${key} is not allowed`);
    }
  }

  validateRequiredText(reference.volumeId, `${label}.volumeId`);
  validateRequiredText(reference.sourcePath, `${label}.sourcePath`);
  validateRequiredText(reference.lineRange, `${label}.lineRange`);
  validateRequiredText(reference.note, `${label}.note`);

  if (reference.sourceVolumeId !== undefined) {
    validateRequiredText(reference.sourceVolumeId, `${label}.sourceVolumeId`);
    if (reference.sourceVolumeId !== stableIngestionVolumeId && !isPromotedTextbookVolumeId(reference.sourceVolumeId)) {
      errors.push(`${label}.sourceVolumeId 必须为 ${stableIngestionVolumeId}：${String(reference.sourceVolumeId)}`);
    }
  }

  if (reference.sourceHeading !== undefined) {
    validateRequiredText(reference.sourceHeading, `${label}.sourceHeading`);
  }

  if (reference.sourceHash !== undefined) {
    validateRequiredText(reference.sourceHash, `${label}.sourceHash`);
    if (typeof reference.sourceHash === 'string' && !/^sha256:[a-f0-9]{64}$/.test(reference.sourceHash)) {
      errors.push(`${label}.sourceHash 必须是 sha256:<64 hex>：${reference.sourceHash}`);
    }
  }

  if (reference.candidateId !== undefined) {
    validateRequiredText(reference.candidateId, `${label}.candidateId`);
  }

  if (reference.reviewedBy !== undefined) {
    validateRequiredText(reference.reviewedBy, `${label}.reviewedBy`);
  }

  if (reference.reviewedAt !== undefined) {
    validateRequiredText(reference.reviewedAt, `${label}.reviewedAt`);
    if (typeof reference.reviewedAt === 'string' && Number.isNaN(Date.parse(reference.reviewedAt))) {
      errors.push(`${label}.reviewedAt 必须是有效 ISO 时间：${reference.reviewedAt}`);
    }
  }

  if (reference.assetReferences !== undefined) {
    validateReviewedAssetReferences(reference.assetReferences, label);
  }

  const volume = textbookVolumesById.get(reference.volumeId);
  if (!volume) {
    if (!isPromotedTextbookVolumeId(reference.volumeId)) {
      errors.push(`${label}.volumeId 未在 textbookAssetManifest.volumes 中定义：${String(reference.volumeId)}`);
    }
  } else if (reference.sourcePath !== volume.sourcePath) {
    errors.push(`${label}.sourcePath 必须匹配 ${reference.volumeId} 的教材 sourcePath：${volume.sourcePath}`);
  }

  if (typeof reference.lineRange === 'string') {
    const lineRangeMatch = /^(\d+)-(\d+)$/.exec(reference.lineRange);
    if (!lineRangeMatch) {
      errors.push(`${label}.lineRange 必须使用 起始行-结束行 格式：${reference.lineRange}`);
    } else if (Number(lineRangeMatch[1]) > Number(lineRangeMatch[2])) {
      errors.push(`${label}.lineRange 起始行不能大于结束行：${reference.lineRange}`);
    }
  }

  if (reference.assetId !== undefined) {
    validateRequiredText(reference.assetId, `${label}.assetId`);
    const asset = textbookAssetsById.get(reference.assetId);
    if (!asset) {
      errors.push(`${label}.assetId 未在 textbookAssetManifest.assets 中定义：${String(reference.assetId)}`);
    } else {
      if (asset.extractionStatus !== 'reviewed') {
        errors.push(`${label}.assetId 必须引用 reviewed 教材资产：${asset.id} 当前为 ${asset.extractionStatus}`);
      }
      if (asset.volumeId !== reference.volumeId) {
        errors.push(`${label}.assetId 必须与 volumeId 属于同一册教材：${asset.id}`);
      }
    }
  }

  if (reference.reviewedTextField !== undefined) {
    validateRequiredText(reference.reviewedTextField, `${label}.reviewedTextField`);
    if (!presentReviewedTextFields.has(reference.reviewedTextField)) {
      errors.push(`${label}.reviewedTextField 必须指向当前记录中的 formulaText/equationText：${String(reference.reviewedTextField)}`);
    }
  }
}

function validateReviewedAssetReferences(assetReferences, label) {
  if (!Array.isArray(assetReferences)) {
    errors.push(`${label}.assetReferences 必须是数组`);
    return;
  }

  for (const [index, assetReference] of assetReferences.entries()) {
    const assetReferenceLabel = `${label}.assetReferences[${index}]`;
    if (!isRecord(assetReference)) {
      errors.push(`${assetReferenceLabel} 必须是对象`);
      continue;
    }

    validateRequiredText(assetReference.assetId, `${assetReferenceLabel}.assetId`);
    if (!Number.isInteger(assetReference.sourceLineNumber) || assetReference.sourceLineNumber < 1) {
      errors.push(`${assetReferenceLabel}.sourceLineNumber 必须是正整数`);
    }
  }
}

function validateRequiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label} 必须是非空字符串`);
  }
}

function validateExperimentUnlockRequirements(reaction, validStageIds) {
  if (reaction.unlockRequirements === undefined) {
    return;
  }

  if (!isRecord(reaction.unlockRequirements)) {
    errors.push(`反应 ${reaction.id || 'unknown-reaction'} 的 unlockRequirements 必须是对象`);
    return;
  }

  const unlock = reaction.unlockRequirements;
  const allowedKeys = new Set(['curriculumTags', 'safetyLevels', 'stageIds', 'minimumLearnedElements', 'grade', 'chapter']);
  for (const key of Object.keys(unlock)) {
    if (!allowedKeys.has(key)) {
      errors.push(`反应 ${reaction.id || 'unknown-reaction'} 的 unlockRequirements.${key} is not allowed`);
    }
  }

  validateRequiredCurriculumTags(unlock.curriculumTags, `反应 ${reaction.id || 'unknown-reaction'} unlockRequirements.curriculumTags`);

  if (!Array.isArray(unlock.safetyLevels) || unlock.safetyLevels.length === 0) {
    errors.push(`反应 ${reaction.id || 'unknown-reaction'} unlockRequirements.safetyLevels 必须是非空数组`);
  } else {
    const seenSafetyLevels = new Set();
    for (const [index, safetyLevel] of unlock.safetyLevels.entries()) {
      if (!allowedSafetyLevels.includes(safetyLevel)) {
        errors.push(`反应 ${reaction.id || 'unknown-reaction'} unlockRequirements.safetyLevels[${index}] 非法：${String(safetyLevel)}`);
      }
      if (seenSafetyLevels.has(safetyLevel)) {
        errors.push(`反应 ${reaction.id || 'unknown-reaction'} unlockRequirements.safetyLevels 包含重复值：${String(safetyLevel)}`);
      }
      seenSafetyLevels.add(safetyLevel);
    }
    if (!unlock.safetyLevels.includes(reaction.safetyLevel)) {
      errors.push(`反应 ${reaction.id || 'unknown-reaction'} unlockRequirements.safetyLevels 必须保留并包含 safetyLevel：${String(reaction.safetyLevel)}`);
    }
  }

  if (!Array.isArray(unlock.stageIds) || (!isPromotedTextbookRecord(reaction) && unlock.stageIds.length === 0)) {
    errors.push(`反应 ${reaction.id || 'unknown-reaction'} unlockRequirements.stageIds 必须是非空数组`);
  } else {
    const seenStageIds = new Set();
    for (const [index, stageId] of unlock.stageIds.entries()) {
      if (typeof stageId !== 'string' || !stageId.trim()) {
        errors.push(`反应 ${reaction.id || 'unknown-reaction'} unlockRequirements.stageIds[${index}] 必须是非空字符串`);
      } else if (!validStageIds.has(stageId)) {
        errors.push(`反应 ${reaction.id || 'unknown-reaction'} unlockRequirements.stageIds[${index}] 引用了未知学习阶段：${stageId}`);
      }
      if (seenStageIds.has(stageId)) {
        errors.push(`反应 ${reaction.id || 'unknown-reaction'} unlockRequirements.stageIds 包含重复值：${String(stageId)}`);
      }
      seenStageIds.add(stageId);
    }
  }

  if (!Number.isInteger(unlock.minimumLearnedElements) || unlock.minimumLearnedElements < 0) {
    errors.push(`反应 ${reaction.id || 'unknown-reaction'} unlockRequirements.minimumLearnedElements 必须是非负整数`);
  }

  if (!validGrades.has(unlock.grade)) {
    errors.push(`反应 ${reaction.id || 'unknown-reaction'} unlockRequirements.grade 非法：${String(unlock.grade)}`);
  }

  if (typeof unlock.chapter !== 'string' || !unlock.chapter.trim()) {
    errors.push(`反应 ${reaction.id || 'unknown-reaction'} unlockRequirements.chapter 必须是非空字符串`);
  }
}

function validateRequiredCurriculumMetadata(record, label) {
  const referenceCount = validateRequiredCurriculumTags(record.curriculumTags, `${label}.curriculumTags`);
  validateDifficulty(record.difficulty, `${label}.difficulty`);
  return referenceCount;
}

function validateManualReviewAfterPromotionAchievement(achievement, label) {
  const tags = Array.isArray(achievement.curriculumTags) ? achievement.curriculumTags : [];
  if (tags.length !== 1) {
    errors.push(`${label}.curriculumTags 必须恰好包含 1 个 manual learning segment`);
  } else {
    validateRequiredText(tags[0], `${label}.curriculumTags[0]`);
  }

  if (achievement.sourceReviewStatus !== 'reviewed') {
    errors.push(`${label}.sourceReviewStatus 必须为 reviewed`);
  }

  if (!Array.isArray(achievement.sourceReferences) || achievement.sourceReferences.length === 0) {
    errors.push(`${label}.sourceReferences 必须至少包含 1 条完整来源记录`);
    return;
  }

  const requiredReferenceFields = [
    'sourceVolumeId',
    'volumeId',
    'sourcePath',
    'sourceHeading',
    'lineRange',
    'sourceHash',
    'candidateId',
    'reviewedBy',
    'reviewedAt',
    'note'
  ];

  const hasCompleteReference = achievement.sourceReferences.some((reference) => (
    isRecord(reference)
    && requiredReferenceFields.every((fieldName) => typeof reference[fieldName] === 'string' && reference[fieldName].trim())
  ));

  if (!hasCompleteReference) {
    errors.push(`${label}.sourceReferences 必须至少包含 1 条完整来源记录：${requiredReferenceFields.join(', ')}`);
  }
}

function isReactionGameUsableCandidate(reaction, reactants, products) {
  if (!isPromotedTextbookRecord(reaction)) {
    return true;
  }

  return reactants.length > 0 || products.length > 0 || reaction.gameUsable === true;
}

function validateGameUsableReactionContract(reaction, reactants, products) {
  const reactionId = reaction.id || 'unknown-reaction';
  validateRequiredText(reaction.id, `反应配对游戏反应 ${reactionId}.id`);
  validateRequiredText(reaction.name, `反应配对游戏反应 ${reactionId}.name`);
  validateRequiredText(reaction.description, `反应配对游戏反应 ${reactionId}.description`);

  if (reactants.length === 0) {
    errors.push(`反应配对游戏反应 ${reactionId} 缺少或为空 reactants`);
  }

  if (products.length === 0) {
    errors.push(`反应配对游戏反应 ${reactionId} 缺少或为空 products`);
  }

  validateRequiredCurriculumTags(reaction.curriculumTags, `反应配对游戏反应 ${reactionId}.curriculumTags`);

  if ((reaction.sourceReviewStatus !== undefined || reaction.sourceReferences !== undefined) && reaction.sourceReviewStatus !== 'reviewed') {
    errors.push(`反应配对游戏反应 ${reactionId}.sourceReviewStatus 必须为 reviewed`);
  }
}

function validateRequiredCurriculumTags(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label} 必须是非空数组`);
    return 0;
  }

  const seenTags = new Set();
  for (const [index, tagId] of value.entries()) {
    if (typeof tagId !== 'string' || !tagId.trim()) {
      errors.push(`${label}[${index}] 必须是非空字符串`);
      continue;
    }

    if (!runtimeCurriculumTagIds.has(tagId)) {
      errors.push(`${label}[${index}] 引用了未知 curriculum tag：${tagId}`);
    }

    if (seenTags.has(tagId)) {
      errors.push(`${label} 包含重复 curriculum tag：${tagId}`);
    }
    seenTags.add(tagId);
  }

  return value.length;
}

function validateDifficulty(value, label) {
  if (!validDifficultyBands.has(value)) {
    errors.push(`${label} 非法：${String(value)}`);
  }
}

function isPromotedTextbookRecord(record) {
  return typeof record?.id === 'string'
    && record.id.startsWith('textbook-')
    && record.sourceReviewStatus === 'reviewed';
}

function isPromotedTextbookVolumeId(volumeId) {
  return typeof volumeId === 'string'
    && (volumeId.startsWith('rj-chemistry-') || textbookVolumesById.has(volumeId));
}

function ensureArray(value, errorMessage) {
  if (Array.isArray(value)) {
    return value;
  }

  errors.push(errorMessage);
  return [];
}

function ensureObject(value, errorMessage) {
  if (isRecord(value)) {
    return value;
  }

  errors.push(errorMessage);
  return null;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateLearningSegmentTextbookContentLinkage(mode) {
  const learningAchievements = safeAchievementsData.filter(a =>
    a.category === 'learning' &&
    a.condition?.type === 'manualReviewAfterPromotion' &&
    a.sourceReviewStatus === 'reviewed' &&
    Array.isArray(a.sourceReferences) &&
    a.sourceReferences.length > 0 &&
    a.sourceReferences[0].lineRange
  );

  const contentRecords = structuredClone(learningSegmentTextbookContent);
  const contentMapByVolumeCandidate = new Map();
  const contentMapByVolumeSection = new Map();
  const contentMapByVolumeLineRange = new Map();
  const segmentIds = new Set();

  for (const record of contentRecords) {
    if (mode === 'missing-learning-segment-textbook-content' && record.segmentId === 'knowledge-topic-0004-source-section-l63-l74-105f9964c8') continue;

    if (mode === 'empty-learning-segment-textbook-content' && record.segmentId === 'knowledge-topic-0004-source-section-l63-l74-105f9964c8') {
      record.blocks = [];
    } else if (mode === 'invalid-learning-segment-textbook-content-block' && record.segmentId === 'knowledge-topic-0004-source-section-l63-l74-105f9964c8') {
      record.blocks = [{ type: 'raw-html', text: '<img onerror="window.bad=true">' }];
    }

    if (record.segmentId) {
      if (segmentIds.has(record.segmentId)) errors.push(`重复的 segmentId: ${record.segmentId}`);
      segmentIds.add(record.segmentId);
    }

    const volCand = `${record.sourceVolumeId}:${record.candidateId || ''}`;
    const volSect = `${record.sourceVolumeId}:${record.sourceSectionId || ''}`;
    const volLine = `${record.sourceVolumeId}:${record.lineRange}`;

    if (record.candidateId) {
      if (contentMapByVolumeCandidate.has(volCand)) errors.push(`重复的 sourceVolumeId+candidateId: ${volCand}`);
      contentMapByVolumeCandidate.set(volCand, record);
    }
    
    if (record.sourceSectionId) {
      if (contentMapByVolumeSection.has(volSect)) errors.push(`重复的 sourceVolumeId+sourceSectionId: ${volSect}`);
      contentMapByVolumeSection.set(volSect, record);
    }

    if (!contentMapByVolumeLineRange.has(volLine)) contentMapByVolumeLineRange.set(volLine, []);
    contentMapByVolumeLineRange.get(volLine).push(record);
  }

  for (const achievement of learningAchievements) {
    const tags = achievement.curriculumTags;
    if (!Array.isArray(tags) || tags.filter(t => t).length !== 1) {
      errors.push(`成就 ${achievement.id} 必须恰好包含 1 个 non-empty segmentId`);
      continue;
    }
    const segmentId = tags[0];

    const ref = achievement.sourceReferences[0];
    const vol = achievement.sourceVolumeId || ref.sourceVolumeId || ref.volumeId || '';
    const cand = ref.candidateId || '';
    const sect = cand.startsWith('achievement-') ? cand.slice('achievement-'.length) : '';
    const range = ref.lineRange;

    let record = contentMapByVolumeCandidate.get(`${vol}:${cand}`) ||
                 contentMapByVolumeSection.get(`${vol}:${sect}`) ||
                 null;

    if (!record && contentMapByVolumeLineRange.has(`${vol}:${range}`)) {
      const records = contentMapByVolumeLineRange.get(`${vol}:${range}`);
      if (records.length === 1) record = records[0];
      else errors.push(`成就 ${achievement.id} 使用 lineRange fallback 存在歧义: ${vol}:${range}`);
    }

    if (!record) {
      errors.push(`成就 ${achievement.id} 缺失 textbook content 记录 (segmentId: ${segmentId})`);
      continue;
    }

    if (!Array.isArray(record.blocks) || record.blocks.length === 0) {
      errors.push(`成就 ${achievement.id} textbook content 记录 blocks 为空 (segmentId: ${segmentId})`);
    }

    for (const block of record.blocks) {
      if (!['heading', 'paragraph', 'list'].includes(block.type)) {
        errors.push(`成就 ${achievement.id} 包含非法 block type: ${block.type}`);
      }
      if (block.type === 'heading' || block.type === 'paragraph') {
        if (typeof block.text !== 'string' || !block.text.trim()) {
           errors.push(`成就 ${achievement.id} 包含 empty text 在 block type ${block.type}`);
        }
      }
      if (block.type === 'list') {
        if (!Array.isArray(block.items) || block.items.some(i => typeof i !== 'string' || !i.trim())) {
          errors.push(`成就 ${achievement.id} list block 包含 empty items`);
        }
      }
    }

    if (record.sourceVolumeId !== vol) errors.push(`成就 ${achievement.id} sourceVolumeId mismatch`);
    if (cand && record.candidateId !== cand) errors.push(`成就 ${achievement.id} candidateId mismatch`);
    if (range && record.lineRange !== range) errors.push(`成就 ${achievement.id} lineRange mismatch`);
    if (!record.textbookName?.trim() || !record.rangeLabel?.trim()) errors.push(`成就 ${achievement.id} missing textbookName/rangeLabel`);
  }
}



function validateRuntimeSourceImportBoundary() {
  const srcRoot = path.resolve(process.cwd(), 'src');
  const textbookRoot = path.resolve(srcRoot, 'data', 'textbooks');
  const sourceFiles = listJavaScriptFiles(srcRoot);
  const forbiddenImportPattern = /(?:^|\n)\s*(?:import|export)\s+(?:[^'";]+\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const filePath of sourceFiles) {
    const source = readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(forbiddenImportPattern)) {
      const specifier = match[1] || match[2] || '';
      const normalizedSpecifier = specifier.replace(/\\/g, '/');
      const bareSpecifier = normalizedSpecifier.split(/[?#]/, 1)[0];
      const resolvedSpecifier = bareSpecifier.startsWith('.')
        ? path.resolve(path.dirname(filePath), bareSpecifier)
        : '';
      const importsTextbookSource = normalizedSpecifier.includes('src/data/textbooks')
        || normalizedSpecifier.includes('/data/textbooks/')
        || (resolvedSpecifier && (resolvedSpecifier === textbookRoot || resolvedSpecifier.startsWith(`${textbookRoot}${path.sep}`)));

      if (bareSpecifier.endsWith('.md') || importsTextbookSource) {
        errors.push(`运行时代码 ${path.relative(process.cwd(), filePath)} 不能导入原始教材 Markdown 或 src/data/textbooks：${specifier}`);
      }
    }
  }
}

function listJavaScriptFiles(directoryPath) {
  const files = [];
  for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJavaScriptFiles(entryPath));
    } else if (/\.[cm]?js$/i.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}


function validateComparisonReviewedSource(record, label) {
  if (record?.sourceReviewStatus !== 'reviewed') {
    errors.push(label + '.sourceReviewStatus 必须为 reviewed');
  }
  if (!Array.isArray(record?.sourceReferences) || record.sourceReferences.length === 0) {
    errors.push(label + '.sourceReferences 必须包含已审核 comparison 来源');
    return;
  }

  const presentReviewedTextFields = new Set([...notationFields.keys()].filter((fieldName) => record[fieldName] !== undefined));
  let hasCoreRange = false;
  let hasC60SupplementalRange = false;
  for (const [index, reference] of record.sourceReferences.entries()) {
    const referenceLabel = label + '.sourceReferences[' + index + ']';
    validateReviewedSourceReference(reference, referenceLabel, presentReviewedTextFields);
    if (reference?.lineRange === '3432-3462') {
      hasCoreRange = true;
    }
    if (reference?.lineRange === '3494-3504') {
      hasC60SupplementalRange = true;
    }
    if (reference?.lineRange === '3463-3489' || reference?.lineRange === '3483') {
      errors.push(referenceLabel + '.lineRange 不能使用活性炭污染区间：' + reference.lineRange);
    }
  }

  if (!hasCoreRange && !hasC60SupplementalRange) {
    errors.push(label + '.sourceReferences 必须引用 comparison 核心区间 3432-3462 或已审核 C60 区间 3494-3504');
  }
}


function validateTopicInventoryManifest(topic) {
  const inventoryItems = safeTextbookPilotContent.filter((item) => topicMatchesInventory(topic, item));
  if (inventoryItems.length === 0) {
    return;
  }

  validateExactStringSet(inventoryItems.map((item) => item.id).filter(Boolean), topic.inventory.exactIds, topic.topicLabel + ' inventory ID');

  if (Array.isArray(topic.inventory.reservedIds)) {
    for (const item of inventoryItems) {
      if (topic.inventory.reservedIds.includes(item.id)) {
        errors.push(topic.topicLabel + ' 不能复用保留 ID：' + item.id);
      }
    }
  }

  for (const item of inventoryItems) {
    topic.inventory.sourceValidator(item, topic.topicLabel + ' inventory ' + item.id);
  }

  if (Array.isArray(topic.inventory.draftIds) && topic.inventory.draftIds.length > 0) {
    for (const draftId of topic.inventory.draftIds) {
      if (safeReactions.some((reaction) => reaction?.id === draftId || reaction?.experimentId === draftId)) {
        errors.push(topic.topicLabel + ' draft-only experiment 不应泄漏到 runtime reactions：' + draftId);
      }
    }
  }
}

function validateTopicRuntimeScope(topic) {
  const inventorySignals = safeTextbookPilotContent.some((item) => topicMatchesInventory(topic, item));
  const quizMatches = safeQuizData.filter((quiz) => topicMatchesQuiz(topic, quiz));
  const stageMatches = safeStages.filter((stage) => topicMatchesStage(topic, stage));
  const challengeMatches = Object.entries(safeGameMeta ?? {}).filter(([, gameMeta]) => topicMatchesChallenge(topic, gameMeta));

  if (!inventorySignals && quizMatches.length === 0 && stageMatches.length === 0 && challengeMatches.length === 0) {
    return;
  }

  if (topic.runtime.quizIds && topic.runtime.quizIds.length > 0) {
    validateExactStringSet(quizMatches.map((quiz) => quiz.id).filter(Boolean), topic.runtime.quizIds, topic.topicLabel + ' runtime quiz ID');
    for (const quiz of quizMatches) {
      topic.runtime.sourceValidator(quiz, topic.topicLabel + ' runtime quiz ' + quiz.id);
    }
  }

  if (topic.runtime.progressIds) {
    validateExactStringSet(stageMatches.map((stage) => stage.id).filter(Boolean), topic.runtime.progressIds, topic.topicLabel + ' progress relation ID');
    for (const stage of stageMatches) {
      topic.runtime.sourceValidator(stage, topic.topicLabel + ' progress relation ' + stage.id);
    }
  }

  if (topic.runtime.challengeIds && topic.runtime.challengeIds.length > 0) {
    validateExactStringSet(challengeMatches.map(([, gameMeta]) => (topic.topicId === 'g9-carbon-allotropes-comparison' ? gameMeta.comparisonChallengeMetadata?.challengeId : gameMeta.challengeMetadata?.challengeId)).filter(Boolean), topic.runtime.challengeIds, topic.topicLabel + ' game challenge ID');
    for (const [gameId, gameMeta] of challengeMatches) {
      const challengeRecord = topic.topicId === 'g9-carbon-allotropes-comparison' ? gameMeta.comparisonChallengeMetadata : gameMeta.challengeMetadata;
      topic.runtime.sourceValidator(challengeRecord, topic.topicLabel + ' game challenge metadata ' + gameId + '.challengeMetadata');
    }
  }
}

function topicMatchesInventory(topic, item) {
  return Array.isArray(topic.inventory.exactIds) && topic.inventory.exactIds.includes(item?.id);
}

function topicMatchesQuiz(topic, quiz) {
  if (topic.topicId === 'g9-carbon-allotropes-comparison') {
    return ['quiz-carbon-allotropes-comparison-1', 'quiz-carbon-allotropes-comparison-2', 'quiz-carbon-allotropes-comparison-3'].includes(quiz?.id);
  }
  return Array.isArray(quiz?.curriculumTags) && quiz.curriculumTags.includes(topic.topicTag);
}

function topicMatchesStage(topic, stage) {
  if (topic.topicId === 'g9-carbon-allotropes-comparison') {
    return stage?.id === 'relation-carbon-allotropes-comparison';
  }
  return Array.isArray(stage?.curriculumTags) && stage.curriculumTags.includes(topic.topicTag);
}

function topicMatchesChallenge(topic, gameMeta) {
  if (topic.topicId === 'g9-carbon-c60-allotrope') {
    return gameMeta?.challengeMetadata?.challengeId === 'challenge-c60-carbon-topic'
      || (Array.isArray(gameMeta?.challengeMetadata?.curriculumTags) && gameMeta.challengeMetadata.curriculumTags.includes(topic.topicTag));
  }
  if (topic.topicId === 'g9-carbon-allotropes-comparison') {
    return gameMeta?.comparisonChallengeMetadata?.challengeId === 'challenge-carbon-allotropes-comparison';
  }
  return Array.isArray(gameMeta?.challengeMetadata?.curriculumTags) && gameMeta.challengeMetadata.curriculumTags.includes(topic.topicTag);
}

function topicMatchesRuntimeDraft(topic, item) {
  return topic.topicId === 'g9-carbon-allotropes-comparison' && item?.id === 'draft-exp-carbon-allotropes-observation';
}

function createComparisonQuizFixtures(options = {}) {
  const { sourceMode = 'valid', invalidQuizId = null } = options;
  const quizzes = [
    {
      id: invalidQuizId || 'quiz-carbon-allotropes-comparison-1',
      question: '金刚石、石墨和 C60 之间共同点是什么？',
      options: ['都属于碳的单质', '都属于金属', '都属于盐类', '都属于氧化物'],
      correctIndex: 0,
      category: 'comparison-topic',
      relatedElement: 6,
      explanation: '三者都属于碳的单质。',
      curriculumTags: ['g9-carbon-allotropes-comparison'],
      difficulty: '初中',
      sourceReviewStatus: 'reviewed',
      sourceReferences: sourceMode === 'missing-reviewed-source'
        ? []
        : [{
            volumeId: 'pep-chemistry-g9-2024',
            sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
            lineRange: sourceMode === 'contaminated' ? '3463-3489' : '3432-3462',
            note: 'comparison core evidence'
          }]
    },
    {
      id: 'quiz-carbon-allotropes-comparison-2',
      question: '金刚石和石墨的物理性质差异主要与什么有关？',
      options: ['原子排列不同', '元素周期表位置不同', '是否含水不同', '颜色不同'],
      correctIndex: 0,
      category: 'comparison-topic',
      relatedElement: 6,
      explanation: '性质差异主要与原子排列方式不同有关。',
      curriculumTags: ['g9-carbon-allotropes-comparison'],
      difficulty: '初中',
      sourceReviewStatus: 'reviewed',
      sourceReferences: [{
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3432-3462',
        note: 'comparison physical property evidence'
      }]
    },
    {
      id: 'quiz-carbon-allotropes-comparison-3',
      question: 'C60 的分子结构和什么相似？',
      options: ['足球', '正方体', '雪花', '水滴'],
      correctIndex: 0,
      category: 'comparison-topic',
      relatedElement: 6,
      explanation: 'C60 的分子结构和足球相似。',
      curriculumTags: ['g9-carbon-allotropes-comparison'],
      difficulty: '初中',
      sourceReviewStatus: 'reviewed',
      sourceReferences: [{
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3494-3504',
        assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
        reviewedTextField: 'formulaText',
        note: 'C60 comparison evidence'
      }],
      formulaText: 'C60',
      notationReviewStatus: 'reviewed',
      textbookAssetReferences: [{
        assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
        usage: 'formula',
        reviewedTextField: 'formulaText',
        note: 'C60 comparison evidence'
      }]
    }
  ];

  if (invalidQuizId) {
    quizzes.push({
      id: 'quiz-carbon-allotropes-comparison-1',
      question: '金刚石、石墨和 C60 之间共同点是什么？',
      options: ['都属于碳的单质', '都属于金属', '都属于盐类', '都属于氧化物'],
      correctIndex: 0,
      category: 'comparison-topic',
      relatedElement: 6,
      explanation: '三者都属于碳的单质。',
      curriculumTags: ['g9-carbon-allotropes-comparison'],
      difficulty: '初中',
      sourceReviewStatus: 'reviewed',
      sourceReferences: [{
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3432-3462',
        note: 'comparison core evidence'
      }]
    });
  }

  return quizzes;
}

function createComparisonStageFixture(options) {
  const { sourceMode = 'valid' } = options || {};
  return {
    id: 'relation-carbon-allotropes-comparison',
    name: 'carbon allotrope comparison relation',
    description: 'comparison progress relation',
    requiredCount: 50,
    curriculumTags: ['g9-carbon-allotropes-comparison'],
    unlockedGames: ['game-collector'],
    unlockedExperiments: ['exp-salt-formation'],
    unlockedFeatures: ['compare-view'],
    difficulty: '初中',
    sourceReviewStatus: 'reviewed',
    sourceReferences: [{
      volumeId: 'pep-chemistry-g9-2024',
      sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
      lineRange: sourceMode === 'contaminated' ? '3483' : '3432-3462',
      note: 'comparison progress evidence'
    }]
  };
}

function createComparisonChallengeFixture(options) {
  const { sourceMode = 'valid' } = options || {};
  return {
    challengeId: 'challenge-carbon-allotropes-comparison',
    curriculumTags: ['g9-carbon-allotropes-comparison'],
    challengeGoals: [
      { id: 'complete-comparison-quiz-set', label: '完成比较主题测验记录', target: 3, metric: 'comparisonQuestionIds' }
    ],
    scoringThresholds: { s: 90, a: 60, b: 30 },
    unlockMetadata: { stageIds: ['stage-3'], requiresTags: ['intro-element-symbols', 'g9-carbon-allotropes-comparison'], minimumLearnedElements: 50 },
    sourceReviewStatus: 'reviewed',
    sourceReferences: [{
      volumeId: 'pep-chemistry-g9-2024',
      sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
      lineRange: sourceMode === 'contaminated' ? '3483' : '3432-3462',
      note: 'comparison challenge evidence'
    }]
  };
}

function createComparisonPilotFixtures(options) {
  const { sourceMode = 'valid' } = options || {};
  return [
    {
      id: 'challenge-carbon-allotropes-comparison',
      kind: 'challenge',
      sourceReviewStatus: 'reviewed',
      sourceReferences: [{
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: sourceMode === 'contaminated' ? '3483' : '3432-3462',
        note: 'comparison challenge evidence'
      }]
    },
    {
      id: 'draft-exp-carbon-allotropes-observation',
      kind: 'draft-experiment',
      runtimeStatus: 'draft-only',
      sourceReviewStatus: 'reviewed',
      sourceReferences: [{
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3432-3462',
        note: 'comparison draft evidence'
      }]
    }
  ];
}
