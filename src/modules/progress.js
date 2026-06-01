/** ===== 学习进度模块 ===== */
import { EXPERIMENT_LABELS, FEATURE_LABELS, GAME_LABELS } from '../data/contentMeta.js';
import { mixedProseFormulaHTML } from './chemNotation.js';
import {
  achievementsData,
  curriculumTags,
  elements,
  labExperiments,
  learningPath,
  quizData,
  reactions,
  textbookAssetManifest,
  learningSegmentTextbookContent
} from '../data/index.js';
import {
  getCompletedLearningSegments,
  getLearningSegmentCompletionDates,
  getUnlockedAchievements,
  markLearningSegmentCompleted
} from './storage.js';
import learningCatImage from '../images/cat-9.png';

const TOTAL_EXPERIMENTS = labExperiments.length;
const TOTAL_ELEMENTS = 118;
let isBound = false;
let selectedStageId = learningPath.stages[0]?.id || null;
let celebrationMessage = '';
let celebrationTimer = null;
let focusedLearningSegmentId = null;
let activeLearningSegmentId = null;
let activeTextbookId = null;

/** Build a map of curriculum tag -> canonical metadata for label lookups */
const CURRICULUM_TAG_MAP = new Map(Object.entries(curriculumTags || {}));

const ELEMENT_BY_SYMBOL = new Map((elements || []).map((element) => [element.symbol, element]));

/** Textbook content lookup indexes */
const LEARNING_CONTENT_BY_SEGMENT_ID = new Map(
  (learningSegmentTextbookContent || []).map((c) => [c.segmentId, c])
);
const LEARNING_CONTENT_BY_VOLUME_AND_CANDIDATE = new Map(
  (learningSegmentTextbookContent || []).map((c) => [`${c.sourceVolumeId}::${c.candidateId}`, c])
);
const LEARNING_CONTENT_BY_VOLUME_AND_SECTION = new Map(
  (learningSegmentTextbookContent || []).map((c) => [`${c.sourceVolumeId}::${c.sourceSectionId}`, c])
);
const LEARNING_CONTENT_BY_VOLUME_AND_LINE_RANGE = new Map();
(learningSegmentTextbookContent || []).forEach((c) => {
  const key = `${c.sourceVolumeId}::${c.lineRange}`;
  if (!LEARNING_CONTENT_BY_VOLUME_AND_LINE_RANGE.has(key)) {
    LEARNING_CONTENT_BY_VOLUME_AND_LINE_RANGE.set(key, []);
  }
  LEARNING_CONTENT_BY_VOLUME_AND_LINE_RANGE.get(key).push(c);
});

function findLearningSegmentTextbookContent(achievement, reference, segmentId) {
  const volumeId = normalizeText(achievement?.sourceVolumeId || reference?.sourceVolumeId || reference?.volumeId);
  const candidateId = normalizeText(reference?.candidateId);
  const lineRange = normalizeText(reference?.lineRange);
  const sourceSectionId = candidateId && candidateId.startsWith('achievement-') 
    ? candidateId.slice('achievement-'.length) 
    : '';

  if (volumeId && candidateId && LEARNING_CONTENT_BY_VOLUME_AND_CANDIDATE.has(`${volumeId}::${candidateId}`)) {
    return LEARNING_CONTENT_BY_VOLUME_AND_CANDIDATE.get(`${volumeId}::${candidateId}`);
  }

  if (volumeId && sourceSectionId && LEARNING_CONTENT_BY_VOLUME_AND_SECTION.has(`${volumeId}::${sourceSectionId}`)) {
    return LEARNING_CONTENT_BY_VOLUME_AND_SECTION.get(`${volumeId}::${sourceSectionId}`);
  }

  if (volumeId && lineRange) {
    const list = LEARNING_CONTENT_BY_VOLUME_AND_LINE_RANGE.get(`${volumeId}::${lineRange}`) || [];
    if (list.length === 1) return list[0];
  }

  return null;
}

const MANUAL_LEARNING_ACHIEVEMENTS = (achievementsData || [])
  .map((achievement) => ({
    achievement,
    segmentId: getManualLearningSegmentId(achievement)
  }))
  .filter(({ achievement, segmentId }) => (
    achievement?.condition?.type === 'manualReviewAfterPromotion'
    && achievement.sourceReviewStatus === 'reviewed'
    && Boolean(segmentId)
  ));

const MANUAL_ACHIEVEMENT_BY_SEGMENT = new Map(
  MANUAL_LEARNING_ACHIEVEMENTS.map(({ achievement, segmentId }) => [segmentId, achievement])
);

function hasCurriculumTag(record, tagId) {
  return Array.isArray(record?.curriculumTags) && record.curriculumTags.includes(tagId);
}

function getManualLearningSegmentId(achievement) {
  const tags = Array.isArray(achievement?.curriculumTags) ? achievement.curriculumTags : [];
  if (tags.length !== 1 || typeof tags[0] !== 'string') {
    return null;
  }

  const segmentId = tags[0].trim();
  return segmentId || null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('`', '&#96;');
}

function escapeHtmlAttr(value) {
  return escapeHtml(value);
}

function renderTextbookTabLabel(label) {
  const parts = String(label ?? '').split('·');
  if (parts.length < 2) {
    return `<span class="textbook-tab-line">${escapeHtml(label)}</span>`;
  }
  return parts.map((part, index) => {
    const cls = index === 1 ? 'textbook-tab-line is-emphasis' : 'textbook-tab-line';
    return `<span class="${cls}">${escapeHtml(part)}</span>`;
  }).join('');
}

function isQuizCompleted(quizId, quizScores) {
  return quizScores.some((score) => (
    score.id === quizId
    || score.quizId === quizId
    || (Array.isArray(score.questionIds) && score.questionIds.includes(quizId))
  ));
}

export const __progressTestHooks = {
  isQuizCompleted,
  computeTopicMastery,
  computeStageCurriculum,
  getStageStates,
  getManualLearningSegments,
  getLearningSegmentStatus,
  buildLearningSegmentSummary,
  buildLearningSegmentDetailSections
};

