import { parseArgs } from 'node:util';

import { allowedSafetyLevels, curriculumTags, learningPath, reactions } from '../src/data/index.js';
import { GAME_META } from '../src/data/contentMeta.js';

const expectedDifficultyBands = ['入门', '初中', '高中基础', '高中进阶'];
const allowedDifficultyBands = new Set(expectedDifficultyBands);
const allowedGrades = new Set(['入门', '七年级', '八年级', '九年级', '高一', '高二', '高三']);
const allowedSchoolLevels = new Set(['入门', '初中', '高中']);
const allowedTagStatuses = new Set(['seed', 'draft', 'reviewed', 'published']);
const allowedSourceVolumeIds = new Set([
  'app-intro-core',
  'pep-chemistry-g9-2024',
  'pep-chemistry-g10-required-1',
  'pep-chemistry-g10-required-2',
  'pep-chemistry-g11-selective-1',
  'pep-chemistry-g11-selective-2',
  'pep-chemistry-g12-selective-3'
]);
const allowedTagKeys = new Set([
  'id',
  'grade',
  'schoolLevel',
  'chapter',
  'topic',
  'displayPath',
  'difficulty',
  'aliases',
  'sourceVolumeId',
  'sourceHeading',
  'prerequisites',
  'status',
  'experimentUnlocks',
  'gameChallengeRules'
]);
const allowedExperimentUnlockKeys = new Set(['id', 'experimentId', 'requiresTags', 'difficulty', 'description']);
const allowedReactionUnlockKeys = new Set([
  'curriculumTags',
  'safetyLevels',
  'stageIds',
  'minimumLearnedElements',
  'grade',
  'chapter'
]);
const expectedGameIds = ['drag', 'memory', 'reaction'];
const allowedGameChallengeMetadataKeys = new Set([
  'challengeId',
  'curriculumTags',
  'challengeGoals',
  'scoringThresholds',
  'unlockMetadata',
  'sourceVolumeId',
  'sourceReviewStatus',
  'sourceReferences'
]);
const allowedChallengeGoalKeys = new Set(['id', 'label', 'target', 'metric']);
const allowedScoringThresholdKeys = new Set(['s', 'a', 'b']);
const allowedUnlockMetadataKeys = new Set(['stageIds', 'requiresTags', 'minimumLearnedElements', 'achievementIds']);
const allowedGameRuleKeys = new Set([
  'id',
  'gameId',
  'challengeId',
  'curriculumTags',
  'requiresTags',
  'difficulty',
  'challengeGoals',
  'scoringThresholds',
  'unlockMetadata',
  'displayName',
  'title',
  'description'
]);
const forbiddenGameRuleMutationKeys = new Set([
  'rulesByDifficulty',
  'coreRulesByDifficulty',
  'difficultyRules',
  'ruleOverrides',
  'ruleOverridesByDifficulty'
]);
const validGameIds = new Set(expectedGameIds);
const selfCheckModes = new Set([
  'unknown-tag',
  'invalid-difficulty',
  'prerequisite-cycle',
  'invalid-experiment-unlock',
  'game-rule-difficulty-change'
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

  const dataset = options.selfCheckInvalid
    ? buildInvalidFixture({ curriculumTags, reactions, gameMeta: GAME_META }, options.selfCheckInvalid)
    : { curriculumTags, reactions, gameMeta: GAME_META };
  const errors = validateCurriculum(dataset.curriculumTags, {
    reactions: dataset.reactions,
    gameMeta: dataset.gameMeta,
    learningPath,
    allowedSafetyLevels
  });

  if (options.selfCheckInvalid) {
    finishSelfCheck(options.selfCheckInvalid, errors);
    return;
  }

  finishValidation(errors);
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      'self-check-invalid': { type: 'string' }
    },
    strict: true
  });

  const selfCheckInvalid = values['self-check-invalid'] ?? null;
  if (selfCheckInvalid !== null && !selfCheckModes.has(selfCheckInvalid)) {
    throw new Error(`--self-check-invalid must be one of: ${[...selfCheckModes].join(', ')}`);
  }

  return {
    help: values.help === true,
    selfCheckInvalid
  };
}

