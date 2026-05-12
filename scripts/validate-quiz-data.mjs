import { parseArgs } from 'node:util';
import { quizData } from '../src/data/index.js';

const validDifficulties = new Set(['基础', '进阶', '挑战']);
const placeholderPattern = /待复核|TODO|请补充|待填写|依据来源片段补全标准答案|placeholder/i;
const selfCheckModes = new Set([
  'duplicate-options',
  'placeholder',
  'missing-generation-source',
  'invalid-correct-index',
  'invalid-difficulty',
  'missing-source-references'
]);

main().catch((error) => {
  console.error(`Quiz data validator failed / 测验数据校验器失败：${error.message}`);
  process.exit(1);
});

async function main() {
  const options = parseCli(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const dataset = options.selfCheckInvalid
    ? buildInvalidFixture(quizData, options.selfCheckInvalid)
    : quizData;

  const errors = validateQuizData(dataset);

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
  console.log(`Quiz data validator / 测验数据校验器

Usage:
  node scripts/validate-quiz-data.mjs [options]

Modes:
  full mode (default)                 Validate all quizData records from src/data/index.js.
  --self-check-invalid <mode>         Confirm one deterministic invalid fixture is rejected.
  --help                              Show this help.

Invalid fixture modes:
  ${[...selfCheckModes].join('|')}`);
}

function validateQuizData(data) {
  const errors = [];
  const safeQuizData = ensureArray(data, 'quizData 顶层必须是数组', errors);

  const quizIds = new Set();
  let handAuthoredMcqCount = 0;
  let generatedRecordCount = 0;

  for (const [index, quiz] of safeQuizData.entries()) {
    const label = `quizData[${index}]`;

    if (!isRecord(quiz)) {
      errors.push(`${label} 必须是对象`);
      continue;
    }

    if (!quiz.id || typeof quiz.id !== 'string' || !quiz.id.trim()) {
      errors.push(`${label} 缺少有效 id`);
      continue;
    }

    if (quizIds.has(quiz.id)) {
      errors.push(`重复的测验题目 ID：${quiz.id}`);
    }
    quizIds.add(quiz.id);

    const isGenerated = quiz.generatedFromShortAnswer === true;
    const isShortAnswer = quiz.category === 'shortAnswer';

    if (isGenerated) {
      generatedRecordCount += 1;
      validateGeneratedRecord(quiz, label, errors);
    }

    if (!isShortAnswer && !isGenerated) {
      handAuthoredMcqCount += 1;
    }

    validateBasicShape(quiz, label, errors, { isGenerated });
  }

  if (handAuthoredMcqCount < 26) {
    errors.push(`手编 MCQ 数量不足：至少需要 26 题，实际 ${handAuthoredMcqCount}`);
  }

  return errors;
}

function validateBasicShape(quiz, label, errors, options = {}) {
  if (!quiz.question || typeof quiz.question !== 'string' || !quiz.question.trim()) {
    errors.push(`${label} (${quiz.id}) question 必须是非空字符串`);
  }

  if (!Array.isArray(quiz.options)) {
    errors.push(`${label} (${quiz.id}) options 必须是数组`);
  } else {
    const isGenerated = options.isGenerated || false;
    const expectedLength = isGenerated ? 4 : quiz.options.length;

    if (isGenerated && quiz.options.length !== 4) {
      errors.push(`${label} (${quiz.id}) options 必须包含恰好 4 个选项，实际 ${quiz.options.length}`);
    }

    const trimmedOptions = quiz.options.map((option) => typeof option === 'string' ? option.trim() : option);
    for (const [optionIndex, option] of trimmedOptions.entries()) {
      if (typeof option !== 'string' || !option) {
        errors.push(`${label} (${quiz.id}) options[${optionIndex}] 必须是非空字符串`);
      }
    }

    if (isGenerated) {
      const uniqueOptions = new Set(trimmedOptions.filter((option) => typeof option === 'string'));
      if (uniqueOptions.size !== trimmedOptions.length) {
        errors.push(`${label} (${quiz.id}) options 必须唯一（trim 后）`);
      }
    }
  }

  if (!Number.isInteger(quiz.correctIndex) || quiz.correctIndex < 0 || quiz.correctIndex >= (Array.isArray(quiz.options) ? quiz.options.length : 4)) {
    errors.push(`${label} (${quiz.id}) correctIndex 非法：${quiz.correctIndex}`);
  }

  if (!quiz.category || typeof quiz.category !== 'string' || !quiz.category.trim()) {
    errors.push(`${label} (${quiz.id}) category 必须是非空字符串`);
  }

  if (!quiz.explanation || typeof quiz.explanation !== 'string' || !quiz.explanation.trim()) {
    errors.push(`${label} (${quiz.id}) explanation 必须是非空字符串`);
  }

  if (!Array.isArray(quiz.curriculumTags) || quiz.curriculumTags.length === 0) {
    errors.push(`${label} (${quiz.id}) curriculumTags 必须是非空数组`);
  }

  if (!quiz.difficulty || typeof quiz.difficulty !== 'string') {
    errors.push(`${label} (${quiz.id}) difficulty 必须是非空字符串`);
  }
}

function validateGeneratedRecord(quiz, label, errors) {
  if (quiz.category === 'shortAnswer') {
    errors.push(`${label} (${quiz.id}) generated 记录的 category 不能是 shortAnswer`);
  }

  if (!validDifficulties.has(quiz.difficulty)) {
    errors.push(`${label} (${quiz.id}) difficulty 必须是 基础|进阶|挑战，实际 ${quiz.difficulty}`);
  }

  validateNoPlaceholder(quiz.question, `${label} (${quiz.id}) question`, errors);
  validateNoPlaceholder(quiz.explanation, `${label} (${quiz.id}) explanation`, errors);

  if (Array.isArray(quiz.options)) {
    for (const [optionIndex, option] of quiz.options.entries()) {
      validateNoPlaceholder(option, `${label} (${quiz.id}) options[${optionIndex}]`, errors);
    }
  }

  if (quiz.generatedFromShortAnswer !== true) {
    errors.push(`${label} (${quiz.id}) generatedFromShortAnswer 必须为 true`);
  }

  const hasGenerationSource = (typeof quiz.generationSource === 'string' && quiz.generationSource.trim())
    || (typeof quiz.generationModel === 'string' && quiz.generationModel.trim());
  if (!hasGenerationSource) {
    errors.push(`${label} (${quiz.id}) generationSource 或 generationModel 必须为非空字符串`);
  }

  if (!Array.isArray(quiz.sourceReferences) || quiz.sourceReferences.length === 0) {
    errors.push(`${label} (${quiz.id}) sourceReferences 必须为非空数组`);
  } else {
    for (const [refIndex, reference] of quiz.sourceReferences.entries()) {
      const refLabel = `${label} (${quiz.id}).sourceReferences[${refIndex}]`;
      if (!isRecord(reference)) {
        errors.push(`${refLabel} 必须是对象`);
        continue;
      }
      if (!reference.sourceVolumeId || typeof reference.sourceVolumeId !== 'string' || !reference.sourceVolumeId.trim()) {
        errors.push(`${refLabel} sourceVolumeId 必须为非空字符串`);
      }
      if (!reference.candidateId || typeof reference.candidateId !== 'string' || !reference.candidateId.trim()) {
        errors.push(`${refLabel} candidateId 必须为非空字符串`);
      }
    }
  }

  if ('answer' in quiz) {
    errors.push(`${label} (${quiz.id}) answer 字段不应存在`);
  }
}

function validateNoPlaceholder(value, label, errors) {
  if (typeof value === 'string' && placeholderPattern.test(value)) {
    errors.push(`${label} 包含占位符文本`);
  }
}

function buildInvalidFixture(sourceQuizData, mode) {
  const items = structuredClone(sourceQuizData);

  if (mode === 'duplicate-options') {
    items.push({
      id: 'invalid-duplicate-options',
      question: '测试重复选项',
      options: ['A', 'B', ' A ', 'C'],
      correctIndex: 0,
      category: '测试',
      difficulty: '基础',
      curriculumTags: ['test-tag'],
      explanation: '测试解释',
      generatedFromShortAnswer: true,
      generationSource: 'test-fixture',
      sourceReferences: [
        { sourceVolumeId: 'test-volume', candidateId: 'test-candidate', note: 'test' }
      ]
    });
  } else if (mode === 'placeholder') {
    items.push({
      id: 'invalid-placeholder',
      question: '待复核：依据来源片段补全标准答案。',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      category: '测试',
      difficulty: '基础',
      curriculumTags: ['test-tag'],
      explanation: '测试解释',
      generatedFromShortAnswer: true,
      generationSource: 'test-fixture',
      sourceReferences: [
        { sourceVolumeId: 'test-volume', candidateId: 'test-candidate', note: 'test' }
      ]
    });
  } else if (mode === 'missing-generation-source') {
    items.push({
      id: 'invalid-missing-generation-source',
      question: '测试缺少生成来源',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      category: '测试',
      difficulty: '基础',
      curriculumTags: ['test-tag'],
      explanation: '测试解释',
      generatedFromShortAnswer: true,
      sourceReferences: [
        { sourceVolumeId: 'test-volume', candidateId: 'test-candidate', note: 'test' }
      ]
    });
  } else if (mode === 'invalid-correct-index') {
    items.push({
      id: 'invalid-correct-index',
      question: '测试错误 correctIndex',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 4,
      category: '测试',
      difficulty: '基础',
      curriculumTags: ['test-tag'],
      explanation: '测试解释',
      generatedFromShortAnswer: true,
      generationSource: 'test-fixture',
      sourceReferences: [
        { sourceVolumeId: 'test-volume', candidateId: 'test-candidate', note: 'test' }
      ]
    });
  } else if (mode === 'invalid-difficulty') {
    items.push({
      id: 'invalid-difficulty',
      question: '测试错误难度',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      category: '测试',
      difficulty: '简单',
      curriculumTags: ['test-tag'],
      explanation: '测试解释',
      generatedFromShortAnswer: true,
      generationSource: 'test-fixture',
      sourceReferences: [
        { sourceVolumeId: 'test-volume', candidateId: 'test-candidate', note: 'test' }
      ]
    });
  } else if (mode === 'missing-source-references') {
    items.push({
      id: 'invalid-missing-source-references',
      question: '测试缺少来源引用',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      category: '测试',
      difficulty: '基础',
      curriculumTags: ['test-tag'],
      explanation: '测试解释',
      generatedFromShortAnswer: true,
      generationSource: 'test-fixture',
      sourceReferences: []
    });
  }

  return items;
}

function finishSelfCheck(mode, errors) {
  if (errors.length > 0) {
    console.log(`quiz invalid fixture rejected: ${mode}`);
    for (const error of errors) {
      console.log(`- ${error}`);
    }
    return;
  }

  console.error(`测验数据非法夹具自检失败：${mode} 未被拒绝`);
  process.exit(1);
}

function finishValidation(errors) {
  if (errors.length > 0) {
    console.error('测验数据校验失败：');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('quizData: valid');
  console.log('All quiz records passed validation.');
}

function ensureArray(value, errorMessage, errors) {
  if (Array.isArray(value)) {
    return value;
  }
  errors.push(errorMessage);
  return [];
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
