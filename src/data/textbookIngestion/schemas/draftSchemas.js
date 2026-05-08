const draftStatuses = ['generated', 'needsReview', 'reviewed', 'promoted', 'deferred', 'notApplicable'];
const draftStatusSet = new Set(draftStatuses);

const candidateTypes = [
  'sourceSection',
  'curriculumTopic',
  'experimentCandidate',
  'labCandidate',
  'gameChallengeCandidate',
  'storyCandidate',
  'achievementCandidate',
  'quizCandidate',
  'learningPathCandidate',
  'reviewedSourceReference'
];
const candidateTypeSet = new Set(candidateTypes);

const draftCollections = [
  {
    key: 'sourceSections',
    itemName: 'source section',
    requiredTextFields: ['sectionId', 'sourceText']
  },
  {
    key: 'curriculumTopics',
    itemName: 'curriculum topic',
    requiredTextFields: ['topicId', 'title', 'summary']
  },
  {
    key: 'experimentCandidates',
    itemName: 'experiment candidate',
    requiredTextFields: ['candidateId', 'title', 'summary']
  },
  {
    key: 'labCandidates',
    itemName: 'lab candidate',
    requiredTextFields: ['candidateId', 'title', 'summary']
  },
  {
    key: 'gameChallengeCandidates',
    itemName: 'game challenge candidate',
    requiredTextFields: ['candidateId', 'title', 'summary']
  },
  {
    key: 'storyCandidates',
    itemName: 'story candidate',
    requiredTextFields: ['candidateId', 'title', 'summary']
  },
  {
    key: 'achievementCandidates',
    itemName: 'achievement candidate',
    requiredTextFields: ['candidateId', 'title', 'summary']
  },
  {
    key: 'quizCandidates',
    itemName: 'quiz candidate',
    requiredTextFields: ['candidateId', 'prompt', 'answer']
  },
  {
    key: 'reviewedSourceReferences',
    itemName: 'reviewed source reference',
    requiredTextFields: ['referenceId', 'note']
  }
];

const requiredDraftTopLevelKeys = [
  'schemaVersion',
  'volumeId',
  'sourceHash',
  'status',
  ...draftCollections.map((collection) => collection.key)
];

const allowedDraftTopLevelKeys = new Set([
  ...requiredDraftTopLevelKeys,
  'generatedAt'
]);

const requiredPromotionTopLevelKeys = ['schemaVersion', 'volumeId', 'sourceHash', 'entries'];
const allowedPromotionTopLevelKeys = new Set([...requiredPromotionTopLevelKeys, 'generatedAt']);
const requiredProvenanceFields = [
  'sourceVolumeId',
  'sourcePath',
  'sourceHeading',
  'sourceLineStart',
  'sourceLineEnd',
  'sourceHash',
  'reviewStatus'
];
const reviewerRequiredStatuses = new Set(['reviewed', 'promoted']);

export {
  candidateTypes,
  draftCollections,
  draftStatuses,
  requiredProvenanceFields,
  validateDraftInventory,
  validatePromotionManifest
};

function validateDraftInventory(value, options = {}) {
  const errors = [];
  const inventory = ensureObject(value, 'draft inventory top level must be an object', errors);

  if (!inventory) {
    return errors;
  }

  validateRequiredKeys(inventory, requiredDraftTopLevelKeys, errors);
  validateAllowedKeys(inventory, allowedDraftTopLevelKeys, 'draft inventory', errors);
  validateSchemaVersion(inventory.schemaVersion, errors);
  validateStableId(inventory.volumeId, 'volumeId', errors);
  validateSourceHash(inventory.sourceHash, errors);
  validateEnum(inventory.status, 'status', draftStatusSet, errors);
  validateExpectedIdentity(inventory, options, errors);

  if ('generatedAt' in inventory) {
    validateIsoDate(inventory.generatedAt, 'generatedAt', errors);
  }

  for (const collection of draftCollections) {
    validateDraftCollection(inventory[collection.key], collection, inventory, errors);
  }

  return errors;
}