function printHelp() {
  console.log(`Curriculum validator / 课程标签校验器

Usage:
  node scripts/validate-curriculum.mjs [options]

Modes:
  full mode (default)                 Validate canonical curriculumTags from src/data/index.js.
  --self-check-invalid <mode>         Confirm one deterministic invalid fixture is rejected.
  --help                              Show this help.

Invalid fixture modes:
  ${[...selfCheckModes].join('|')}`);
}

function validateCurriculum(tags, supportingData = {}) {
  const errors = [];

  validateDifficultyBands(errors);
  const safeTags = ensureObject(tags, 'curriculumTags 顶层必须是对象', errors) ?? {};
  const tagIds = new Set(Object.keys(safeTags));
  const safeLearningStages = Array.isArray(supportingData.learningPath?.stages) ? supportingData.learningPath.stages : [];
  const runtimeTagIds = new Set([
    ...tagIds,
    ...safeLearningStages.flatMap((stage) => Array.isArray(stage?.curriculumTags) ? stage.curriculumTags : [])
  ]);

  for (const [key, tag] of Object.entries(safeTags)) {
    const label = `curriculumTags.${key}`;
    if (!isRecord(tag)) {
      errors.push(`${label} 必须是对象`);
      continue;
    }

    validateAllowedKeys(tag, label, allowedTagKeys, errors);
    validateTagIdentity(key, tag, label, tagIds, errors);
    validateTagMetadata(tag, label, errors);
    validatePrerequisites(tag, label, tagIds, errors);
    validateExperimentUnlocks(tag, label, tagIds, errors);
    validateGameChallengeRules(tag, label, tagIds, errors);
  }

  validateAcyclicPrerequisites(safeTags, errors);
  validateReactionExperimentUnlocks(supportingData, runtimeTagIds, errors);
  validateGameMetadataChallenges(supportingData, runtimeTagIds, errors);
  return errors;
}

function validateDifficultyBands(errors) {
  if (expectedDifficultyBands.length !== 4) {
    errors.push(`difficultyBands 必须恰好包含 4 个值，实际 ${expectedDifficultyBands.length}`);
  }

  const expectedSet = new Set(['入门', '初中', '高中基础', '高中进阶']);
  for (const band of expectedDifficultyBands) {
    if (!expectedSet.has(band)) {
      errors.push(`difficultyBands 包含非法值：${String(band)}`);
    }
  }

  if (new Set(expectedDifficultyBands).size !== expectedDifficultyBands.length) {
    errors.push('difficultyBands 包含重复值');
  }
}

function validateTagIdentity(key, tag, label, tagIds, errors) {
  validateStableId(key, `${label} key`, errors);
  validateRequiredText(tag.id, `${label}.id`, errors);

  if (tag.id !== key) {
    errors.push(`${label}.id 必须与对象 key 一致：key=${key} id=${String(tag.id)}`);
  }

  if (typeof tag.id === 'string' && tag.id.trim() && !tagIds.has(tag.id)) {
    errors.push(`${label}.id 未出现在 curriculumTags key 集合中：${tag.id}`);
  }
}

function validateTagMetadata(tag, label, errors) {
  validateEnum(tag.grade, `${label}.grade`, allowedGrades, errors);
  validateEnum(tag.schoolLevel, `${label}.schoolLevel`, allowedSchoolLevels, errors);
  validateRequiredText(tag.chapter, `${label}.chapter`, errors);
  validateRequiredText(tag.topic, `${label}.topic`, errors);
  validateRequiredText(tag.displayPath, `${label}.displayPath`, errors);
  validateEnum(tag.difficulty, `${label}.difficulty`, allowedDifficultyBands, errors);
  validateEnum(tag.sourceVolumeId, `${label}.sourceVolumeId`, allowedSourceVolumeIds, errors);
  validateRequiredText(tag.sourceHeading, `${label}.sourceHeading`, errors);
  validateEnum(tag.status, `${label}.status`, allowedTagStatuses, errors);
  validateAliases(tag.aliases, `${label}.aliases`, errors);

  if (tag.schoolLevel === '入门' && tag.grade !== '入门') {
    errors.push(`${label}.grade 必须与 入门 schoolLevel 保持一致`);
  }
  if (['七年级', '八年级', '九年级'].includes(tag.grade) && tag.schoolLevel !== '初中') {
    errors.push(`${label}.schoolLevel 必须与初中 grade 保持一致：${tag.grade}`);
  }
  if (['高一', '高二', '高三'].includes(tag.grade) && tag.schoolLevel !== '高中') {
    errors.push(`${label}.schoolLevel 必须与高中 grade 保持一致：${tag.grade}`);
  }
}

