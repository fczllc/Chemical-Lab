import { mkdir, readFile, writeFile } from 'node:fs/promises';
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

const columnRequirements = {
  sourceEvidence: 'required',
  assets: 'optional',
  quiz: 'required',
  learningPath: 'required',
  labOrReaction: 'required',
  experimentBacklog: 'optional',
  story: 'required',
  achievement: 'required',
  gameChallenge: 'required',
  runtimeStatus: 'required',
  reviewStatus: 'required',
  notes: 'optional'
};

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
    reviewedManifestPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'reviewed', volumeId, 'promotion-manifest.json'),
    generatedRoot: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', volumeId),
    coveragePath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', volumeId, 'coverage-matrix.json')
  };
}

const candidateFiles = [
  { fileName: 'knowledge-topics.json', column: 'sourceEvidence', idField: 'topicId' },
  { fileName: 'learning-path-candidates.json', column: 'learningPath', idField: 'candidateId' },
  { fileName: 'quiz-candidates.json', column: 'quiz', idField: 'candidateId' },
  { fileName: 'lab-candidates.json', column: 'labOrReaction', idField: 'candidateId' },
  { fileName: 'experiment-candidates.json', column: 'labOrReaction', idField: 'candidateId' },
  { fileName: 'story-candidates.json', column: 'story', idField: 'candidateId' },
  { fileName: 'achievement-candidates.json', column: 'achievement', idField: 'candidateId' },
  { fileName: 'game-candidates.json', column: 'gameChallenge', idField: 'candidateId' }
];

const manifestSurfaceColumns = new Map([
  ['quiz', 'quiz'],
  ['learningPath', 'learningPath'],
  ['lab', 'labOrReaction'],
  ['reaction', 'labOrReaction'],
  ['experiment', 'labOrReaction'],
  ['labOrReaction', 'labOrReaction'],
  ['story', 'story'],
  ['achievement', 'achievement'],
  ['game', 'gameChallenge'],
  ['gameChallenge', 'gameChallenge']
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

  if (!options.textbook) {
    throw new Error('--textbook is required');
  }

  const paths = knownTextbookBatches.get(options.textbook);
  if (!paths) {
    throw new Error(`Unknown textbook batch: ${options.textbook}`);
  }

  const manifest = await readJsonFile(paths.reviewedManifestPath, 'reviewed promotion manifest');
  const generatedContext = await loadGeneratedContext(paths.generatedRoot);
  const matrix = buildCoverageMatrix(options.textbook, manifest, generatedContext);

  await mkdir(path.dirname(paths.coveragePath), { recursive: true });
  await writeFile(paths.coveragePath, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');

  console.log(`Textbook coverage matrix generated: ${options.textbook}`);
  console.log(`wrote: ${relativeProjectPath(paths.coveragePath)}`);
  console.log(`rows: ${matrix.rows.length}`);
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
  console.log(`Textbook coverage generator / 教材覆盖矩阵生成器

Usage:
  node scripts/textbook/generate-coverage.mjs --textbook <volumeId>

Options:
  --textbook <volumeId>                Generate reviewed-topic coverage for a known textbook.
  --help                               Show this help.`);
}

async function loadGeneratedContext(generatedRoot) {
  const candidates = [];

  for (const candidateFile of candidateFiles) {
    const filePath = path.join(generatedRoot, candidateFile.fileName);
    const items = await readJsonFile(filePath, candidateFile.fileName);
    if (!Array.isArray(items)) {
      throw new Error(`${candidateFile.fileName} must be an array`);
    }

    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        continue;
      }

      const id = item[candidateFile.idField];
      if (typeof id !== 'string' || id.trim().length === 0) {
        continue;
      }

      candidates.push({
        id,
        column: candidateFile.column,
        fileName: candidateFile.fileName,
        item
      });
    }
  }

  const sourceInventory = await readJsonFile(path.join(generatedRoot, 'source-inventory.json'), 'source inventory');
  const sourceSections = Array.isArray(sourceInventory?.sections)
    ? sourceInventory.sections
    : Array.isArray(sourceInventory?.sourceSections)
      ? sourceInventory.sourceSections
      : [];

  return { candidates, sourceSections };
}

