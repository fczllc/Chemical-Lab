import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { isFormulaText, normalizeReactionEquation } from './reaction-equation-normalizer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const defaultManifestPath = 'src/data/textbookIngestion/reactionEquationReview.json';
const defaultOutputPath = 'src/data/reactions.json';
const fallbackCandidateReportPath = '.sisyphus/evidence/task-1-extraction-report.json';
const completedReviewStatuses = new Set([
  'complete',
  'completed',
  'review-complete',
  'reviewed',
  'reviewed-complete'
]);
const excludeDecisionPattern = /^exclude_/u;
const defaultDifficulty = '高中基础';
const reviewedAt = '2026-05-13T00:00:00.000Z';
const sourcePathVolumeIds = new Map([
  ['src/data/textbooks/2019版人教版高中化学-选择性必修1 化学反应原理/book.md', 'pep-chemistry-g11-selective-1'],
  ['src/data/textbooks/2019版人教版高中化学-选择性必修2 物质结构与性质/book.md', 'pep-chemistry-g11-selective-2'],
  ['src/data/textbooks/2019版人教版高中化学-选择性必修3 有机化学基础/book.md', 'pep-chemistry-g12-selective-3'],
  ['src/data/textbooks/2019版人教版高中化学必修第1册/book.md', 'pep-chemistry-g10-required-1'],
  ['src/data/textbooks/2019版人教版高中化学必修第2册/book.md', 'pep-chemistry-g10-required-2'],
  ['src/data/textbooks/2024版人教版（五·四学制）八年级化学全一册/book.md', 'pep-chemistry-g8-2024-54-full'],
  ['src/data/textbooks/2024版人教版九年级化学上册/book.md', 'pep-chemistry-g9-2024'],
  ['src/data/textbooks/2024版人教版九年级化学下册/book.md', 'pep-chemistry-g9-2024-volume-2']
]);
const textbookExperimentIds = new Map([
  ['C + O2 --点燃--> CO2', 'exp-oxygen-supports-combustion'],
  ['2Fe + O2 + 2H2O = 2Fe(OH)2', 'exp-iron-rusting'],
  ['NaOH + HCl = NaCl + H2O', 'exp-salt-formation'],
  ['2H2 + O2 --点燃--> 2H2O', 'exp-hydrogen-combustion'],
  ['2Na + 2H2O = 2NaOH + H2', 'exp-sodium-water']
]);

export async function buildReviewedReactionPlan(options = {}) {
  const manifestPath = projectPath(options.manifestPath ?? defaultManifestPath);
  const manifest = await readJsonFile(manifestPath, 'reaction equation review manifest');
  const candidateReportPath = projectPath(options.candidateReportPath ?? requireText(manifest.candidateSourceReport, 'manifest.candidateSourceReport'));
  const candidateReport = await readJsonFile(candidateReportPath, 'reaction equation candidate report');

  validateCandidateReport(candidateReport, candidateReportPath);
  const candidatesById = buildCandidateMap(candidateReport.candidates);
  const reviews = validateReviewManifest({ manifest, candidateReport, candidatesById, manifestPath });
  const records = buildRuntimeRecords({ reviews, candidatesById });

  return {
    manifestPath: relativeProjectPath(manifestPath),
    candidateReportPath: relativeProjectPath(candidateReportPath),
    outputPath: options.outputPath ?? defaultOutputPath,
    reviewStatus: manifest.reviewStatus,
    candidateCount: candidateReport.candidateCount,
    reviewCount: reviews.length,
    includeCount: reviews.filter((review) => review.decision === 'include').length,
    excludeCount: reviews.filter((review) => excludeDecisionPattern.test(review.decision)).length,
    runtimeRecordCount: records.length,
    records
  };
}

export async function writeReviewedReactions(outputPath, records) {
  const absoluteOutputPath = projectPath(outputPath ?? defaultOutputPath);
  await writeJsonFile(absoluteOutputPath, { reactions: records });
  return relativeProjectPath(absoluteOutputPath);
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      check: { type: 'boolean' },
      write: { type: 'boolean' },
      manifest: { type: 'string' },
      'candidate-report': { type: 'string' },
      output: { type: 'string' }
    },
    strict: true
  });

  if (values.check && values.write) {
    throw new Error('--check and --write cannot be used together');
  }

  return {
    help: values.help === true,
    check: values.check === true,
    write: values.write === true,
    manifestPath: values.manifest ?? defaultManifestPath,
    candidateReportPath: values['candidate-report'] ?? null,
    outputPath: values.output ?? defaultOutputPath
  };
}