function validateAliases(aliases, label, errors) {
  if (!Array.isArray(aliases) || aliases.length === 0) {
    errors.push(`${label} 必须是非空数组`);
    return;
  }

  const seenAliases = new Set();
  for (const [index, alias] of aliases.entries()) {
    if (typeof alias !== 'string' || !alias.trim()) {
      errors.push(`${label}[${index}] 必须是非空字符串`);
      continue;
    }
    if (alias !== alias.trim()) {
      errors.push(`${label}[${index}] 不能包含首尾空白`);
    }
    if (seenAliases.has(alias)) {
      errors.push(`${label} 包含重复别名：${alias}`);
    }
    seenAliases.add(alias);
  }
}

function validatePrerequisites(tag, label, tagIds, errors) {
  if (!Array.isArray(tag.prerequisites)) {
    errors.push(`${label}.prerequisites 必须是数组`);
    return;
  }

  const seenPrerequisites = new Set();
  for (const [index, prerequisiteId] of tag.prerequisites.entries()) {
    validateTagReference(prerequisiteId, `${label}.prerequisites[${index}]`, tagIds, errors);
    if (prerequisiteId === tag.id) {
      errors.push(`${label}.prerequisites[${index}] 不能引用自身`);
    }
    if (seenPrerequisites.has(prerequisiteId)) {
      errors.push(`${label}.prerequisites 包含重复引用：${String(prerequisiteId)}`);
    }
    seenPrerequisites.add(prerequisiteId);
  }
}

function validateExperimentUnlocks(tag, label, tagIds, errors) {
  if (tag.experimentUnlocks === undefined) {
    return;
  }

  if (!Array.isArray(tag.experimentUnlocks)) {
    errors.push(`${label}.experimentUnlocks 必须是数组`);
    return;
  }

  const unlockIds = new Set();
  for (const [index, unlock] of tag.experimentUnlocks.entries()) {
    const unlockLabel = `${label}.experimentUnlocks[${index}]`;
    if (!isRecord(unlock)) {
      errors.push(`${unlockLabel} 必须是对象`);
      continue;
    }

    validateAllowedKeys(unlock, unlockLabel, allowedExperimentUnlockKeys, errors);
    validateStableId(unlock.id, `${unlockLabel}.id`, errors);
    validateStableId(unlock.experimentId, `${unlockLabel}.experimentId`, errors);
    validateOptionalTagReferences(unlock.requiresTags, `${unlockLabel}.requiresTags`, tagIds, errors);
    validateOptionalDifficulty(unlock.difficulty, `${unlockLabel}.difficulty`, errors);
    validateOptionalText(unlock.description, `${unlockLabel}.description`, errors);

    if (unlockIds.has(unlock.id)) {
      errors.push(`${label}.experimentUnlocks 包含重复 id：${String(unlock.id)}`);
    }
    unlockIds.add(unlock.id);
  }
}

