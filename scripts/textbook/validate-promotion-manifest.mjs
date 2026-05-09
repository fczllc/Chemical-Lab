import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { validatePromotionManifest } from '../../src/data/textbookIngestion/schemas/draftSchemas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const knownTextbookBatches = new Map([
  [
    'rj-chemistry-grade9-2024-vol1',
    buildTextbookPaths('rj-chemistry-grade9-2024-vol1')
  ],
  [
    'rj-chemistry-grade9-2024-vol2',
    buildTextbookPaths('rj-chemistry-grade9-2024-vol2')
  ],
  [
    'rj-chemistry-g12-selective-3-organic-2019',
    buildTextbookPaths('rj-chemistry-g12-selective-3-organic-2019')
  ],
  [
    'rj-chemistry-grade8-54-2024-full',
    buildTextbookPaths('rj-chemistry-grade8-54-2024-full')
  ]
]);

function buildTextbookPaths(volumeId) {
  return {
    batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', `${volumeId}.json`),
    promotionManifestPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'reviewed', volumeId, 'promotion-manifest.json'),
    generatedDraftRoot: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', volumeId)
  };
}

const knownFixtures = new Map([
  [
    'missing-reviewed-by',
    path.join(projectRoot, 'scripts', 'textbook', 'fixtures', 'missing-reviewed-by.json')
  ],
  [
    'chapter-wide-promotion',
    path.join(projectRoot, 'scripts', 'textbook', 'fixtures', 'chapter-wide-promotion.json')
  ],
  [
    'invalid-reviewed-semantics',
    path.join(projectRoot, 'scripts', 'textbook', 'fixtures', 'invalid-reviewed-semantics.json')
  ]
]);

const candidateFiles = [
  { fileName: 'knowledge-topics.json', candidateType: 'curriculumTopic', idField: 'topicId' },
  { fileName: 'experiment-candidates.json', candidateType: 'experimentCandidate', idField: 'candidateId' },
  { fileName: 'lab-candidates.json', candidateType: 'labCandidate', idField: 'candidateId' },
  { fileName: 'game-candidates.json', candidateType: 'gameChallengeCandidate', idField: 'candidateId' },
  { fileName: 'story-candidates.json', candidateType: 'storyCandidate', idField: 'candidateId' },
  { fileName: 'achievement-candidates.json', candidateType: 'achievementCandidate', idField: 'candidateId' },
  { fileName: 'quiz-candidates.json', candidateType: 'quizCandidate', idField: 'candidateId' },
  { fileName: 'learning-path-candidates.json', candidateType: 'learningPathCandidate', idField: 'candidateId' }
];

const sourceTraceabilityFields = [
  'sourceVolumeId',
  'sourcePath',
  'sourceHeading',
  'sourceLineStart',
  'sourceLineEnd',
  'sourceHash'
];

const supportedRuntimeAdapters = [
  {
    adapterKey: 'quiz',
    contentTypes: ['quiz'],
    candidateTypes: ['quizCandidate'],
    targetRuntimeFiles: ['src/data/quizData.json']
  },
  {
    adapterKey: 'contentMetadata',
    contentTypes: ['contentMetadata', 'gameChallenge'],
    candidateTypes: ['curriculumTopic', 'gameChallengeCandidate'],
    targetRuntimeFiles: ['src/data/contentMeta.js']
  },
  {
    adapterKey: 'achievement',
    contentTypes: ['achievement'],
    candidateTypes: ['achievementCandidate'],
    targetRuntimeFiles: ['src/data/achievementsData.json']
  },
  {
    adapterKey: 'learningPath',
    contentTypes: ['learningPath'],
    candidateTypes: ['learningPathCandidate'],
    targetRuntimeFiles: ['src/data/learningPath.json']
  },
  {
    adapterKey: 'reaction',
    contentTypes: ['reaction', 'labOrReaction'],
    candidateTypes: ['experimentCandidate', 'labCandidate'],
    targetRuntimeFiles: ['src/data/reactions.json']
  }
];

