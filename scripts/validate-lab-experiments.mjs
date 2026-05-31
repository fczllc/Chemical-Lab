import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const evidenceRoot = path.join(projectRoot, '.sisyphus', 'evidence');
const labTextbookCandidateInventoryPath = path.join(evidenceRoot, 'lab-textbook-candidate-inventory.json');

/**
 * Runtime lab experiment schema and inclusion/content-quality predicates.
 *
 * Required fields for every runtime lab experiment record:
 *   id                  - stable runtime identifier
 *   experimentId        - stable experiment identifier (UI compatibility alias)
 *   title               - human-readable Chinese experiment title (display)
 *   name                - UI alias for title; same content-quality rules apply
 *   description         - 1-2 Chinese sentences summarising what the learner will observe/do
 *   textbookContent     - full or excerpted textbook content backing the experiment
 *   materials           - array of material names (strings)
 *   steps               - array of procedural step strings
 *   observedPhenomena   - array of observation strings
 *   visualDescription   - Chinese visual/animation description
 *   safetyLevel         - one of the allowed safety levels
 *   safetyNotes         - array of safety note strings
 *   curriculumTags      - array of curriculum tag strings
 *   difficulty          - difficulty label string
 *   unlockRequirements  - object describing unlock conditions (must be present and non-empty)
 *   sourceKind          - exactly "textbookExperiment" or "curatedLegacy"
 *   sourceReviewStatus  - review status string
 *   sourceVolumeId      - source textbook volume identifier
 *   sourceReferences    - array of provenance reference objects
 *
 * Allowed sourceKind values:
 *   "textbookExperiment"  - transformed explicit textbook experiment
 *   "curatedLegacy"       - preserved unmatched record from the original five curated lab experiments
 *
 * Inclusion rules (explicit-source inclusion):
 *   - Include explicit experiment sections from experiment-candidates.json and/or
 *     lab-candidates.json where the title/source heading is an explicit experiment
 *     marker such as 【实验...】 OR where activityType === "experimentReview".
 *   - Use experiment-backlog.json ONLY as enrichment for observations, materials,
 *     safety notes, and provenance; do NOT expose backlog records directly.
 *
 * Exclusion rules:
 *   - Exclude generic inquiryReview sections (activityType === "inquiryReview").
 *   - Exclude plain reaction formula records that lack experiment-specific fields.
 *   - Exclude any output record whose sourceKind is "textbook" (that is the game
 *     reaction-pool kind, not a lab experiment kind).
 *   - Exclude records without unlockRequirements.
 *
 * Content-quality rules:
 *   - title/name must be a human-readable Chinese summary derived from textbook
 *     experiment content. Raw candidateId, sourceSectionId, hash suffixes, and
 *     textbook numbering labels such as 【实验1-1】 are INVALID in display titles.
 *   - description must summarise what the learner will observe/do in 1-2 Chinese
 *     sentences. It must NOT be a raw copied ID/heading, a formula-pool placeholder
 *     such as "教材已审核反应：...", or shorter than a meaningful Chinese phrase.
 */

const REQUIRED_FIELDS = [
  'id',
  'experimentId',
  'title',
  'name',
  'description',
  'textbookContent',
  'materials',
  'steps',
  'observedPhenomena',
  'visualDescription',
  'safetyLevel',
  'safetyNotes',
  'curriculumTags',
  'difficulty',
  'unlockRequirements',
  'sourceKind',
  'sourceReviewStatus',
  'sourceVolumeId',
  'sourceReferences'
];

const ALLOWED_SOURCE_KINDS = new Set(['textbookExperiment', 'curatedLegacy']);

const ALLOWED_SOURCE_REVIEW_STATUSES = new Set([
  'needsReview',
  'reviewed',
  'legacy-preserved'
]);

const FINAL_CANDIDATE_ACTIONS = new Set(['add', 'merge', 'skip']);

const ALLOWED_SAFETY_LEVELS = new Set([
  'safe',
  'caution',
  'dangerous',
  'extremely dangerous'
]);

const ORIGINAL_CURATED_EXPERIMENT_IDS = new Set([
  'exp-hydrogen-combustion',
  'exp-iron-rusting',
  'exp-sodium-water',
  'exp-salt-formation',
  'exp-oxygen-supports-combustion'
]);

// Patterns that invalidate display text
const RAW_ID_PATTERN = /^(experiment-|lab-|backlog-|reaction-)[a-z0-9-]+$/iu;
const RAW_ID_FRAGMENT_PATTERN = /\b(?:experiment|lab|backlog|reaction)-[a-z0-9][a-z0-9-]{6,}\b/iu;
const SOURCE_SECTION_ID_PATTERN = /^(?:\d{4}-(?:source-section|[a-z0-9-]*l\d+-l\d+)-)?[a-f0-9]{8,}$/iu;
const SOURCE_SECTION_ID_FRAGMENT_PATTERN = /\b\d{4}-(?:source-section|[a-z0-9-]*l\d+-l\d+)-[a-f0-9]{8,}\b/iu;
const HASH_FRAGMENT_PATTERN = /\b(?:sha256:)?[a-f0-9]{32,}\b/iu;
const HASH_SUFFIX_PATTERN = /-[a-f0-9]{8,}$/iu;
const EXPERIMENT_NUMBER_LABEL_PATTERN = /【实验[^】\s，。；;:：]*(?:】|\s+)?/u;
const PLACEHOLDER_DESCRIPTION_PATTERN = /教材已审核反应[：:]/u;
const SAFETY_NOTE_FALLBACK_PATTERN = /No explicit safety note was extracted/i;
const FORBIDDEN_SAFETY_FALLBACK_PHRASES = [
  '未提取到安全提示',
  '教材未提取到明确安全提示',
  'No explicit safety note was extracted'
];

const GENERIC_TITLE_KEYS = new Set([
  '',
  '观察现象',
  '实验现象',
  '观察现象和数据',
  '记录',
  '实验内容',
  '现象和数据',
  '实验记录',
  '实验记录和数据处理',
  '数据处理',
  '项目现象和数据',
  '记录实验现象',
  '观察并记录实验现象',
  '的观察与描述',
  '实验现象的观察与描述'
]);

// Minimum meaningful Chinese description length (arbitrary but reasonable)
const MIN_DESCRIPTION_LENGTH = 8;

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  const options = parseCli(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (options.selfCheck) {
    const result = runSelfCheck(options.selfCheck);
    await maybeWriteReport(options.report, result);
    printResult(result);
    if (result.status !== 'pass') {
      process.exitCode = 1;
    }
    return;
  }

  const inventoryLoadResult = await loadLabTextbookCandidateInventory();

  const labPath = path.join(projectRoot, 'src', 'data', 'labExperiments.json');
  let labPayload = null;
  try {
    labPayload = JSON.parse(await readFile(labPath, 'utf8'));
  } catch (error) {
    const result = {
      schemaVersion: 1,
      validator: 'scripts/validate-lab-experiments.mjs',
      source: 'src/data/labExperiments.json',
      status: 'fail',
      counters: { totalRecords: 0 },
      errors: [`Failed to read src/data/labExperiments.json: ${error.message}`],
      details: {}
    };
    await maybeWriteReport(options.report, result);
    printResult(result);
    process.exitCode = 1;
    return;
  }

  const records = Array.isArray(labPayload?.labExperiments) ? labPayload.labExperiments : [];
  const result = validateLabExperiments(records, {
    ...options,
    inventory: inventoryLoadResult.inventory,
    inventoryLoadError: inventoryLoadResult.error
  });

  await maybeWriteReport(options.report, result);
  printResult(result);
  if (result.status !== 'pass') {
    process.exitCode = 1;
  }
}