function validateReactionExperimentUnlocks(supportingData, tagIds, errors) {
  const safeReactions = Array.isArray(supportingData.reactions) ? supportingData.reactions : [];
  const safeLearningStages = Array.isArray(supportingData.learningPath?.stages) ? supportingData.learningPath.stages : [];
  const validStageIds = new Set(safeLearningStages.map((stage) => stage.id).filter((id) => typeof id === 'string'));
  const validSafetyLevels = new Set(Array.isArray(supportingData.allowedSafetyLevels) ? supportingData.allowedSafetyLevels : []);

  for (const [index, reaction] of safeReactions.entries()) {
    const label = `reactions[${index}]`;
    if (!isRecord(reaction)) {
      errors.push(`${label} 必须是对象`);
      continue;
    }

    validateStableId(reaction.experimentId, `${label}.experimentId`, errors);
    if (!validSafetyLevels.has(reaction.safetyLevel)) {
      errors.push(`${label}.safetyLevel 非法：${String(reaction.safetyLevel)}`);
    }

    const unlock = reaction.unlockRequirements;
    if (unlock === undefined) {
      continue;
    }

    const unlockLabel = `${label}.unlockRequirements`;
    if (!isRecord(unlock)) {
      errors.push(`${unlockLabel} 必须是对象`);
      continue;
    }

    validateAllowedKeys(unlock, unlockLabel, allowedReactionUnlockKeys, errors);
    validateOptionalTagReferences(unlock.curriculumTags, `${unlockLabel}.curriculumTags`, tagIds, errors);
    validateSafetyLevelReferences(unlock.safetyLevels, `${unlockLabel}.safetyLevels`, validSafetyLevels, errors);
    validateStageReferences(unlock.stageIds, `${unlockLabel}.stageIds`, validStageIds, errors, { allowEmpty: isPromotedTextbookRecord(reaction) });
    validateMinimumLearnedElements(unlock.minimumLearnedElements, `${unlockLabel}.minimumLearnedElements`, errors);
    validateOptionalGrade(unlock.grade, `${unlockLabel}.grade`, errors);
    validateOptionalText(unlock.chapter, `${unlockLabel}.chapter`, errors);

    if (Array.isArray(unlock.safetyLevels) && !unlock.safetyLevels.includes(reaction.safetyLevel)) {
      errors.push(`${unlockLabel}.safetyLevels 必须包含当前 reaction.safetyLevel：${String(reaction.safetyLevel)}`);
    }

    if (Array.isArray(unlock.curriculumTags) && Array.isArray(reaction.curriculumTags)) {
      for (const tagId of unlock.curriculumTags) {
        if (typeof tagId === 'string' && !reaction.curriculumTags.includes(tagId)) {
          errors.push(`${unlockLabel}.curriculumTags 引用的标签未出现在 reaction.curriculumTags：${tagId}`);
        }
      }
    }
  }
}

function validateSafetyLevelReferences(value, label, validSafetyLevels, errors) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label} 必须是非空数组`);
    return;
  }

  const seenLevels = new Set();
  for (const [index, level] of value.entries()) {
    if (!validSafetyLevels.has(level)) {
      errors.push(`${label}[${index}] 引用了非法 safetyLevel：${String(level)}`);
    }
    if (seenLevels.has(level)) {
      errors.push(`${label} 包含重复 safetyLevel：${String(level)}`);
    }
    seenLevels.add(level);
  }
}

function validateStageReferences(value, label, validStageIds, errors, options = {}) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || (!options.allowEmpty && value.length === 0)) {
    errors.push(`${label} 必须是非空数组`);
    return;
  }

  const seenStages = new Set();
  for (const [index, stageId] of value.entries()) {
    validateStableId(stageId, `${label}[${index}]`, errors);
    if (typeof stageId === 'string' && stageId.trim() && !validStageIds.has(stageId)) {
      errors.push(`${label}[${index}] 引用了未知 learning stage：${stageId}`);
    }
    if (seenStages.has(stageId)) {
      errors.push(`${label} 包含重复 stageId：${String(stageId)}`);
    }
    seenStages.add(stageId);
  }
}

function validateMinimumLearnedElements(value, label, errors) {
  if (value === undefined) {
    return;
  }

  if (!Number.isInteger(value) || value < 0) {
    errors.push(`${label} 必须是非负整数`);
  }
}

function validateOptionalGrade(value, label, errors) {
  if (value === undefined) {
    return;
  }

  validateEnum(value, label, allowedGrades, errors);
}

function validateGameMetadataChallenges(supportingData, tagIds, errors) {
  const safeGameMeta = ensureObject(supportingData.gameMeta, 'GAME_META 顶层必须是对象', errors) ?? {};
  const gameIds = Object.keys(safeGameMeta);
  validateExactStringSet(gameIds, expectedGameIds, 'GAME_META 游戏 ID', errors);
  const safeLearningStages = Array.isArray(supportingData.learningPath?.stages) ? supportingData.learningPath.stages : [];
  const validStageIds = new Set(safeLearningStages.map((stage) => stage.id).filter((id) => typeof id === 'string'));

  for (const gameId of expectedGameIds) {
    const meta = safeGameMeta[gameId];
    const metaLabel = `GAME_META.${gameId}`;
    if (!isRecord(meta)) {
      errors.push(`${metaLabel} 必须是对象`);
      continue;
    }

    validateRequiredText(meta.title, `${metaLabel}.title`, errors);
    validateRequiredText(meta.kicker, `${metaLabel}.kicker`, errors);
    validateRequiredText(meta.description, `${metaLabel}.description`, errors);
    validateOptionalTagReferences(meta.curriculumTags, `${metaLabel}.curriculumTags`, tagIds, errors);
    validateOptionalDifficulty(meta.difficulty, `${metaLabel}.difficulty`, errors);
    validateGameChallengeMetadata(meta.challengeMetadata, `${metaLabel}.challengeMetadata`, tagIds, validStageIds, errors);
    if (meta.comparisonChallengeMetadata !== undefined) {
      validateGameChallengeMetadata(meta.comparisonChallengeMetadata, `${metaLabel}.comparisonChallengeMetadata`, tagIds, validStageIds, errors);
    }
  }
}

function validateGameChallengeMetadata(challenge, label, tagIds, validStageIds, errors) {
  if (!isRecord(challenge)) {
    errors.push(`${label} 必须是对象`);
    return;
  }

  validateAllowedKeys(challenge, label, allowedGameChallengeMetadataKeys, errors);
  validateNoDifficultyRuleMutationDeep(challenge, label, errors);
  validateStableId(challenge.challengeId, `${label}.challengeId`, errors);
  validateRequiredCurriculumTags(challenge.curriculumTags, `${label}.curriculumTags`, tagIds, errors);
  validateChallengeGoals(challenge.challengeGoals, `${label}.challengeGoals`, errors);
  validateScoringThresholds(challenge.scoringThresholds, `${label}.scoringThresholds`, errors);
  validateUnlockMetadata(challenge.unlockMetadata, `${label}.unlockMetadata`, tagIds, validStageIds, errors);
}

function validateRequiredCurriculumTags(value, label, tagIds, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label} 必须是非空数组`);
    return;
  }

  validateOptionalTagReferences(value, label, tagIds, errors);
}