function getManualLearningSegments(unlockedAchievements = new Set(), completedLearningSegments = new Set(), learningSegmentCompletionDates = {}) {
  return MANUAL_LEARNING_ACHIEVEMENTS.map(({ achievement, segmentId }) => {
    const reference = achievement.sourceReferences?.[0] || {};
    const statusInfo = getLearningSegmentStatus(achievement, segmentId, unlockedAchievements, completedLearningSegments);
    const sourceVolumeId = achievement.sourceVolumeId || reference.sourceVolumeId || reference.volumeId || '';
    const textbookContent = findLearningSegmentTextbookContent(achievement, reference, segmentId);

    return {
      segmentId,
      achievementId: achievement.id,
      title: reference.sourceHeading || achievement.title || segmentId,
      sourceVolumeId,
      lineRange: reference.lineRange || '',
      sourceHeading: reference.sourceHeading || '',
      displayPath: formatSourceReference(reference, sourceVolumeId),
      status: statusInfo.status,
      summary: buildLearningSegmentSummary(achievement, reference, segmentId),
      detailSections: buildLearningSegmentDetailSections(achievement, reference, segmentId, textbookContent),
      asset: findTextbookAssetForReference(reference),
      achievement,
      reference,
      completionDate: learningSegmentCompletionDates[segmentId] || '',
      textbookContent
    };
  }).filter((segment) => {
    if (isExperimentLearningSegment(segment)) {
      return false;
    }

    const id = String(segment.sourceVolumeId || '').trim();
    return id.length > 0;
  });
}

function isExperimentLearningSegment(segment) {
  return [
    segment?.sourceHeading,
    segment?.title,
    segment?.reference?.sourceHeading
  ].some(isExperimentLearningHeading);
}

function isExperimentLearningHeading(value) {
  const heading = normalizeText(value);
  return /^【实验/.test(heading) || [
    '实验目的',
    '实验用品',
    '实验步骤'
  ].includes(heading);
}

function getLearningSegmentStatus(achievement, segmentId, unlockedAchievements = new Set(), completedLearningSegments = new Set()) {
  const isCompleted = unlockedAchievements.has(achievement.id);
  const isRawCompleted = completedLearningSegments.has(segmentId);
  return {
    isCompleted,
    isRawCompleted,
    status: isCompleted || isRawCompleted ? 'completed' : 'not-started'
  };
}

function buildLearningSegmentSummary(achievement, reference, segmentId) {
  const description = normalizeText(achievement.description);
  if (description) {
    return description;
  }

  const summaryParts = compactTextValues([
    achievement.title,
    reference.sourceHeading,
    segmentId
  ]);
  return summaryParts[0]
    ? `已记录学习目标元数据：${summaryParts[0]}`
    : '暂无已审核的学习目标元数据。';
}

