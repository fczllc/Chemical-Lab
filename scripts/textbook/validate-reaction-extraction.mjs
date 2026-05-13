import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import process from 'node:process';
import { normalizeReactionEquation } from './reaction-equation-normalizer.mjs';

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'reactionEquationReview.json');
const extractorPath = path.join(projectRoot, 'scripts', 'textbook', 'extract-reaction-equations.mjs');
const includeDecision = 'include';
const duplicateDecision = 'exclude_duplicate';
const exclusionPrefix = 'exclude_';

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

  const manifest = await readJson(manifestPath, 'reaction review manifest');
  const schemaResult = validateManifestSchema(manifest);

  if (options.schemaOnly) {
    const result = buildResult({ schemaResult, extractionReport: null, coverage: emptyCoverage() });
    await maybeWriteReport(options.report, result);
    printResult(result, 'schema-only');
    finish(result);
    return;
  }

  const extractionReport = await runExtractorReport();
  const coverage = validateCoverage(manifest, extractionReport, schemaResult.allowedDecisionCodes);
  const result = buildResult({ schemaResult, extractionReport, coverage });

  await maybeWriteReport(options.report, result);
  printResult(result, 'full');
  finish(result);
}

function parseCli(args) {
  const options = { help: false, schemaOnly: false, report: null };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--schema-only') {
      options.schemaOnly = true;
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
  console.log(`Reaction extraction coverage validator / 教材反应方程式提取覆盖校验器

Usage:
  node scripts/textbook/validate-reaction-extraction.mjs [--schema-only] [--report <path>]

Options:
  --schema-only   Validate reactionEquationReview.json schema without requiring completed reviews.
  --report <path> Write JSON coverage report.
  --help          Show this help.`);
}