function validateChallengeGoals(value, label, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label} 必须是非空数组`);
    return;
  }

  const goalIds = new Set();
  for (const [index, goal] of value.entries()) {
    const goalLabel = `${label}[${index}]`;
    if (!isRecord(goal)) {
      errors.push(`${goalLabel} 必须是对象`);
      continue;
    }

    validateAllowedKeys(goal, goalLabel, allowedChallengeGoalKeys, errors);
    validateStableId(goal.id, `${goalLabel}.id`, errors);
    validateRequiredText(goal.label, `${goalLabel}.label`, errors);
    validateRequiredText(goal.metric, `${goalLabel}.metric`, errors);
    if (!Number.isFinite(goal.target) || goal.target < 0) {
      errors.push(`${goalLabel}.target 必须是非负数字`);
    }
    if (goalIds.has(goal.id)) {
      errors.push(`${label} 包含重复目标 id：${String(goal.id)}`);
    }
    goalIds.add(goal.id);
  }
}

function validateScoringThresholds(value, label, errors) {
  if (!isRecord(value)) {
    errors.push(`${label} 必须是对象`);
    return;
  }

  validateAllowedKeys(value, label, allowedScoringThresholdKeys, errors);
  for (const tier of allowedScoringThresholdKeys) {
    if (!Number.isFinite(value[tier]) || value[tier] < 0) {
      errors.push(`${label}.${tier} 必须是非负数字`);
    }
  }
  if (Number(value.s) < Number(value.a) || Number(value.a) < Number(value.b)) {
    errors.push(`${label} 必须保持 s >= a >= b`);
  }
}

function validateUnlockMetadata(value, label, tagIds, validStageIds, errors) {
  if (!isRecord(value)) {
    errors.push(`${label} 必须是对象`);
    return;
  }

  validateAllowedKeys(value, label, allowedUnlockMetadataKeys, errors);
  validateStageReferences(value.stageIds, `${label}.stageIds`, validStageIds, errors);
  validateRequiredCurriculumTags(value.requiresTags, `${label}.requiresTags`, tagIds, errors);
  validateMinimumLearnedElements(value.minimumLearnedElements, `${label}.minimumLearnedElements`, errors);
  if (value.achievementIds !== undefined) {
    validateNonEmptyTextArray(value.achievementIds, `${label}.achievementIds`, errors);
  }
}

function validateNonEmptyTextArray(value, label, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label} 必须是非空数组`);
    return;
  }

  for (const [index, item] of value.entries()) {
    validateRequiredText(item, `${label}[${index}]`, errors);
  }
}

