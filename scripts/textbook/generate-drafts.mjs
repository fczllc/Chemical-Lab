import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  createExperimentExcerpt,
  generateExperimentTitle,
  normalizeExperimentText
} from './experiment-enrichment.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const generatedRoot = path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated');

const knownTextbookBatches = new Set([
  'rj-chemistry-grade9-2024-vol1',
  'rj-chemistry-grade9-2024-vol2',
  'rj-chemistry-g12-selective-3-organic-2019',
  'rj-chemistry-grade8-54-2024-full',
  'pep-chemistry-g10-required-1',
  'pep-chemistry-g10-required-2',
  'pep-chemistry-g11-selective-1',
  'pep-chemistry-g11-selective-2'
]);

const outputFiles = [
  ['knowledge-topics.json', 'knowledgeTopics'],
  ['quiz-candidates.json', 'quizCandidates'],
  ['experiment-candidates.json', 'experimentCandidates'],
  ['lab-candidates.json', 'labCandidates'],
  ['game-candidates.json', 'gameChallengeCandidates'],
  ['story-candidates.json', 'storyCandidates'],
  ['achievement-candidates.json', 'achievementCandidates'],
  ['learning-path-candidates.json', 'learningPathCandidates']
];

const materialKeywords = [
  '试管',
  '烧杯',
  '酒精灯',
  '铁架台',
  '玻璃片',
  '玻璃棒',
  '集气瓶',
  '水槽',
  '导管',
  '量筒',
  '胶头滴管',
  '药匙',
  '镊子',
  '坩埚钳',
  '蒸发皿',
  '石棉网',
  '火柴',
  '蜡烛',
  '水',
  '石蜡',
  '硫酸铜',
  '氢氧化钠',
  '盐酸',
  '碳酸钠',
  '高锰酸钾',
  '二氧化锰',
  '过氧化氢',
  '氧气',
  '木炭',
  '铁丝',
  '红磷'
];

if (isCliInvocation()) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

async function main() {
  const options = parseCli(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.textbook) {
    throw new Error('--textbook is required');
  }

  if (!knownTextbookBatches.has(options.textbook)) {
    throw new Error(`Unknown textbook batch: ${options.textbook}`);
  }

  const volumeDirectory = path.join(generatedRoot, options.textbook);
  const inventoryPath = path.join(volumeDirectory, 'source-inventory.json');
  const inventory = await readSourceInventory(inventoryPath, options.textbook);
  const drafts = buildDrafts(inventory);

  await mkdir(volumeDirectory, { recursive: true });

  for (const [fileName, key] of outputFiles) {
    const outputPath = path.join(volumeDirectory, fileName);
    await writeJson(outputPath, drafts[key]);
    console.log(`Wrote ${fileName}: ${drafts[key].length}`);
  }

  const draftInventory = buildDraftInventory(inventory, drafts);
  const draftInventoryPath = path.join(volumeDirectory, 'draft-inventory.json');
  await writeJson(draftInventoryPath, draftInventory);
  console.log(`Wrote draft-inventory.json: ${countDraftInventoryCandidates(draftInventory)}`);
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      textbook: { type: 'string' }
    },
    strict: true
  });

  return {
    help: values.help === true,
    textbook: values.textbook ?? null
  };
}

function printHelp() {
  console.log(`Textbook draft generator / 教材草稿候选生成器

Usage:
  node scripts/textbook/generate-drafts.mjs --textbook <volumeId>

Options:
  --textbook <volumeId>                Generate conservative draft candidates from source-inventory.json.
  --help                              Show this help.`);
}

