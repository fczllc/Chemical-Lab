import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const coverageColumns = [
  'sourceEvidence',
  'assets',
  'quiz',
  'learningPath',
  'labOrReaction',
  'experimentBacklog',
  'story',
  'achievement',
  'gameChallenge',
  'runtimeStatus',
  'reviewStatus',
  'notes'
];

const statusValues = ['required', 'optional', 'notApplicable', 'covered', 'deferred', 'missing'];
const allowedRequirements = new Set(['required', 'optional', 'notApplicable']);
const allowedStatuses = new Set(['covered', 'deferred', 'missing', 'notApplicable']);
const reviewedSurfaceColumns = new Set(['quiz', 'learningPath', 'labOrReaction', 'story', 'achievement', 'gameChallenge']);

const knownTextbookBatches = new Map([
  [
    'rj-chemistry-grade9-2024-vol1',
    {
      coveragePath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', 'rj-chemistry-grade9-2024-vol1', 'coverage-matrix.json')
    }
  ],
  [
    'rj-chemistry-grade9-2024-vol2',
    {
      coveragePath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', 'rj-chemistry-grade9-2024-vol2', 'coverage-matrix.json')
    }
  ],
  [
    'rj-chemistry-g12-selective-3-organic-2019',
    {
      coveragePath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', 'rj-chemistry-g12-selective-3-organic-2019', 'coverage-matrix.json')
    }
  ],
  [
    'rj-chemistry-grade8-54-2024-full',
    {
      coveragePath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', 'rj-chemistry-grade8-54-2024-full', 'coverage-matrix.json')
    }
  ]
]);

const knownFixtures = new Map([
  [
    'reviewed-missing-surface',
    path.join(projectRoot, 'scripts', 'textbook', 'fixtures', 'reviewed-missing-surface-coverage.json')
  ]
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

  if (options.fixture) {
    const fixturePath = knownFixtures.get(options.fixture);
    if (!fixturePath) {
      throw new Error(`Unknown coverage fixture: ${options.fixture}`);
    }

    const result = await validateFixture(fixturePath, options.fixture, options.status);
    finishValidation(result);
    return;
  }

  if (!options.textbook) {
    throw new Error('--textbook is required unless --fixture is provided');
  }

  const paths = knownTextbookBatches.get(options.textbook);
  if (!paths) {
    throw new Error(`Unknown textbook batch: ${options.textbook}`);
  }

  const result = await validateCoverageFile(paths.coveragePath, options.textbook, options.status);
  finishValidation(result);
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      textbook: { type: 'string' },
      fixture: { type: 'string' },
      status: { type: 'string' }
    },
    strict: true
  });

  return {
    help: values.help === true,
    textbook: values.textbook ?? null,
    fixture: values.fixture ?? null,
    status: values.status ?? 'all'
  };
}

function printHelp() {
  console.log(`Textbook coverage validator / 教材覆盖矩阵校验器

Usage:
  node scripts/textbook/validate-coverage.mjs --textbook <volumeId> [--status reviewed]
  node scripts/textbook/validate-coverage.mjs --fixture <fixtureName>

Options:
  --textbook <volumeId>                Validate generated coverage for a known textbook.
  --fixture <fixtureName>              Validate a coverage matrix fixture by stable fixture name.
  --status <all|reviewed>              Limit missing-required checks to reviewed rows.
  --help                               Show this help.`);
}

async function validateCoverageFile(coveragePath, expectedVolumeId, statusFilter) {
  const errors = [];
  const matrix = await readJsonFile(coveragePath, 'coverage matrix', errors);

  errors.push(...validateMatrix(matrix, expectedVolumeId, statusFilter));

  return {
    errors,
    label: expectedVolumeId,
    checked: [relativeProjectPath(coveragePath)]
  };
}

async function validateFixture(fixturePath, fixtureName, statusFilter) {
  const errors = [];
  const fixture = await readJsonFile(fixturePath, 'coverage fixture', errors);

  if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) {
    errors.push('fixture top level must be an object');
    return { errors, label: fixtureName, checked: [relativeProjectPath(fixturePath)] };
  }

  if (fixture.kind !== 'coverageMatrix') {
    errors.push(`fixture kind must be coverageMatrix: ${String(fixture.kind)}`);
    return { errors, label: fixtureName, checked: [relativeProjectPath(fixturePath)] };
  }

  errors.push(...validateMatrix(fixture.data, fixture.data?.volumeId, statusFilter));

  return { errors, label: fixtureName, checked: [relativeProjectPath(fixturePath)] };
}