const runtimeAdapterByContentType = new Map(
  supportedRuntimeAdapters.flatMap((adapter) => adapter.contentTypes.map((contentType) => [contentType, adapter]))
);
const supportedRuntimeTargets = new Set(supportedRuntimeAdapters.flatMap((adapter) => adapter.targetRuntimeFiles));

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
      throw new Error(`Unknown promotion manifest fixture: ${options.fixture}`);
    }

    const defaultPaths = knownTextbookBatches.get('rj-chemistry-grade9-2024-vol1');
    const result = await validateFixture(fixturePath, options.fixture, defaultPaths.generatedDraftRoot);
    finishValidation(result);
    return;
  }

  if (options.allReviewed) {
    const result = await validateAllReviewedTextbooks();
    finishValidation(result);
    return;
  }

  if (!options.textbook) {
    throw new Error('--textbook is required unless --fixture or --all-reviewed is provided');
  }

  const paths = knownTextbookBatches.get(options.textbook);
  if (!paths) {
    throw new Error(`Unknown textbook batch: ${options.textbook}`);
  }

  const result = await validateTextbook(paths, options.textbook);
  finishValidation(result);
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      textbook: { type: 'string' },
      fixture: { type: 'string' },
      'all-reviewed': { type: 'boolean' }
    },
    strict: true
  });

  return {
    help: values.help === true,
    textbook: values.textbook ?? null,
    fixture: values.fixture ?? null,
    allReviewed: values['all-reviewed'] === true
  };
}

function printHelp() {
  console.log(`Reviewed promotion manifest validator / 已审核推广清单校验器

Usage:
  node scripts/textbook/validate-promotion-manifest.mjs --textbook <volumeId>
  node scripts/textbook/validate-promotion-manifest.mjs --all-reviewed
  node scripts/textbook/validate-promotion-manifest.mjs --fixture <fixtureName>

Options:
  --textbook <volumeId>                Validate reviewed promotion manifest for a known textbook.
  --all-reviewed                       Validate every known reviewed promotion manifest and cross-manifest IDs.
  --fixture <fixtureName>              Validate a promotion manifest fixture by stable fixture name.
  --help                              Show this help.`);
}

async function validateAllReviewedTextbooks() {
  const errors = [];
  const checked = [];
  const summaries = [];
  const runtimeIds = [];

  for (const [volumeId, paths] of knownTextbookBatches) {
    const result = await validateTextbook(paths, volumeId);
    errors.push(...result.errors);
    checked.push(...result.checked);
    summaries.push(...result.summaries);
    runtimeIds.push(...result.runtimeIds);
  }

  errors.push(...validateCrossManifestRuntimeIds(runtimeIds));

  return {
    errors,
    label: 'all-reviewed',
    checked: [...new Set(checked)],
    summaries
  };
}

async function validateTextbook(paths, expectedVolumeId) {
  const errors = [];
  const manifestPath = relativeProjectPath(paths.promotionManifestPath);
  const batch = await readJsonFile(paths.batchPath, 'batch contract', errors);
  const expectedSourceHash = batch?.sourceHash;
  const identity = { expectedVolumeId, expectedSourceHash };
  const promotionManifest = await readJsonFile(paths.promotionManifestPath, 'reviewed promotion manifest', errors);
  const candidateIndex = await loadCandidateIndex(paths.generatedDraftRoot, errors);

  errors.push(...withSource(validatePromotionManifest(promotionManifest, identity), manifestPath));
  const reviewedResult = validateReviewedPromotionManifest(promotionManifest, candidateIndex, manifestPath);
  errors.push(...reviewedResult.errors);

  return {
    errors,
    label: expectedVolumeId,
    checked: [
      manifestPath,
      relativeProjectPath(paths.generatedDraftRoot)
    ],
    summaries: [buildManifestSummary(manifestPath, promotionManifest)],
    runtimeIds: reviewedResult.runtimeIds
  };
}