function buildLearningSegmentDetailSections(achievement, reference, segmentId, textbookContent) {
  return [
    buildDetailSection('source', '章节来源', buildSourceBlocks(achievement, reference, textbookContent)),
    buildDetailSection('content', '教材内容', buildTextbookContentBlocks(textbookContent))
  ];
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function compactTextValues(values) {
  return (values || []).map(normalizeText).filter(Boolean);
}

function paragraphBlock(text) {
  const normalized = normalizeText(text);
  return normalized ? { type: 'paragraph', text: normalized } : null;
}

function listBlock(items) {
  const normalizedItems = compactTextValues(items);
  return normalizedItems.length ? { type: 'list', items: normalizedItems } : null;
}

function assetBlock(asset) {
  const label = normalizeText(asset?.nearbyHeading);
  return label ? { type: 'asset', label } : null;
}

function buildDetailSection(id, title, blocks) {
  return {
    id,
    title,
    blocks: (blocks || []).filter(Boolean)
  };
}

function findTextbookVolume(volumeId) {
  const normalizedVolumeId = normalizeText(volumeId);
  if (!normalizedVolumeId) return null;
  return textbookAssetManifest.volumes.find((volume) => volume.volumeId === normalizedVolumeId) || null;
}

function buildSourceBlocks(achievement, reference, textbookContent) {
  const textbookName = textbookContent?.textbookName || '';
  const rangeLabel = textbookContent?.rangeLabel || '';
  const sourceHeading = reference.sourceHeading || '';

  if (textbookName) {
    const rangeText = rangeLabel ? `；范围：${rangeLabel}` : '';
    return [paragraphBlock(`教材：${textbookName}${rangeText}`)];
  }

  if (sourceHeading) {
    return [paragraphBlock(`章节：${sourceHeading}`)];
  }

  return [paragraphBlock('暂无已审核的教材来源元数据。')];
}

function buildTextbookContentBlocks(textbookContent) {
  if (!textbookContent || !Array.isArray(textbookContent.blocks) || textbookContent.blocks.length === 0) {
    return [paragraphBlock('未找到该学习卡片对应的教材正文，请运行数据校验修复来源映射。')];
  }

  return textbookContent.blocks
    .filter(block => ['heading', 'paragraph', 'list', 'table'].includes(block.type))
    .map(block => {
      if (block.type === 'heading') return { ...block, type: 'heading' };
      if (block.type === 'paragraph') return { ...block, type: 'paragraph' };
      if (block.type === 'list') return { ...block, type: 'list' };
      if (block.type === 'table') {
        const rows = Array.isArray(block.rows)
          ? block.rows
              .filter(Array.isArray)
              .map((row) => row.map(normalizeText))
              .filter((row) => row.some(Boolean))
          : [];
        return rows.length ? { type: 'table', rows } : null;
      }
      return null;
    })
    .filter(Boolean);
}

function buildLearningGoalBlocks(achievement, reference, segmentId) {
  const blocks = [
    paragraphBlock(achievement.description),
    paragraphBlock(achievement.title ? `关联成就：${achievement.title}` : ''),
    listBlock(compactTextValues([
      segmentId ? `学习片段：${segmentId}` : '',
      reference.sourceHeading ? `来源章节：${reference.sourceHeading}` : '',
      ...compactTextValues(achievement.curriculumTags).map((tag) => `课程标签：${tag}`)
    ]))
  ];

  return blocks.some(Boolean)
    ? blocks
    : [paragraphBlock('暂无已审核的学习目标元数据。')];
}

function buildKeyPointBlocks(achievement) {
  const keyPointBlock = listBlock(achievement.keyPoints);
  return keyPointBlock
    ? [keyPointBlock]
    : [paragraphBlock('暂无已审核的关键知识点元数据。')];
}

function buildRelatedMaterialBlocks(asset, reviewedAsset) {
  if (reviewedAsset) {
    return [
      assetBlock(reviewedAsset),
      paragraphBlock(reviewedAsset.assetType ? `资料类型：${reviewedAsset.assetType}` : ''),
      paragraphBlock(reviewedAsset.sourceVolume ? `来源册别：${reviewedAsset.sourceVolume}` : ''),
      paragraphBlock(reviewedAsset.sourceNotes ? `来源记录：${reviewedAsset.sourceNotes}` : '')
    ];
  }

  if (asset) {
    return [
      paragraphBlock(`暂无已审核的相关资料。已记录资料审核状态：${asset.extractionStatus || '未标注'}`)
    ];
  }

  return [paragraphBlock('暂无已审核的相关资料。')];
}

function buildLearningConfirmationBlocks(achievement, segmentId) {
  const confirmationItems = compactTextValues([
    segmentId ? `学习片段：${segmentId}` : '',
    achievement.title ? `关联成就：${achievement.title}` : '',
    ...compactTextValues(achievement.curriculumTags).map((tag) => `课程标签：${tag}`)
  ]);

  return confirmationItems.length
    ? [listBlock(confirmationItems)]
    : [paragraphBlock('暂无已审核的学习确认元数据。')];
}

function findTextbookAssetForReference(reference) {
  if (!reference.assetReferences?.length) return null;
  const assetId = reference.assetReferences[0].assetId;
  const volumeId = reference.sourceVolumeId || reference.volumeId;
  return textbookAssetManifest.assets.find(a => a.id === assetId && a.volumeId === volumeId) || null;
}

function formatSourceReference(reference, sourceVolumeId) {
  return reference.lineRange ? `L${reference.lineRange}` : '';
}

/** Known textbook sourceVolumeIds in deterministic display order.
 *  Uses actual runtime IDs from achievementsData.json:
 *  rj- for legacy grade 8/9/12, pep- for new g10/g11.
 */
const KNOWN_TEXTBOOK_ORDER = [
  'rj-chemistry-grade8-54-2024-full',
  'rj-chemistry-grade9-2024-vol1',
  'rj-chemistry-grade9-2024-vol2',
  'pep-chemistry-g10-required-1',
  'pep-chemistry-g10-required-2',
  'pep-chemistry-g11-selective-1',
  'pep-chemistry-g11-selective-2',
  'rj-chemistry-g12-selective-3-organic-2019'
];

/** Map raw sourceVolumeId to clean Chinese tab label */
const TEXTBOOK_TAB_LABELS = {
  'pep-chemistry-grade8-2024-full': '八年级·全册',
  'pep-chemistry-grade9-2024-vol1': '九年级·上册',
  'pep-chemistry-grade9-2024-vol2': '九年级·下册',
  'pep-chemistry-g10-required-1': '高一/10年级·必修第一册',
  'pep-chemistry-g10-required-2': '高一/10年级·必修第二册',
  'pep-chemistry-g11-selective-1': '高二/11年级·选择性必修一·反应原理',
  'pep-chemistry-g11-selective-2': '高二/11年级·选择性必修二·物质结构与性质',
  'pep-chemistry-g12-selective-3-organic': '高三/12年级·有机基础',
  // Backward-compatible aliases for legacy rj- prefixed data
  'rj-chemistry-grade8-54-2024-full': '八年级·全册',
  'rj-chemistry-grade9-2024-vol1': '九年级·上册',
  'rj-chemistry-grade9-2024-vol2': '九年级·下册',
  'rj-chemistry-g12-selective-3-organic-2019': '高三/12年级·有机基础'
};

function formatTextbookTabLabel(sourceVolumeId) {
  const label = TEXTBOOK_TAB_LABELS[sourceVolumeId];
  if (label) {
    return label;
  }
  const id = String(sourceVolumeId || '').trim();
  if (!id) {
    return '未标注教材';
  }

  const parts = id.split('-');
  const publisher = parts[0] === 'rj' || parts[0] === 'pep' ? '' : parts[0] || '教材';
  const gradeToken = parts.find((part) => /^g\d+$/i.test(part));
  const gradeNumber = gradeToken ? Number(gradeToken.slice(1)) : null;
  const gradeLabel = getGradeLabel(gradeNumber);
  const selectiveIndex = parts.findIndex((part) => part === 'selective');
  const selectiveLabel = selectiveIndex >= 0 && parts[selectiveIndex + 1]
    ? `选择性必修${toChineseNumber(parts[selectiveIndex + 1])}`
    : '';
  const requiredIndex = parts.findIndex((part) => part === 'required');
  const requiredLabel = requiredIndex >= 0 && parts[requiredIndex + 1]
    ? `必修${toChineseNumber(parts[requiredIndex + 1])}`
    : '';
  const subjectLabel = getSubjectLabel(id);

  return [publisher, gradeLabel, [selectiveLabel || requiredLabel, subjectLabel].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join('·');
}

function formatTextbookVolumeLabel(volume) {
  const publisher = volume.publisher === '人民教育出版社' || volume.displayName?.includes('人教版') ? '人教版' : volume.publisher || '';
  const gradeMatch = volume.volumeId.match(/g(\d+)/i) || volume.sourceVolume?.match(/(\d+)年级/);
  const gradeLabel = getGradeLabel(gradeMatch ? Number(gradeMatch[1]) : null);
  const sourceVolume = String(volume.sourceVolume || volume.displayName || '')
    .replace(/^高中化学/, '')
    .replace(/^九年级化学/, '九年级')
    .replace(/^八年级化学/, '八年级')
    .replace(/第(\d)册/g, (_, number) => `第${toChineseNumber(number)}册`)
    .trim();

  return [publisher, gradeLabel, sourceVolume].filter(Boolean).join('·');
}

function getGradeLabel(gradeNumber) {
  if (gradeNumber === 12) return '高三/12年级';
  if (gradeNumber === 11) return '高二/11年级';
  if (gradeNumber === 10) return '高一/10年级';
  return gradeNumber ? `${gradeNumber}年级` : '';
}

function getSubjectLabel(id) {
  if (id.includes('organic')) return '有机化学基础';
  if (id.includes('reaction')) return '化学反应原理';
  if (id.includes('structure')) return '物质结构与性质';
  return '';
}

function toChineseNumber(value) {
  return ({ '1': '一', '2': '二', '3': '三', '4': '四', '5': '五' })[String(value)] || String(value);
}

function extractAtomicNumbersFromFormula(value) {
  if (typeof value !== 'string') {
    return [];
  }

  return [...value.matchAll(/[A-Z][a-z]?/g)]
    .map((match) => ELEMENT_BY_SYMBOL.get(match[0])?.atomicNumber)
    .filter((atomicNumber) => Number.isInteger(atomicNumber));
}

/** Collect sample activities tagged with a curriculum topic for mastery checks. */
function getActivitiesForTag(tagId) {
  const taggedQuizzes = (quizData || []).filter((quiz) => hasCurriculumTag(quiz, tagId));
  const taggedReactions = (reactions || []).filter((reaction) => hasCurriculumTag(reaction, tagId));
  const elementNumbers = new Set();

  taggedQuizzes.forEach((quiz) => {
    if (Number.isInteger(Number(quiz.relatedElement))) {
      elementNumbers.add(Number(quiz.relatedElement));
    }
  });

  taggedReactions.forEach((reaction) => {
    [...(reaction.reactants || []), ...(reaction.products || [])]
      .flatMap((formula) => extractAtomicNumbersFromFormula(formula))
      .forEach((atomicNumber) => elementNumbers.add(atomicNumber));
  });

  return {
    elements: [...elementNumbers],
    quizzes: taggedQuizzes.map((quiz) => quiz.id).filter(Boolean),
    experiments: taggedReactions.map((reaction) => reaction.experimentId).filter(Boolean)
  };
}

/** Compute topic mastery for a single tag based on current state. */
function computeTopicMastery(tagId, learned, completedExperiments, quizScores, unlockedAchievements = getUnlockedAchievements(), completedLearningSegments = getCompletedLearningSegments()) {
  const meta = CURRICULUM_TAG_MAP.get(tagId);
  const manualAchievement = MANUAL_ACHIEVEMENT_BY_SEGMENT.get(tagId);
  if (!meta && !manualAchievement) {
    return null;
  }

  const { elements: topicElements, quizzes, experiments } = getActivitiesForTag(tagId);
  const completedElements = topicElements.filter((atomicNumber) => learned?.has(atomicNumber));
  const completedQuizzes = quizzes.filter((quizId) => isQuizCompleted(quizId, quizScores));
  const completedExperimentIds = experiments.filter((experimentId) => completedExperiments.has(experimentId));
  const totalActivities = topicElements.length + quizzes.length + experiments.length;
  const completedActivities = completedElements.length + completedQuizzes.length + completedExperimentIds.length;
  const hasTouched = completedActivities > 0;
  const stagePathCompleted = totalActivities > 0 && completedActivities >= totalActivities;
  const rawSegmentCompleted = Boolean(manualAchievement && completedLearningSegments.has(tagId));
  const manualCompleted = Boolean(manualAchievement && unlockedAchievements.has(manualAchievement.id));
  const displayCompleted = stagePathCompleted || manualCompleted;

  return {
    tagId,
    segmentId: manualAchievement ? tagId : '',
    grade: meta?.grade || manualAchievement?.difficulty || '',
    chapter: meta?.chapter || manualAchievement?.sourceReferences?.[0]?.sourceHeading || manualAchievement?.title || '',
    topic: meta?.topic || manualAchievement?.title || '',
    displayPath: meta?.displayPath || buildManualDisplayPath(manualAchievement, tagId),
    started: hasTouched || rawSegmentCompleted,
    completed: displayCompleted,
    displayCompleted,
    stagePathCompleted,
    manualAchievementId: manualAchievement?.id || '',
    manualCompleted,
    rawSegmentCompleted,
    manualAchievement,
    totalActivities,
    completedActivities,
    elementCount: topicElements.length,
    quizCount: quizzes.length,
    experimentCount: experiments.length
  };
}

/** Compute curriculum summary for a stage using its curriculumTags. */
function computeStageCurriculum(stage, learned, completedExperiments, quizScores, unlockedAchievements = getUnlockedAchievements(), completedLearningSegments = getCompletedLearningSegments()) {
  const tags = (stage.curriculumTags || []).filter((tagId) => CURRICULUM_TAG_MAP.has(tagId) || MANUAL_ACHIEVEMENT_BY_SEGMENT.has(tagId));
  const topics = tags.map((tagId) => (
    computeTopicMastery(tagId, learned, completedExperiments, quizScores, unlockedAchievements, completedLearningSegments)
  )).filter(Boolean);
  const startedCount = topics.filter((topic) => topic.started).length;
  const completedCount = topics.filter((topic) => topic.stagePathCompleted).length;
  const totalActivities = topics.reduce((sum, topic) => sum + topic.totalActivities, 0);
  const completedActivities = topics.reduce((sum, topic) => sum + topic.completedActivities, 0);
  return {
    topics,
    startedCount,
    completedCount,
    totalTopics: topics.length,
    totalActivities,
    completedActivities
  };
}

function buildManualDisplayPath(achievement, segmentId) {
  const reference = achievement?.sourceReferences?.[0] || {};
  const heading = reference.sourceHeading || achievement?.title || segmentId;
  const lineRange = reference.lineRange ? `L${reference.lineRange}` : '';
  const sourceVolumeId = achievement?.sourceVolumeId || reference.sourceVolumeId || reference.volumeId || '';
  return [sourceVolumeId, heading, lineRange].filter(Boolean).join(' / ');
}

export function initProgress() {
  renderProgress();

  if (isBound) {
    return;
  }

  window.addEventListener('statechange', handleStateChange);
  window.addEventListener('statereset', handleStateReset);
  window.addEventListener('pagechange', (event) => {
    if (event.detail?.section === 'progress') {
      renderProgress();
    }
  });

  isBound = true;
}

function handleStateChange(event) {
  if (event.detail?.field === 'learnedElements') {
    maybeCelebrateStageProgress(event.detail?.oldValue, event.detail?.newValue);
  }
  renderProgress();
}

function handleStateReset() {
  selectedStageId = learningPath.stages[0]?.id || null;
  celebrationMessage = '';
  renderProgress();
}

function maybeCelebrateStageProgress(oldValue, newValue) {
  const previousCount = oldValue instanceof Set ? oldValue.size : 0;
  const nextCount = newValue instanceof Set ? newValue.size : getLearnedElements().size;
  const stages = learningPath.stages || [];

  stages.forEach((stage, index) => {
    if (previousCount < stage.requiredCount && nextCount >= stage.requiredCount) {
      const nextStage = stages[index + 1];
      celebrationMessage = nextStage
        ? `已完成「${stage.name}」！下一阶段「${nextStage.name}」现已解锁。`
        : `恭喜完成最终阶段「${stage.name}」！你已经达成完整学习路径。`;
      selectedStageId = nextStage?.id || stage.id;
      window.clearTimeout(celebrationTimer);
      celebrationTimer = window.setTimeout(() => {
        celebrationMessage = '';
        renderProgress();
      }, 3600);
    }
  });
}

function renderProgress() {
  const container = document.querySelector('#progress .progress-path');
  if (!container) {
    return;
  }

  readAchievementActionFocus();

  const unlockedAchievements = getUnlockedAchievements();
  const completedLearningSegments = getCompletedLearningSegments();
  const learningSegmentCompletionDates = getLearningSegmentCompletionDates();

  container.innerHTML = renderManualLearningSection(unlockedAchievements, completedLearningSegments, learningSegmentCompletionDates);

  bindLearningInteractions();
}

function getTextbookGroups(manualSegments) {
  const groupMap = new Map();
  manualSegments.forEach((segment) => {
    const sourceVolumeId = segment.sourceVolumeId || 'unknown';
    if (!groupMap.has(sourceVolumeId)) {
      groupMap.set(sourceVolumeId, {
        sourceVolumeId,
        label: formatTextbookTabLabel(sourceVolumeId),
        total: 0,
        completed: 0
      });
    }
    const group = groupMap.get(sourceVolumeId);
    group.total += 1;
    if (segment.status === 'completed') {
      group.completed += 1;
    }
  });

  const knownOrder = KNOWN_TEXTBOOK_ORDER.filter((id) => groupMap.has(id));
  const unknownOrder = [...groupMap.keys()].filter((id) => !KNOWN_TEXTBOOK_ORDER.includes(id));
  const orderedIds = [...knownOrder, ...unknownOrder];

  return orderedIds.map((id) => groupMap.get(id));
}

function bindLearningInteractions() {
  document.querySelectorAll('[data-textbook-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.textbookTab || '';
      activeTextbookId = tabId;
      document.querySelectorAll('[data-textbook-tab]').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.textbookTab === tabId));
      document.querySelectorAll('[data-textbook-panel]').forEach((panel) => {
        const isActive = panel.dataset.textbookPanel === tabId;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
      });
    });
  });

  document.querySelectorAll('[data-testid="learning-card"]').forEach((card) => {
    const openCard = () => {
      const segmentId = card.dataset.learningSegmentId || '';
      activeLearningSegmentId = segmentId;
      focusedLearningSegmentId = segmentId;
      renderProgress();
    };
    card.addEventListener('click', openCard);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openCard();
      }
    });
  });

  const modal = document.querySelector('[data-testid="lesson-modal"]');
  if (modal) {
    const closeButton = modal.querySelector('[data-testid="lesson-modal-close"]');
    if (closeButton) {
      closeButton.addEventListener('click', closeLessonModal);
    }

    const confirmButton = modal.querySelector('[data-testid="confirm-learning"]');
    if (confirmButton) {
      confirmButton.addEventListener('click', () => {
        const segmentId = modal.dataset.learningSegmentId || '';
        const achievementId = confirmButton.dataset.manualAchievementId || '';
        markLearningSegmentCompleted(segmentId, { achievementId, source: 'progress-learning-modal' });
        focusedLearningSegmentId = segmentId;
        // Keep modal open so tests can observe the updated status before any close.
        // Re-render to refresh the modal content (status label, disabled confirm).
        renderProgress();
      });
    }

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeLessonModal();
      }
    });

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeLessonModal();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    modal.__lessonModalKeydownHandler = onKeyDown;
  }

  focusLearningSegmentRow();
}