function parseCli(args) {
  const options = {
    help: false,
    selfCheck: null,
    report: null
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--self-check') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--self-check requires a check name');
      }
      options.selfCheck = value;
      index += 1;
      continue;
    }
    if (arg === '--report') {
      const reportPath = args[index + 1];
      if (!reportPath || reportPath.startsWith('--')) {
        throw new Error('--report requires a path');
      }
      options.report = reportPath;
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Lab experiment runtime schema validator / 实验室实验运行时模式校验器

Usage:
  node scripts/validate-lab-experiments.mjs [--self-check <name>] [--report <path>]

Self-check names:
  explicit-include        Verify inclusion predicate accepts explicit experiment records.
  reject-non-experiment   Verify exclusion predicate rejects inquiryReview and formula-only records.
  reject-meaningless-title Verify title/description quality predicates reject raw IDs and placeholders.
  missing-unlock          Verify missing/empty unlock metadata is rejected.
  placeholder-text        Verify display fields reject placeholders, raw IDs, hashes, and experiment labels.
  duplicate-content-merge Verify duplicate canonical content is rejected unless provenance is unioned into one record.
  duplicate-content-conflict Verify distinct chemistry fixtures keep separate canonical fingerprints.
  source-reference-union Verify merged provenance fixtures retain all source references.
  safety-risk-summary     Verify Chinese safety risk summaries pass quality rules.
  safety-note-quality     Verify fallback phrases, empty notes, English notes, and step copies are rejected.
  candidate-target-accounting Verify add/merge inventory actions require targetExperimentId.
  duplicate-textbook-source Verify duplicate normalized titles within one textbook source are rejected.

Options:
  --report <path>  Write JSON validation report under .sisyphus/evidence/.
  --help           Show this help.`);
}

function runSelfCheck(checkName) {
  switch (checkName) {
    case 'explicit-include':
      return selfCheckExplicitInclude();
    case 'reject-non-experiment':
      return selfCheckRejectNonExperiment();
    case 'reject-meaningless-title':
      return selfCheckRejectMeaninglessTitle();
    case 'missing-unlock':
      return selfCheckMissingUnlock();
    case 'placeholder-text':
      return selfCheckPlaceholderText();
    case 'duplicate-content-merge':
      return selfCheckDuplicateContentMerge();
    case 'duplicate-content-conflict':
      return selfCheckDuplicateContentConflict();
    case 'source-reference-union':
      return selfCheckSourceReferenceUnion();
    case 'safety-risk-summary':
      return selfCheckSafetyRiskSummary();
    case 'safety-note-quality':
      return selfCheckSafetyNoteQuality();
    case 'candidate-target-accounting':
      return selfCheckCandidateTargetAccounting();
    case 'duplicate-textbook-source':
      return selfCheckDuplicateTextbookSource();
    default:
      throw new Error(`Unknown self-check: ${checkName}`);
  }
}

function selfCheckExplicitInclude() {
  const accepted = [];
  const rejected = [];

  // Fixture: explicit experiment candidate with 【实验1-1】 heading and experimentReview activityType
  const explicitExperiment = {
    candidateId: 'lab-0006-1-1-l27-l50-e9eba2d49e',
    title: '【实验1-1】',
    activityType: 'experimentReview',
    sourceHeading: '【实验1-1】',
    sourceSectionId: '0006-1-1-l27-l50-e9eba2d49e',
    sourceVolumeId: 'rj-chemistry-grade9-2024-vol1'
  };

  if (isExplicitExperimentCandidate(explicitExperiment)) {
    accepted.push(explicitExperiment.candidateId);
  } else {
    rejected.push(explicitExperiment.candidateId);
  }

  // Also accept experiment-candidates.json style record with matching sourceHeading
  const explicitCandidate = {
    candidateId: 'experiment-0006-1-1-l27-l50-e9eba2d49e',
    title: '观察记录实验现象',
    sourceHeading: '【实验1-1】',
    sourceSectionId: '0006-1-1-l27-l50-e9eba2d49e',
    sourceVolumeId: 'rj-chemistry-grade9-2024-vol1'
  };

  if (isExplicitExperimentCandidate(explicitCandidate)) {
    accepted.push(explicitCandidate.candidateId);
  } else {
    rejected.push(explicitCandidate.candidateId);
  }

  const status = accepted.length === 2 && rejected.length === 0 ? 'pass' : 'fail';
  const errors = [];
  if (status !== 'pass') {
    errors.push(`explicit-include expected 2 accepted, got ${accepted.length}; expected 0 rejected, got ${rejected.length}`);
  }

  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-experiments.mjs',
    check: 'explicit-include',
    status,
    accepted,
    rejected,
    errors
  };
}

function selfCheckRejectNonExperiment() {
  const accepted = [];
  const rejected = [];

  // Fixture: generic inquiryReview must be rejected
  const inquiryReview = {
    candidateId: 'lab-0002-source-section-l5-l12-476de3bd8c',
    title: '第一单元走进化学世界',
    activityType: 'inquiryReview',
    sourceHeading: '第一单元走进化学世界',
    sourceSectionId: '0002-source-section-l5-l12-476de3bd8c',
    sourceVolumeId: 'rj-chemistry-grade9-2024-vol1'
  };

  if (isExplicitExperimentCandidate(inquiryReview)) {
    accepted.push(inquiryReview.candidateId);
  } else {
    rejected.push(inquiryReview.candidateId);
  }

  // Fixture: formula-only record with sourceKind "textbook" must be rejected for lab runtime
  const formulaOnly = {
    id: 'textbook-rj-chemistry-grade9-2024-vol1-some-reaction',
    name: '铁与硫酸铜反应',
    sourceKind: 'textbook',
    sourceReviewStatus: 'reviewed',
    reactants: ['Fe', 'CuSO4'],
    products: ['FeSO4', 'Cu']
  };

  if (isValidLabRuntimeRecord(formulaOnly)) {
    accepted.push(formulaOnly.id);
  } else {
    rejected.push(formulaOnly.id);
  }

  // Fixture: missing unlockRequirements must be rejected
  const missingUnlock = {
    id: 'lab-missing-unlock',
    name: '某个实验',
    sourceKind: 'textbookExperiment',
    unlockRequirements: undefined
  };

  if (isValidLabRuntimeRecord(missingUnlock)) {
    accepted.push(missingUnlock.id);
  } else {
    rejected.push(missingUnlock.id);
  }

  const status =
    accepted.length === 0 && rejected.length === 3 ? 'pass' : 'fail';
  const errors = [];
  if (status !== 'pass') {
    errors.push(`reject-non-experiment expected 0 accepted, got ${accepted.length}; expected 3 rejected, got ${rejected.length}`);
  }

  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-experiments.mjs',
    check: 'reject-non-experiment',
    status,
    accepted,
    rejected,
    errors
  };
}

function selfCheckRejectMeaninglessTitle() {
  const badTitles = [
    { value: 'lab-0006-1-1-l27-l50-e9eba2d49e', reason: 'raw candidateId' },
    { value: '0006-1-1-l27-l50-e9eba2d49e', reason: 'raw sourceSectionId' },
    { value: 'sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', reason: 'hash string' },
    { value: '0006-source-section-l27-l50-e9eba2d49e', reason: 'source section id' },
    { value: '实验标题-e9eba2d4', reason: 'hash suffix' },
    { value: '【实验1-1】', reason: 'textbook experiment numbering label' },
    { value: '【实验2-3】观察氧气性质', reason: 'contains textbook numbering label' }
  ];

  const badDescriptions = [
    { value: '教材已审核反应：铁与硫酸铜反应生成硫酸亚铁和铜', reason: 'placeholder prefix' },
    { value: '【实验1-1】', reason: 'raw heading shorter than threshold' },
    { value: 'lab-0006-1-1-l27-l50-e9eba2d49e', reason: 'raw candidateId' }
  ];

  const rejectedTitles = [];
  const acceptedTitles = [];
  for (const { value, reason } of badTitles) {
    if (isMeaningfulTitle(value)) {
      acceptedTitles.push({ value, reason });
    } else {
      rejectedTitles.push({ value, reason });
    }
  }

  const rejectedDescriptions = [];
  const acceptedDescriptions = [];
  for (const { value, reason } of badDescriptions) {
    if (isMeaningfulDescription(value)) {
      acceptedDescriptions.push({ value, reason });
    } else {
      rejectedDescriptions.push({ value, reason });
    }
  }

  const status =
    rejectedTitles.length === 7 &&
    acceptedTitles.length === 0 &&
    rejectedDescriptions.length === 3 &&
    acceptedDescriptions.length === 0
      ? 'pass'
      : 'fail';

  const errors = [];
  if (status !== 'pass') {
    errors.push(`reject-meaningless-title: expected 7 rejected titles, got ${rejectedTitles.length}; expected 0 accepted titles, got ${acceptedTitles.length}`);
    errors.push(`reject-meaningless-title: expected 3 rejected descriptions, got ${rejectedDescriptions.length}; expected 0 accepted descriptions, got ${acceptedDescriptions.length}`);
  }

  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-experiments.mjs',
    check: 'reject-meaningless-title',
    status,
    rejectedTitles: rejectedTitles.map((t) => t.value),
    acceptedTitles: acceptedTitles.map((t) => t.value),
    rejectedDescriptions: rejectedDescriptions.map((d) => d.value),
    acceptedDescriptions: acceptedDescriptions.map((d) => d.value),
    errors
  };
}

function selfCheckMissingUnlock() {
  const fixture = makeValidLabRecord({ id: 'lab-self-check-missing-unlock' });
  delete fixture.unlockRequirements;

  const result = validateLabExperiments([fixture]);
  const status = result.status === 'fail' && result.counters.missingUnlockRequirements === 1 ? 'pass' : 'fail';
  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-experiments.mjs',
    check: 'missing-unlock',
    status,
    counters: result.counters,
    errors: status === 'pass' ? [] : ['missing-unlock self-check expected validator failure for absent unlockRequirements']
  };
}

function selfCheckPlaceholderText() {
  const fixture = makeValidLabRecord({
    id: 'lab-self-check-placeholder-text',
    description: '教材已审核反应：铁与硫酸铜反应生成硫酸亚铁和铜',
    observedPhenomena: ['观察到 experiment-0006-1-1-l27-l50-e9eba2d49e 原始编号。'],
    visualDescription: '教材已审核反应：可视化占位内容。',
    safetyNotes: ['来源 sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef 不应展示。'],
    steps: ['读取 0006-source-section-l27-l50-e9eba2d49e 的原始片段。'],
    materials: ['【实验1-1】器材占位']
  });

  const result = validateLabExperiments([fixture]);
  const status = result.status === 'fail' && result.counters.dirtyDisplayFields >= 6 ? 'pass' : 'fail';
  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-experiments.mjs',
    check: 'placeholder-text',
    status,
    counters: result.counters,
    errors: status === 'pass' ? [] : ['placeholder-text self-check expected dirty display fields to be rejected']
  };
}

function selfCheckDuplicateContentMerge() {
  const mergedFixture = makeValidLabRecord({
    id: 'lab-self-check-merged-oxygen-a',
    experimentId: 'lab-self-check-merged-oxygen-a',
    textbookContent: '【实验1】（1）把带火星木条伸入盛有O₂的集气瓶中。（2）观察木条是否复燃。',
    steps: ['1）把带火星木条伸入盛有O₂的集气瓶中。', '2）观察木条是否复燃。'],
    sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
    sourceReferences: [
      makeSourceReference('candidate-a', 'rj-chemistry-grade9-2024-vol1', 'section-a'),
      makeSourceReference('candidate-b', 'rj-chemistry-grade8-54-2024-full', 'section-b')
    ]
  });
  const duplicateFixture = makeValidLabRecord({
    id: 'lab-self-check-merged-oxygen-b',
    experimentId: 'lab-self-check-merged-oxygen-b',
    textbookContent: '【实验2】（1）把带火星木条伸入盛有O₂的集气瓶中。（2）观察木条是否复燃。',
    steps: ['1）把带火星木条伸入盛有O₂的集气瓶中。', '2）观察木条是否复燃。'],
    materials: ['集气瓶', '氧气', '带火星木条'],
    observedPhenomena: ['带火星木条在氧气中复燃。'],
    sourceVolumeId: 'rj-chemistry-grade8-54-2024-full',
    sourceReferences: [makeSourceReference('candidate-b', 'rj-chemistry-grade8-54-2024-full', 'section-b')]
  });

  const starterFixture = makeStarterLabRecord({ id: 'lab-self-check-duplicate-starter' });
  const acceptedResult = validateLabExperiments([starterFixture, mergedFixture]);
  const rejectedResult = validateLabExperiments([starterFixture, mergedFixture, duplicateFixture]);
  const status = acceptedResult.status === 'pass' && rejectedResult.status === 'fail' && rejectedResult.counters.duplicateContentClusters === 1 ? 'pass' : 'fail';

  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-experiments.mjs',
    check: 'duplicate-content-merge',
    status,
    canonicalFingerprint: contentFingerprintFor(mergedFixture),
    acceptedCounters: acceptedResult.counters,
    rejectedCounters: rejectedResult.counters,
    sourceReferenceCount: mergedFixture.sourceReferences.length,
    errors: status === 'pass' ? [] : ['duplicate-content-merge expected one unioned record to pass and two canonical-equivalent runtime records to fail']
  };
}

function selfCheckDuplicateContentConflict() {
  const oxygenFixture = makeValidLabRecord({
    id: 'lab-self-check-conflict-oxygen',
    experimentId: 'lab-self-check-conflict-oxygen',
    title: '氧气性质检验',
    name: '氧气性质检验',
    textbookContent: '把带火星木条伸入盛有氧气的集气瓶中，观察木条复燃现象。',
    materials: ['氧气', '带火星木条', '集气瓶'],
    steps: ['把带火星木条伸入盛有氧气的集气瓶。', '观察木条是否复燃。'],
    observedPhenomena: ['带火星木条在氧气中复燃。'],
    sourceReferences: [makeSourceReference('candidate-oxygen', 'rj-chemistry-grade9-2024-vol1', 'oxygen-section')]
  });
  const hydrogenFixture = makeValidLabRecord({
    id: 'lab-self-check-conflict-hydrogen',
    experimentId: 'lab-self-check-conflict-hydrogen',
    title: '氢气燃烧检验',
    name: '氢气燃烧检验',
    description: '观察氢气点燃后产生淡蓝色火焰的现象，理解可燃气体验纯要求。',
    textbookContent: '收集一试管氢气，验纯后点燃，观察淡蓝色火焰。',
    materials: ['氢气', '试管', '火柴'],
    steps: ['收集一试管氢气。', '验纯后点燃。', '观察淡蓝色火焰。'],
    observedPhenomena: ['氢气燃烧产生淡蓝色火焰。'],
    visualDescription: '氢气点燃后出现淡蓝色火焰并提示验纯风险。',
    safetyLevel: 'dangerous',
    safetyNotes: ['点燃氢气前必须验纯，远离明火，防止爆炸或火灾。'],
    unlockRequirements: {
      curriculumTags: ['g9-textbook-experiment'],
      safetyLevels: ['dangerous'],
      stageIds: ['stage-3'],
      minimumLearnedElements: 20,
      grade: '九年级'
    },
    sourceReferences: [makeSourceReference('candidate-hydrogen', 'rj-chemistry-grade9-2024-vol2', 'hydrogen-section')]
  });

  const starterFixture = makeStarterLabRecord({ id: 'lab-self-check-conflict-starter' });
  const result = validateLabExperiments([starterFixture, oxygenFixture, hydrogenFixture]);
  const fingerprints = [contentFingerprintFor(oxygenFixture), contentFingerprintFor(hydrogenFixture)];
  const status = result.status === 'pass' && new Set(fingerprints).size === 2 ? 'pass' : 'fail';

  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-experiments.mjs',
    check: 'duplicate-content-conflict',
    status,
    counters: result.counters,
    fingerprints,
    errors: status === 'pass' ? [] : ['duplicate-content-conflict expected distinct chemistry fixtures to keep separate fingerprints and pass validation']
  };
}

function selfCheckSourceReferenceUnion() {
  const fixture = makeValidLabRecord({
    id: 'lab-self-check-source-reference-union',
    experimentId: 'lab-self-check-source-reference-union',
    safetyLevel: 'dangerous',
    safetyNotes: ['点燃氧气助燃实验相关材料时，必须由教师演示并远离易燃物。'],
    unlockRequirements: {
      curriculumTags: ['g9-textbook-experiment'],
      safetyLevels: ['dangerous'],
      stageIds: ['stage-3'],
      minimumLearnedElements: 20,
      grade: '九年级'
    },
    sourceReferences: [
      makeSourceReference('primary-candidate', 'rj-chemistry-grade8-54-2024-full', 'safe-section'),
      makeSourceReference('supplement-candidate', 'rj-chemistry-grade9-2024-vol1', 'danger-section')
    ]
  });
  const duplicateReferenceFixture = makeValidLabRecord({
    id: 'lab-self-check-source-reference-duplicate',
    experimentId: 'lab-self-check-source-reference-duplicate',
    sourceReferences: [
      makeSourceReference('primary-candidate', 'rj-chemistry-grade8-54-2024-full', 'safe-section'),
      makeSourceReference('primary-candidate', 'rj-chemistry-grade8-54-2024-full', 'safe-section')
    ]
  });

  const starterFixture = makeStarterLabRecord({ id: 'lab-self-check-source-reference-starter' });
  const result = validateLabExperiments([starterFixture, fixture]);
  const duplicateResult = validateLabExperiments([starterFixture, duplicateReferenceFixture]);
  const uniqueSourceReferenceCount = uniqueSourceReferences(fixture.sourceReferences).length;
  const status = result.status === 'pass' && duplicateResult.status === 'fail' && uniqueSourceReferenceCount === 2 && duplicateResult.counters.duplicateSourceReferences === 1 ? 'pass' : 'fail';

  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-experiments.mjs',
    check: 'source-reference-union',
    status,
    counters: result.counters,
    duplicateCounters: duplicateResult.counters,
    sourceReferenceCount: fixture.sourceReferences.length,
    uniqueSourceReferenceCount,
    errors: status === 'pass' ? [] : ['source-reference-union expected unioned source references to pass and duplicate provenance entries to fail']
  };
}

function selfCheckSafetyRiskSummary() {
  const fixtures = [
    makeValidLabRecord({
      id: 'lab-self-check-safety-flame',
      experimentId: 'lab-self-check-safety-flame',
      title: '酒精灯加热铜片实验',
      name: '酒精灯加热铜片实验',
      description: '观察酒精灯加热铜片后的颜色变化，理解加热实验风险。',
      textbookContent: '用酒精灯加热铜片，观察铜片颜色变化和火焰。',
      materials: ['酒精灯', '铜片', '试管夹'],
      steps: ['用试管夹夹住铜片。', '在酒精灯火焰上加热。', '观察铜片颜色变化。'],
      observedPhenomena: ['铜片表面变黑。'],
      visualDescription: '铜片在火焰上受热后表面逐渐变黑。',
      safetyLevel: 'dangerous',
      safetyNotes: ['涉及加热或酒精灯时，远离可燃物，使用试管夹，防止明火和热玻璃烫伤。'],
      unlockRequirements: dangerUnlockRequirements(),
      sourceReferences: [makeSourceReference('candidate-flame', 'rj-chemistry-grade9-2024-vol1', 'flame-section')]
    }),
    makeValidLabRecord({
      id: 'lab-self-check-safety-corrosive',
      experimentId: 'lab-self-check-safety-corrosive',
      title: '盐酸与氢氧化钠反应',
      name: '盐酸与氢氧化钠反应',
      description: '观察盐酸和氢氧化钠中和过程中的颜色变化，理解酸碱反应。',
      textbookContent: '向氢氧化钠溶液中滴加稀盐酸，观察酸碱中和现象。',
      materials: ['稀盐酸', '氢氧化钠溶液', '酚酞'],
      steps: ['取氢氧化钠溶液。', '滴加稀盐酸。', '观察指示剂颜色变化。'],
      observedPhenomena: ['溶液颜色逐渐变化。'],
      visualDescription: '溶液在滴加过程中颜色逐渐变化。',
      safetyLevel: 'dangerous',
      safetyNotes: ['酸碱或腐蚀性试剂需佩戴护目镜，避免接触皮肤和眼睛，少量洒出立即冲洗并报告教师。'],
      unlockRequirements: dangerUnlockRequirements(),
      sourceReferences: [makeSourceReference('candidate-corrosive', 'rj-chemistry-grade9-2024-vol1', 'corrosive-section')]
    })
  ];

  const result = validateLabExperiments([makeStarterLabRecord({ id: 'lab-self-check-safety-risk-starter' }), ...fixtures]);
  const notes = fixtures.flatMap((fixture) => fixture.safetyNotes);
  const hasRiskLanguage = notes.every((note) => /教师|远离|防止|佩戴|避免|冲洗|报告/u.test(note));
  const status = result.status === 'pass' && hasRiskLanguage ? 'pass' : 'fail';

  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-experiments.mjs',
    check: 'safety-risk-summary',
    status,
    counters: result.counters,
    notes,
    errors: status === 'pass' ? [] : ['safety-risk-summary expected Chinese risk-focused safety summaries to pass quality validation']
  };
}

function selfCheckSafetyNoteQuality() {
  const acceptedFixture = makeValidLabRecord({
    id: 'lab-self-check-safety-note-good',
    experimentId: 'lab-self-check-safety-note-good',
    safetyNotes: ['燃烧实验需要教师指导并远离易燃物。']
  });
  const rejectedFixtures = [
    makeValidLabRecord({
      id: 'lab-self-check-safety-note-empty',
      experimentId: 'lab-self-check-safety-note-empty',
      safetyNotes: ['']
    }),
    makeValidLabRecord({
      id: 'lab-self-check-safety-note-cn-fallback-a',
      experimentId: 'lab-self-check-safety-note-cn-fallback-a',
      safetyNotes: ['未提取到安全提示']
    }),
    makeValidLabRecord({
      id: 'lab-self-check-safety-note-cn-fallback-b',
      experimentId: 'lab-self-check-safety-note-cn-fallback-b',
      safetyNotes: ['教材未提取到明确安全提示']
    }),
    makeValidLabRecord({
      id: 'lab-self-check-safety-note-en-fallback',
      experimentId: 'lab-self-check-safety-note-en-fallback',
      safetyNotes: ['No explicit safety note was extracted']
    }),
    makeValidLabRecord({
      id: 'lab-self-check-safety-note-english',
      experimentId: 'lab-self-check-safety-note-english',
      safetyNotes: ['Wear goggles and keep away from flames.']
    }),
    makeValidLabRecord({
      id: 'lab-self-check-safety-note-step-copy',
      experimentId: 'lab-self-check-safety-note-step-copy',
      safetyNotes: ['把带火星木条伸入集气瓶。']
    })
  ];

  const starterFixture = makeStarterLabRecord({ id: 'lab-self-check-safety-note-starter' });
  const acceptedResult = validateLabExperiments([starterFixture, acceptedFixture]);
  const rejectedResult = validateLabExperiments([starterFixture, acceptedFixture, ...rejectedFixtures]);
  const status = acceptedResult.status === 'pass' && rejectedResult.status === 'fail' && rejectedResult.counters.invalidSafetyNotes >= rejectedFixtures.length ? 'pass' : 'fail';

  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-experiments.mjs',
    check: 'safety-note-quality',
    status,
    forbiddenPhrases: FORBIDDEN_SAFETY_FALLBACK_PHRASES,
    acceptedCounters: acceptedResult.counters,
    rejectedCounters: rejectedResult.counters,
    errors: status === 'pass' ? [] : ['safety-note-quality expected good Chinese summaries to pass and fallback/English/empty/step-copy notes to fail']
  };
}

function selfCheckCandidateTargetAccounting() {
  const representedRecord = makeValidLabRecord({
    id: 'lab-self-check-target-accounting',
    experimentId: 'lab-self-check-target-accounting',
    sourceReferences: [makeSourceReference('target-accounting-candidate', 'rj-chemistry-grade9-2024-vol1', 'target-accounting-section')]
  });
  const inventory = {
    volumes: [
      {
        sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
        experimentCandidatesStatus: 'present',
        labCandidatesCount: 1,
        experimentCandidatesCount: 1
      }
    ],
    candidates: [
      {
        candidateId: 'target-accounting-candidate',
        sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
        sourcePath: 'self-check/rj-chemistry-grade9-2024-vol1.md',
        sourceSectionId: 'target-accounting-section',
        includeCandidate: true,
        action: 'add'
      }
    ]
  };

  const result = validateLabExperiments([makeStarterLabRecord(), representedRecord], { inventory });
  const status = result.status === 'fail' && result.counters.unrepresentedCandidates === 1 ? 'pass' : 'fail';

  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-experiments.mjs',
    check: 'candidate-target-accounting',
    status,
    counters: result.counters,
    errors: status === 'pass' ? [] : ['candidate-target-accounting expected add/merge inventory actions without targetExperimentId to fail even when runtime provenance exists']
  };
}

function selfCheckDuplicateTextbookSource() {
  const first = makeValidLabRecord({
    id: 'lab-self-check-source-title-a',
    experimentId: 'lab-self-check-source-title-a',
    title: '氧气助燃实验',
    name: '氧气助燃实验',
    sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
    sourceReferences: [makeSourceReference('candidate-source-title-a', 'rj-chemistry-grade9-2024-vol1', 'section-a')]
  });
  const duplicate = makeValidLabRecord({
    id: 'lab-self-check-source-title-b',
    experimentId: 'lab-self-check-source-title-b',
    title: '氧气 助燃实验#abc12345',
    name: '氧气助燃实验',
    textbookContent: '把带火星木条伸入另一瓶氧气中，观察复燃现象。',
    steps: ['准备另一瓶氧气。', '把带火星木条伸入另一瓶氧气。', '观察复燃现象。'],
    sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
    sourceReferences: [makeSourceReference('candidate-source-title-b', 'rj-chemistry-grade9-2024-vol1', 'section-a')]
  });
  const separateSource = makeValidLabRecord({
    id: 'lab-self-check-source-title-c',
    experimentId: 'lab-self-check-source-title-c',
    title: '氧气助燃实验',
    name: '氧气助燃实验',
    textbookContent: '把带火星木条伸入另一册教材的氧气集气瓶中，观察复燃现象。',
    steps: ['准备另一册教材中的氧气。', '伸入带火星木条。', '观察复燃现象。'],
    sourceVolumeId: 'rj-chemistry-grade8-54-2024-full',
    sourceReferences: [makeSourceReference('candidate-source-title-c', 'rj-chemistry-grade8-54-2024-full', 'section-c')]
  });

  const acceptedResult = validateLabExperiments([makeStarterLabRecord({ id: 'lab-self-check-source-title-starter' }), first, separateSource]);
  const rejectedResult = validateLabExperiments([makeStarterLabRecord({ id: 'lab-self-check-source-title-starter' }), first, duplicate]);
  const status = acceptedResult.status === 'pass' && rejectedResult.status === 'fail' && rejectedResult.counters.duplicateTextbookSourceTitles === 1 ? 'pass' : 'fail';

  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-experiments.mjs',
    check: 'duplicate-textbook-source',
    status,
    normalizedTitle: normalizedTextbookTitleForDuplicateCheck(first.title),
    acceptedCounters: acceptedResult.counters,
    rejectedCounters: rejectedResult.counters,
    rejected: rejectedResult.details.duplicateTextbookSourceTitles,
    errors: status === 'pass' ? [] : ['duplicate-textbook-source expected duplicate normalized title within one textbook source to be rejected while another source passes']
  };
}

function validateLabExperiments(records, options = {}) {
  const errors = [];
  const details = {
    missingRequiredFields: [],
    invalidSourceKind: [],
    invalidSafetyLevel: [],
    missingUnlockRequirements: [],
    invalidUnlockRequirements: [],
    invalidStringFields: [],
    meaninglessTitles: [],
    meaninglessDescriptions: [],
    dirtyDisplayFields: [],
    invalidCuratedLegacyIds: [],
    invalidTextbookSourceKind: [],
    nonArrayFields: [],
    emptyArrayFields: [],
    duplicateIds: [],
    duplicateContentClusters: [],
    invalidSafetyNotes: [],
    invalidSourceReferences: [],
    duplicateSourceReferences: [],
    invalidSourceReviewStatus: [],
    invalidTextbookMetadata: [],
    duplicateExperimentIds: [],
    duplicateTextbookSourceTitles: [],
    invalidInventoryVolumes: [],
    unrepresentedCandidates: [],
    pendingCandidateActions: []
  };
  const seenIds = new Set();
  const seenExperimentIds = new Set();
  const contentFingerprints = new Map();
  const textbookTitleSources = new Map();
  const provenanceIndex = buildRuntimeProvenanceIndex(records);
  let lockedRecords = 0;
  let starterRecords = 0;
  let textbookBackedRecords = 0;
  let curatedLegacyRecords = 0;

  for (const record of records) {
    const id = record?.id || 'unknown-lab-record';

    if (seenIds.has(id)) {
      details.duplicateIds.push(id);
    }
    seenIds.add(id);

    const experimentId = record?.experimentId || 'unknown-experiment-id';
    if (seenExperimentIds.has(experimentId)) {
      details.duplicateExperimentIds.push(experimentId);
    }
    seenExperimentIds.add(experimentId);

    // Required fields
    for (const field of REQUIRED_FIELDS) {
      if (!(field in record) || record[field] === undefined || record[field] === null) {
        details.missingRequiredFields.push(`${id}: missing ${field}`);
      }
    }

    for (const field of ['id', 'experimentId', 'title', 'name', 'description', 'textbookContent', 'visualDescription', 'safetyLevel', 'difficulty', 'sourceKind', 'sourceReviewStatus', 'sourceVolumeId']) {
      if (field in record && !hasText(record[field])) {
        details.invalidStringFields.push(`${id}: ${field} must be a non-empty string`);
      }
    }

    // sourceKind
    if (!ALLOWED_SOURCE_KINDS.has(record?.sourceKind)) {
      details.invalidSourceKind.push(`${id}: sourceKind "${record?.sourceKind}" not allowed`);
    }
    if (!ALLOWED_SOURCE_REVIEW_STATUSES.has(record?.sourceReviewStatus)) {
      details.invalidSourceReviewStatus.push(`${id}: sourceReviewStatus "${record?.sourceReviewStatus}" not allowed`);
    }
    if (record?.sourceKind === 'curatedLegacy' && !ORIGINAL_CURATED_EXPERIMENT_IDS.has(id)) {
      details.invalidCuratedLegacyIds.push(`${id}: curatedLegacy is allowed only for original curated experiment IDs`);
    }
    if (record?.sourceKind !== 'curatedLegacy' && record?.sourceKind !== 'textbookExperiment') {
      details.invalidTextbookSourceKind.push(`${id}: non-curated records must use sourceKind textbookExperiment`);
    }
    if (record?.sourceKind === 'textbookExperiment') {
      textbookBackedRecords += 1;
      details.invalidTextbookMetadata.push(...textbookMetadataIssuesFor(record));
      collectDuplicateTextbookTitleIssues(record, textbookTitleSources, details.duplicateTextbookSourceTitles);
    }
    if (record?.sourceKind === 'curatedLegacy') {
      curatedLegacyRecords += 1;
    }

    // safetyLevel
    if (!ALLOWED_SAFETY_LEVELS.has(record?.safetyLevel)) {
      details.invalidSafetyLevel.push(`${id}: safetyLevel "${record?.safetyLevel}" not allowed`);
    }

    // unlockRequirements must be present and non-empty object
    if (!isNonEmptyObject(record?.unlockRequirements)) {
      details.missingUnlockRequirements.push(`${id}: missing or empty unlockRequirements`);
    } else {
      validateUnlockRequirements(record, details.invalidUnlockRequirements);
      if (isStarterUnlock(record.unlockRequirements)) {
        starterRecords += 1;
      } else {
        lockedRecords += 1;
      }
    }

    // Title/name quality
    if (!isMeaningfulTitle(record?.title)) {
      details.meaninglessTitles.push(`${id}: title "${record?.title}"`);
    }
    if (!isMeaningfulTitle(record?.name)) {
      details.meaninglessTitles.push(`${id}: name "${record?.name}"`);
    }

    // Description quality
    if (!isMeaningfulDescription(record?.description)) {
      details.meaninglessDescriptions.push(`${id}: description "${record?.description}"`);
    }

    // Safety note quality
    for (const note of record?.safetyNotes || []) {
      if (SAFETY_NOTE_FALLBACK_PATTERN.test(note)) {
        details.dirtyDisplayFields.push(`${id}: safetyNote placeholder found`);
      }
    }
    details.invalidSafetyNotes.push(...safetyNoteQualityIssuesFor(record));

    const sourceReferenceIssues = sourceReferenceIssuesFor(record);
    details.invalidSourceReferences.push(...sourceReferenceIssues.invalid);
    details.duplicateSourceReferences.push(...sourceReferenceIssues.duplicates);

    const contentFingerprint = contentFingerprintFor(record);
    if (contentFingerprint) {
      const prior = contentFingerprints.get(contentFingerprint);
      if (prior) {
        details.duplicateContentClusters.push(`${id}: duplicates canonical content of ${prior.id} (${contentFingerprint})`);
      } else {
        contentFingerprints.set(contentFingerprint, { id });
      }
    }

    for (const [field, value] of displayValuesFor(record)) {
      if (!isCleanDisplayText(value)) {
        details.dirtyDisplayFields.push(`${id}: ${field} "${String(value)}"`);
      }
    }

    // Array fields must be non-empty arrays
    const arrayFields = ['materials', 'steps', 'observedPhenomena', 'safetyNotes', 'curriculumTags', 'sourceReferences'];
    for (const field of arrayFields) {
      if (field in record) {
        if (!Array.isArray(record[field])) {
          details.nonArrayFields.push(`${id}: ${field} is not an array`);
        } else if (record[field].length === 0) {
          details.emptyArrayFields.push(`${id}: ${field} is empty`);
        }
      }
    }
  }

  if (records.length === 0) {
    errors.push('src/data/labExperiments.json contains no lab experiments');
  }
  if (records.length > 0 && starterRecords === 0) {
    errors.push('No starter/available lab experiment found; at least one record must be unlocked by default');
  }
  if (records.length > 0 && lockedRecords === 0) {
    errors.push('No locked lab experiment found; all records are unlocked by default');
  }

  if (details.missingRequiredFields.length > 0) {
    errors.push(`${details.missingRequiredFields.length} record(s) missing required fields`);
  }
  if (details.invalidSourceKind.length > 0) {
    errors.push(`${details.invalidSourceKind.length} record(s) with invalid sourceKind`);
  }
  if (details.invalidSafetyLevel.length > 0) {
    errors.push(`${details.invalidSafetyLevel.length} record(s) with invalid safetyLevel`);
  }
  if (details.missingUnlockRequirements.length > 0) {
    errors.push(`${details.missingUnlockRequirements.length} record(s) missing unlockRequirements`);
  }
  if (details.invalidUnlockRequirements.length > 0) {
    errors.push(`${details.invalidUnlockRequirements.length} unlockRequirements issue(s)`);
  }
  if (details.invalidStringFields.length > 0) {
    errors.push(`${details.invalidStringFields.length} string field issue(s)`);
  }
  if (details.meaninglessTitles.length > 0) {
    errors.push(`${details.meaninglessTitles.length} record(s) with meaningless title/name`);
  }
  if (details.meaninglessDescriptions.length > 0) {
    errors.push(`${details.meaninglessDescriptions.length} record(s) with meaningless description`);
  }
  if (details.dirtyDisplayFields.length > 0) {
    errors.push(`${details.dirtyDisplayFields.length} dirty display field(s)`);
  }
  if (details.invalidCuratedLegacyIds.length > 0) {
    errors.push(`${details.invalidCuratedLegacyIds.length} curatedLegacy sourceKind issue(s)`);
  }
  if (details.invalidTextbookSourceKind.length > 0) {
    errors.push(`${details.invalidTextbookSourceKind.length} textbook sourceKind issue(s)`);
  }
  if (details.nonArrayFields.length > 0) {
    errors.push(`${details.nonArrayFields.length} array field type error(s)`);
  }
  if (details.emptyArrayFields.length > 0) {
    errors.push(`${details.emptyArrayFields.length} empty array field(s)`);
  }
  if (details.duplicateIds.length > 0) {
    errors.push(`${details.duplicateIds.length} duplicate id(s)`);
  }
  if (details.duplicateExperimentIds.length > 0) {
    errors.push(`${details.duplicateExperimentIds.length} duplicate experimentId(s)`);
  }
  if (details.duplicateContentClusters.length > 0) {
    errors.push(`${details.duplicateContentClusters.length} duplicate canonical content cluster(s)`);
  }
  if (details.invalidSafetyNotes.length > 0) {
    errors.push(`${details.invalidSafetyNotes.length} invalid safety note(s)`);
  }
  if (details.invalidSourceReferences.length > 0) {
    errors.push(`${details.invalidSourceReferences.length} source reference issue(s)`);
  }
  if (details.duplicateSourceReferences.length > 0) {
    errors.push(`${details.duplicateSourceReferences.length} duplicate source reference(s)`);
  }
  if (details.invalidSourceReviewStatus.length > 0) {
    errors.push(`${details.invalidSourceReviewStatus.length} sourceReviewStatus issue(s)`);
  }
  if (details.invalidTextbookMetadata.length > 0) {
    errors.push(`${details.invalidTextbookMetadata.length} textbook metadata issue(s)`);
  }
  if (details.duplicateTextbookSourceTitles.length > 0) {
    errors.push(`${details.duplicateTextbookSourceTitles.length} duplicate textbook source/title issue(s)`);
  }

  const inventoryCoverage = validateInventoryCoverage(options.inventory, provenanceIndex, details);
  if (options.inventoryLoadError) {
    errors.push(options.inventoryLoadError);
  }
  if (details.invalidInventoryVolumes.length > 0) {
    errors.push(`${details.invalidInventoryVolumes.length} inventory volume issue(s)`);
  }
  if (details.unrepresentedCandidates.length > 0) {
    errors.push(`${details.unrepresentedCandidates.length} included textbook candidate(s) are not represented by add/merge or explicit skip`);
  }
  if (details.pendingCandidateActions.length > 0) {
    errors.push(`${details.pendingCandidateActions.length} included textbook candidate(s) still have pending final action`);
  }

  return {
    schemaVersion: 1,
    validator: 'scripts/validate-lab-experiments.mjs',
    source: 'src/data/labExperiments.json',
    status: errors.length === 0 ? 'pass' : 'fail',
    counters: {
      totalRecords: records.length,
      starterRecords,
      lockedRecords,
      missingRequiredFields: details.missingRequiredFields.length,
      invalidSourceKind: details.invalidSourceKind.length,
      invalidSafetyLevel: details.invalidSafetyLevel.length,
      missingUnlockRequirements: details.missingUnlockRequirements.length,
      invalidUnlockRequirements: details.invalidUnlockRequirements.length,
      invalidStringFields: details.invalidStringFields.length,
      meaninglessTitles: details.meaninglessTitles.length,
      meaninglessDescriptions: details.meaninglessDescriptions.length,
      dirtyDisplayFields: details.dirtyDisplayFields.length,
      invalidCuratedLegacyIds: details.invalidCuratedLegacyIds.length,
      invalidTextbookSourceKind: details.invalidTextbookSourceKind.length,
      nonArrayFields: details.nonArrayFields.length,
      emptyArrayFields: details.emptyArrayFields.length,
      duplicateIds: details.duplicateIds.length,
      duplicateExperimentIds: details.duplicateExperimentIds.length,
      duplicateContentClusters: details.duplicateContentClusters.length,
      invalidSafetyNotes: details.invalidSafetyNotes.length,
      invalidSourceReferences: details.invalidSourceReferences.length,
      duplicateSourceReferences: details.duplicateSourceReferences.length,
      invalidSourceReviewStatus: details.invalidSourceReviewStatus.length,
      invalidTextbookMetadata: details.invalidTextbookMetadata.length,
      duplicateTextbookSourceTitles: details.duplicateTextbookSourceTitles.length,
      invalidInventoryVolumes: details.invalidInventoryVolumes.length,
      unrepresentedCandidates: details.unrepresentedCandidates.length,
      pendingCandidateActions: details.pendingCandidateActions.length,
      textbookBackedRecords,
      curatedLegacyRecords,
      representedCandidates: inventoryCoverage.representedCandidates,
      mergedCandidates: inventoryCoverage.mergedCandidates,
      skippedCandidates: inventoryCoverage.skippedCandidates,
      labCandidatesConsidered: inventoryCoverage.labCandidatesConsidered,
      experimentCandidatesConsidered: inventoryCoverage.experimentCandidatesConsidered
    },
    errors,
    details
  };
}

// ---------------------------------------------------------------------------
// Inclusion / exclusion predicates
// ---------------------------------------------------------------------------

/**
 * Returns true if a candidate record represents an explicit textbook experiment
 * that should be considered for lab runtime inclusion.
 *
 * Rules:
 *   - Accept if sourceHeading matches 【实验...】 pattern.
 *   - Accept if activityType === "experimentReview".
 *   - Reject if activityType === "inquiryReview".
 *   - Reject plain reaction formulas (no experiment-specific fields).
 */
function isExplicitExperimentCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') return false;

  const heading = stringValue(candidate.sourceHeading);
  const activityType = stringValue(candidate.activityType);

  // Explicit rejection: generic inquiry review
  if (activityType === 'inquiryReview') return false;

  // Explicit inclusion: experiment review activity type
  if (activityType === 'experimentReview') return true;

  // Explicit inclusion: heading is a textbook experiment marker
  if (/【实验\s*\d+[-–]\d*\s*】/u.test(heading)) return true;

  // Otherwise reject
  return false;
}

/**
 * Returns true if a runtime record is a valid lab experiment according to
 * sourceKind, unlockRequirements, and basic shape.
 */
function isValidLabRuntimeRecord(record) {
  if (!record || typeof record !== 'object') return false;

  // sourceKind must be allowed and never the generic game-pool "textbook"
  if (!ALLOWED_SOURCE_KINDS.has(record.sourceKind)) return false;
  if (record.sourceKind === 'textbook') return false;

  // Must have unlockRequirements
  if (!isNonEmptyObject(record.unlockRequirements)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Content-quality predicates
// ---------------------------------------------------------------------------

/**
 * Returns true if a title or name is a meaningful human-readable Chinese
 * experiment summary. Rejects raw IDs, hashes, source section IDs, and
 * textbook experiment numbering labels.
 */
function isMeaningfulTitle(value) {
  if (!hasText(value)) return false;
  const trimmed = value.trim();

  // Reject raw candidate IDs like "lab-0006-1-1-l27-l50-e9eba2d49e"
  if (RAW_ID_PATTERN.test(trimmed)) return false;

  // Reject raw source section IDs (long hex strings)
  if (SOURCE_SECTION_ID_PATTERN.test(trimmed)) return false;

  // Reject hash suffixes
  if (HASH_SUFFIX_PATTERN.test(trimmed)) return false;

  if (!isCleanDisplayText(trimmed)) return false;

  if (isGenericTitle(trimmed)) return false;

  if (/^(观察|记录|实验|现象|数据|项目)$/u.test(cleanTitlePhrase(trimmed))) return false;

  // Reject titles that start with a bare Chinese particle or common generic fragments
  if (/^[的与及和或之][\\p{Script=Han}]/u.test(trimmed)) return false;
  if (/^(观察与描述|实验与记录|步骤与现象|实验现象|实验记录|观察记录)$/u.test(trimmed)) return false;

  return meaningfulChineseLength(trimmed) >= 3;
}

/**
 * Returns true if a description is a meaningful Chinese summary of what the
 * learner will observe/do. Rejects formula-pool placeholders, raw headings,
 * and very short strings.
 */
function isMeaningfulDescription(value) {
  if (!hasText(value)) return false;
  const trimmed = value.trim();

  if (trimmed.length < MIN_DESCRIPTION_LENGTH) return false;

  // Reject formula-pool placeholders
  if (PLACEHOLDER_DESCRIPTION_PATTERN.test(trimmed)) return false;

  if (!isCleanDisplayText(trimmed)) return false;

  // Reject raw IDs and headings that are just experiment numbers
  if (EXPERIMENT_NUMBER_LABEL_PATTERN.test(trimmed) && trimmed.length < MIN_DESCRIPTION_LENGTH + 4) {
    return false;
  }

  // Reject raw candidate IDs (same pattern as title check)
  if (RAW_ID_PATTERN.test(trimmed)) return false;

  return true;
}

function contentFingerprintFor(record) {
  if (!record || typeof record !== 'object') {
    return '';
  }
  const canonicalFields = canonicalContentFieldsFor(record);
  if (!canonicalFields.textbookContent || canonicalFields.steps.length === 0 || canonicalFields.materials.length === 0 || canonicalFields.observedPhenomena.length === 0) {
    return '';
  }
  return hashText(exactFingerprintPayloadFor(canonicalFields));
}

function exactFingerprintPayloadFor(canonicalFields) {
  return JSON.stringify({
    textbookContent: canonicalFields.textbookContent,
    steps: canonicalFields.steps,
    materials: canonicalFields.materials,
    observedPhenomena: canonicalFields.observedPhenomena
  });
}

function canonicalContentFieldsFor(record) {
  return {
    textbookContent: canonicalContentText(record?.textbookContent),
    steps: Array.isArray(record?.steps) ? record.steps.map(canonicalStepText).filter(Boolean) : [],
    materials: Array.isArray(record?.materials) ? uniqueSorted(record.materials.map(canonicalContentText).filter(Boolean)) : [],
    observedPhenomena: Array.isArray(record?.observedPhenomena) ? uniqueSorted(record.observedPhenomena.map(canonicalContentText).filter(Boolean)) : []
  };
}

function canonicalContentText(value) {
  return stringValue(value)
    .normalize('NFKC')
    .replace(/[“”]/gu, '"')
    .replace(/[‘’]/gu, "'")
    .replace(/[﹐，]/gu, ',')
    .replace(/[。]/gu, '.')
    .replace(/[；]/gu, ';')
    .replace(/[：]/gu, ':')
    .replace(/[、]/gu, ',')
    .replace(/[（]/gu, '(')
    .replace(/[）]/gu, ')')
    .replace(/[【［〔]/gu, '[')
    .replace(/[】］〕]/gu, ']')
    .replace(/[－–—]/gu, '-')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/[`*_#>]+/gu, ' ')
    .replace(/\$([^$]+)\$/gu, '$1')
    .replace(/【实验[^】\s，。；;:：]*(?:】|\s+)?/gu, ' ')
    .replace(/\[实验[^\]\s,.，。;；:：]*(?:\]|\s+)?/gu, ' ')
    .replace(/\\mathrm\s*\{\s*([^}]+)\s*\}/gu, '$1')
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/gu, (match) => String('①②③④⑤⑥⑦⑧⑨⑩'.indexOf(match) + 1))
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/gu, (match) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(match)))
    .replace(/\b([A-Za-z]+)\s*([0-9]+)\b/gu, '$1$2')
    .replace(/(\d+(?:\.\d+)?)\s*(mL|L|g|kg|mg|mol|cm|mm|℃|°C)\b/giu, '$1$2')
    .replace(/\s*([,.!?;:()\[\]])\s*/gu, '$1')
    .replace(/[,.!?;:()\[\]]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

function canonicalStepText(value) {
  return canonicalContentText(value)
    .replace(/^(?:步骤)?(?:\d+|一|二|三|四|五|六|七|八|九|十)[).、:：-]?\s*/u, '')
    .replace(/^第(?:\d+|一|二|三|四|五|六|七|八|九|十)步[：:、]?\s*/u, '')
    .trim();
}