async function validateFixture(fixturePath, fixtureName, generatedDraftRoot) {
  const errors = [];
  const fixturePathLabel = relativeProjectPath(fixturePath);
  const fixture = await readJsonFile(fixturePath, 'promotion manifest fixture', errors);
  const candidateIndex = await loadCandidateIndex(generatedDraftRoot, errors);

  if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) {
    errors.push(`${fixturePathLabel}: fixture top level must be an object`);
    return { errors, label: fixtureName, checked: [fixturePathLabel], summaries: [] };
  }

  if (fixture.kind !== 'promotionManifest') {
    errors.push(`${fixturePathLabel}: fixture kind must be promotionManifest: ${String(fixture.kind)}`);
    return { errors, label: fixtureName, checked: [fixturePathLabel], summaries: [] };
  }

  const manifest = fixture.data ?? null;
  errors.push(...withSource(validatePromotionManifest(manifest), fixturePathLabel));
  const reviewedResult = validateReviewedPromotionManifest(manifest, candidateIndex, fixturePathLabel);
  errors.push(...reviewedResult.errors);

  return {
    errors,
    label: fixtureName,
    checked: [fixturePathLabel],
    summaries: [buildManifestSummary(fixturePathLabel, manifest)],
    runtimeIds: reviewedResult.runtimeIds
  };
}

async function loadCandidateIndex(generatedDraftRoot, errors) {
  const candidateIndex = new Map();

  for (const candidateFile of candidateFiles) {
    const filePath = path.join(generatedDraftRoot, candidateFile.fileName);
    const items = await readJsonFile(filePath, candidateFile.fileName, errors);

    if (!Array.isArray(items)) {
      errors.push(`${candidateFile.fileName} must be an array`);
      continue;
    }

    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        continue;
      }

      const candidateId = item[candidateFile.idField];
      if (typeof candidateId === 'string' && candidateId.trim().length > 0) {
        candidateIndex.set(candidateId, {
          candidateType: candidateFile.candidateType,
          fileName: candidateFile.fileName,
          item
        });
      }
    }
  }

  return candidateIndex;
}

function validateReviewedPromotionManifest(manifest, candidateIndex, manifestPath) {
  const errors = [];
  const runtimeIds = [];
  const manifestRuntimeIds = new Map();

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) || !Array.isArray(manifest.entries)) {
    return { errors, runtimeIds };
  }

  if (manifest.entries.length === 0) {
    return { errors, runtimeIds };
  }

  for (const [index, entry] of manifest.entries.entries()) {
    const entryPath = `entries[${index}]`;
    const context = entryContext(manifestPath, entryPath, entry);

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${manifestPath}#${entryPath}: entry must be an object; empty scaffold manifests must use entries: []`);
      continue;
    }

    const candidate = validateCandidateReference(entry, context, candidateIndex, errors);
    validateStableEntryIds(entry, context, errors);
    validateTopicScope(entry, context, errors);
    validateReviewedMetadata(entry, context, errors);
    validateSourceTraceability(entry, context, candidate, errors);
    validateTargetRuntimeFiles(entry, context, errors);
    validateAdapterCompatibility(entry, context, errors);
    validateRuntimeIdentityUniqueness(entry, context, manifestRuntimeIds, runtimeIds, errors);
    validateSurfaceRequirements(entry, context, candidateIndex, errors);
  }

  return { errors, runtimeIds };
}

function validateTopicScope(entry, context, errors) {
  if (entry.promoteScope !== 'topic' || !hasRequiredText(entry.curriculumTagId)) {
    errors.push(`${context}: promotion entries must target promoteScope topic with curriculumTagId`);
  }

  if (!hasRequiredText(entry.topicId)) {
    errors.push(`${context}: topicId must be a non-empty string`);
  }
}

function validateReviewedMetadata(entry, context, errors) {
  if (entry.reviewStatus !== 'reviewed' && entry.reviewStatus !== 'promoted') {
    errors.push(`${context}: reviewStatus must be reviewed or promoted`);
  }

  if (!hasRequiredText(entry.reviewedBy)) {
    errors.push(`${context}: reviewedBy must be a non-empty string`);
  }

  if (!hasRequiredText(entry.reviewedAt)) {
    errors.push(`${context}: reviewedAt must be a non-empty string`);
  }
}