function closeLessonModal() {
  activeLearningSegmentId = null;
  const modal = document.querySelector('[data-testid="lesson-modal"]');
  if (modal && modal.__lessonModalKeydownHandler) {
    document.removeEventListener('keydown', modal.__lessonModalKeydownHandler);
    delete modal.__lessonModalKeydownHandler;
  }
  renderProgress();
}

function readAchievementActionFocus() {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  try {
    const rawPayload = window.sessionStorage.getItem('achievementActionFocus');
    if (!rawPayload) {
      return;
    }

    const payload = JSON.parse(rawPayload);
    const segmentId = typeof payload?.segmentId === 'string' ? payload.segmentId.trim() : '';
    if (payload?.conditionType === 'manualReviewAfterPromotion' && segmentId) {
      focusedLearningSegmentId = segmentId;
      selectStageForLearningSegment(segmentId);
    }
  } catch {
    // Ignore invalid focus payloads; achievement navigation should still render progress.
  } finally {
    try {
      window.sessionStorage.removeItem('achievementActionFocus');
    } catch {
      // ignore sessionStorage errors
    }
  }
}

function selectStageForLearningSegment(segmentId) {
  const matchingStage = (learningPath.stages || []).find((stage) => (
    Array.isArray(stage.curriculumTags) && stage.curriculumTags.includes(segmentId)
  ));

  if (matchingStage) {
    selectedStageId = matchingStage.id;
  }
}

