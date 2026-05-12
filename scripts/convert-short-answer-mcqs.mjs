import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const quizDataPath = path.join(projectRoot, 'src', 'data', 'quizData.json');
const inventoryPath = path.join(projectRoot, '.sisyphus', 'evidence', 'mcq-batch-inventory.json');
const evidenceRoot = path.join(projectRoot, '.sisyphus', 'evidence');
const validDifficulties = new Set(['基础', '进阶', '挑战']);
const placeholderPattern = /待复核|TODO|请补充|待填写|placeholder/i;
const copiedFields = [
  'sourceVolumeId',
  'sourceReviewStatus',
  'sourceReferences',
  'textbookAssetReferences',
  'formulaText',
  'notationReviewStatus'
];

main().catch((error) => {
  console.error(`MCQ conversion failed / 选择题转换失败：${error.message}`);
  process.exit(1);
});

async function main() {
  const options = parseCli(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const inventory = validateInventory(await readJsonFile(inventoryPath, 'batch inventory'));
  const quizPayload = validateQuizPayload(await readJsonFile(quizDataPath, 'runtime quiz data'));
  const batches = resolveSelectedBatches(inventory, options);
  const selectedRecords = selectInventoryRecords(inventory, batches);
  const runtimeById = buildRuntimeMap(quizPayload.quizData);
  const generatedEntries = options.generated
    ? normalizeGeneratedEntries(await readJsonFile(path.resolve(projectRoot, options.generated), 'generated MCQ JSON'))
    : [];
  const report = buildBaseReport({ inventory, batches, selectedRecords, generatedEntries, options });
  const validation = validateGeneratedEntries({ generatedEntries, selectedRecords, runtimeById });

  applyValidationToReport(report, validation);

  if (options.write) {
    if (!options.generated) {
      throw new Error('--write requires --generated <path>; refusing to write without generated MCQ JSON');
    }

    if (validation.invalid.length > 0) {
      await writeReports(report);
      printSummary(report);
      console.error(`Generated MCQ validation failed (${validation.invalid.length} invalid); refusing to write`);
      process.exitCode = 1;
      return;
    }

    const convertedQuizData = replaceSelectedRecords(quizPayload.quizData, validation.validById);
    validateHandAuthoredMcqsStable(quizPayload.quizData, convertedQuizData);
    const serialized = `${JSON.stringify({ quizData: convertedQuizData }, null, 2)}\n`;
    JSON.parse(serialized);
    await writeJsonAtomic(quizDataPath, serialized);
    report.writeApplied = true;
    report.outputRuntimeFile = relativeProjectPath(quizDataPath);
  }

  await writeReports(report);
  printSummary(report);

  if (validation.invalid.length > 0) {
    process.exitCode = 1;
  }
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      batch: { type: 'string' },
      'dry-run': { type: 'boolean' },
      generated: { type: 'string' },
      write: { type: 'boolean' },
      'all-ready-batches': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' }
    },
    strict: true
  });

  const dryRun = values['dry-run'] === true;
  const write = values.write === true;

  if (values.help === true) {
    return {
      help: true,
      batch: values.batch ?? null,
      dryRun,
      generated: values.generated ?? null,
      write,
      allReadyBatches: values['all-ready-batches'] === true
    };
  }

  if (dryRun && write) {
    throw new Error('Use either --dry-run or --write, not both');
  }

  if (!dryRun && !write) {
    throw new Error('Choose an explicit mode: --dry-run or --write');
  }

  if (values.batch && values['all-ready-batches']) {
    throw new Error('Use either --batch <id> or --all-ready-batches, not both');
  }

  if (!values.batch && !values['all-ready-batches']) {
    throw new Error('Provide --batch <id> or --all-ready-batches');
  }

  return {
    help: values.help === true,
    batch: values.batch ?? null,
    dryRun,
    generated: values.generated ?? null,
    write,
    allReadyBatches: values['all-ready-batches'] === true
  };
}

