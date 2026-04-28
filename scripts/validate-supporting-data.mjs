import { elements, allowedSafetyLevels } from '../src/data/elements.js';
import { quizData } from '../src/data/quizData.js';
import { reactions } from '../src/data/reactions.js';
import { achievementsData } from '../src/data/achievementsData.js';
import { learningPath } from '../src/data/learningPath.js';

const errors = [];
const elementIds = new Set(elements.map((element) => element.atomicNumber));
const elementSymbols = new Set(elements.map((element) => element.symbol));
const validFormulas = new Set(['H2', 'O2', 'Cl2', 'H2O', 'Fe2O3', 'NaOH', 'NaCl', 'CO2']);
const validGameIds = new Set(['game-memory', 'game-drag', 'game-reaction', 'game-collector']);
const validAchievementConditionPrefixes = new Set(['gameCompleted', 'gamePerfect']);

if (quizData.length < 20) {
  errors.push(`测验题数量不足：至少需要 20 题，实际 ${quizData.length}`);
}

if (reactions.length < 5) {
  errors.push(`反应数量不足：至少需要 5 个，实际 ${reactions.length}`);
}

const quizIds = new Set();
for (const quiz of quizData) {
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

  if (!quiz.options.every((option) => typeof option === 'string' && option.trim())) {
    errors.push(`测验题目 ${quiz.id} 的选项必须全部为非空字符串`);
  }
}

const reactionIds = new Set();
const experimentIds = new Set();
for (const reaction of reactions) {
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

  for (const symbol of [...reaction.reactants, ...reaction.products]) {
    if (!elementSymbols.has(symbol) && !validFormulas.has(symbol)) {
      errors.push(`反应 ${reaction.id} 引用了未知的元素符号或化学式：${symbol}`);
    }
  }

  if (!allowedSafetyLevels.includes(reaction.safetyLevel)) {
    errors.push(`反应 ${reaction.id} 的 safetyLevel 非法：${reaction.safetyLevel}`);
  }

  if (!Array.isArray(reaction.reactants) || reaction.reactants.length === 0 || !Array.isArray(reaction.products) || reaction.products.length === 0) {
    errors.push(`反应 ${reaction.id} 必须包含非空的 reactants/products 数组`);
  }
}

const achievementIds = new Set();
for (const achievement of achievementsData) {
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
    const conditionMatch = achievement.condition.match(/^(gameCompleted|gamePerfect):(.+)$/);
    if (conditionMatch) {
      const [, prefix, gameId] = conditionMatch;
      if (!validAchievementConditionPrefixes.has(prefix)) {
        errors.push(`成就 ${achievement.id} 的条件前缀非法：${prefix}`);
      }
      if (!validGameIds.has(gameId)) {
        errors.push(`成就 ${achievement.id} 引用了不存在的游戏 ID：${gameId}`);
      }
    }
  } else if (typeof achievement.condition === 'object' && achievement.condition !== null) {
    if (!achievement.condition.type) {
      errors.push(`成就 ${achievement.id} 的条件对象缺少 type 字段`);
    }
  } else {
    errors.push(`成就 ${achievement.id} 的条件格式非法`);
  }
}

const stageIds = new Set();
for (const stage of learningPath.stages) {
  if (!stage.id || !stage.name || !stage.description) {
    errors.push(`学习阶段存在空字段：${stage.id || 'unknown-stage'}`);
  }

  if (stageIds.has(stage.id)) {
    errors.push(`重复的学习阶段 ID：${stage.id}`);
  }
  stageIds.add(stage.id);

  const requiredElements = stage.focusElements || stage.requiredElements || [];
  for (const atomicNumber of requiredElements) {
    if (!elementIds.has(atomicNumber)) {
      errors.push(`学习阶段 ${stage.id} 引用了不存在的元素 atomicNumber：${atomicNumber}`);
    }
  }

  for (const experimentId of stage.unlockedExperiments) {
    if (!experimentIds.has(experimentId)) {
      errors.push(`学习阶段 ${stage.id} 引用了不存在的 experimentId：${experimentId}`);
    }
  }

  for (const gameId of stage.unlockedGames) {
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

console.log(`支持数据校验通过：${quizData.length} 道题、${reactions.length} 个反应、${achievementsData.length} 个成就、${learningPath.stages.length} 个学习阶段。`);