function printHelp() {
  console.log(`Reviewed textbook reaction runtime builder / 已审核教材反应运行时生成器

Usage:
  node scripts/textbook/build-reviewed-reactions.mjs --check
  node scripts/textbook/build-reviewed-reactions.mjs --write

Options:
  --check                    Validate manifest and preview generated record counts without writing.
  --write                    Replace src/data/reactions.json with reviewed textbook records when complete.
  --manifest <path>          Review manifest path. Defaults to ${defaultManifestPath}.
  --candidate-report <path>  Task 1 extractor report path. Defaults to manifest.candidateSourceReport.
  --output <path>            Runtime reactions JSON path. Defaults to ${defaultOutputPath}.
  --help                     Show this help.`);
}

function validateCandidateReport(report, reportPath) {
  if (!isRecord(report)) {
    throw new Error(`${relativeProjectPath(reportPath)} must contain a JSON object`);
  }

  if (report.schemaVersion !== 1 || report.status !== 'generated') {
    throw new Error(`${relativeProjectPath(reportPath)} is not a Task 1 generated candidate report`);
  }

  if (!Array.isArray(report.candidates)) {
    throw new Error(`${relativeProjectPath(reportPath)} candidates must be an array`);
  }

  if (report.candidateCount !== report.candidates.length) {
    throw new Error(`${relativeProjectPath(reportPath)} candidateCount ${report.candidateCount} does not match ${report.candidates.length} candidates`);
  }
}

function validateReviewManifest({ manifest, candidateReport, candidatesById, manifestPath }) {
  if (!isRecord(manifest)) {
    throw new Error(`${relativeProjectPath(manifestPath)} must contain a JSON object`);
  }

  if (manifest.schemaVersion !== 1 || manifest.manifestKind !== 'reactionEquationReview') {
    throw new Error(`${relativeProjectPath(manifestPath)} is not a reactionEquationReview manifest`);
  }

  const reviews = requireArray(manifest.reviews, `${relativeProjectPath(manifestPath)} reviews`);

  if (manifest.reviewStatus === 'schema-only-pending-task-8' && reviews.length === 0) {
    const error = new Error('Fail-closed: reactionEquationReview.json is schema-only-pending-task-8 with no reviews. Task 8 must fill include/exclude reviews before runtime reactions can be regenerated. src/data/reactions.json was not modified.');
    error.failClosed = true;
    throw error;
  }

  if (!completedReviewStatuses.has(manifest.reviewStatus)) {
    const error = new Error(`Fail-closed: reviewStatus must be one of ${[...completedReviewStatuses].sort().join(', ')} before runtime replacement, got ${String(manifest.reviewStatus)}. src/data/reactions.json was not modified.`);
    error.failClosed = true;
    throw error;
  }

  if (!Number.isInteger(manifest.candidateCount)) {
    throw new Error('Manifest candidateCount must be an integer');
  }

  if (manifest.candidateCount !== candidateReport.candidateCount) {
    throw new Error(`Manifest candidateCount ${manifest.candidateCount} does not match extractor report ${candidateReport.candidateCount}`);
  }

  const allowedDecisions = new Set(requireArray(manifest.allowedDecisionCodes?.codes, 'allowedDecisionCodes.codes'));
  const currentIds = new Set(candidatesById.keys());
  const reviewedIds = new Set();

  for (const [index, review] of reviews.entries()) {
    if (!isRecord(review)) {
      throw new Error(`reviews[${index}] must be an object`);
    }

    const candidateId = requireText(review.candidateId, `reviews[${index}].candidateId`);
    const decision = requireText(review.decision, `reviews[${index}].decision`);

    if (reviewedIds.has(candidateId)) {
      throw new Error(`Duplicate review entry for candidateId ${candidateId}`);
    }
    reviewedIds.add(candidateId);

    if (!currentIds.has(candidateId)) {
      throw new Error(`Review entry references stale candidateId ${candidateId}`);
    }

    if (!allowedDecisions.has(decision)) {
      throw new Error(`Review entry ${candidateId} has unsupported decision ${decision}`);
    }

    if (decision !== 'include' && !excludeDecisionPattern.test(decision)) {
      throw new Error(`Review entry ${candidateId} decision must be include or exclude_*, got ${decision}`);
    }
  }

  const missingIds = [...currentIds].filter((candidateId) => !reviewedIds.has(candidateId)).sort(compareText);
  if (missingIds.length > 0) {
    throw new Error(`Review manifest is incomplete: ${missingIds.length} current candidate(s) lack include/exclude review decisions. First missing candidateId: ${missingIds[0]}`);
  }

  return [...reviews].sort((left, right) => compareText(left.candidateId, right.candidateId));
}