function printHelp() {
  console.log(`Short-answer to MCQ batch converter / 简答题选择题批量转换器

Usage:
  node scripts/convert-short-answer-mcqs.mjs --batch <batchId> --dry-run [--generated <path>]
  node scripts/convert-short-answer-mcqs.mjs --batch <batchId> --write --generated <path>
  node scripts/convert-short-answer-mcqs.mjs --all-ready-batches --dry-run [--generated <path>]

Modes:
  --dry-run                         Validate selected batch and generated JSON, write reports only.
  --write                           Replace selected shortAnswer records after all generated entries validate.

Selection:
  --batch <batchId>                 Select one inventory batch by id.
  --all-ready-batches               Select all inventory batches marked readyForMcqGeneration.

Generated JSON shapes accepted by --generated:
  [ { "id": "runtime-id", ... }, { "skipped": true, "runtimeId": "runtime-id", "reason": "..." } ]
  { "records": [ ... ] }
  { "mcqs": [ ... ] }
  { "generated": [ ... ] }
  { "runtime-id": { "id": "runtime-id", ... } }

Generated MCQs must follow .sisyphus/evidence/task-2-generation-contract.md: exactly 4 unique options,
correctIndex 0-3, difficulty 基础|进阶|挑战, generatedFromShortAnswer: true, generationSource or
generationModel, and unchanged provenance fields. Skipped entries are reported but not written.`);
}