function validateCandidateReference(entry, context, candidateIndex, errors) {
  if (!hasRequiredText(entry.candidateId)) {
    errors.push(`${context}: candidateId must be a non-empty stable source candidate id`);
    return null;
  }

  const candidate = candidateIndex.get(entry.candidateId);
  if (!candidate) {
    errors.push(`${context}: candidateId must reference generated draft candidate: ${entry.candidateId}`);
    return null;
  }

  if (hasRequiredText(entry.candidateType) && candidate.candidateType !== entry.candidateType) {
    errors.push(`${context}: candidateType must match generated candidate type ${candidate.candidateType} for ${entry.candidateId}`);
  }

  return candidate;
}

function validateStableEntryIds(entry, context, errors) {
  validateStableMachineId(entry.entryId, 'entryId', context, errors);
  validateStableMachineId(entry.candidateId, 'candidateId', context, errors);
  validateStableMachineId(entry.topicId, 'topicId', context, errors);
  validateStableMachineId(entry.curriculumTagId, 'curriculumTagId', context, errors);

  if ('runtimeId' in entry) {
    validateStableMachineId(entry.runtimeId, 'runtimeId', context, errors);
  }
}

function validateSourceTraceability(entry, context, candidate, errors) {
  for (const field of sourceTraceabilityFields) {
    if (!hasTraceValue(entry[field])) {
      errors.push(`${context}: missing sourceTrace.${field}`);
    }
  }

  if (!candidate) {
    return;
  }

  for (const field of sourceTraceabilityFields) {
    const candidateValue = candidate.item[field];
    if (candidateValue === undefined || entry[field] === undefined) {
      continue;
    }

    if (entry[field] !== candidateValue) {
      errors.push(`${context}: sourceTrace.${field} must match generated candidate ${entry.candidateId}; expected ${String(candidateValue)}, actual ${String(entry[field])}`);
    }
  }
}

function validateTargetRuntimeFiles(entry, context, errors) {
  validateExplicitRuntimePath(entry.targetRuntimeFile, 'targetRuntimeFile', context, errors);

  if (!Array.isArray(entry.targetRuntimeFiles) || entry.targetRuntimeFiles.length === 0) {
    errors.push(`${context}: targetRuntimeFiles must be a non-empty array`);
    return;
  }

  for (const [targetIndex, targetRuntimeFile] of entry.targetRuntimeFiles.entries()) {
    validateExplicitRuntimePath(targetRuntimeFile, `targetRuntimeFiles[${targetIndex}]`, context, errors);
  }

  if (hasRequiredText(entry.targetRuntimeFile) && !entry.targetRuntimeFiles.includes(entry.targetRuntimeFile)) {
    errors.push(`${context}: targetRuntimeFiles must include targetRuntimeFile ${entry.targetRuntimeFile}`);
  }
}

function validateAdapterCompatibility(entry, context, errors) {
  const contentType = entryContentType(entry);
  if (!hasRequiredText(contentType)) {
    errors.push(`${context}: surface or contentType must identify a supported content type`);
    return;
  }

  if (hasRequiredText(entry.surface) && hasRequiredText(entry.contentType) && entry.surface !== entry.contentType) {
    errors.push(`${context}: contentType must match surface when both are provided`);
  }

  const adapter = runtimeAdapterByContentType.get(contentType);
  if (!adapter) {
    errors.push(`${context}: unsupported destination adapter/content type ${contentType}; supported content types: ${supportedContentTypes().join(', ')}`);
    return;
  }

  if (!adapter.candidateTypes.includes(entry.candidateType)) {
    errors.push(`${context}: adapter ${adapter.adapterKey} does not support candidateType ${String(entry.candidateType)}; expected one of: ${adapter.candidateTypes.join(', ')}`);
  }

  const targetRuntimeFiles = Array.isArray(entry.targetRuntimeFiles) ? entry.targetRuntimeFiles : [];
  for (const targetRuntimeFile of [entry.targetRuntimeFile, ...targetRuntimeFiles]) {
    if (!hasRequiredText(targetRuntimeFile)) {
      continue;
    }

    if (!supportedRuntimeTargets.has(targetRuntimeFile)) {
      errors.push(`${context}: unsupported destination runtime target ${targetRuntimeFile}; supported targets: ${[...supportedRuntimeTargets].join(', ')}`);
      continue;
    }

    if (!adapter.targetRuntimeFiles.includes(targetRuntimeFile)) {
      errors.push(`${context}: adapter ${adapter.adapterKey} cannot write ${targetRuntimeFile}; expected target: ${adapter.targetRuntimeFiles.join(', ')}`);
    }
  }
}

