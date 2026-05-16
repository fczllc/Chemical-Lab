import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const evidenceRoot = path.join(projectRoot, '.sisyphus', 'evidence');

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
  const result = validateLabExperiments(records, options);

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

function validateLabExperiments(records, _options) {
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
    duplicateIds: []
  };
  const seenIds = new Set();
  let lockedRecords = 0;
  let starterRecords = 0;

  for (const record of records) {
    const id = record?.id || 'unknown-lab-record';

    if (seenIds.has(id)) {
      details.duplicateIds.push(id);
    }
    seenIds.add(id);

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
    if (record?.sourceKind === 'curatedLegacy' && !ORIGINAL_CURATED_EXPERIMENT_IDS.has(id)) {
      details.invalidCuratedLegacyIds.push(`${id}: curatedLegacy is allowed only for original curated experiment IDs`);
    }
    if (record?.sourceKind !== 'curatedLegacy' && record?.sourceKind !== 'textbookExperiment') {
      details.invalidTextbookSourceKind.push(`${id}: non-curated records must use sourceKind textbookExperiment`);
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
      duplicateIds: details.duplicateIds.length
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