function validatePromotionManifest(value, options = {}) {
  const errors = [];
  const manifest = ensureObject(value, 'promotion manifest top level must be an object', errors);

  if (!manifest) {
    return errors;
  }

  validateRequiredKeys(manifest, requiredPromotionTopLevelKeys, errors);
  validateAllowedKeys(manifest, allowedPromotionTopLevelKeys, 'promotion manifest', errors);
  validateSchemaVersion(manifest.schemaVersion, errors);
  validateStableId(manifest.volumeId, 'volumeId', errors);
  validateSourceHash(manifest.sourceHash, errors);
  validateExpectedIdentity(manifest, options, errors);

  if ('generatedAt' in manifest) {
    validateIsoDate(manifest.generatedAt, 'generatedAt', errors);
  }

  if (!Array.isArray(manifest.entries)) {
    errors.push('entries must be an array');
    return errors;
  }

  for (const [index, entry] of manifest.entries.entries()) {
    validatePromotionEntry(entry, index, manifest, errors);
  }

  return errors;
}

function validateDraftCollection(value, collection, inventory, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${collection.key} must be an array`);
    return;
  }

  for (const [index, item] of value.entries()) {
    const itemPath = `${collection.key}[${index}]`;
    validateDraftItem(item, collection, itemPath, inventory, errors);
  }
}

function validateDraftItem(value, collection, itemPath, inventory, errors) {
  const item = ensureObject(value, `${itemPath} must be an object`, errors);

  if (!item) {
    return;
  }

  for (const field of collection.requiredTextFields) {
    validateRequiredText(item[field], field, itemPath, errors);
  }

  validateProvenance(item, itemPath, inventory, errors);
}

function validatePromotionEntry(value, index, manifest, errors) {
  const entryPath = `entries[${index}]`;
  const entry = ensureObject(value, `${entryPath} must be an object`, errors);

  if (!entry) {
    return;
  }

  for (const field of ['entryId', 'candidateId', 'targetRuntimeFile']) {
    validateRequiredText(entry[field], field, entryPath, errors);
  }

  validateEnum(entry.candidateType, 'candidateType', candidateTypeSet, errors, entryPath);
  validateProvenance(entry, entryPath, manifest, errors);

  if (entry.reviewStatus !== 'reviewed' && entry.reviewStatus !== 'promoted') {
    errors.push(`${entryPath}.reviewStatus must be reviewed or promoted for promotion manifest entries`);
  }
}

function validateProvenance(item, itemPath, parent, errors) {
  for (const field of requiredProvenanceFields) {
    if (!(field in item)) {
      errors.push(`Missing required provenance field: ${field}`);
    }
  }

  validateRequiredText(item.sourceVolumeId, 'sourceVolumeId', itemPath, errors);
  validateProjectRelativePath(item.sourcePath, 'sourcePath', itemPath, errors);
  validateRequiredText(item.sourceHeading, 'sourceHeading', itemPath, errors);
  validatePositiveInteger(item.sourceLineStart, 'sourceLineStart', itemPath, errors);
  validatePositiveInteger(item.sourceLineEnd, 'sourceLineEnd', itemPath, errors);
  validateSourceHash(item.sourceHash, errors, itemPath);
  validateEnum(item.reviewStatus, 'reviewStatus', draftStatusSet, errors, itemPath);

  if (Number.isInteger(item.sourceLineStart) && Number.isInteger(item.sourceLineEnd) && item.sourceLineEnd < item.sourceLineStart) {
    errors.push(`${itemPath}.sourceLineEnd must be greater than or equal to sourceLineStart`);
  }

  if (parent?.volumeId && item.sourceVolumeId !== parent.volumeId) {
    errors.push(`${itemPath}.sourceVolumeId must match volumeId: ${parent.volumeId}`);
  }

  if (parent?.sourceHash && item.sourceHash !== parent.sourceHash) {
    errors.push(`${itemPath}.sourceHash must match sourceHash: ${parent.sourceHash}`);
  }

  if (reviewerRequiredStatuses.has(item.reviewStatus)) {
    validateReviewerMetadata(item, itemPath, errors);
  }
}

function validateReviewerMetadata(item, itemPath, errors) {
  if (!hasRequiredText(item.reviewedBy)) {
    errors.push(`reviewedBy is required when reviewStatus is ${item.reviewStatus} at ${itemPath}`);
  }

  if (!hasRequiredText(item.reviewedAt)) {
    errors.push(`reviewedAt is required when reviewStatus is ${item.reviewStatus} at ${itemPath}`);
    return;
  }

  validateIsoDate(item.reviewedAt, 'reviewedAt', errors, itemPath);
}

function validateExpectedIdentity(value, options, errors) {
  if (options.expectedVolumeId && value.volumeId !== options.expectedVolumeId) {
    errors.push(`volumeId must match --textbook: ${options.expectedVolumeId}`);
  }

  if (options.expectedSourceHash && value.sourceHash !== options.expectedSourceHash) {
    errors.push(`sourceHash must match batch sourceHash: ${options.expectedSourceHash}`);
  }
}

function validateRequiredKeys(value, keys, errors) {
  for (const key of keys) {
    if (!(key in value)) {
      errors.push(`Missing required field: ${key}`);
    }
  }
}

function validateAllowedKeys(value, allowedKeys, label, errors) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(`${label} has unsupported field: ${key}`);
    }
  }
}

function validateSchemaVersion(value, errors) {
  if (!Number.isInteger(value) || value < 1) {
    errors.push('schemaVersion must be a positive integer');
  }
}

function validateStableId(value, label, errors) {
  if (!hasRequiredText(value)) {
    errors.push(`${label} must be a non-empty string`);
    return;
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    errors.push(`${label} must be a stable kebab-case machine id: ${value}`);
  }
}

function validateRequiredText(value, label, itemPath, errors) {
  if (!hasRequiredText(value)) {
    errors.push(`${itemPath}.${label} must be a non-empty string`);
  } else if (value !== value.trim()) {
    errors.push(`${itemPath}.${label} cannot contain leading or trailing whitespace`);
  }
}

function validateProjectRelativePath(value, label, itemPath, errors) {
  validateRequiredText(value, label, itemPath, errors);

  if (typeof value !== 'string') {
    return;
  }

  if (value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || value.includes('..')) {
    errors.push(`${itemPath}.${label} must be a project-relative path without ..: ${value}`);
  }
}

function validateSourceHash(value, errors, itemPath = null) {
  if (!hasRequiredText(value)) {
    errors.push(itemPath ? `${itemPath}.sourceHash must be a non-empty string` : 'sourceHash must be a non-empty string');
    return;
  }

  if (!/^sha256:[a-f0-9]{64}$/.test(value)) {
    errors.push(itemPath ? `${itemPath}.sourceHash must be sha256:<64 hex>: ${value}` : `sourceHash must be sha256:<64 hex>: ${value}`);
  }
}

function validatePositiveInteger(value, label, itemPath, errors) {
  if (!Number.isInteger(value) || value < 1) {
    errors.push(`${itemPath}.${label} must be a positive integer`);
  }
}

function validateIsoDate(value, label, errors, itemPath = null) {
  const pathLabel = itemPath ? `${itemPath}.${label}` : label;

  if (!hasRequiredText(value)) {
    errors.push(`${pathLabel} must be a non-empty string`);
    return;
  }

  if (Number.isNaN(Date.parse(value))) {
    errors.push(`${pathLabel} must be a valid ISO timestamp: ${value}`);
  }
}

function validateEnum(value, label, allowedValues, errors, itemPath = null) {
  if (!allowedValues.has(value)) {
    const pathLabel = itemPath ? `${itemPath}.${label}` : label;
    errors.push(`${pathLabel} must be one of: ${[...allowedValues].join(', ')}; actual: ${String(value)}`);
  }
}

function ensureObject(value, message, errors) {
  if (!isRecord(value)) {
    errors.push(message);
    return null;
  }

  return value;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasRequiredText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