function validateRuntimeIdentityUniqueness(entry, context, manifestRuntimeIds, runtimeIds, errors) {
  const runtimeId = runtimeIdentityForEntry(entry);
  if (!hasRequiredText(runtimeId)) {
    return;
  }

  const previousContext = manifestRuntimeIds.get(runtimeId);
  if (previousContext) {
    errors.push(`${context}: duplicate runtimeId ${runtimeId} also used by ${previousContext}`);
    return;
  }

  manifestRuntimeIds.set(runtimeId, context);
  runtimeIds.push({ runtimeId, context });
}

const explicitSurfacePolicyStatuses = new Set(['covered', 'deferred', 'notApplicable']);

function validateSurfaceRequirements(entry, context, candidateIndex, errors) {
  if (!Array.isArray(entry.surfaceRequirements) || entry.surfaceRequirements.length === 0) {
    errors.push(`${context}: surfaceRequirements must be a non-empty array`);
    return;
  }

  for (const [requirementIndex, requirement] of entry.surfaceRequirements.entries()) {
    const requirementPath = `${context}.surfaceRequirements[${requirementIndex}]`;

    if (!requirement || typeof requirement !== 'object' || Array.isArray(requirement)) {
      errors.push(`${requirementPath}: must be an object`);
      continue;
    }

    if (!hasRequiredText(requirement.surface)) {
      errors.push(`${requirementPath}: surface must be a non-empty string`);
    }

    if (!hasRequiredText(requirement.requirement)) {
      errors.push(`${requirementPath}: requirement must be a non-empty string`);
    }

    const policyStatus = explicitSurfacePolicyStatuses.has(requirement.status) ? requirement.status : 'covered';
    if (requirement.status !== undefined && !explicitSurfacePolicyStatuses.has(requirement.status)) {
      errors.push(`${requirementPath}: status must be covered, deferred, or notApplicable`);
    }

    if (policyStatus === 'deferred' || policyStatus === 'notApplicable') {
      if (!hasRequiredText(requirement.reason) && !hasRequiredText(requirement.rationale)) {
        errors.push(`${requirementPath}: reason must explain ${policyStatus} surface policy`);
      }
    } else {
      if (!Array.isArray(requirement.candidateIds) || requirement.candidateIds.length === 0) {
        errors.push(`${requirementPath}: candidateIds must be a non-empty array`);
      } else if (hasRequiredText(entry.candidateId) && !requirement.candidateIds.includes(entry.candidateId)) {
        errors.push(`${requirementPath}: candidateIds must include entry candidateId ${entry.candidateId}`);
      }

      if (!Array.isArray(requirement.targetRuntimeFiles) || requirement.targetRuntimeFiles.length === 0) {
        errors.push(`${requirementPath}: targetRuntimeFiles must be a non-empty array`);
      }
    }

    if (Array.isArray(requirement.candidateIds)) {
      for (const [candidateIndexInRequirement, candidateId] of requirement.candidateIds.entries()) {
        if (!hasRequiredText(candidateId)) {
          errors.push(`${requirementPath}: candidateIds[${candidateIndexInRequirement}] must be a non-empty string`);
        } else if (!candidateIndex.has(candidateId)) {
          errors.push(`${requirementPath}: candidateIds[${candidateIndexInRequirement}] must reference generated draft candidate: ${candidateId}`);
        }
      }
    }

    if (Array.isArray(requirement.targetRuntimeFiles)) {
      for (const [targetIndex, targetRuntimeFile] of requirement.targetRuntimeFiles.entries()) {
        validateExplicitRuntimePath(targetRuntimeFile, `targetRuntimeFiles[${targetIndex}]`, requirementPath, errors);
      }
    }
  }
}