function focusLearningSegmentRow() {
  if (!focusedLearningSegmentId) {
    return;
  }

  const escapedSegmentId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(focusedLearningSegmentId)
    : focusedLearningSegmentId.replaceAll('"', '\\"');
  const row = document.querySelector(`#progress [data-learning-segment-id="${escapedSegmentId}"]`);
  if (!row) {
    return;
  }

  row.classList.add('is-focused');
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });

  const modal = document.querySelector('[data-testid="lesson-modal"]');
  if (modal) {
    const closeButton = modal.querySelector('[data-testid="lesson-modal-close"]');
    if (closeButton instanceof HTMLElement) {
      closeButton.focus({ preventScroll: true });
    }
    return;
  }

  const card = row.closest('[data-testid="learning-card"]');
  if (card instanceof HTMLElement) {
    card.focus({ preventScroll: true });
  }
}

function getStageStates(stages, learned, completedExperiments, quizScores, unlockedAchievements = getUnlockedAchievements(), completedLearningSegments = getCompletedLearningSegments()) {
  const learnedCount = learned.size;
  let previousStageComplete = true;

  return stages.map((stage) => {
    const curriculum = computeStageCurriculum(stage, learned, completedExperiments, quizScores, unlockedAchievements, completedLearningSegments);
    const hasCurriculumCompletion = curriculum.totalTopics > 0 && curriculum.completedCount >= curriculum.totalTopics;
    const completedCount = Math.min(learnedCount, stage.requiredCount);
    const progressPercent = stage.requiredCount > 0
      ? Math.round((completedCount / stage.requiredCount) * 100)
      : 0;
    const isComplete = learnedCount >= stage.requiredCount || hasCurriculumCompletion;
    const isUnlocked = previousStageComplete;
    let status = 'locked';

    if (isComplete) {
      status = 'complete';
    } else if (isUnlocked) {
      status = 'current';
    }

    previousStageComplete = isComplete;

    return {
      ...stage,
      isUnlocked,
      isComplete,
      progressPercent,
      completedCount,
      remainingCount: Math.max(stage.requiredCount - learnedCount, 0),
      status,
      curriculum
    };
  });
}