function safetyNoteQualityIssuesFor(record) {
  const id = record?.id || 'unknown-lab-record';
  const notes = record?.safetyNotes;
  const issues = [];

  if (!Array.isArray(notes)) {
    return issues;
  }

  const stepKeys = new Set((Array.isArray(record?.steps) ? record.steps : []).map(canonicalStepText).filter(Boolean));
  for (const [index, note] of notes.entries()) {
    const text = stringValue(note);
    const label = `${id}: safetyNotes[${index}]`;
    if (!text) {
      issues.push(`${label} must be a non-empty Chinese safety summary`);
      continue;
    }
    if (!containsChinese(text)) {
      issues.push(`${label} must be Chinese text`);
    }
    for (const phrase of FORBIDDEN_SAFETY_FALLBACK_PHRASES) {
      if (text.includes(phrase)) {
        issues.push(`${label} contains forbidden fallback phrase "${phrase}"`);
      }
    }
    const stepSimilarity = maxStepSimilarity(text, stepKeys);
    if (stepSimilarity >= 0.92) {
      issues.push(`${label} copies or closely mirrors a full step sentence`);
    }
  }

  return issues;
}

function sourceReferenceIssuesFor(record) {
  const id = record?.id || 'unknown-lab-record';
  const refs = record?.sourceReferences;
  const invalid = [];
  const duplicates = [];
  if (!Array.isArray(refs)) {
    return { invalid, duplicates };
  }

  const seen = new Set();
  for (const [index, ref] of refs.entries()) {
    if (!isRecord(ref)) {
      invalid.push(`${id}: sourceReferences[${index}] must be an object`);
      continue;
    }
    for (const field of ['candidateId', 'sourceVolumeId', 'sourceSectionId', 'sourceKind', 'sourcePath', 'lineRange']) {
      if (!hasText(ref[field])) {
        invalid.push(`${id}: sourceReferences[${index}].${field} must be a non-empty string`);
      }
    }
    const key = sourceReferenceKey(ref);
    if (seen.has(key)) {
      duplicates.push(`${id}: duplicate sourceReference ${key}`);
    }
    seen.add(key);
  }
  return { invalid, duplicates };
}