function validateExactStringSet(actualValues, expectedValues, label, errors) {
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

function validateGameChallengeRules(tag, label, tagIds, errors) {
  if (tag.gameChallengeRules === undefined) {
    return;
  }

  if (!Array.isArray(tag.gameChallengeRules)) {
    errors.push(`${label}.gameChallengeRules 必须是数组`);
    return;
  }

  const ruleIds = new Set();
  for (const [index, rule] of tag.gameChallengeRules.entries()) {
    const ruleLabel = `${label}.gameChallengeRules[${index}]`;
    if (!isRecord(rule)) {
      errors.push(`${ruleLabel} 必须是对象`);
      continue;
    }

    validateAllowedKeys(rule, ruleLabel, allowedGameRuleKeys, errors);
    validateNoDifficultyRuleMutation(rule, ruleLabel, errors);
    validateStableId(rule.id, `${ruleLabel}.id`, errors);
    validateEnum(rule.gameId, `${ruleLabel}.gameId`, validGameIds, errors);
    validateStableId(rule.challengeId, `${ruleLabel}.challengeId`, errors);
    validateOptionalTagReferences(rule.curriculumTags, `${ruleLabel}.curriculumTags`, tagIds, errors);
    validateOptionalTagReferences(rule.requiresTags, `${ruleLabel}.requiresTags`, tagIds, errors);
    validateOptionalDifficulty(rule.difficulty, `${ruleLabel}.difficulty`, errors);
    validateOptionalMetadata(rule.challengeGoals, `${ruleLabel}.challengeGoals`, errors);
    validateOptionalMetadata(rule.scoringThresholds, `${ruleLabel}.scoringThresholds`, errors);
    validateOptionalMetadata(rule.unlockMetadata, `${ruleLabel}.unlockMetadata`, errors);
    validateOptionalText(rule.displayName, `${ruleLabel}.displayName`, errors);
    validateOptionalText(rule.title, `${ruleLabel}.title`, errors);
    validateOptionalText(rule.description, `${ruleLabel}.description`, errors);

    if (ruleIds.has(rule.id)) {
      errors.push(`${label}.gameChallengeRules 包含重复 id：${String(rule.id)}`);
    }
    ruleIds.add(rule.id);
  }
}

function validateNoDifficultyRuleMutation(rule, label, errors) {
  validateNoDifficultyRuleMutationDeep(rule, label, errors);
}

function validateNoDifficultyRuleMutationDeep(value, label, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNoDifficultyRuleMutationDeep(item, `${label}[${index}]`, errors));
    return;
  }
  if (!isRecord(value)) {
    return;
  }

  const keys = Object.keys(value);
  const difficultyKeys = keys.filter((key) => allowedDifficultyBands.has(key));
  if (difficultyKeys.length > 0 && difficultyKeys.length === keys.length) {
    errors.push(`${label} 不能以 difficulty 分支改变挑战或核心规则`);
  }

  for (const key of keys) {
    if (forbiddenGameRuleMutationKeys.has(key) || /(?:rules?|overrides?)ByDifficulty$/i.test(key)) {
      errors.push(`${label}.${key} 不能按 difficulty 改变核心游戏规则`);
    }
    validateNoDifficultyRuleMutationDeep(value[key], `${label}.${key}`, errors);
  }
}

function validateAcyclicPrerequisites(tags, errors) {
  const visiting = new Set();
  const visited = new Set();

  for (const tagId of Object.keys(tags)) {
    visitPrerequisite(tagId, tags, visiting, visited, [], errors);
  }
}

function visitPrerequisite(tagId, tags, visiting, visited, path, errors) {
  if (visited.has(tagId)) {
    return;
  }

  if (visiting.has(tagId)) {
    errors.push(`prerequisites 存在循环：${[...path, tagId].join(' -> ')}`);
    return;
  }

  const tag = tags[tagId];
  if (!isRecord(tag) || !Array.isArray(tag.prerequisites)) {
    return;
  }

  visiting.add(tagId);
  for (const prerequisiteId of tag.prerequisites) {
    if (typeof prerequisiteId === 'string' && Object.hasOwn(tags, prerequisiteId)) {
      visitPrerequisite(prerequisiteId, tags, visiting, visited, [...path, tagId], errors);
    }
  }
  visiting.delete(tagId);
  visited.add(tagId);
}