function isCliInvocation() {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

async function readSourceInventory(inventoryPath, expectedVolumeId) {
  let inventory;

  try {
    inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
  } catch (error) {
    throw new Error(`Source inventory cannot be read or parsed: ${relativeProjectPath(inventoryPath)}: ${error.message}`);
  }

  validateSourceInventory(inventory, expectedVolumeId);
  return inventory;
}

function validateSourceInventory(inventory, expectedVolumeId) {
  if (!isRecord(inventory)) {
    throw new Error('Source inventory top level must be an object');
  }

  if (inventory.volumeId !== expectedVolumeId) {
    throw new Error(`Source inventory volumeId must match --textbook: ${expectedVolumeId}`);
  }

  if (!/^sha256:[a-f0-9]{64}$/.test(inventory.sourceHash)) {
    throw new Error(`Source inventory sourceHash must be sha256:<64 hex>: ${String(inventory.sourceHash)}`);
  }

  if (!Array.isArray(inventory.sourceSections)) {
    throw new Error('Source inventory sourceSections must be an array');
  }
}

function buildDrafts(inventory) {
  const sections = inventory.sourceSections.filter(hasSubstantiveSourceText);
  const knowledgeTopics = sections.map((section) => buildKnowledgeTopic(section));
  const experimentSections = sections.filter(isExperimentSection);
  const quizSections = sections.filter(isQuizSection);
  const labSections = sections.filter(isLabSection);
  const gameSections = sections.filter(isGameSection);
  const storySections = sections.filter(isStorySection);

  return {
    knowledgeTopics,
    quizCandidates: quizSections.map((section) => buildQuizCandidate(section)),
    experimentCandidates: experimentSections.map((section) => buildExperimentCandidate(section)),
    labCandidates: labSections.map((section) => buildLabCandidate(section)),
    gameChallengeCandidates: gameSections.map((section) => buildGameChallengeCandidate(section)),
    storyCandidates: storySections.map((section) => buildStoryCandidate(section)),
    achievementCandidates: knowledgeTopics.map((topic) => buildAchievementCandidate(topic)),
    learningPathCandidates: knowledgeTopics.map((topic, index, topics) => buildLearningPathCandidate(topic, index, topics))
  };
}

export function buildExperimentCandidateForValidation(section) {
  return buildExperimentCandidate(section);
}

function buildKnowledgeTopic(section) {
  return {
    topicId: buildCandidateId('knowledge-topic', section),
    title: cleanHeading(section.sourceHeading),
    summary: summarizeSection(section),
    reviewStatus: 'needsReview',
    runtimeEligible: false,
    ...copyProvenance(section)
  };
}

function buildQuizCandidate(section) {
  const question = firstQuestion(section.sourceText) ?? `围绕“${cleanHeading(section.sourceHeading)}”设计一道待审题目。`;

  return {
    candidateId: buildCandidateId('quiz', section),
    prompt: question,
    answer: '待复核：依据来源片段补全标准答案。',
    questionType: 'shortAnswer',
    sourceExcerpt: summarizeSection(section),
    reviewStatus: 'needsReview',
    runtimeEligible: false,
    ...copyProvenance(section)
  };
}

function buildExperimentCandidate(section) {
  const textbookContent = normalizeExperimentText(section.sourceText);
  const excerpt = createExperimentExcerpt(textbookContent, { maxCjkChars: 100 });

  return {
    candidateId: buildCandidateId('experiment', section),
    title: generateExperimentTitle({ sourceHeading: section.sourceHeading, text: section.sourceText }),
    summary: excerpt,
    description: excerpt,
    textbookContent,
    animationStatus: 'deferred',
    hazardLevel: inferHazardLevel(section.sourceText),
    safetyNotes: extractSafetyNotes(section.sourceText),
    materials: extractMaterials(section.sourceText),
    observations: extractObservationPrompts(section.sourceText),
    deferredReason: 'Runtime use is deferred until a human reviewer confirms safety, materials, observations, and animation requirements.',
    reviewStatus: 'needsReview',
    runtimeEligible: false,
    ...copyProvenance(section)
  };
}

function buildLabCandidate(section) {
  return {
    candidateId: buildCandidateId('lab', section),
    title: cleanHeading(section.sourceHeading),
    summary: summarizeSection(section),
    activityType: isExperimentSection(section) ? 'experimentReview' : 'inquiryReview',
    reviewStatus: 'needsReview',
    runtimeEligible: false,
    ...copyProvenance(section)
  };
}

function buildGameChallengeCandidate(section) {
  return {
    candidateId: buildCandidateId('game', section),
    title: `${cleanHeading(section.sourceHeading)}挑战草稿`,
    summary: summarizeSection(section),
    challengeType: 'reviewDraft',
    reviewStatus: 'needsReview',
    runtimeEligible: false,
    ...copyProvenance(section)
  };
}

function buildStoryCandidate(section) {
  return {
    candidateId: buildCandidateId('story', section),
    title: `${cleanHeading(section.sourceHeading)}故事草稿`,
    summary: summarizeSection(section),
    narrativeSeed: summarizeSection(section),
    reviewStatus: 'needsReview',
    runtimeEligible: false,
    ...copyProvenance(section)
  };
}

function buildAchievementCandidate(topic) {
  return {
    candidateId: `achievement-${topic.topicId.replace(/^knowledge-topic-/, '')}`,
    title: `完成“${topic.title}”学习草稿`,
    summary: `待审成就：学习并复核“${topic.title}”相关教材片段。`,
    triggerDraft: 'manualReviewAfterPromotion',
    reviewStatus: 'needsReview',
    runtimeEligible: false,
    ...copyProvenance(topic)
  };
}

function buildLearningPathCandidate(topic, index, topics) {
  const prerequisiteTopicIds = index === 0 ? [] : [topics[index - 1].topicId];

  return {
    candidateId: `learning-path-${topic.topicId.replace(/^knowledge-topic-/, '')}`,
    topicId: topic.topicId,
    title: topic.title,
    summary: topic.summary,
    sequenceIndex: index + 1,
    prerequisiteTopicIds,
    reviewStatus: 'needsReview',
    runtimeEligible: false,
    ...copyProvenance(topic)
  };
}

function buildDraftInventory(inventory, drafts) {
  return {
    schemaVersion: 1,
    volumeId: inventory.volumeId,
    sourceHash: inventory.sourceHash,
    status: 'generated',
    sourceSections: inventory.sourceSections.map((section) => ({
      sectionId: section.sectionId,
      sourceText: section.sourceText.trim(),
      reviewStatus: 'needsReview',
      ...copyProvenance(section)
    })),
    curriculumTopics: drafts.knowledgeTopics.map((topic) => ({
      topicId: topic.topicId,
      title: topic.title,
      summary: topic.summary,
      reviewStatus: 'needsReview',
      runtimeEligible: false,
      ...copyProvenance(topic)
    })),
    experimentCandidates: drafts.experimentCandidates,
    labCandidates: drafts.labCandidates,
    gameChallengeCandidates: drafts.gameChallengeCandidates,
    storyCandidates: drafts.storyCandidates,
    achievementCandidates: drafts.achievementCandidates,
    quizCandidates: drafts.quizCandidates,
    reviewedSourceReferences: []
  };
}

function countDraftInventoryCandidates(draftInventory) {
  return draftInventory.curriculumTopics.length + draftInventory.experimentCandidates.length + draftInventory.labCandidates.length + draftInventory.gameChallengeCandidates.length + draftInventory.storyCandidates.length + draftInventory.achievementCandidates.length + draftInventory.quizCandidates.length;
}

function hasSubstantiveSourceText(section) {
  return isSourceSection(section) && cleanText(section.sourceText).length > 12;
}

function isSourceSection(section) {
  return isRecord(section) && hasText(section.sectionId) && hasText(section.sourceText) && hasText(section.sourceHeading);
}

function isExperimentSection(section) {
  return /实验/.test(section.sourceHeading);
}

function isQuizSection(section) {
  return /[?？]|思考|讨论|练习|问题|判断|解释|说明|为什么/.test(section.sourceText);
}

function isLabSection(section) {
  return /实验|探究|活动|实践|调查/.test(`${section.sourceHeading}\n${section.sourceText}`);
}

function isGameSection(section) {
  return /练习|思考|讨论|问题|判断|选择|挑战|活动/.test(`${section.sourceHeading}\n${section.sourceText}`);
}

function isStorySection(section) {
  return /资料|阅读|化学史|科学家|生活|社会|自然界|故事|发展史|技术/.test(`${section.sourceHeading}\n${section.sourceText}`);
}

function buildCandidateId(surface, section) {
  return `${surface}-${section.sectionId}`;
}

function copyProvenance(section) {
  return {
    sourceVolumeId: section.sourceVolumeId,
    sourcePath: section.sourcePath,
    sourceHeading: section.sourceHeading,
    sourceLineStart: section.sourceLineStart,
    sourceLineEnd: section.sourceLineEnd,
    sourceHash: section.sourceHash,
    sectionHash: section.sectionHash,
    sourceSectionId: section.sourceSectionId ?? section.sectionId,
    assets: Array.isArray(section.assets) ? section.assets : [],
    reviewStatus: 'needsReview'
  };
}

function summarizeSection(section) {
  return firstNonEmptyExcerpt(cleanText(section.sourceText), 120) || cleanHeading(section.sourceHeading);
}

function cleanHeading(value) {
  const heading = String(value ?? '').replace(/^#+\s*/, '').trim();
  return heading || '未命名教材片段';
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#+\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstNonEmptyExcerpt(text, maxLength) {
  if (!text) {
    return '';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function firstQuestion(text) {
  const sentences = splitSentences(cleanText(text));
  return sentences.find((sentence) => /[?？]$/.test(sentence)) ?? null;
}

function inferHazardLevel(text) {
  if (/腐蚀|有毒|明火|燃烧|高锰酸钾|浓硫酸|盐酸|氢氧化钠/.test(text)) {
    return 'high';
  }

  if (/加热|护目镜|酒精灯|烫|电器|排风/.test(text)) {
    return 'medium';
  }

  return 'low';
}

function extractSafetyNotes(text) {
  const notes = splitSentences(cleanText(text)).filter((sentence) => /注意|护目镜|腐蚀|有毒|明火|加热|禁止|安全|排风|烫/.test(sentence));
  return uniqueStrings(notes).slice(0, 4);
}

function extractMaterials(text) {
  return materialKeywords.filter((keyword) => text.includes(keyword));
}

function extractObservationPrompts(text) {
  const prompts = splitSentences(cleanText(text)).filter((sentence) => /观察|记录|现象/.test(sentence));
  return uniqueStrings(prompts).slice(0, 4);
}

function splitSentences(text) {
  return text
    .split(/(?<=[。！？?])\s*/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