function textbookMetadataIssuesFor(record) {
  const id = record?.id || 'unknown-lab-record';
  const issues = [];
  if (!hasText(record?.sourceVolumeId) || record.sourceVolumeId === 'curated-legacy') {
    issues.push(`${id}: textbookExperiment sourceVolumeId must identify a textbook volume`);
  }
  if (!ALLOWED_SOURCE_REVIEW_STATUSES.has(record?.sourceReviewStatus) || record.sourceReviewStatus === 'legacy-preserved') {
    issues.push(`${id}: textbookExperiment sourceReviewStatus must be a textbook review status`);
  }
  if (!Array.isArray(record?.sourceReferences) || record.sourceReferences.length === 0) {
    issues.push(`${id}: textbookExperiment must include sourceReferences`);
    return issues;
  }

  for (const [index, ref] of record.sourceReferences.entries()) {
    const label = `${id}: sourceReferences[${index}]`;
    if (!isRecord(ref)) {
      issues.push(`${label} must be an object`);
      continue;
    }
    if (!hasText(ref.candidateId) && !hasText(ref.sourceSectionId)) {
      issues.push(`${label} must include candidateId or sourceSectionId`);
    }
    if (!hasText(ref.sourceVolumeId)) {
      issues.push(`${label}.sourceVolumeId must identify the source volume`);
    }
    if (!hasText(ref.sourceKind) || ref.sourceKind === 'curatedLegacy') {
      issues.push(`${label}.sourceKind must identify textbook provenance`);
    }
    if ('sourcePath' in ref && !hasText(ref.sourcePath)) {
      issues.push(`${label}.sourcePath must be a non-empty string when present`);
    }
  }

  return issues;
}