function validateMatrix(matrix, expectedVolumeId, statusFilter) {
  const errors = [];

  if (statusFilter !== 'all' && statusFilter !== 'reviewed') {
    errors.push(`--status must be all or reviewed: ${statusFilter}`);
  }

  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) {
    errors.push('coverage matrix must be an object');
    return errors;
  }

  if (matrix.schemaVersion !== 1) {
    errors.push(`schemaVersion must be 1: ${String(matrix.schemaVersion)}`);
  }

  if (expectedVolumeId && matrix.volumeId !== expectedVolumeId) {
    errors.push(`volumeId must be ${expectedVolumeId}: ${String(matrix.volumeId)}`);
  }

  if (matrix.rowKey !== 'curriculumTagId') {
    errors.push('rowKey must be curriculumTagId');
  }

  validateOrderedStringArray(matrix.columns, coverageColumns, 'columns', errors);
  validateStatusValues(matrix.statusValues, errors);

  if (!Array.isArray(matrix.rows)) {
    errors.push('rows must be an array');
    return errors;
  }

  const seenCurriculumTagIds = new Set();

  for (const [rowIndex, row] of matrix.rows.entries()) {
    const rowPath = `rows[${rowIndex}]`;
    validateRow(row, rowPath, seenCurriculumTagIds, errors);

    if (shouldCheckRequiredCoverage(row, statusFilter)) {
      errors.push(...findMissingRequiredCoverage(row, rowPath));
      errors.push(...findReviewedSurfacePolicyErrors(row, rowPath));
    }
  }

  return errors;
}

function validateOrderedStringArray(actual, expected, label, errors) {
  if (!Array.isArray(actual)) {
    errors.push(`${label} must be an array`);
    return;
  }

  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    errors.push(`${label} must match ${expected.join(', ')}`);
  }
}

function validateStatusValues(values, errors) {
  if (!Array.isArray(values)) {
    errors.push('statusValues must be an array');
    return;
  }

  for (const statusValue of statusValues) {
    if (!values.includes(statusValue)) {
      errors.push(`statusValues must include ${statusValue}`);
    }
  }
}

function validateRow(row, rowPath, seenCurriculumTagIds, errors) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    errors.push(`${rowPath} must be an object`);
    return;
  }

  if (!hasText(row.curriculumTagId)) {
    errors.push(`${rowPath}.curriculumTagId must be a non-empty string`);
  } else if (seenCurriculumTagIds.has(row.curriculumTagId)) {
    errors.push(`${rowPath}.curriculumTagId must be unique: ${row.curriculumTagId}`);
  } else {
    seenCurriculumTagIds.add(row.curriculumTagId);
  }

  for (const column of coverageColumns) {
    const cell = row[column];
    const cellPath = `${rowPath}.${column}`;

    if (!cell || typeof cell !== 'object' || Array.isArray(cell)) {
      errors.push(`${cellPath} must be an object`);
      continue;
    }

    if (!allowedRequirements.has(cell.requirement)) {
      errors.push(`${cellPath}.requirement must be required, optional, or notApplicable`);
    }

    if (!allowedStatuses.has(cell.status)) {
      errors.push(`${cellPath}.status must be covered, deferred, missing, or notApplicable`);
    }
  }
}

function shouldCheckRequiredCoverage(row, statusFilter) {
  if (statusFilter !== 'reviewed') {
    return true;
  }

  const reviewValue = row?.reviewStatus?.value;
  return reviewValue === 'reviewed' || reviewValue === 'promoted';
}

function findMissingRequiredCoverage(row, rowPath) {
  const errors = [];

  for (const column of coverageColumns) {
    const coverageCell = row?.[column];

    if (coverageCell?.requirement === 'required' && coverageCell.status === 'missing') {
      errors.push(`Missing required surface coverage: ${row.curriculumTagId} -> ${column} (${rowPath}.${column})`);
    }
  }

  return errors;
}

function findReviewedSurfacePolicyErrors(row, rowPath) {
  const errors = [];

  for (const column of reviewedSurfaceColumns) {
    const coverageCell = row?.[column];
    if (!coverageCell || typeof coverageCell !== 'object' || Array.isArray(coverageCell)) {
      continue;
    }

    if (coverageCell.status === 'covered' && coverageCell.requirement === 'required' && normalizeArray(coverageCell.manifestCandidateIds).length === 0) {
      errors.push(`Reviewed surface coverage must include manifest-approved candidate: ${row.curriculumTagId} -> ${column} (${rowPath}.${column})`);
    }

    if ((coverageCell.status === 'deferred' || coverageCell.status === 'notApplicable') && !hasText(coverageCell.reason)) {
      errors.push(`Reviewed surface ${coverageCell.status} status requires rationale: ${row.curriculumTagId} -> ${column} (${rowPath}.${column})`);
    }
  }

  return errors;
}

async function readJsonFile(filePath, label, errors) {
  try {
    const source = await readFile(filePath, 'utf8');
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${label} cannot be read or parsed: ${error.message}`);
    return null;
  }
}

function finishValidation(result) {
  if (result.errors.length > 0) {
    console.error('Textbook coverage validation failed:');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Textbook coverage valid: ${result.label}`);
  for (const checkedPath of result.checked) {
    console.log(`checked: ${checkedPath}`);
  }
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

