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

  if (!options.textbook) {
    throw new Error('--textbook is required unless --fixture is provided');
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
      fixture: { type: 'string' }
    },
    strict: true
  });

  return {
    help: values.help === true,
    textbook: values.textbook ?? null,
    fixture: values.fixture ?? null
  };
}

function printHelp() {
  console.log(`Reviewed promotion manifest validator / 已审核推广清单校验器

Usage:
  node scripts/textbook/validate-promotion-manifest.mjs --textbook <volumeId>
  node scripts/textbook/validate-promotion-manifest.mjs --fixture <fixtureName>

Options:
  --textbook <volumeId>                Validate reviewed promotion manifest for a known textbook.
  --fixture <fixtureName>              Validate a promotion manifest fixture by stable fixture name.
  --help                              Show this help.`);
}

async function validateTextbook(paths, expectedVolumeId) {
  const errors = [];
  const batch = await readJsonFile(paths.batchPath, 'batch contract', errors);
  const expectedSourceHash = batch?.sourceHash;
  const identity = { expectedVolumeId, expectedSourceHash };
  const promotionManifest = await readJsonFile(paths.promotionManifestPath, 'reviewed promotion manifest', errors);
  const candidateIndex = await loadCandidateIndex(paths.generatedDraftRoot, errors);

  errors.push(...validatePromotionManifest(promotionManifest, identity));
  errors.push(...validateReviewedPromotionManifest(promotionManifest, candidateIndex));

  return {
    errors,
    label: expectedVolumeId,
    checked: [
      relativeProjectPath(paths.promotionManifestPath),
      relativeProjectPath(paths.generatedDraftRoot)
    ]
  };
}

async function validateFixture(fixturePath, fixtureName, generatedDraftRoot) {
  const errors = [];
  const fixture = await readJsonFile(fixturePath, 'promotion manifest fixture', errors);
  const candidateIndex = await loadCandidateIndex(generatedDraftRoot, errors);

  if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) {
    errors.push('fixture top level must be an object');
    return { errors, label: fixtureName, checked: [relativeProjectPath(fixturePath)] };
  }

  if (fixture.kind !== 'promotionManifest') {
    errors.push(`fixture kind must be promotionManifest: ${String(fixture.kind)}`);
    return { errors, label: fixtureName, checked: [relativeProjectPath(fixturePath)] };
  }

  const manifest = fixture.data ?? null;
  errors.push(...validatePromotionManifest(manifest));
  errors.push(...validateReviewedPromotionManifest(manifest, candidateIndex));

  return { errors, label: fixtureName, checked: [relativeProjectPath(fixturePath)] };
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
          fileName: candidateFile.fileName
        });
      }
    }
  }

  return candidateIndex;
}

function validateReviewedPromotionManifest(manifest, candidateIndex) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) || !Array.isArray(manifest.entries)) {
    return errors;
  }

  if (manifest.entries.length === 0) {
    errors.push('entries must include at least one reviewed topic promotion');
  }

  for (const [index, entry] of manifest.entries.entries()) {
    const entryPath = `entries[${index}]`;

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    validateTopicScope(entry, entryPath, errors);
    validateReviewedMetadata(entry, entryPath, errors);
    validateCandidateReference(entry, entryPath, candidateIndex, errors);
    validateTargetRuntimeFiles(entry, entryPath, errors);
    validateSurfaceRequirements(entry, entryPath, candidateIndex, errors);
  }

  return errors;
}

function validateTopicScope(entry, entryPath, errors) {
  if (entry.promoteScope !== 'topic' || !hasRequiredText(entry.curriculumTagId)) {
    errors.push('Promotion must target curriculumTagId');
  }

  if (!hasRequiredText(entry.topicId)) {
    errors.push(`${entryPath}.topicId must be a non-empty string`);
  }
}

function validateReviewedMetadata(entry, entryPath, errors) {
  if (entry.reviewStatus !== 'reviewed' && entry.reviewStatus !== 'promoted') {
    errors.push(`${entryPath}.reviewStatus must be reviewed or promoted`);
  }

  if (!hasRequiredText(entry.reviewedBy)) {
    errors.push(`${entryPath}.reviewedBy must be a non-empty string`);
  }

  if (!hasRequiredText(entry.reviewedAt)) {
    errors.push(`${entryPath}.reviewedAt must be a non-empty string`);
  }
}

function validateCandidateReference(entry, entryPath, candidateIndex, errors) {
  if (!hasRequiredText(entry.candidateId)) {
    return;
  }

  const candidate = candidateIndex.get(entry.candidateId);
  if (!candidate) {
    errors.push(`${entryPath}.candidateId must reference generated draft candidate: ${entry.candidateId}`);
    return;
  }

  if (hasRequiredText(entry.candidateType) && candidate.candidateType !== entry.candidateType) {
    errors.push(`${entryPath}.candidateType must match generated candidate type ${candidate.candidateType} for ${entry.candidateId}`);
  }
}