function collectDuplicateTextbookTitleIssues(record, textbookTitleSources, issues) {
  const id = record?.id || 'unknown-lab-record';
  const titleKey = normalizedTextbookTitleForDuplicateCheck(record?.title);
  if (!titleKey || !Array.isArray(record?.sourceReferences)) {
    return;
  }

  const recordKeys = new Set();
  for (const ref of record.sourceReferences) {
    if (!isRecord(ref)) {
      continue;
    }
    const sourceKey = textbookSourceTitleKey(ref, record, titleKey);
    if (!sourceKey || recordKeys.has(sourceKey)) {
      continue;
    }
    recordKeys.add(sourceKey);

    const prior = textbookTitleSources.get(sourceKey);
    if (!prior) {
      textbookTitleSources.set(sourceKey, { id, title: record.title, record, ref });
      continue;
    }
    if (prior.id === id) {
      continue;
    }
    if (hasDocumentedDistinctTextbookTitle(record, ref) || hasDocumentedDistinctTextbookTitle(prior.record, prior.ref)) {
      continue;
    }
    issues.push(`${id}: duplicates normalized title "${titleKey}" from ${prior.id} within textbook source ${sourceKey}`);
  }
}

function textbookSourceTitleKey(ref, record, titleKey) {
  const sourceVolumeId = stringValue(ref?.sourceVolumeId || record?.sourceVolumeId);
  const sourcePath = stringValue(ref?.sourcePath);
  const sourceSectionId = stringValue(ref?.sourceSectionId || ref?.candidateId);
  if (!sourceVolumeId || !sourceSectionId) {
    return '';
  }
  return [sourceVolumeId, sourcePath, sourceSectionId, titleKey].map(canonicalContentText).join('|');
}