function renderStageCard(stage, learnedCount) {
  const icon = stage.status === 'complete' ? 'check-circle-2' : stage.status === 'current' ? 'star' : 'lock';
  const curriculumLabels = (stage.curriculum?.topics || [])
    .map((topic) => topic.displayPath)
    .filter(Boolean);
  const curriculumLabelHtml = curriculumLabels.length
    ? `<div class="progress-stage-curriculum">${curriculumLabels.map((label) => `<span class="curriculum-chip">${escapeHtml(label)}</span>`).join('')}</div>`
    : '';
  return `
    <article class="progress-stage-card hud-shell is-${stage.status}">
      <button class="progress-stage-button" type="button" data-stage-select="${escapeHtmlAttr(stage.id)}">
        <div class="progress-stage-top">
          <div>
            <p class="hud-kicker"><i data-lucide="${icon}"></i> PATH STAGE</p>
            <h3>${escapeHtml(stage.name)}</h3>
          </div>
          <strong>${stage.completedCount}/${stage.requiredCount}</strong>
        </div>
        <p>${escapeHtml(stage.description)}</p>
        ${curriculumLabelHtml}
        <div class="progress-stage-meta-row">
          <span>需要元素：${stage.requiredCount}</span>
          <span>${stage.status === 'locked' ? '尚未解锁' : stage.status === 'complete' ? '已完成' : `还差 ${stage.remainingCount} 个`}</span>
        </div>
        <div class="progress-bar-track">
          <span class="progress-bar-fill" style="width:${stage.progressPercent}%"></span>
        </div>
        <div class="progress-stage-rewards">
          ${stage.curriculum?.totalTopics ? `<span>主题 ${stage.curriculum.completedCount}/${stage.curriculum.totalTopics}</span>` : ''}
          <span>解锁 ${stage.unlockedGames.length} 个游戏</span>
          <span>${stage.unlockedExperiments.length} 个实验</span>
          <span>${stage.unlockedFeatures.length} 项功能</span>
        </div>
      </button>
    </article>
  `;
}