function buildCoverageMatrix(volumeId, manifest, generatedContext) {
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.entries)) {
    throw new Error('reviewed promotion manifest must include entries');
  }

  const reviewedGroups = groupReviewedEntries(manifest.entries);
  const rows = [...reviewedGroups.entries()]
    .sort(([leftTag], [rightTag]) => leftTag.localeCompare(rightTag))
    .map(([curriculumTagId, entries]) => buildCoverageRow(curriculumTagId, entries, generatedContext));

  return {
    schemaVersion: 1,
    volumeId,
    generatedFrom: relativeProjectPath(knownTextbookBatches.get(volumeId).reviewedManifestPath),
    rowKey: 'curriculumTagId',
    columns: coverageColumns,
    statusValues,
    rows
  };
}

function groupReviewedEntries(entries) {
  const groups = new Map();

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    if (entry.reviewStatus !== 'reviewed' && entry.reviewStatus !== 'promoted') {
      continue;
    }

    if (typeof entry.curriculumTagId !== 'string' || entry.curriculumTagId.trim().length === 0) {
      continue;
    }

    const group = groups.get(entry.curriculumTagId) ?? [];
    group.push(entry);
    groups.set(entry.curriculumTagId, group);
  }

  return groups;
}

function buildCoverageRow(curriculumTagId, entries, generatedContext) {
  const sortedEntries = [...entries].sort((left, right) => String(left.entryId).localeCompare(String(right.entryId)));
  const matchingCandidates = findMatchingCandidates(sortedEntries, generatedContext.candidates);
  const sourceSections = findMatchingSourceSections(sortedEntries, generatedContext.sourceSections);
  const surfacePolicies = collectSurfacePolicies(sortedEntries);
  const generatedByColumn = groupCandidatesByColumn(matchingCandidates);
  const candidateIds = new Set(matchingCandidates.map((candidate) => candidate.id));
  const manifestCandidateIds = new Set(sortedEntries.map((entry) => entry.candidateId).filter(hasText));
  const allAssets = collectAssets([...matchingCandidates.map((candidate) => candidate.item), ...sourceSections]);
  const reviewStatuses = [...new Set(sortedEntries.map((entry) => entry.reviewStatus))].sort();
  const runtimeTargets = [...new Set(sortedEntries.flatMap((entry) => normalizeArray(entry.targetRuntimeFiles)))].sort();

  return {
    curriculumTagId,
    sourceEvidence: buildSourceEvidenceCell(sortedEntries, sourceSections, generatedByColumn),
    assets: buildAssetsCell(allAssets),
    quiz: buildSurfaceCell('quiz', surfacePolicies, generatedByColumn, manifestCandidateIds, candidateIds),
    learningPath: buildSurfaceCell('learningPath', surfacePolicies, generatedByColumn, manifestCandidateIds, candidateIds),
    labOrReaction: buildSurfaceCell('labOrReaction', surfacePolicies, generatedByColumn, manifestCandidateIds, candidateIds),
    experimentBacklog: buildExperimentBacklogCell(matchingCandidates),
    story: buildSurfaceCell('story', surfacePolicies, generatedByColumn, manifestCandidateIds, candidateIds),
    achievement: buildSurfaceCell('achievement', surfacePolicies, generatedByColumn, manifestCandidateIds, candidateIds),
    gameChallenge: buildSurfaceCell('gameChallenge', surfacePolicies, generatedByColumn, manifestCandidateIds, candidateIds),
    runtimeStatus: buildRuntimeStatusCell(sortedEntries, runtimeTargets),
    reviewStatus: buildReviewStatusCell(reviewStatuses, sortedEntries),
    notes: buildNotesCell(sortedEntries, runtimeTargets, matchingCandidates)
  };
}

function findMatchingCandidates(entries, candidates) {
  const candidateIds = new Set(entries.flatMap((entry) => [entry.candidateId, ...collectRequirementCandidateIds(entry)]).filter(hasText));
  const sourceKeys = collectSourceKeys(entries);

  return candidates
    .filter((candidate) => candidateIds.has(candidate.id) || sourceKeysIntersect(sourceKeys, sourceKeysFor(candidate.item)))
    .sort((left, right) => left.fileName.localeCompare(right.fileName) || left.id.localeCompare(right.id));
}

function findMatchingSourceSections(entries, sourceSections) {
  const sourceKeys = collectSourceKeys(entries);
  return sourceSections
    .filter((section) => sourceKeysIntersect(sourceKeys, sourceKeysFor(section)))
    .sort((left, right) => stableSourceKey(left).localeCompare(stableSourceKey(right)));
}

function collectSourceKeys(values) {
  const sourceKeys = new Set();

  for (const value of values) {
    for (const key of sourceKeysFor(value)) {
      sourceKeys.add(key);
    }
  }

  return sourceKeys;
}