function hasDocumentedDistinctTextbookTitle(record, ref) {
  if (!record || !ref) {
    return false;
  }
  if (record.distinctTextbookSourceTitle === true || hasText(record.duplicateTitleJustification)) {
    return true;
  }
  return /distinct|不同实验|独立实验|同名/u.test(stringValue(ref.note));
}

function normalizedTextbookTitleForDuplicateCheck(value) {
  return stringValue(value)
    .normalize('NFKC')
    .replace(/【实验[^】\s，。；;:：]*(?:】|\s+)?/gu, ' ')
    .replace(/\[实验[^\]\s,.，。;；:：]*(?:\]|\s+)?/gu, ' ')
    .replace(/\b(?:sha256:)?[a-f0-9]{8,}\b/giu, ' ')
    .replace(/[#_-]?[a-f0-9]{8,}\b/giu, ' ')
    .replace(/[\s\p{P}\p{S}]/gu, '')
    .toLowerCase();
}

async function loadLabTextbookCandidateInventory() {
  try {
    return {
      inventory: JSON.parse(await readFile(labTextbookCandidateInventoryPath, 'utf8')),
      error: null
    };
  } catch (error) {
    return {
      inventory: null,
      error: `Failed to read .sisyphus/evidence/lab-textbook-candidate-inventory.json: ${error.message}`
    };
  }
}

function buildRuntimeProvenanceIndex(records) {
  const candidateIds = new Set();
  const sourceSectionIds = new Set();
  const sourcePathLines = new Set();
  const sourcePathSections = new Set();
  const targetExperimentIds = new Set();

  for (const record of records) {
    if (!record || typeof record !== 'object') {
      continue;
    }
    if (hasText(record.id)) targetExperimentIds.add(record.id);
    if (hasText(record.experimentId)) targetExperimentIds.add(record.experimentId);
    for (const ref of Array.isArray(record.sourceReferences) ? record.sourceReferences : []) {
      if (!isRecord(ref)) {
        continue;
      }
      if (hasText(ref.candidateId)) candidateIds.add(ref.candidateId);
      if (hasText(ref.sourceSectionId)) sourceSectionIds.add(ref.sourceSectionId);
      if (hasText(ref.sourcePath) && hasText(ref.lineRange)) sourcePathLines.add(`${ref.sourcePath}|${ref.lineRange}`);
      if (hasText(ref.sourcePath) && hasText(ref.sourceSectionId)) sourcePathSections.add(`${ref.sourcePath}|${ref.sourceSectionId}`);
    }
  }

  return { candidateIds, sourceSectionIds, sourcePathLines, sourcePathSections, targetExperimentIds };
}

function validateInventoryCoverage(inventory, provenanceIndex, details) {
  const counters = {
    representedCandidates: 0,
    mergedCandidates: 0,
    skippedCandidates: 0,
    labCandidatesConsidered: 0,
    experimentCandidatesConsidered: 0
  };

  if (!inventory) {
    return counters;
  }

  if (!Array.isArray(inventory.volumes)) {
    details.invalidInventoryVolumes.push('inventory.volumes must be an array');
  } else {
    for (const [index, volume] of inventory.volumes.entries()) {
      const label = `inventory.volumes[${index}]`;
      if (!hasText(volume?.sourceVolumeId)) {
        details.invalidInventoryVolumes.push(`${label}: sourceVolumeId is required`);
      }
      if (!hasText(volume?.experimentCandidatesStatus) || !['present', 'absent'].includes(volume.experimentCandidatesStatus)) {
        details.invalidInventoryVolumes.push(`${label}: experimentCandidatesStatus must record present/absent`);
      }
      counters.labCandidatesConsidered += Number.isInteger(volume?.labCandidatesCount) ? volume.labCandidatesCount : 0;
      counters.experimentCandidatesConsidered += Number.isInteger(volume?.experimentCandidatesCount) ? volume.experimentCandidatesCount : 0;
    }
  }

  if (!Array.isArray(inventory.candidates)) {
    details.invalidInventoryVolumes.push('inventory.candidates must be an array');
    return counters;
  }

  for (const candidate of inventory.candidates) {
    if (candidate?.includeCandidate !== true) {
      continue;
    }

    const action = finalCandidateActionFor(candidate);
    const representedInRuntime = isCandidateRepresented(candidate, provenanceIndex);
    const targetExperimentId = candidateTargetExperimentId(candidate);
    const hasRuntimeTarget = hasText(targetExperimentId) && provenanceIndex.targetExperimentIds.has(targetExperimentId);

    if (action === 'skip') {
      counters.skippedCandidates += 1;
      if (!hasText(candidate.inclusionSkipReason) && !hasText(candidate.skipReason)) {
        details.unrepresentedCandidates.push(`${candidateLabel(candidate)}: skip action must include a reason`);
      }
      continue;
    }

    if (action === 'merge') {
      counters.mergedCandidates += 1;
    }

    if (action === 'add' || action === 'merge' || representedInRuntime || hasRuntimeTarget) {
      counters.representedCandidates += 1;
    }

    if (!FINAL_CANDIDATE_ACTIONS.has(action)) {
      details.pendingCandidateActions.push(`${candidateLabel(candidate)}: final action is "${action || 'missing'}"`);
      continue;
    }

    if ((action === 'add' || action === 'merge') && !hasText(targetExperimentId)) {
      details.unrepresentedCandidates.push(`${candidateLabel(candidate)}: ${action} action must include targetExperimentId`);
      continue;
    }

    if ((action === 'add' || action === 'merge') && !representedInRuntime && !hasRuntimeTarget) {
      details.unrepresentedCandidates.push(`${candidateLabel(candidate)}: ${action} action is not represented in runtime sourceReferences or targetExperimentId`);
    }
  }

  return counters;
}

function finalCandidateActionFor(candidate) {
  return stringValue(candidate?.action || candidate?.finalAction || candidate?.candidateAction || candidate?.preliminaryAction);
}

function candidateTargetExperimentId(candidate) {
  return stringValue(candidate?.targetExperimentId || candidate?.experimentId || candidate?.mergedIntoExperimentId || candidate?.runtimeExperimentId);
}

function isCandidateRepresented(candidate, provenanceIndex) {
  if (!candidate || !provenanceIndex) {
    return false;
  }
  const candidateIds = [candidate.candidateId, candidate.enrichment?.matchedExperimentCandidateId].filter(hasText);
  if (candidateIds.some((candidateId) => provenanceIndex.candidateIds.has(candidateId))) {
    return true;
  }
  if (hasText(candidate.sourceSectionId) && provenanceIndex.sourceSectionIds.has(candidate.sourceSectionId)) {
    return true;
  }
  const sourcePath = stringValue(candidate.sourcePath);
  if (sourcePath && hasText(candidate.sourceSectionId) && provenanceIndex.sourcePathSections.has(`${sourcePath}|${candidate.sourceSectionId}`)) {
    return true;
  }
  const provenance = candidate.sourceProvenance;
  if (sourcePath && Number.isInteger(provenance?.sourceLineStart) && Number.isInteger(provenance?.sourceLineEnd)) {
    return provenanceIndex.sourcePathLines.has(`${sourcePath}|${provenance.sourceLineStart}-${provenance.sourceLineEnd}`);
  }
  return false;
}

function candidateLabel(candidate) {
  return candidate?.candidateId || candidate?.sourceSectionId || 'unknown-inventory-candidate';
}

function uniqueSourceReferences(refs = []) {
  const byKey = new Map();
  for (const ref of refs) {
    if (isRecord(ref)) {
      byKey.set(sourceReferenceKey(ref), ref);
    }
  }
  return [...byKey.values()].sort(compareSourceReferences);
}

function sourceReferenceKey(ref) {
  return [ref?.candidateId, ref?.sourcePath, ref?.lineRange, ref?.sourceKind, ref?.sourceVolumeId, ref?.sourceSectionId].map(canonicalContentText).join('|');
}

function maxStepSimilarity(note, stepKeys) {
  const noteKey = canonicalStepText(note);
  if (!noteKey) {
    return 0;
  }
  let max = 0;
  for (const stepKey of stepKeys) {
    if (!stepKey) {
      continue;
    }
    if (noteKey === stepKey || noteKey.includes(stepKey) || stepKey.includes(noteKey)) {
      return 1;
    }
    max = Math.max(max, sorensenDice(charTrigrams(noteKey), charTrigrams(stepKey)));
  }
  return max;
}

function containsChinese(value) {
  return /[\p{Script=Han}]/u.test(stringValue(value));
}

function charTrigrams(value) {
  const text = canonicalContentText(value).replace(/\s+/gu, '');
  if (!text) return [];
  const chars = [...text];
  if (chars.length <= 3) return [text];
  const trigrams = [];
  for (let index = 0; index <= chars.length - 3; index += 1) {
    trigrams.push(chars.slice(index, index + 3).join(''));
  }
  return trigrams;
}

function sorensenDice(leftItems, rightItems) {
  if (leftItems.length === 0 && rightItems.length === 0) return 1;
  if (leftItems.length === 0 || rightItems.length === 0) return 0;
  const rightCounts = countedItems(rightItems);
  let overlap = 0;
  for (const item of leftItems) {
    const count = rightCounts.get(item) ?? 0;
    if (count > 0) {
      overlap += 1;
      rightCounts.set(item, count - 1);
    }
  }
  return (2 * overlap) / (leftItems.length + rightItems.length);
}

function countedItems(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return counts;
}

function uniqueSorted(values) {
  return [...new Set(values)].filter(Boolean).sort(compareText);
}

function validateUnlockRequirements(record, issues) {
  const id = record?.id || 'unknown-lab-record';
  const unlock = record.unlockRequirements;
  const allowedKeys = new Set(['curriculumTags', 'safetyLevels', 'stageIds', 'minimumLearnedElements', 'grade', 'chapter']);

  for (const key of Object.keys(unlock)) {
    if (!allowedKeys.has(key)) {
      issues.push(`${id}: unlockRequirements.${key} is not allowed`);
    }
  }

  if (!Array.isArray(unlock.curriculumTags) || unlock.curriculumTags.length === 0 || !unlock.curriculumTags.every(hasText)) {
    issues.push(`${id}: unlockRequirements.curriculumTags must be a non-empty string array`);
  }
  if ('safetyLevels' in unlock) {
    if (!Array.isArray(unlock.safetyLevels) || unlock.safetyLevels.length === 0) {
      issues.push(`${id}: unlockRequirements.safetyLevels must be a non-empty array when present`);
    } else {
      const seenSafetyLevels = new Set();
      for (const [index, safetyLevel] of unlock.safetyLevels.entries()) {
        if (!ALLOWED_SAFETY_LEVELS.has(safetyLevel)) {
          issues.push(`${id}: unlockRequirements.safetyLevels[${index}] is invalid: ${String(safetyLevel)}`);
        }
        if (seenSafetyLevels.has(safetyLevel)) {
          issues.push(`${id}: unlockRequirements.safetyLevels contains duplicate value: ${String(safetyLevel)}`);
        }
        seenSafetyLevels.add(safetyLevel);
      }
      if (!unlock.safetyLevels.includes(record.safetyLevel)) {
        issues.push(`${id}: unlockRequirements.safetyLevels must include record safetyLevel ${String(record.safetyLevel)}`);
      }
    }
  }
  if (!Array.isArray(unlock.stageIds) || unlock.stageIds.length === 0 || !unlock.stageIds.every(hasText)) {
    issues.push(`${id}: unlockRequirements.stageIds must be a non-empty string array`);
  }
  if (!Number.isInteger(unlock.minimumLearnedElements) || unlock.minimumLearnedElements < 0) {
    issues.push(`${id}: unlockRequirements.minimumLearnedElements must be a non-negative integer`);
  }
  if ('grade' in unlock && !hasText(unlock.grade)) {
    issues.push(`${id}: unlockRequirements.grade must be a non-empty string when present`);
  }
  if ('chapter' in unlock && !hasText(unlock.chapter)) {
    issues.push(`${id}: unlockRequirements.chapter must be a non-empty string when present`);
  }
}

function isStarterUnlock(unlock) {
  return Number.isInteger(unlock?.minimumLearnedElements) && unlock.minimumLearnedElements === 0;
}

function isCleanDisplayText(value) {
  const text = stringValue(value);
  if (!text) return false;
  if (EXPERIMENT_NUMBER_LABEL_PATTERN.test(text)) return false;
  if (PLACEHOLDER_DESCRIPTION_PATTERN.test(text)) return false;
  if (RAW_ID_FRAGMENT_PATTERN.test(text)) return false;
  if (SOURCE_SECTION_ID_FRAGMENT_PATTERN.test(text)) return false;
  if (HASH_FRAGMENT_PATTERN.test(text)) return false;
  return true;
}

function displayValuesFor(record) {
  const values = [];
  for (const field of ['title', 'name', 'description', 'observedPhenomena', 'visualDescription', 'safetyNotes', 'steps', 'materials']) {
    const value = record?.[field];
    if (Array.isArray(value)) {
      for (const item of value) {
        values.push([field, item]);
      }
    } else {
      values.push([field, value]);
    }
  }
  return values;
}

function isGenericTitle(value) {
  const originalKey = normalizeForDedupe(stringValue(value));
  const cleanedKey = normalizeForDedupe(cleanTitlePhrase(value));
  return GENERIC_TITLE_KEYS.has(originalKey) || GENERIC_TITLE_KEYS.has(cleanedKey);
}

function cleanTitlePhrase(value) {
  return stringValue(value)
    .replace(/【实验[^】\s，。；;:：]*(?:】|\s+)?/gu, ' ')
    .replace(/^如图\d+[-–]\d+所示[，,]?\s*/u, '')
    .replace(/^观察(?:并记录)?/u, '')
    // Only strip "实验现象" when it is a standalone prefix (followed by punctuation/space/end),
    // not when it is part of a possessive phrase like "实验现象的观察与描述".
    .replace(/^实验(?:内容|现象|记录)?(?=[\s：:，,、]|$)/u, '')
    .replace(/^记录[：:]?\s*/u, '')
    .replace(/^现象和数据[：:]?\s*/u, '')
    .replace(/^项目\s*/u, '')
    .replace(/^[:：，,、\s]+/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalizeForDedupe(value) {
  return stringValue(value).replace(/[\s，。；;:：、（）()【】\[\]-]/gu, '').toLowerCase();
}

function meaningfulChineseLength(value) {
  return (stringValue(value).match(/[\p{Script=Han}A-Za-z0-9]/gu) ?? []).length;
}

function makeValidLabRecord(overrides = {}) {
  return {
    id: 'lab-self-check-valid',
    experimentId: 'lab-self-check-valid',
    title: '氧气性质检验',
    name: '氧气性质检验',
    description: '观察氧气能让带火星木条复燃的现象，理解氧气助燃性质。',
    textbookContent: '把带火星木条伸入盛有氧气的集气瓶中，观察木条复燃现象。',
    materials: ['氧气', '带火星木条', '集气瓶'],
    steps: ['收集一瓶氧气。', '把带火星木条伸入集气瓶。', '观察木条是否复燃。'],
    observedPhenomena: ['带火星木条在氧气中复燃。'],
    visualDescription: '木条靠近氧气后火星变亮并重新燃烧。',
    safetyLevel: 'caution',
    safetyNotes: ['燃烧实验需要教师指导并远离易燃物。'],
    curriculumTags: ['g9-textbook-experiment'],
    difficulty: '初中基础',
    unlockRequirements: {
      curriculumTags: ['g9-textbook-experiment'],
      safetyLevels: ['caution'],
      stageIds: ['stage-2'],
      minimumLearnedElements: 8,
      grade: '九年级'
    },
    sourceKind: 'textbookExperiment',
    sourceReviewStatus: 'reviewed',
    sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
    sourceReferences: [
      {
        candidateId: 'experiment-self-check',
        sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
        sourceSectionId: 'self-check-section',
        sourceKind: 'experimentCandidate',
        sourcePath: 'self-check',
        lineRange: '1-3'
      }
    ],
    ...overrides
  };
}

function makeStarterLabRecord(overrides = {}) {
  return makeValidLabRecord({
    id: 'lab-self-check-starter',
    experimentId: 'lab-self-check-starter',
    title: '二氧化碳性质观察',
    name: '二氧化碳性质观察',
    description: '观察二氧化碳通入澄清石灰水后的变化，理解气体检验方法。',
    textbookContent: '把二氧化碳通入澄清石灰水中，观察石灰水是否变浑浊。',
    materials: ['二氧化碳', '澄清石灰水', '导管'],
    steps: ['准备澄清石灰水。', '通入少量二氧化碳。', '观察石灰水变化。'],
    observedPhenomena: ['澄清石灰水逐渐变浑浊。'],
    visualDescription: '气泡进入澄清石灰水后，液体逐渐呈现白色浑浊。',
    safetyLevel: 'safe',
    safetyNotes: ['按教师要求少量通入气体，不擅自改变化学试剂和操作条件。'],
    unlockRequirements: {
      curriculumTags: ['g9-textbook-experiment'],
      safetyLevels: ['safe'],
      stageIds: ['stage-1'],
      minimumLearnedElements: 0,
      grade: '九年级'
    },
    sourceReferences: [makeSourceReference('starter-candidate', 'rj-chemistry-grade9-2024-vol1', 'starter-section')],
    ...overrides
  });
}

function makeSourceReference(candidateId, sourceVolumeId, sourceSectionId) {
  return {
    candidateId,
    sourceVolumeId,
    sourceSectionId,
    sourceKind: 'experimentCandidate',
    sourcePath: `self-check/${sourceVolumeId}.md`,
    sourceHeading: '教材实验',
    lineRange: '1-3',
    sourceHash: hashText(candidateId),
    sectionHash: hashText(sourceSectionId),
    assets: []
  };
}

function dangerUnlockRequirements() {
  return {
    curriculumTags: ['g9-textbook-experiment'],
    safetyLevels: ['dangerous'],
    stageIds: ['stage-3'],
    minimumLearnedElements: 20,
    grade: '九年级'
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isNonEmptyObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), 'zh-Hans-CN');
}

function compareSourceReferences(left, right) {
  return compareText(left.sourcePath, right.sourcePath) || compareText(left.lineRange, right.lineRange) || compareText(left.candidateId, right.candidateId) || compareText(left.sourceKind, right.sourceKind);
}

function printResult(result) {
  console.log(`${result.check || 'labExperimentValidationStatus'}=${result.status}`);
  if (result.counters) {
    for (const [name, value] of Object.entries(result.counters)) {
      console.log(`${name}=${value}`);
    }
  }
  for (const error of result.errors ?? []) {
    console.error(`ERROR ${error}`);
  }
  if (result.accepted) {
    for (const id of result.accepted) {
      console.log(`ACCEPTED ${id}`);
    }
  }
  if (result.rejected) {
    for (const id of result.rejected) {
      console.log(`REJECTED ${id}`);
    }
  }
  if (result.rejectedTitles) {
    for (const t of result.rejectedTitles) {
      console.log(`REJECTED_TITLE ${t}`);
    }
  }
  if (result.rejectedDescriptions) {
    for (const d of result.rejectedDescriptions) {
      console.log(`REJECTED_DESCRIPTION ${d}`);
    }
  }
}

async function maybeWriteReport(reportPath, result) {
  if (!reportPath) {
    return;
  }
  const absolutePath = resolveReportPath(reportPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

function resolveReportPath(reportPath) {
  if (path.isAbsolute(reportPath)) {
    throw new Error('--report must be a repository-relative path under .sisyphus/evidence/');
  }

  const normalizedPath = path.normalize(reportPath);
  if (normalizedPath.split(path.sep).includes('..')) {
    throw new Error('--report must not contain parent-directory traversal');
  }

  const absolutePath = path.resolve(projectRoot, normalizedPath);
  const relativeToEvidence = path.relative(evidenceRoot, absolutePath);
  if (relativeToEvidence === '' || relativeToEvidence.startsWith('..') || path.isAbsolute(relativeToEvidence)) {
    throw new Error('--report must be under .sisyphus/evidence/');
  }

  return absolutePath;
}