function validateOptionalTagReferences(value, label, tagIds, errors) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    errors.push(`${label} 必须是数组`);
    return;
  }

  for (const [index, tagId] of value.entries()) {
    validateTagReference(tagId, `${label}[${index}]`, tagIds, errors);
  }
}

function validateTagReference(value, label, tagIds, errors) {
  validateRequiredText(value, label, errors);
  if (typeof value === 'string' && value.trim() && !tagIds.has(value)) {
    errors.push(`${label} 引用了未知 curriculum tag：${value}`);
  }
}

function validateOptionalDifficulty(value, label, errors) {
  if (value === undefined) {
    return;
  }

  validateEnum(value, label, allowedDifficultyBands, errors);
}

function validateOptionalMetadata(value, label, errors) {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    errors.push(`${label} 必须是对象`);
  }
}

function validateOptionalText(value, label, errors) {
  if (value === undefined) {
    return;
  }

  validateRequiredText(value, label, errors);
}

function validateRequiredText(value, label, errors) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label} 必须是非空字符串`);
  }
}

function validateStableId(value, label, errors) {
  validateRequiredText(value, label, errors);
  if (typeof value === 'string' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    errors.push(`${label} 必须是 kebab-case 稳定 ID：${value}`);
  }
}

function validateEnum(value, label, allowedValues, errors) {
  if (!allowedValues.has(value)) {
    errors.push(`${label} 非法：${String(value)}`);
  }
}

function ensureObject(value, errorMessage, errors) {
  if (isRecord(value)) {
    return value;
  }

  errors.push(errorMessage);
  return null;
}

function validateAllowedKeys(value, label, allowedKeys, errors) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(`${label}.${key} is not allowed`);
    }
  }
}

function buildInvalidFixture(sourceData, mode) {
  const fixture = {
    curriculumTags: structuredClone(sourceData.curriculumTags),
    reactions: structuredClone(sourceData.reactions),
    gameMeta: structuredClone(sourceData.gameMeta)
  };
  const intro = fixture.curriculumTags['intro-element-symbols'];
  const neutralization = fixture.curriculumTags['g9-acid-base-salt-neutralization'];
  const redox = fixture.curriculumTags['g10-redox-valence-change'];

  if (mode === 'unknown-tag') {
    neutralization.prerequisites = ['missing-curriculum-tag'];
  } else if (mode === 'invalid-difficulty') {
    intro.difficulty = '小学';
  } else if (mode === 'prerequisite-cycle') {
    intro.prerequisites = ['g10-redox-valence-change'];
    redox.prerequisites = ['intro-element-symbols'];
  } else if (mode === 'invalid-experiment-unlock') {
    intro.experimentUnlocks = [
      {
        id: 'intro-water-electrolysis',
        experimentId: '',
        requiresTags: ['missing-curriculum-tag'],
        difficulty: '入门'
      }
    ];
    fixture.reactions[0].unlockRequirements = {
      curriculumTags: ['missing-curriculum-tag'],
      safetyLevels: ['unsafe'],
      stageIds: ['missing-stage'],
      minimumLearnedElements: -1,
      grade: '小学',
      chapter: ''
    };
  } else if (mode === 'game-rule-difficulty-change') {
    fixture.gameMeta.memory.challengeMetadata.rulesByDifficulty = {
      入门: { pairCount: 4 },
      初中: { pairCount: 8 }
    };
  }

  return fixture;
}

function finishSelfCheck(mode, errors) {
  if (errors.length > 0) {
    console.log(`curriculum invalid fixture rejected: ${mode}`);
    return;
  }

  console.error(`课程标签非法夹具自检失败：${mode} 未被拒绝`);
  process.exit(1);
}

function finishValidation(errors) {
  if (errors.length > 0) {
    console.error('课程标签校验失败：');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('curriculumTags: valid');
  console.log('difficultyBands: valid');
  console.log('prerequisites: acyclic');
  console.log('experimentUnlocks: valid');
  console.log('gameChallengeRules: valid');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPromotedTextbookRecord(record) {
  return typeof record?.id === 'string'
    && record.id.startsWith('textbook-')
    && record.sourceReviewStatus === 'reviewed';
}
