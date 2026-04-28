import {
  achievementsData,
  allowedSafetyLevels,
  elements,
  learningPath,
  quizData,
  reactions
} from '../src/data/index.js';

const errors = [];
const elementIds = new Set(elements.map((element) => element.atomicNumber));
const elementSymbols = new Set(elements.map((element) => element.symbol));
const validFormulas = new Set(['H2', 'O2', 'Cl2', 'H2O', 'Fe2O3', 'NaOH', 'NaCl', 'CO2']);
const validGameIds = new Set(['game-memory', 'game-drag', 'game-reaction', 'game-collector']);
const validAchievementConditionTypes = new Set([
  'learnedElements',
  'completedExperiments',
  'quizAttempts',
  'quizPerfectScore',
  'gamePlays',
  'gameScore'
]);
const countBasedAchievementTypes = new Set([
  'learnedElements',
  'completedExperiments',
  'quizAttempts',
  'gamePlays',
  'gameScore'
]);
const safeQuizData = ensureArray(quizData, 'quizData 顶层必须是数组');
const safeReactions = ensureArray(reactions, 'reactions 顶层必须是数组');
const safeAchievementsData = ensureArray(achievementsData, 'achievementsData 顶层必须是数组');
const safeLearningPath = ensureObject(learningPath, 'learningPath 顶层必须是对象');
const safeStages = ensureArray(safeLearningPath?.stages, 'learningPath.stages 必须是数组');

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

  if (!elementIds.has(quiz.relatedElement)) {
    errors.push(`测验题目 ${quiz.id} 引用了不存在的元素 atomicNumber：${quiz.relatedElement}`);
  }

  if (!Array.isArray(quiz.options) || quiz.options.length !== 4) {
    errors.push(`测验题目 ${quiz.id} 必须包含 4 个选项`);
  }

  if (!Number.isInteger(quiz.correctIndex) || quiz.correctIndex < 0 || quiz.correctIndex > 3) {
    errors.push(`测验题目 ${quiz.id} 的 correctIndex 非法：${quiz.correctIndex}`);
  }

  if (Array.isArray(quiz.options) && !quiz.options.every((option) => typeof option === 'string' && option.trim())) {
    errors.push(`测验题目 ${quiz.id} 的选项必须全部为非空字符串`);
  }
}

const reactionIds = new Set();
const experimentIds = new Set();
for (const reaction of safeReactions) {
  if (!isRecord(reaction)) {
    errors.push('反应条目必须是对象');
    continue;
  }

  if (!reaction.id || !reaction.name || !reaction.description || !reaction.experimentId || !reaction.visualDescription) {
    errors.push(`反应数据存在空字段：${reaction.id || 'unknown-reaction'}`);
  }

  if (reactionIds.has(reaction.id)) {
    errors.push(`重复的反应 ID：${reaction.id}`);
  }
  reactionIds.add(reaction.id);

  if (experimentIds.has(reaction.experimentId)) {
    errors.push(`重复的 experimentId：${reaction.experimentId}`);
  }
  experimentIds.add(reaction.experimentId);

  const reactants = ensureArray(reaction.reactants, `反应 ${reaction.id || 'unknown-reaction'} 的 reactants 必须是数组`);
  const products = ensureArray(reaction.products, `反应 ${reaction.id || 'unknown-reaction'} 的 products 必须是数组`);

  for (const symbol of [...reactants, ...products]) {
    if (typeof symbol !== 'string' || !symbol.trim()) {
      errors.push(`反应 ${reaction.id || 'unknown-reaction'} 包含非法 reactant/product 条目：${String(symbol)}`);
      continue;
    }

    if (!elementSymbols.has(symbol) && !validFormulas.has(symbol)) {
      errors.push(`反应 ${reaction.id} 引用了未知的元素符号或化学式：${symbol}`);
    }
  }

  if (!allowedSafetyLevels.includes(reaction.safetyLevel)) {
    errors.push(`反应 ${reaction.id} 的 safetyLevel 非法：${reaction.safetyLevel}`);
  }

  if (reactants.length === 0 || products.length === 0) {
    errors.push(`反应 ${reaction.id} 必须包含非空的 reactants/products 数组`);
  }
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

    if (achievement.condition.type === 'gameScore') {
      if (typeof achievement.condition.gameKey !== 'string' || !achievement.condition.gameKey.trim()) {
        errors.push(`成就 ${achievement.id} 的 gameScore 条件缺少 gameKey`);
      } else if (!validGameIds.has(achievement.condition.gameKey)) {
        errors.push(`成就 ${achievement.id} 引用了不存在的游戏 ID：${achievement.condition.gameKey}`);
      }
    }
  } else {
    errors.push(`成就 ${achievement.id} 的条件格式非法`);
  }
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
}

if (errors.length > 0) {
  console.error('支持数据校验失败：');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`支持数据校验通过：${safeQuizData.length} 道题、${safeReactions.length} 个反应、${safeAchievementsData.length} 个成就、${safeStages.length} 个学习阶段。`);

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