function buildCandidateMap(candidates) {
  const map = new Map();

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      throw new Error('Candidate report contains a non-object candidate');
    }

    const candidateId = requireText(candidate.candidateId, 'candidate.candidateId');
    if (map.has(candidateId)) {
      throw new Error(`Duplicate candidateId in extractor report: ${candidateId}`);
    }

    validateCandidateSource(candidate);
    map.set(candidateId, candidate);
  }

  return map;
}

function validateCandidateSource(candidate) {
  const sourceFile = requireText(candidate.sourceFile, `${candidate.candidateId}.sourceFile`);
  if (!sourceFile.startsWith('src/data/textbooks/') || !sourceFile.endsWith('/book.md')) {
    throw new Error(`${candidate.candidateId} sourceFile must be under src/data/textbooks/**/book.md`);
  }

  if (!Number.isInteger(candidate.lineStart) || candidate.lineStart < 1) {
    throw new Error(`${candidate.candidateId}.lineStart must be a positive integer`);
  }

  if (!Number.isInteger(candidate.lineEnd) || candidate.lineEnd < candidate.lineStart) {
    throw new Error(`${candidate.candidateId}.lineEnd must be an integer >= lineStart`);
  }
}

function buildRuntimeRecords({ reviews, candidatesById }) {
  const recordsByNormalizedEquation = new Map();

  for (const review of reviews) {
    if (review.decision !== 'include') {
      continue;
    }

    const candidate = candidatesById.get(review.candidateId);
    const record = buildRuntimeRecord({ review, candidate, candidatesById });
    const existing = recordsByNormalizedEquation.get(record.normalizedEquation);

    if (existing) {
      mergeDuplicateRecord(existing, record);
      continue;
    }

    recordsByNormalizedEquation.set(record.normalizedEquation, record);
  }

  return [...recordsByNormalizedEquation.values()].sort((left, right) => compareText(left.id, right.id));
}

function buildRuntimeRecord({ review, candidate, candidatesById }) {
  const normalized = normalizeReactionEquation(candidate.rawEquationText);
  const overrideReactants = optionalFormulaArray(review.reactants, `${review.candidateId}.reactants`);
  const overrideProducts = optionalFormulaArray(review.products, `${review.candidateId}.products`);
  const hasReviewedSideOverrides = overrideReactants !== null && overrideProducts !== null;

  if (normalized.unsupportedReason && !hasReviewedSideOverrides) {
    throw new Error(`${review.candidateId} is marked include but normalizer returned unsupportedReason ${normalized.unsupportedReason.code}; reviewed reactants[] and products[] overrides are required`);
  }

  const reactants = overrideReactants ?? normalized.reactants;
  const products = overrideProducts ?? normalized.products;

  if (reactants.length === 0 || products.length === 0) {
    throw new Error(`${review.candidateId} include did not produce non-empty reactants and products`);
  }

  const normalizedEquation = canonicalText(review.normalizedEquation)
    || canonicalText(normalized.normalizedEquation)
    || `${reactants.join(' + ')} → ${products.join(' + ')}`;
  const curriculumTags = runtimeCurriculumTags(review.curriculumTags, `${review.candidateId}.curriculumTags`);
  const sourceReferences = buildSourceReferences({ review, candidate, candidatesById });

  return {
    id: reactionIdFor(normalizedEquation),
    name: canonicalText(review.name) || `${normalizedEquation} 反应`,
    description: canonicalText(review.description) || `教材已审核反应：${canonicalText(candidate.rawEquationText)}`,
    equationText: renderableEquationText(reactants, products),
    normalizedEquation,
    notationReviewStatus: 'reviewed',
    reactants,
    products,
    curriculumTags,
    difficulty: normalizeDifficulty(canonicalText(review.difficulty) || defaultDifficulty),
    ...labMetadataFor({ normalizedEquation, reactants, products, description: canonicalText(review.description) || `教材已审核反应：${canonicalText(candidate.rawEquationText)}` }),
    sourceKind: 'textbook',
    sourceReviewStatus: 'reviewed',
    sourceReferences
  };
}