function sourceKeysIntersect(leftKeys, rightKeys) {
  return rightKeys.some((key) => leftKeys.has(key));
}

function stableSourceKey(value) {
  return sourceKeysFor(value)[0] ?? '';
}

function sourceKeysFor(value) {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const keys = [];

  if (hasText(value.sourceSectionId)) {
    keys.push(value.sourceSectionId);
  }

  if (Number.isInteger(value.sourceLineStart) && Number.isInteger(value.sourceLineEnd) && hasText(value.sourceHash)) {
    keys.push(`${value.sourceHash}:${value.sourceLineStart}:${value.sourceLineEnd}`);
  }

  return keys;
}

function collectSurfacePolicies(entries) {
  const policies = new Map();

  for (const entry of entries) {
    addSurfacePolicy(policies, entry.surface, {
      status: 'covered',
      candidateIds: [entry.candidateId].filter(hasText),
      targetRuntimeFiles: normalizeArray(entry.targetRuntimeFiles),
      entryId: entry.entryId
    });

    for (const requirement of normalizeArray(entry.surfaceRequirements)) {
      if (!requirement || typeof requirement !== 'object') {
        continue;
      }

      addSurfacePolicy(policies, requirement.surface, {
        status: normalizeSurfacePolicyStatus(requirement.status),
        candidateIds: normalizeArray(requirement.candidateIds).filter(hasText),
        targetRuntimeFiles: normalizeArray(requirement.targetRuntimeFiles),
        entryId: entry.entryId,
        reason: requirement.reason ?? requirement.rationale ?? ''
      });
    }
  }

  return policies;
}

function addSurfacePolicy(policies, surface, policy) {
  const column = manifestSurfaceColumns.get(surface);
  if (!column) {
    return;
  }

  const columnPolicies = policies.get(column) ?? [];
  columnPolicies.push(policy);
  policies.set(column, columnPolicies);
}

function normalizeSurfacePolicyStatus(status) {
  return ['covered', 'deferred', 'notApplicable'].includes(status) ? status : 'covered';
}

function groupCandidatesByColumn(candidates) {
  const groups = new Map();

  for (const candidate of candidates) {
    const group = groups.get(candidate.column) ?? [];
    group.push(candidate);
    groups.set(candidate.column, group);
  }

  return groups;
}

function buildSourceEvidenceCell(entries, sourceSections, generatedByColumn) {
  const hasManifestEvidence = entries.every((entry) => hasText(entry.sourcePath) && Number.isInteger(entry.sourceLineStart) && Number.isInteger(entry.sourceLineEnd) && hasText(entry.sourceHash));
  const generatedTopics = generatedByColumn.get('sourceEvidence') ?? [];
  const references = [...new Set([
    ...entries.map((entry) => formatSourceReference(entry)),
    ...sourceSections.map((section) => formatSourceReference(section)),
    ...generatedTopics.map((candidate) => `${candidate.fileName}:${candidate.id}`)
  ].filter(hasText))].sort();

  return cell('required', hasManifestEvidence && references.length > 0 ? 'covered' : 'missing', {
    references
  });
}

function buildAssetsCell(assets) {
  if (assets.length === 0) {
    return cell('optional', 'notApplicable', {
      reason: 'No local textbook assets are attached to this reviewed topic source section.'
    });
  }

  return cell('optional', 'covered', {
    assetCount: assets.length,
    assetIds: assets.map((asset) => asset.assetId).filter(hasText).sort()
  });
}