function validateTargetRuntimeFiles(entry, entryPath, errors) {
  validateExplicitRuntimePath(entry.targetRuntimeFile, `${entryPath}.targetRuntimeFile`, errors);

  if (!Array.isArray(entry.targetRuntimeFiles) || entry.targetRuntimeFiles.length === 0) {
    errors.push(`${entryPath}.targetRuntimeFiles must be a non-empty array`);
    return;
  }

  for (const [targetIndex, targetRuntimeFile] of entry.targetRuntimeFiles.entries()) {
    validateExplicitRuntimePath(targetRuntimeFile, `${entryPath}.targetRuntimeFiles[${targetIndex}]`, errors);
  }

  if (hasRequiredText(entry.targetRuntimeFile) && !entry.targetRuntimeFiles.includes(entry.targetRuntimeFile)) {
    errors.push(`${entryPath}.targetRuntimeFiles must include targetRuntimeFile`);
  }
}

const explicitSurfacePolicyStatuses = new Set(['covered', 'deferred', 'notApplicable']);

function validateSurfaceRequirements(entry, entryPath, candidateIndex, errors) {
  if (!Array.isArray(entry.surfaceRequirements) || entry.surfaceRequirements.length === 0) {
    errors.push(`${entryPath}.surfaceRequirements must be a non-empty array`);
    return;
  }

  for (const [requirementIndex, requirement] of entry.surfaceRequirements.entries()) {
    const requirementPath = `${entryPath}.surfaceRequirements[${requirementIndex}]`;

    if (!requirement || typeof requirement !== 'object' || Array.isArray(requirement)) {
      errors.push(`${requirementPath} must be an object`);
      continue;
    }

    if (!hasRequiredText(requirement.surface)) {
      errors.push(`${requirementPath}.surface must be a non-empty string`);
    }

    if (!hasRequiredText(requirement.requirement)) {
      errors.push(`${requirementPath}.requirement must be a non-empty string`);
    }

    const policyStatus = explicitSurfacePolicyStatuses.has(requirement.status) ? requirement.status : 'covered';
    if (requirement.status !== undefined && !explicitSurfacePolicyStatuses.has(requirement.status)) {
      errors.push(`${requirementPath}.status must be covered, deferred, or notApplicable`);
    }

    if (policyStatus === 'deferred' || policyStatus === 'notApplicable') {
      if (!hasRequiredText(requirement.reason) && !hasRequiredText(requirement.rationale)) {
        errors.push(`${requirementPath}.reason must explain ${policyStatus} surface policy`);
      }
    } else {
      if (!Array.isArray(requirement.candidateIds) || requirement.candidateIds.length === 0) {
        errors.push(`${requirementPath}.candidateIds must be a non-empty array`);
      } else if (hasRequiredText(entry.candidateId) && !requirement.candidateIds.includes(entry.candidateId)) {
        errors.push(`${requirementPath}.candidateIds must include entry candidateId`);
      }

      if (!Array.isArray(requirement.targetRuntimeFiles) || requirement.targetRuntimeFiles.length === 0) {
        errors.push(`${requirementPath}.targetRuntimeFiles must be a non-empty array`);
      }
    }

    if (Array.isArray(requirement.candidateIds)) {
      for (const [candidateIndexInRequirement, candidateId] of requirement.candidateIds.entries()) {
        if (!hasRequiredText(candidateId)) {
          errors.push(`${requirementPath}.candidateIds[${candidateIndexInRequirement}] must be a non-empty string`);
        } else if (!candidateIndex.has(candidateId)) {
          errors.push(`${requirementPath}.candidateIds[${candidateIndexInRequirement}] must reference generated draft candidate: ${candidateId}`);
        }
      }
    }

    if (Array.isArray(requirement.targetRuntimeFiles)) {
      for (const [targetIndex, targetRuntimeFile] of requirement.targetRuntimeFiles.entries()) {
        validateExplicitRuntimePath(targetRuntimeFile, `${requirementPath}.targetRuntimeFiles[${targetIndex}]`, errors);
      }
    }
  }
}

function validateExplicitRuntimePath(value, pathLabel, errors) {
  if (!hasRequiredText(value)) {
    errors.push(`${pathLabel} must be a non-empty string`);
    return;
  }

  if (value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || value.includes('..')) {
    errors.push(`${pathLabel} must be a project-relative path without ..: ${value}`);
  }

  if (!value.startsWith('src/data/')) {
    errors.push(`${pathLabel} must target src/data runtime files: ${value}`);
  }

  if (value.includes('*')) {
    errors.push(`${pathLabel} must be an explicit runtime file path, not a wildcard: ${value}`);
  }

  if (!/\.[A-Za-z0-9]+$/.test(value)) {
    errors.push(`${pathLabel} must be an explicit runtime file path: ${value}`);
  }
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
    console.error('Promotion manifest validation failed:');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Promotion manifest valid: ${result.label}`);
  for (const checkedPath of result.checked) {
    console.log(`checked: ${checkedPath}`);
  }
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

function hasRequiredText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