async function readJsonFile(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} cannot be read or parsed (${relativeProjectPath(filePath)}): ${error.message}`);
  }
}

function validateInventory(inventory) {
  const errors = [];

  if (!isRecord(inventory)) {
    throw new Error('batch inventory top level must be an object');
  }

  if (inventory.sourceRuntimeFile !== 'src/data/quizData.json') {
    errors.push('batch inventory sourceRuntimeFile must be src/data/quizData.json');
  }

  if (!Array.isArray(inventory.batchSummaries)) {
    errors.push('batch inventory batchSummaries must be an array');
  }

  if (!Array.isArray(inventory.records)) {
    errors.push('batch inventory records must be an array');
  }

  const seenRuntimeIds = new Set();
  for (const [index, record] of (inventory.records ?? []).entries()) {
    const label = `inventory.records[${index}]`;
    if (!isRecord(record)) {
      errors.push(`${label} must be an object`);
      continue;
    }

    validateRequiredText(record.runtimeId, `${label}.runtimeId`, errors);
    validateRequiredText(record.batchId, `${label}.batchId`, errors);
    validateRequiredText(record.status, `${label}.status`, errors);
    if (!isRecord(record.runtime)) {
      errors.push(`${label}.runtime must be an object`);
    }

    if (!isRecord(record.source) || record.source.sourceTextAvailable !== true) {
      errors.push(`${label}.source must include sourceTextAvailable: true`);
    }

    if (seenRuntimeIds.has(record.runtimeId)) {
      errors.push(`${label}.runtimeId is duplicated: ${record.runtimeId}`);
    }
    seenRuntimeIds.add(record.runtimeId);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid batch inventory:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }

  return inventory;
}

function validateQuizPayload(payload) {
  if (!isRecord(payload) || !Array.isArray(payload.quizData)) {
    throw new Error('runtime quiz data must be an object with quizData array');
  }

  return payload;
}

function resolveSelectedBatches(inventory, options) {
  const summaries = inventory.batchSummaries;

  if (options.allReadyBatches) {
    const readyBatches = summaries
      .filter((summary) => summary.readyForMcqGeneration === true)
      .map((summary) => summary.batchId);
    if (readyBatches.length === 0) {
      throw new Error('No ready batches found in inventory');
    }
    return readyBatches;
  }

  const summary = summaries.find((candidate) => candidate.batchId === options.batch);
  if (!summary) {
    throw new Error(`Unknown batch in inventory: ${options.batch}`);
  }

  return [options.batch];
}

function selectInventoryRecords(inventory, batchIds) {
  const selectedBatchIds = new Set(batchIds);
  const selectedRecords = inventory.records.filter((record) => selectedBatchIds.has(record.batchId));

  if (selectedRecords.length === 0) {
    throw new Error(`No inventory records matched selected batches: ${batchIds.join(', ')}`);
  }

  return selectedRecords;
}

function buildRuntimeMap(quizData) {
  const runtimeById = new Map();

  for (const [index, record] of quizData.entries()) {
    if (!isRecord(record) || typeof record.id !== 'string' || !record.id.trim()) {
      throw new Error(`quizData[${index}] must be an object with non-empty id`);
    }

    if (runtimeById.has(record.id)) {
      throw new Error(`Duplicate runtime quiz id: ${record.id}`);
    }

    runtimeById.set(record.id, record);
  }

  return runtimeById;
}

function normalizeGeneratedEntries(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    throw new Error('generated MCQ JSON must be an array or object');
  }

  for (const key of ['records', 'mcqs', 'generated']) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  if (typeof payload.id === 'string' || payload.skipped === true) {
    return [payload];
  }

  return Object.values(payload);
}

function buildBaseReport({ inventory, batches, selectedRecords, generatedEntries, options }) {
  const selectedReadyRecords = selectedRecords.filter((record) => record.status === 'ready');
  const sourceUnresolvedRecords = selectedRecords.filter((record) => record.status !== 'ready');
  const reportId = batches.length === 1 ? batches[0] : 'all-ready-batches';

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: options.write ? 'write' : 'dry-run',
    batchId: reportId,
    batchIds: batches,
    sourceRuntimeFile: inventory.sourceRuntimeFile,
    inventoryFile: relativeProjectPath(inventoryPath),
    generatedFile: options.generated ? normalizeProjectInputPath(options.generated) : null,
    writeApplied: false,
    counts: {
      selectedRecords: selectedRecords.length,
      readyRecords: selectedReadyRecords.length,
      generatedEntries: generatedEntries.length,
      converted: 0,
      skipped: 0,
      invalid: 0,
      sourceUnresolved: sourceUnresolvedRecords.length,
      missingGenerated: 0
    },
    ids: {
      converted: [],
      skipped: [],
      invalid: [],
      sourceUnresolved: sourceUnresolvedRecords.map((record) => record.runtimeId),
      missingGenerated: []
    },
    invalidEntries: [],
    skippedEntries: []
  };
}

function validateGeneratedEntries({ generatedEntries, selectedRecords, runtimeById }) {
  const selectedReadyIds = new Set(selectedRecords.filter((record) => record.status === 'ready').map((record) => record.runtimeId));
  const inventoryRecordById = new Map(selectedRecords.map((record) => [record.runtimeId, record]));
  const seenGeneratedIds = new Set();
  const validById = new Map();
  const skipped = [];
  const invalid = [];

  for (const [index, entry] of generatedEntries.entries()) {
    const errors = [];

    if (!isRecord(entry)) {
      invalid.push({ index, runtimeId: null, errors: ['entry must be an object'] });
      continue;
    }

    if (entry.skipped === true) {
      validateSkippedEntry(entry, index, selectedReadyIds, seenGeneratedIds, skipped, invalid);
      continue;
    }

    const runtimeId = typeof entry.id === 'string' ? entry.id.trim() : '';
    if (!runtimeId) {
      errors.push('id must be a non-empty string');
    }

    if (runtimeId && !selectedReadyIds.has(runtimeId)) {
      errors.push(`id is not a selected ready shortAnswer record: ${runtimeId}`);
    }

    if (runtimeId && seenGeneratedIds.has(runtimeId)) {
      errors.push(`duplicate generated entry for runtime id: ${runtimeId}`);
    }

    if (runtimeId) {
      seenGeneratedIds.add(runtimeId);
    }

    const original = runtimeById.get(runtimeId);
    const inventoryRecord = inventoryRecordById.get(runtimeId);
    if (!original) {
      errors.push(`runtime quiz id not found in src/data/quizData.json: ${runtimeId}`);
    } else if (original.category !== 'shortAnswer') {
      errors.push(`runtime quiz id is not a shortAnswer record: ${runtimeId}`);
    }

    if (inventoryRecord && original) {
      validateInventoryRuntimeMatch(inventoryRecord, original, errors);
    }

    validateGeneratedMcqShape(entry, original, errors);

    if (errors.length > 0) {
      invalid.push({ index, runtimeId: runtimeId || null, errors });
      continue;
    }

    validById.set(runtimeId, normalizeMcqForWrite(entry, original));
  }

  const missingGenerated = [...selectedReadyIds]
    .filter((runtimeId) => !seenGeneratedIds.has(runtimeId))
    .sort(compareText);

  return { validById, skipped, invalid, missingGenerated };
}

function validateSkippedEntry(entry, index, selectedReadyIds, seenGeneratedIds, skipped, invalid) {
  const errors = [];
  const runtimeId = typeof entry.runtimeId === 'string' ? entry.runtimeId.trim() : '';

  if (!runtimeId) {
    errors.push('skipped entry runtimeId must be a non-empty string');
  }

  if (runtimeId && !selectedReadyIds.has(runtimeId)) {
    errors.push(`skipped runtimeId is not a selected ready shortAnswer record: ${runtimeId}`);
  }

  if (runtimeId && seenGeneratedIds.has(runtimeId)) {
    errors.push(`duplicate generated/skipped entry for runtime id: ${runtimeId}`);
  }

  if (runtimeId) {
    seenGeneratedIds.add(runtimeId);
  }

  validateRequiredText(entry.reason, 'skipped entry reason', errors);

  if (errors.length > 0) {
    invalid.push({ index, runtimeId: runtimeId || null, errors });
  } else {
    skipped.push({ index, runtimeId, reason: entry.reason.trim() });
  }
}

function validateInventoryRuntimeMatch(inventoryRecord, original, errors) {
  if (inventoryRecord.runtime.category !== original.category) {
    errors.push(`inventory/runtime category mismatch for ${original.id}`);
  }

  if (inventoryRecord.runtime.sourceVolumeId !== original.sourceVolumeId) {
    errors.push(`inventory/runtime sourceVolumeId mismatch for ${original.id}`);
  }

  if (!Array.isArray(original.sourceReferences) || original.sourceReferences.length === 0) {
    errors.push(`runtime sourceReferences missing for ${original.id}`);
  }
}

function validateGeneratedMcqShape(entry, original, errors) {
  validateRequiredText(entry.question, 'question', errors);
  validateNoPlaceholder(entry.question, 'question', errors);

  if (!Array.isArray(entry.options)) {
    errors.push('options must be an array');
  } else {
    if (entry.options.length !== 4) {
      errors.push(`options must contain exactly 4 entries, got ${entry.options.length}`);
    }

    const trimmedOptions = entry.options.map((option) => typeof option === 'string' ? option.trim() : option);
    for (const [optionIndex, option] of trimmedOptions.entries()) {
      validateRequiredText(option, `options[${optionIndex}]`, errors);
      validateNoPlaceholder(option, `options[${optionIndex}]`, errors);
    }

    const uniqueOptions = new Set(trimmedOptions.filter((option) => typeof option === 'string'));
    if (uniqueOptions.size !== trimmedOptions.length) {
      errors.push('options must be unique after trimming');
    }
  }

  if (!Number.isInteger(entry.correctIndex) || entry.correctIndex < 0 || entry.correctIndex > 3) {
    errors.push(`correctIndex must be an integer from 0 to 3, got ${String(entry.correctIndex)}`);
  }

  validateRequiredText(entry.category, 'category', errors);
  if (entry.category === 'shortAnswer') {
    errors.push('category must replace shortAnswer with an MCQ category');
  }

  if (!validDifficulties.has(entry.difficulty)) {
    errors.push(`difficulty must be one of 基础|进阶|挑战, got ${String(entry.difficulty)}`);
  }

  validateCurriculumTags(entry.curriculumTags, original, errors);
  validateRequiredText(entry.explanation, 'explanation', errors);
  validateNoPlaceholder(entry.explanation, 'explanation', errors);

  if (entry.generatedFromShortAnswer !== true) {
    errors.push('generatedFromShortAnswer must be true');
  }

  if (!hasGenerationSource(entry)) {
    errors.push('generationSource or generationModel must be a non-empty string');
  }

  if ('answer' in entry) {
    errors.push('answer field must not be present');
  }

  validateRecursiveNoPlaceholder(entry, 'entry', errors);

  if (original) {
    validateProvenance(entry, original, errors);
  }
}

function validateCurriculumTags(tags, original, errors) {
  if (!Array.isArray(tags) || tags.length === 0) {
    errors.push('curriculumTags must be a non-empty array');
    return;
  }

  for (const [index, tag] of tags.entries()) {
    validateRequiredText(tag, `curriculumTags[${index}]`, errors);
  }

  if (original && Array.isArray(original.curriculumTags)) {
    const generatedTags = new Set(tags);
    for (const originalTag of original.curriculumTags) {
      if (!generatedTags.has(originalTag)) {
        errors.push(`curriculumTags must preserve original tag: ${originalTag}`);
      }
    }
  }
}

function validateProvenance(entry, original, errors) {
  if (entry.id !== original.id) {
    errors.push('id must match original runtime id');
  }

  for (const field of ['sourceVolumeId', 'sourceReviewStatus', 'sourceReferences']) {
    if (!(field in entry)) {
      errors.push(`${field} must be present and unchanged`);
      continue;
    }

    if (!deepEqual(entry[field], original[field])) {
      errors.push(`${field} must match original runtime provenance exactly`);
    }
  }

  for (const field of ['textbookAssetReferences', 'formulaText', 'notationReviewStatus']) {
    if (field in original && !deepEqual(entry[field], original[field])) {
      errors.push(`${field} must match original runtime provenance exactly`);
    }
  }
}

function applyValidationToReport(report, validation) {
  report.counts.converted = validation.validById.size;
  report.counts.skipped = validation.skipped.length;
  report.counts.invalid = validation.invalid.length;
  report.counts.missingGenerated = validation.missingGenerated.length;
  report.ids.converted = [...validation.validById.keys()].sort(compareText);
  report.ids.skipped = validation.skipped.map((entry) => entry.runtimeId).sort(compareText);
  report.ids.invalid = validation.invalid.map((entry) => entry.runtimeId ?? `entry-${entry.index}`);
  report.ids.missingGenerated = validation.missingGenerated;
  report.invalidEntries = validation.invalid;
  report.skippedEntries = validation.skipped;
}

function replaceSelectedRecords(quizData, validById) {
  return quizData.map((record) => validById.get(record.id) ?? record);
}

function normalizeMcqForWrite(entry, original) {
  const normalized = deepClone(entry);
  normalized.id = original.id;
  normalized.question = normalized.question.trim();
  normalized.options = normalized.options.map((option) => option.trim());
  normalized.category = normalized.category.trim();
  normalized.explanation = normalized.explanation.trim();
  normalized.curriculumTags = normalized.curriculumTags.map((tag) => tag.trim());

  for (const field of copiedFields) {
    if (field in original) {
      normalized[field] = deepClone(original[field]);
    }
  }

  delete normalized.answer;
  return normalized;
}

function validateHandAuthoredMcqsStable(before, after) {
  const errors = [];

  for (const [index, original] of before.entries()) {
    if (original.category === 'shortAnswer') {
      continue;
    }

    if (!deepEqual(original, after[index])) {
      errors.push(`hand-authored MCQ changed unexpectedly: ${original.id}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Refusing to write because non-shortAnswer records changed:\n${errors.join('\n')}`);
  }
}

async function writeReports(report) {
  await mkdir(evidenceRoot, { recursive: true });
  const jsonPath = path.join(evidenceRoot, `mcq-conversion-${report.batchId}.json`);
  const mdPath = path.join(evidenceRoot, `mcq-conversion-${report.batchId}.md`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, buildMarkdownReport(report), 'utf8');
}

function buildMarkdownReport(report) {
  return `# MCQ Conversion Report — ${report.batchId}