function validateCrossManifestRuntimeIds(runtimeIds) {
  const errors = [];
  const seenRuntimeIds = new Map();

  for (const { runtimeId, context } of runtimeIds) {
    const previousContext = seenRuntimeIds.get(runtimeId);
    if (previousContext) {
      errors.push(`${context}: duplicate runtimeId ${runtimeId} across reviewed manifests; first seen at ${previousContext}`);
      continue;
    }

    seenRuntimeIds.set(runtimeId, context);
  }

  return errors;
}

function validateExplicitRuntimePath(value, fieldName, context, errors) {
  if (!hasRequiredText(value)) {
    errors.push(`${context}: ${fieldName} must be a non-empty string`);
    return;
  }

  if (value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || value.includes('..')) {
    errors.push(`${context}: ${fieldName} must be a project-relative path without ..: ${value}`);
  }

  if (!value.startsWith('src/data/')) {
    errors.push(`${context}: ${fieldName} must target src/data runtime files: ${value}`);
  }

  if (value.includes('*')) {
    errors.push(`${context}: ${fieldName} must be an explicit runtime file path, not a wildcard: ${value}`);
  }

  if (!/\.[A-Za-z0-9]+$/.test(value)) {
    errors.push(`${context}: ${fieldName} must be an explicit runtime file path: ${value}`);
  }
}

async function readJsonFile(filePath, label, errors) {
  try {
    const source = await readFile(filePath, 'utf8');
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${label} cannot be read or parsed at ${relativeProjectPath(filePath)}: ${error.message}`);
    return null;
  }
}

function finishValidation(result) {
  if (result.errors.length > 0) {
    console.error(`Promotion manifest validation failed: ${result.label}`);
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Promotion manifest valid: ${result.label}`);
  if (Array.isArray(result.summaries)) {
    for (const summary of result.summaries) {
      console.log(`${summary.status}: ${summary.path} entries=${summary.entryCount}`);
    }
  }
  for (const checkedPath of result.checked) {
    console.log(`checked: ${checkedPath}`);
  }
}

function buildManifestSummary(manifestPath, manifest) {
  const entryCount = Array.isArray(manifest?.entries) ? manifest.entries.length : 0;
  return {
    path: manifestPath,
    entryCount,
    status: entryCount === 0 ? 'empty scaffold' : 'reviewed non-empty'
  };
}

function withSource(errors, sourcePath) {
  return errors.map((error) => `${sourcePath}: ${error}`);
}

function entryContext(manifestPath, entryPath, entry) {
  const entryId = entry && typeof entry === 'object' && hasRequiredText(entry.entryId)
    ? entry.entryId
    : '<missing-entryId>';
  return `${manifestPath}#${entryPath} (${entryId})`;
}

function runtimeIdentityForEntry(entry) {
  if (hasRequiredText(entry.runtimeId)) {
    return entry.runtimeId;
  }

  return entry.entryId;
}

function entryContentType(entry) {
  if (hasRequiredText(entry.contentType)) {
    return entry.contentType;
  }

  return entry.surface;
}

function supportedContentTypes() {
  return [...runtimeAdapterByContentType.keys()].sort();
}

function validateStableMachineId(value, fieldName, context, errors) {
  if (!hasRequiredText(value)) {
    errors.push(`${context}: ${fieldName} must be a non-empty stable machine id`);
    return;
  }

  if (value !== value.trim()) {
    errors.push(`${context}: ${fieldName} cannot contain leading or trailing whitespace`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    errors.push(`${context}: ${fieldName} must be a stable kebab-case machine id: ${value}`);
  }
}

function hasTraceValue(value) {
  return hasRequiredText(value) || Number.isInteger(value);
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

function hasRequiredText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