function renderStageDetail(stage, snapshot) {
  const elementsMap = new Map(snapshot.elements.map((element) => [element.atomicNumber, element]));
  const learned = getLearnedElements();
  const curriculum = stage.curriculum || { topics: [] };
  const curriculumHtml = curriculum.topics.length
    ? `
      <div class="progress-detail-card">
        <span>课程主题进度</span>
        <div class="curriculum-topic-list">
          ${curriculum.topics.map((t) => `
            <div class="curriculum-topic-row">
              <span class="curriculum-topic-path">${escapeHtml(t.displayPath)}</span>
              <span class="curriculum-topic-status"><i data-lucide="${t.displayCompleted ? 'check-circle-2' : t.started ? 'star' : 'circle'}"></i> ${t.displayCompleted ? '已完成' : t.started ? '进行中' : '未开始'} · ${t.completedActivities}/${t.totalActivities || 0}</span>
            </div>
          `).join('')}
        </div>
      </div>`
    : '';

  return `
    <article class="progress-stage-detail hud-shell">
      <div class="progress-panel-heading">
        <div>
          <p class="hud-kicker">STAGE DETAIL</p>
          <h4>${escapeHtml(stage.name)}</h4>
        </div>
        <span><i data-lucide="${stage.status === 'locked' ? 'lock' : stage.status === 'complete' ? 'check-circle-2' : 'star'}"></i> ${stage.status === 'locked' ? '未解锁' : stage.status === 'complete' ? '已完成' : '当前阶段'}</span>
      </div>
      <p class="progress-stage-detail-copy">${escapeHtml(stage.description)} 当前进度 ${stage.completedCount}/${stage.requiredCount}，${stage.remainingCount > 0 ? `再学习 ${stage.remainingCount} 个元素即可完成。` : '该阶段已经达成。'}</p>
      <div class="progress-stage-detail-grid">
        <div class="progress-detail-card">
          <span>本阶段重点元素</span>
          <div class="stage-element-chip-list">
            ${stage.focusElements.map((atomicNumber) => renderElementChip(atomicNumber, elementsMap.get(atomicNumber), learned.has(atomicNumber))).join('')}
          </div>
        </div>
        <div class="progress-detail-card">
          <span>解锁内容预览</span>
          <ul class="progress-unlock-list">
            ${stage.unlockedGames.map((gameKey) => `<li><i data-lucide="gamepad-2"></i> ${escapeHtml(GAME_LABELS[gameKey] || gameKey)}</li>`).join('')}
            ${stage.unlockedExperiments.map((experimentId) => `<li><i data-lucide="flask-conical"></i> ${escapeHtml(EXPERIMENT_LABELS[experimentId] || experimentId)}</li>`).join('')}
            ${stage.unlockedFeatures.map((featureKey) => `<li><i data-lucide="sparkles"></i> ${escapeHtml(FEATURE_LABELS[featureKey] || featureKey)}</li>`).join('')}
          </ul>
        </div>
        ${curriculumHtml}
      </div>
    </article>
  `;
}
function renderManualLearningSection(unlockedAchievements, completedLearningSegments, learningSegmentCompletionDates) {
  const manualSegments = getManualLearningSegments(unlockedAchievements, completedLearningSegments, learningSegmentCompletionDates);
  if (!manualSegments.length) {
    return `
      <div class="progress-manual-learning-panel progress-detail-card">
        <div class="progress-panel-heading">
          <div>
            <h4 class="progress-manual-learning-title">教材复习</h4>
          </div>
          <img
            class="module-cat learning-cat"
            src="${learningCatImage}"
            alt=""
            aria-hidden="true"
            data-testid="floating-learning-cat"
          />
        </div>
        <div class="progress-manual-segment-list">
          <div class="progress-learning-card is-empty" data-testid="learning-empty-fallback">
            <div class="progress-learning-card-copy">
              <p>暂无教材复习内容</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const groups = getTextbookGroups(manualSegments);
  const activeGroupId = activeTextbookId || groups[0]?.sourceVolumeId || '';

  const tabsHtml = groups.map((group) => `
    <button type="button" class="textbook-tab ${group.sourceVolumeId === activeGroupId ? 'is-active' : ''}" data-textbook-tab="${escapeHtmlAttr(group.sourceVolumeId)}">
      <span class="textbook-tab-label">${renderTextbookTabLabel(group.label)}</span>
      <span class="textbook-tab-progress">${group.total}</span>
    </button>
  `).join('');

  const panelsHtml = groups.map((group) => {
    const groupSegments = manualSegments.filter((segment) => segment.sourceVolumeId === group.sourceVolumeId);
    const activeSegment = activeLearningSegmentId
      ? groupSegments.find((s) => s.segmentId === activeLearningSegmentId) || null
      : null;

    return `
      <div class="textbook-panel ${group.sourceVolumeId === activeGroupId ? 'is-active' : ''}" data-textbook-panel="${escapeHtmlAttr(group.sourceVolumeId)}" ${group.sourceVolumeId !== activeGroupId ? 'hidden' : ''}>
        <div class="progress-manual-segment-list">
          ${groupSegments.map((segment) => renderLearningCard(segment)).join('')}
        </div>
        ${activeSegment ? renderLessonModal(activeSegment) : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="progress-manual-learning-panel progress-detail-card">
      <div class="progress-panel-heading">
        <div>
          <h4 class="progress-manual-learning-title">教材复习</h4>
        </div>
        <span>${manualSegments.length} 个片段</span>
        <img
          class="module-cat learning-cat"
          src="${learningCatImage}"
          alt=""
          aria-hidden="true"
          data-testid="floating-learning-cat"
        />
      </div>
      <div class="textbook-tab-bar progress-textbook-tabs">
        ${tabsHtml}
      </div>
      <div class="textbook-panels">
        ${panelsHtml}
      </div>
    </div>
  `;
}

function renderLearningCard(segment) {
  const { segmentId, achievementId, title, displayPath, status, completionDate } = segment;
  const isCompleted = status === 'completed';
  let statusText;
  if (isCompleted) {
    statusText = completionDate ? `学习确认：${completionDate}` : '学习确认：日期待补充';
  } else {
    statusText = '';
  }
  const cardClasses = [
    'progress-learning-card',
    isCompleted ? 'is-complete' : '',
    focusedLearningSegmentId === segmentId ? 'is-focused' : ''
  ].filter(Boolean).join(' ');

  return `
    <article class="${cardClasses}"
      data-testid="learning-card"
      data-learning-segment-id="${escapeHtmlAttr(segmentId)}"
      data-manual-achievement-id="${escapeHtmlAttr(achievementId)}"
      data-learning-card-open="true"
      tabindex="0"
      role="button"
      aria-label="打开学习内容：${escapeHtmlAttr(title)}">
      <div class="progress-learning-card-copy">
        <h5>${escapeHtml(title)}</h5>
        <p>${escapeHtml(displayPath)}</p>
      </div>
      ${statusText ? `<div class="progress-learning-card-meta">
        <span data-testid="learning-card-status">${statusText}</span>
      </div>` : ''}
    </article>
  `;
}

function renderLessonModal(segment) {
  const { segmentId, achievementId, title, status, detailSections, completionDate } = segment;
  const isCompleted = status === 'completed';

  const footerHtml = isCompleted
    ? `<span class="lesson-modal-completed-label">已学习${completionDate ? `：${escapeHtml(completionDate)}` : '：日期待补充'}</span>`
    : `<button type="button" data-testid="confirm-learning" data-manual-achievement-id="${escapeHtmlAttr(achievementId)}">确定已学习</button>`;

  return `
    <div class="lesson-modal-overlay" data-testid="lesson-modal" role="dialog" aria-modal="true" data-learning-segment-id="${escapeHtmlAttr(segmentId)}">
      <div class="lesson-modal-shell">
        <div class="lesson-modal-header">
          <h4>${escapeHtml(title)}</h4>
          <button type="button" data-testid="lesson-modal-close" aria-label="关闭">✕</button>
        </div>
        <div class="lesson-modal-body" data-testid="lesson-modal-body" style="overflow-y:auto;">
          ${detailSections.map((section) => renderLessonModalSection(section)).join('')}
        </div>
        <div class="lesson-modal-footer">
          ${footerHtml}
        </div>
      </div>
    </div>
  `;
}

function renderLessonModalSection(section) {
  if (!section || !section.blocks || !section.blocks.length) {
    return '';
  }

  const blocksHtml = section.blocks.map((block) => renderLessonModalBlock(block)).join('');
  if (!blocksHtml) {
    return '';
  }

  return `
    <section class="lesson-modal-section">
      <h5>${escapeHtml(section.title)}</h5>
      ${blocksHtml}
    </section>
  `;
}

function renderLessonModalBlock(block) {
  if (!block) {
    return '';
  }

  if (block.type === 'paragraph') {
    const text = normalizeText(block.text);
    return text ? `<p>${mixedProseFormulaHTML(text)}</p>` : '';
  }

  if (block.type === 'heading') {
    const text = normalizeText(block.text);
    return text ? `<h6 class="lesson-modal-content-heading">${mixedProseFormulaHTML(text)}</h6>` : '';
  }

  if (block.type === 'list') {
    const items = Array.isArray(block.items) ? block.items.map(normalizeText).filter(Boolean) : [];
    const tag = block.style === 'ordered' ? 'ol' : 'ul';
    return items.length
      ? `<${tag}>${items.map((item) => `<li>${mixedProseFormulaHTML(item)}</li>`).join('')}</${tag}>`
      : '';
  }

  if (block.type === 'table') {
    return renderLessonModalTable(block);
  }

  if (block.type === 'source') {
    const label = normalizeText(block.label);
    const text = normalizeText(block.text);
    if (!label && !text) return '';
    return `<div class="lesson-modal-source-block"><strong>${escapeHtml(label || '')}</strong><p>${escapeHtml(text || '')}</p></div>`;
  }

  if (block.type === 'asset') {
    const label = normalizeText(block.label);
    const text = normalizeText(block.text);
    if (!label && !text) return '';
    return `<div class="lesson-modal-asset-block"><strong>${escapeHtml(label || '')}</strong><p>${escapeHtml(text || '')}</p></div>`;
  }

  return '';
}

function renderLessonModalTable(block) {
  const rows = Array.isArray(block.rows)
    ? block.rows
        .filter(Array.isArray)
        .map((row) => row.map(normalizeText))
        .filter((row) => row.some(Boolean))
    : [];

  if (!rows.length) {
    return '';
  }

  const [headerRow, ...bodyRows] = rows;
  const headerHtml = headerRow.map((cell) => `<th>${mixedProseFormulaHTML(cell)}</th>`).join('');
  const bodyHtml = bodyRows.map((row) => (
    `<tr>${row.map((cell) => `<td>${mixedProseFormulaHTML(cell)}</td>`).join('')}</tr>`
  )).join('');

  return `<div class="lesson-modal-table-wrap"><table class="lesson-modal-table"><thead><tr>${headerHtml}</tr></thead>${bodyHtml ? `<tbody>${bodyHtml}</tbody>` : ''}</table></div>`;
}

function renderElementChip(atomicNumber, element, learned) {
  const label = element ? `${element.chineseName} (${element.symbol})` : `元素 ${atomicNumber}`;
  return `<span class="stage-element-chip ${learned ? 'is-learned' : ''}"><i data-lucide="${learned ? 'check' : 'circle'}"></i> ${escapeHtml(label)}</span>`;
}

function renderActivityList(activityLog, snapshot) {
  if (!activityLog.length) {
    return '<div class="activity-empty">还没有学习活动，去点亮第一个元素吧。</div>';
  }

  const elementsMap = new Map(snapshot.elements.map((element) => [element.atomicNumber, element]));

  return activityLog.slice(0, 6).map((entry) => {
    const description = resolveActivityDescription(entry, elementsMap);
    return `
      <article class="activity-item">
        <div class="activity-dot"></div>
        <div>
          <strong>${escapeHtml(entry.title)}</strong>
          <p>${escapeHtml(description)}</p>
          <span>${escapeHtml(formatDate(entry.timestamp))}</span>
        </div>
      </article>
    `;
  }).join('');
}

function resolveActivityDescription(entry, elementsMap) {
  if (entry.type === 'elementlearned') {
    const atomicNumber = Number(entry.meta?.atomicNumber);
    const element = elementsMap.get(atomicNumber);
    return element
      ? `已学习 ${element.chineseName}（${element.symbol}），学习路径同步更新。`
      : entry.description;
  }

  if (entry.type === 'achievementunlocked') {
    const achievement = achievementsData.find((item) => item.id === entry.meta?.achievementId);
    return achievement ? `解锁成就「${achievement.title}」。` : entry.description;
  }

  if (entry.type === 'gamecompleted') {
    return `${GAME_LABELS[entry.meta?.gameKey] || entry.meta?.gameKey || '学习游戏'} 得分 ${entry.meta?.score ?? 0}。`;
  }

  if (entry.type === 'experimentcompleted') {
    return `${EXPERIMENT_LABELS[entry.meta?.experimentId] || entry.meta?.experimentId || '实验'} 已完成。`;
  }

  return entry.description;
}

function renderMetricBars(items, suffix = '') {
  return items.map((item) => `
    <div class="metric-bar-row">
      <div class="metric-bar-topline">
        <span>${item.label}</span>
        <strong>${item.value}${suffix}</strong>
      </div>
      <div class="progress-bar-track">
        <span class="progress-bar-fill" style="width:${Math.max(0, Math.min(100, item.value))}%"></span>
      </div>
    </div>
  `).join('');
}

function renderGameStats(gameScores, gamePlays) {
  return Object.entries(GAME_LABELS).map(([gameKey, label]) => {
    const bestScore = Number(gameScores[gameKey] || 0);
    const playCount = Number(gamePlays[gameKey] || 0);
    return `
      <article class="game-stat-item">
        <div>
          <strong>${label}</strong>
          <span>最高分 ${bestScore}</span>
        </div>
        <b>${playCount} 次</b>
      </article>
    `;
  }).join('');
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '刚刚';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