function mergeDuplicateRecord(target, duplicate) {
  if (JSON.stringify(target.reactants) !== JSON.stringify(duplicate.reactants)
    || JSON.stringify(target.products) !== JSON.stringify(duplicate.products)) {
    throw new Error(`Duplicate normalizedEquation ${target.normalizedEquation} has conflicting reactants/products`);
  }

  target.curriculumTags = mergeSortedStrings(target.curriculumTags, duplicate.curriculumTags);
  target.sourceReferences = mergeSourceReferences(target.sourceReferences, duplicate.sourceReferences);
}

function buildSourceReferences({ review, candidate, candidatesById }) {
  const candidateIds = [review.candidateId, ...sourceRefCandidateIds(review.sourceRefs, review.candidateId)];
  const references = [];
  const seen = new Set();

  for (const candidateId of candidateIds) {
    if (seen.has(candidateId)) {
      continue;
    }
    seen.add(candidateId);

    const sourceCandidate = candidatesById.get(candidateId);
    if (!sourceCandidate) {
      throw new Error(`${review.candidateId}.sourceRefs references unknown candidateId ${candidateId}`);
    }

    references.push(sourceReferenceFor(sourceCandidate));
  }

  if (!seen.has(candidate.candidateId)) {
    references.push(sourceReferenceFor(candidate));
  }

  return references.sort(compareSourceReferences);
}

function sourceReferenceFor(candidate) {
  return {
    candidateId: candidate.candidateId,
    volumeId: volumeIdForSourcePath(candidate.sourceFile),
    sourcePath: candidate.sourceFile,
    lineRange: `${candidate.lineStart}-${candidate.lineEnd}`,
    sourceHash: candidate.sourceHash ?? null,
    reviewedBy: 'textbook-reaction-review',
    reviewedAt,
    note: `Reviewed explicit textbook equation candidate ${candidate.candidateId}`
  };
}

function sourceRefCandidateIds(sourceRefs, ownerCandidateId) {
  if (sourceRefs === undefined) {
    return [];
  }

  const refs = requireArray(sourceRefs, `${ownerCandidateId}.sourceRefs`);
  return refs.map((ref, index) => {
    if (typeof ref === 'string') {
      return requireText(ref, `${ownerCandidateId}.sourceRefs[${index}]`);
    }

    if (isRecord(ref)) {
      return requireText(ref.candidateId, `${ownerCandidateId}.sourceRefs[${index}].candidateId`);
    }

    throw new Error(`${ownerCandidateId}.sourceRefs[${index}] must be a candidateId string or object with candidateId`);
  });
}

function optionalFormulaArray(value, label) {
  if (value === undefined) {
    return null;
  }

  const formulas = requiredOrderedStringArray(value, label);
  for (const formula of formulas) {
    if (!isFormulaText(formula)) {
      throw new Error(`${label} contains unsupported formula token ${formula}`);
    }
  }

  return formulas;
}

function requiredStringArray(value, label) {
  const items = requiredOrderedStringArray(value, label);
  return mergeSortedStrings([], items);
}

function runtimeCurriculumTags(value, label) {
  requiredStringArray(value, label);
  return ['intro-element-symbols'];
}

function normalizeDifficulty(value) {
  if (value === '初中基础') {
    return '初中';
  }

  return value;
}

function volumeIdForSourcePath(sourcePath) {
  const volumeId = sourcePathVolumeIds.get(sourcePath);
  if (!volumeId) {
    throw new Error(`No textbookAssetManifest volumeId mapping for sourcePath ${sourcePath}`);
  }

  return volumeId;
}