function buildSurfaceCell(column, surfacePolicies, generatedByColumn, manifestCandidateIds, allCandidateIds) {
  const generatedCandidates = generatedByColumn.get(column) ?? [];
  const candidateIds = generatedCandidates.map((candidate) => candidate.id).sort();
  const policies = surfacePolicies.get(column) ?? [];
  const policyCandidateIds = new Set(policies.flatMap((policy) => normalizeArray(policy.candidateIds)).filter(hasText));
  const approvedCandidateIds = candidateIds.filter((candidateId) => manifestCandidateIds.has(candidateId) || policyCandidateIds.has(candidateId));
  const policyEntryIds = [...new Set(policies.map((policy) => policy.entryId).filter(hasText))].sort();
  const deferredPolicy = policies.find((policy) => policy.status === 'deferred');
  const notApplicablePolicy = policies.find((policy) => policy.status === 'notApplicable');
  const coveredPolicy = policies.find((policy) => policy.status === 'covered');

  if (notApplicablePolicy) {
    return cell('notApplicable', 'notApplicable', {
      candidateIds,
      manifestCandidateIds: approvedCandidateIds,
      generatedCandidateCount: candidateIds.filter((candidateId) => allCandidateIds.has(candidateId)).length,
      coveragePolicyEntryIds: policyEntryIds,
      reason: notApplicablePolicy.reason
    });
  }

  if (deferredPolicy) {
    return cell(columnRequirements[column], 'deferred', {
      candidateIds,
      manifestCandidateIds: approvedCandidateIds,
      generatedCandidateCount: candidateIds.filter((candidateId) => allCandidateIds.has(candidateId)).length,
      coveragePolicyEntryIds: policyEntryIds,
      reason: deferredPolicy.reason
    });
  }

  const status = coveredPolicy && approvedCandidateIds.length > 0 ? 'covered' : 'missing';

  return cell(columnRequirements[column], status, {
    candidateIds,
    manifestCandidateIds: approvedCandidateIds,
    generatedCandidateCount: candidateIds.filter((candidateId) => allCandidateIds.has(candidateId)).length,
    coveragePolicyEntryIds: policyEntryIds
  });
}

function buildExperimentBacklogCell(matchingCandidates) {
  const experimentCandidates = matchingCandidates
    .filter((candidate) => candidate.fileName === 'experiment-candidates.json')
    .sort((left, right) => left.id.localeCompare(right.id));

  if (experimentCandidates.length === 0) {
    return cell('optional', 'deferred', {
      reason: 'No generated experiment candidate is attached; experiment backlog remains deferred until a reviewed safe lab scope is created.'
    });
  }

  return cell('optional', 'deferred', {
    candidateIds: experimentCandidates.map((candidate) => candidate.id),
    reasons: experimentCandidates.map((candidate) => candidate.item.deferredReason).filter(hasText).sort()
  });
}

function buildRuntimeStatusCell(entries, runtimeTargets) {
  const allPromoted = entries.length > 0 && entries.every((entry) => entry.reviewStatus === 'promoted');
  const status = allPromoted ? 'covered' : 'deferred';

  return cell('required', status, {
    targetRuntimeFiles: runtimeTargets,
    reason: allPromoted
      ? 'Reviewed entries are marked promoted.'
      : 'Runtime promotion is intentionally deferred to the promotion adapter task.'
  });
}

function buildReviewStatusCell(reviewStatuses, entries) {
  const reviewed = reviewStatuses.every((status) => status === 'reviewed' || status === 'promoted');
  const value = reviewStatuses.includes('promoted') && reviewStatuses.length === 1 ? 'promoted' : 'reviewed';

  return cell('required', reviewed ? 'covered' : 'missing', {
    value,
    entryIds: entries.map((entry) => entry.entryId).filter(hasText).sort()
  });
}

function buildNotesCell(entries, runtimeTargets, matchingCandidates) {
  return cell('optional', 'covered', {
    values: [
      `Reviewed manifest entries: ${entries.length}`,
      `Matched generated candidates: ${matchingCandidates.length}`,
      `Target runtime files: ${runtimeTargets.join(', ')}`
    ]
  });
}

function cell(requirement, status, details = {}) {
  return {
    requirement,
    status,
    ...details
  };
}

function collectRequirementCandidateIds(entry) {
  return normalizeArray(entry.surfaceRequirements).flatMap((requirement) => normalizeArray(requirement?.candidateIds));
}

function collectAssets(items) {
  const assetsById = new Map();

  for (const item of items) {
    for (const asset of normalizeArray(item?.assets)) {
      if (!asset || typeof asset !== 'object' || !hasText(asset.assetId)) {
        continue;
      }

      assetsById.set(asset.assetId, asset);
    }
  }

  return [...assetsById.values()].sort((left, right) => left.assetId.localeCompare(right.assetId));
}

function formatSourceReference(value) {
  if (!value || typeof value !== 'object' || !hasText(value.sourcePath) || !Number.isInteger(value.sourceLineStart) || !Number.isInteger(value.sourceLineEnd)) {
    return '';
  }

  return `${value.sourcePath}:${value.sourceLineStart}-${value.sourceLineEnd}`;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function readJsonFile(filePath, label) {
  try {
    const source = await readFile(filePath, 'utf8');
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${label} cannot be read or parsed: ${error.message}`);
  }
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