- Generated at: ${report.generatedAt}
- Mode: ${report.mode}
- Write applied: ${report.writeApplied ? 'yes' : 'no'}
- Inventory: ${report.inventoryFile}
- Runtime data: ${report.sourceRuntimeFile}
- Generated JSON: ${report.generatedFile ?? 'none'}

## Counts

| Metric | Count |
|---|---:|
| Selected records | ${report.counts.selectedRecords} |
| Ready records | ${report.counts.readyRecords} |
| Generated entries | ${report.counts.generatedEntries} |
| Converted | ${report.counts.converted} |
| Skipped | ${report.counts.skipped} |
| Invalid | ${report.counts.invalid} |
| Source unresolved | ${report.counts.sourceUnresolved} |
| Missing generated | ${report.counts.missingGenerated} |

## Converted IDs

${formatIdList(report.ids.converted)}

## Skipped IDs

${formatIdList(report.ids.skipped)}

## Invalid Entries

${report.invalidEntries.length === 0 ? '- None' : report.invalidEntries.map((entry) => `- ${entry.runtimeId ?? `entry-${entry.index}`}: ${entry.errors.join('; ')}`).join('\n')}

## Source Unresolved IDs

${formatIdList(report.ids.sourceUnresolved)}
`;
}

function printSummary(report) {
  console.log(`MCQ conversion ${report.mode} / 选择题转换${report.mode === 'write' ? '写入' : '预演'}完成`);
  console.log(`Batch(es): ${report.batchIds.join(', ')}`);
  console.log(`Selected: ${report.counts.selectedRecords}; ready: ${report.counts.readyRecords}; source-unresolved: ${report.counts.sourceUnresolved}`);
  console.log(`Generated: ${report.counts.generatedEntries}; converted: ${report.counts.converted}; skipped: ${report.counts.skipped}; invalid: ${report.counts.invalid}; missing-generated: ${report.counts.missingGenerated}`);
  console.log(`Reports: .sisyphus/evidence/mcq-conversion-${report.batchId}.json and .md`);
}

async function writeJsonAtomic(filePath, serialized) {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, serialized, 'utf8');
  await rename(tempPath, filePath);
}

function validateRequiredText(value, label, errors) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label} must be a non-empty string`);
  }
}

function validateNoPlaceholder(value, label, errors) {
  if (typeof value === 'string' && placeholderPattern.test(value)) {
    errors.push(`${label} contains placeholder text`);
  }
}

function validateRecursiveNoPlaceholder(value, label, errors) {
  if (typeof value === 'string') {
    validateNoPlaceholder(value, label, errors);
    return;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      validateRecursiveNoPlaceholder(item, `${label}[${index}]`, errors);
    }
    return;
  }

  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      validateRecursiveNoPlaceholder(item, `${label}.${key}`, errors);
    }
  }
}

function hasGenerationSource(entry) {
  return (typeof entry.generationSource === 'string' && entry.generationSource.trim())
    || (typeof entry.generationModel === 'string' && entry.generationModel.trim());
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function compareText(left, right) {
  return left.localeCompare(right, 'zh-Hans-CN');
}

function formatIdList(ids) {
  return ids.length === 0 ? '- None' : ids.map((id) => `- ${id}`).join('\n');
}

function normalizeProjectInputPath(inputPath) {
  return relativeProjectPath(path.resolve(projectRoot, inputPath));
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}