async function runExtractorReport() {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'reaction-extraction-'));
  const reportPath = path.join(tempRoot, 'report.json');
  try {
    await execFileAsync(process.execPath, [extractorPath, '--report', reportPath], {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024 * 20
    });
    return await readJson(reportPath, 'extractor report');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function validateManifestSchema(manifest) {
  const errors = [];
  const allowedDecisionCodes = new Set();

  requireValue(manifest?.schemaVersion === 1, 'schemaVersion must be 1', errors);
  requireValue(manifest?.manifestKind === 'reactionEquationReview', 'manifestKind must be reactionEquationReview', errors);
  requireValue(typeof manifest?.candidateSourceReport === 'string' && manifest.candidateSourceReport.trim(), 'candidateSourceReport must be a non-empty string', errors);
  requireValue(Number.isInteger(manifest?.candidateCount) && manifest.candidateCount >= 0, 'candidateCount must be a non-negative integer', errors);
  requireValue(isRecord(manifest?.duplicatePolicy), 'duplicatePolicy must be an object', errors);
  requireValue(manifest?.duplicatePolicy?.deduplicationKey === 'normalizedEquation', 'duplicatePolicy.deduplicationKey must be normalizedEquation', errors);
  requireValue(Array.isArray(manifest?.reviews), 'reviews must be an array', errors);

  const codes = manifest?.allowedDecisionCodes?.codes;
  if (!Array.isArray(codes) || codes.length === 0) {
    errors.push('allowedDecisionCodes.codes must be a non-empty array');
  } else {
    for (const code of codes) {
      if (typeof code !== 'string' || !code.trim()) {
        errors.push(`Invalid decision code in allowedDecisionCodes.codes: ${String(code)}`);
        continue;
      }
      allowedDecisionCodes.add(code);
    }
    if (!allowedDecisionCodes.has(includeDecision)) {
      errors.push('allowedDecisionCodes.codes must include include');
    }
    if (!allowedDecisionCodes.has(duplicateDecision)) {
      errors.push('allowedDecisionCodes.codes must include exclude_duplicate');
    }
  }

  return { errors, allowedDecisionCodes };
}

function validateCoverage(manifest, extractionReport, allowedDecisionCodes) {
  const errors = [];
  const warnings = [];
  const reviews = Array.isArray(manifest?.reviews) ? manifest.reviews : [];
  const candidates = Array.isArray(extractionReport?.candidates) ? extractionReport.candidates : [];
  const candidateById = new Map(candidates.map((candidate) => [candidate.candidateId, candidate]));
  const reviewsByCandidateId = new Map();
  const duplicateReviewIds = [];
  const invalidDecisionIds = [];
  const staleManifestIds = [];
  const exclusionsMissingReason = [];
  const includeWithoutUsableOutput = [];

  for (const [index, review] of reviews.entries()) {
    if (!isRecord(review)) {
      errors.push(`reviews[${index}] must be an object`);
      continue;
    }

    const candidateId = review.candidateId;
    if (typeof candidateId !== 'string' || !candidateId.trim()) {
      errors.push(`reviews[${index}].candidateId must be a non-empty string`);
      continue;
    }

    if (reviewsByCandidateId.has(candidateId)) {
      duplicateReviewIds.push(candidateId);
    }
    reviewsByCandidateId.set(candidateId, [...(reviewsByCandidateId.get(candidateId) ?? []), review]);

    if (!candidateById.has(candidateId)) {
      staleManifestIds.push(candidateId);
    }

    if (!allowedDecisionCodes.has(review.decision)) {
      invalidDecisionIds.push(candidateId);
      continue;
    }

    if (String(review.decision).startsWith(exclusionPrefix) && review.decision !== includeDecision && !hasText(review.reason)) {
      exclusionsMissingReason.push(candidateId);
    }
  }

  const unreviewedCandidates = candidates
    .filter((candidate) => !reviewsByCandidateId.has(candidate.candidateId))
    .map((candidate) => candidate.candidateId)
    .sort(compareText);

  let includedCandidates = 0;
  let excludedCandidates = 0;
  let duplicateCandidates = 0;
  const normalizedIncludes = new Map();
  const perTextbook = new Map();

  for (const candidate of candidates) {
    const bucket = perTextbookBucket(perTextbook, candidate.sourceFile);
    bucket.detected += 1;

    const review = reviewsByCandidateId.get(candidate.candidateId)?.[0];
    if (!review || !allowedDecisionCodes.has(review.decision)) {
      continue;
    }

    if (review.decision === includeDecision) {
      includedCandidates += 1;
      bucket.included += 1;
      const normalized = resolveIncludedCandidate(candidate, review);
      if (!normalized.usable) {
        includeWithoutUsableOutput.push(candidate.candidateId);
      } else {
        pushMapArray(normalizedIncludes, normalized.normalizedEquation, candidate.candidateId);
      }
      continue;
    }

    if (String(review.decision).startsWith(exclusionPrefix)) {
      excludedCandidates += 1;
      bucket.excluded += 1;
      if (review.decision === duplicateDecision) {
        duplicateCandidates += 1;
        bucket.duplicate += 1;
      }
      continue;
    }
  }

  const duplicateIncludedEquations = [...normalizedIncludes.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([normalizedEquation, candidateIds]) => ({ normalizedEquation, candidateIds }));

  const unaccountedCandidateSet = new Set([
    ...unreviewedCandidates,
    ...invalidDecisionIds.filter((id) => candidateById.has(id)),
    ...duplicateReviewIds.filter((id) => candidateById.has(id)),
    ...includeWithoutUsableOutput
  ]);

  if (unreviewedCandidates.length > 0) {
    errors.push(`${unreviewedCandidates.length} current extraction candidate(s) have no manifest review`);
  }
  if (staleManifestIds.length > 0) {
    errors.push(`${staleManifestIds.length} manifest review candidateId(s) are stale`);
  }
  if (duplicateReviewIds.length > 0) {
    errors.push(`${duplicateReviewIds.length} duplicate manifest review candidateId(s) found`);
  }
  if (invalidDecisionIds.length > 0) {
    errors.push(`${invalidDecisionIds.length} manifest review decision(s) are not allowed`);
  }
  if (exclusionsMissingReason.length > 0) {
    errors.push(`${exclusionsMissingReason.length} exclusion review(s) are missing reason`);
  }
  if (includeWithoutUsableOutput.length > 0) {
    errors.push(`${includeWithoutUsableOutput.length} include review(s) have no usable normalizer output or reviewed overrides`);
  }
  if (duplicateIncludedEquations.length > 0) {
    errors.push(`${duplicateIncludedEquations.length} normalized equation(s) have multiple include reviews; mark duplicates as exclude_duplicate`);
  }
  if (Number.isInteger(manifest?.candidateCount) && manifest.candidateCount !== candidates.length) {
    warnings.push(`candidateCount ${manifest.candidateCount} differs from current extractor count ${candidates.length}`);
  }

  return {
    errors,
    warnings,
    counters: {
      candidateCount: candidates.length,
      reviewedCandidates: reviews.length,
      includedCandidates,
      excludedCandidates,
      duplicateCandidates,
      staleManifestCandidates: unique(staleManifestIds).length,
      duplicateReviewCandidates: duplicateReviewIds.length,
      invalidDecisionCandidates: invalidDecisionIds.length,
      exclusionsMissingReason: exclusionsMissingReason.length,
      duplicateIncludedEquations: duplicateIncludedEquations.length,
      missingExplicitEquations: includeWithoutUsableOutput.length,
      unreviewedCandidates: unreviewedCandidates.length,
      unaccountedCandidates: unaccountedCandidateSet.size
    },
    details: {
      unreviewedCandidates,
      staleManifestIds: unique(staleManifestIds),
      duplicateReviewIds,
      invalidDecisionIds,
      exclusionsMissingReason,
      includeWithoutUsableOutput,
      duplicateIncludedEquations
    },
    perTextbook: [...perTextbook.values()].sort((left, right) => compareText(left.sourceFile, right.sourceFile))
  };
}

function resolveIncludedCandidate(candidate, review) {
  const normalized = normalizeReactionEquation(candidate.rawEquationText);
  const normalizedEquation = firstText(review.normalizedEquation, normalized.normalizedEquation);
  const reactants = nonEmptyTextArray(review.reactants) ? review.reactants : normalized.reactants;
  const products = nonEmptyTextArray(review.products) ? review.products : normalized.products;

  return {
    normalizedEquation,
    reactants,
    products,
    usable: hasText(normalizedEquation) && nonEmptyTextArray(reactants) && nonEmptyTextArray(products)
  };
}

function buildResult({ schemaResult, extractionReport, coverage }) {
  return {
    schemaVersion: 1,
    validator: 'scripts/textbook/validate-reaction-extraction.mjs',
    manifest: relativeProjectPath(manifestPath),
    extractor: relativeProjectPath(extractorPath),
    status: [...schemaResult.errors, ...coverage.errors].length === 0 ? 'pass' : 'fail',
    counters: coverage.counters,
    schemaErrors: schemaResult.errors,
    coverageErrors: coverage.errors,
    warnings: coverage.warnings,
    perTextbook: coverage.perTextbook,
    details: coverage.details,
    extractorCandidateCount: extractionReport?.candidateCount ?? null
  };
}

function emptyCoverage() {
  return {
    errors: [],
    warnings: [],
    counters: {
      candidateCount: 0,
      reviewedCandidates: 0,
      includedCandidates: 0,
      excludedCandidates: 0,
      duplicateCandidates: 0,
      staleManifestCandidates: 0,
      duplicateReviewCandidates: 0,
      invalidDecisionCandidates: 0,
      exclusionsMissingReason: 0,
      duplicateIncludedEquations: 0,
      missingExplicitEquations: 0,
      unreviewedCandidates: 0,
      unaccountedCandidates: 0
    },
    details: {},
    perTextbook: []
  };
}

function printResult(result, mode) {
  console.log(`reactionExtractionValidationMode=${mode}`);
  console.log(`reactionExtractionValidationStatus=${result.status}`);
  for (const [name, value] of Object.entries(result.counters)) {
    console.log(`${name}=${value}`);
  }
  for (const warning of result.warnings) {
    console.warn(`WARNING ${warning}`);
  }
  for (const error of [...result.schemaErrors, ...result.coverageErrors]) {
    console.error(`ERROR ${error}`);
  }
  printSample('UNREVIEWED', result.details?.unreviewedCandidates);
  printSample('STALE', result.details?.staleManifestIds);
  printSample('MISSING_EXPLICIT_EQUATION', result.details?.includeWithoutUsableOutput);
}

function finish(result) {
  if (result.status !== 'pass') {
    process.exitCode = 1;
  }
}

async function maybeWriteReport(reportPath, result) {
  if (!reportPath) {
    return;
  }
  const absolutePath = path.resolve(projectRoot, reportPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read ${label} at ${relativeProjectPath(filePath)}: ${error.message}`);
  }
}

function perTextbookBucket(perTextbook, sourceFile) {
  const key = sourceFile || 'unknown';
  if (!perTextbook.has(key)) {
    perTextbook.set(key, { sourceFile: key, detected: 0, included: 0, excluded: 0, duplicate: 0 });
  }
  return perTextbook.get(key);
}

function requireValue(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function firstText(...values) {
  return values.find(hasText) ?? '';
}

function nonEmptyTextArray(value) {
  return Array.isArray(value) && value.some((item) => hasText(item));
}

function pushMapArray(map, key, value) {
  map.set(key, [...(map.get(key) ?? []), value]);
}

function unique(values) {
  return [...new Set(values)].sort(compareText);
}

function printSample(prefix, values) {
  for (const value of (values ?? []).slice(0, 20)) {
    console.error(`${prefix} ${value}`);
  }
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), 'zh-Hans-CN');
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}