function labMetadataFor({ normalizedEquation, reactants, products, description }) {
  const experimentId = textbookExperimentIds.get(normalizedEquation) ?? `exp-${reactionIdFor(normalizedEquation)}`;

  return {
    experimentId,
    safetyLevel: 'caution',
    visualDescription: description,
    steps: [
      `观察反应物：${reactants.join(' + ')}`,
      `对照教材方程式：${normalizedEquation}`,
      `记录生成物：${products.join(' + ')}`
    ],
    safetyNotes: [
      '本条目来自教材方程式，仅用于应用内虚拟演示。',
      '不要在现实环境中自行复现实验，需由教师或实验员指导。'
    ]
  };
}

function requiredOrderedStringArray(value, label) {
  const items = requireArray(value, label).map((item, index) => requireText(item, `${label}[${index}]`));
  if (items.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }

  return items;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  return value;
}

function requireText(value, label) {
  const text = canonicalText(value);
  if (!text) {
    throw new Error(`${label} must be a non-empty string`);
  }

  return text;
}

function canonicalText(value) {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';
}

function renderableEquationText(reactants, products) {
  return `${reactants.join(' + ')} = ${products.join(' + ')}`;
}

function reactionIdFor(normalizedEquation) {
  return `textbook-reaction-${hashText(normalizedEquation).slice(0, 16)}`;
}

function mergeSortedStrings(left, right) {
  return [...new Set([...left, ...right])].sort(compareText);
}

function mergeSourceReferences(left, right) {
  const refsByKey = new Map();
  for (const ref of [...left, ...right]) {
    refsByKey.set(sourceReferenceKey(ref), ref);
  }

  return [...refsByKey.values()].sort(compareSourceReferences);
}

function sourceReferenceKey(ref) {
  return `${ref.candidateId}|${ref.sourcePath}|${ref.lineRange}`;
}

function compareSourceReferences(left, right) {
  return compareText(left.sourcePath, right.sourcePath)
    || compareLineRange(left.lineRange, right.lineRange)
    || compareText(left.candidateId, right.candidateId);
}

function compareLineRange(left, right) {
  const leftMatch = /^(\d+)-(\d+)$/u.exec(String(left ?? ''));
  const rightMatch = /^(\d+)-(\d+)$/u.exec(String(right ?? ''));

  if (!leftMatch || !rightMatch) {
    return compareText(left, right);
  }

  return Number(leftMatch[1]) - Number(rightMatch[1]) || Number(leftMatch[2]) - Number(rightMatch[2]);
}

function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), 'zh-Hans-CN');
}

function hashText(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

async function readJsonFile(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Cannot read ${label}: ${relativeProjectPath(filePath)} does not exist`);
    }

    throw new Error(`Cannot read ${label}: ${relativeProjectPath(filePath)} (${error.message})`);
  }
}

async function writeJsonFile(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function projectPath(projectRelativePath) {
  return path.resolve(projectRoot, projectRelativePath);
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function printSummary(plan, mode) {
  console.log(`Mode: ${mode}`);
  console.log(`Manifest: ${plan.manifestPath}`);
  console.log(`Candidate report: ${plan.candidateReportPath}`);
  console.log(`Review status: ${plan.reviewStatus}`);
  console.log(`Extractor candidates: ${plan.candidateCount}`);
  console.log(`Review entries: ${plan.reviewCount}`);
  console.log(`Included reviews: ${plan.includeCount}`);
  console.log(`Excluded reviews: ${plan.excludeCount}`);
  console.log(`Runtime records after normalized-equation dedupe: ${plan.runtimeRecordCount}`);
}

async function main() {
  const options = parseCli(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const plan = await buildReviewedReactionPlan(options);

  if (options.write) {
    if (plan.records.length === 0) {
      printSummary(plan, 'write-noop');
      console.log('No reviewed include entries produced runtime records; src/data/reactions.json was not modified.');
      return;
    }

    const writtenPath = await writeReviewedReactions(options.outputPath, plan.records);
    printSummary(plan, 'write');
    console.log(`Wrote reviewed textbook runtime reactions: ${writtenPath}`);
    return;
  }

  printSummary(plan, options.check ? 'check' : 'dry-run');
  console.log('Dry run only; src/data/reactions.json was not modified.');
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
