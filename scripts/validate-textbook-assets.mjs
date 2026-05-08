import { access, readFile, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

import {
  quizData,
  reactions,
  textbookAssetExtractionStatuses,
  textbookAssetManifest,
  textbookAssetTypes
} from '../src/data/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const allowedAssetTypes = new Set(textbookAssetTypes);
const allowedExtractionStatuses = new Set(textbookAssetExtractionStatuses);
const allowedReferenceUsages = new Set(['formula', 'equation', 'diagram', 'experiment-flow', 'apparatus-diagram', 'photo', 'other']);
const notationTextFields = new Set(['formulaText', 'equationText']);
const referenceUsagesRequiringReview = new Set(['formula', 'equation', 'diagram', 'experiment-flow', 'apparatus-diagram']);
const assetTypesRequiringReviewWhenReferenced = new Set(['formula', 'experiment-flow', 'apparatus-diagram']);
const selfCheckModes = new Set(['unreviewed-formula-reference', 'broken-markdown-image-path']);

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

  const dataset = buildDataset(options.selfCheckInvalid);
  const result = await validateTextbookAssets(dataset);

  if (options.selfCheckInvalid) {
    finishSelfCheck(options.selfCheckInvalid, result.errors);
    return;
  }

  finishValidation(result);
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      'self-check-invalid': { type: 'string' }
    },
    strict: true
  });

  const selfCheckInvalid = values['self-check-invalid'] ?? null;
  if (selfCheckInvalid !== null && !selfCheckModes.has(selfCheckInvalid)) {
    throw new Error(`--self-check-invalid must be one of: ${[...selfCheckModes].join(', ')}`);
  }

  return {
    help: values.help === true,
    selfCheckInvalid
  };
}

function printHelp() {
  console.log(`Textbook asset validator / 教材图片资产校验器

Usage:
  node scripts/validate-textbook-assets.mjs [options]

Modes:
  full mode (default)                 Validate textbook Markdown image links, manifest paths, and reviewed references.
  --self-check-invalid <mode>         Confirm one deterministic invalid fixture is rejected.
  --help                              Show this help.

Invalid fixture modes:
  ${[...selfCheckModes].join('|')}`);
}

function buildDataset(selfCheckInvalid) {
  const baseDataset = {
    manifest: structuredClone(textbookAssetManifest),
    quizItems: structuredClone(quizData),
    reactionItems: structuredClone(reactions),
    markdownFixtures: []
  };

  if (selfCheckInvalid === 'unreviewed-formula-reference') {
    baseDataset.quizItems.push({
      id: 'invalid-unreviewed-formula-reference',
      textbookAssetReferences: [
        {
          assetId: 'pep-g9-2024-up-figure-1-1-water-boiling',
          usage: 'formula',
          note: 'Invalid self-check fixture: formulas require reviewed source assets.'
        }
      ]
    });
  }

  if (selfCheckInvalid === 'broken-markdown-image-path') {
    baseDataset.markdownFixtures.push({
      volumeId: 'self-check-broken-markdown-image-path',
      sourcePath: 'self-check-invalid/book.md',
      imageRoot: 'self-check-invalid/images',
      markdown: '# Invalid fixture\n\n![](images/missing-textbook-asset.png)\n'
    });
  }

  return baseDataset;
}

async function validateTextbookAssets(dataset) {
  const errors = [];
  const counters = {
    markdownImageLinks: 0,
    manifestAssets: 0,
    reviewedReferences: 0
  };

  const manifest = ensureObject(dataset.manifest, 'textbookAssetManifest 顶层必须是对象', errors) ?? {};
  const volumes = validateVolumes(manifest.volumes, errors);
  const sourceIssues = validateSourceIssues(manifest.sourceIssues, volumes, errors);
  const assetsById = await validateAssets(manifest.assets, volumes, errors, counters);

  await validateMarkdownImageLinks([...volumes.values()], dataset.markdownFixtures, sourceIssues, errors, counters);
  validateRuntimeAssetReferences(dataset.quizItems, 'quizData', assetsById, errors, counters);
  validateRuntimeAssetReferences(dataset.reactionItems, 'reactions', assetsById, errors, counters);

  return { errors, counters };
}

function validateSourceIssues(sourceIssues, volumesById, errors) {
  const knownMalformedImageReferences = new Set();

  if (sourceIssues === undefined) {
    return knownMalformedImageReferences;
  }

  if (!Array.isArray(sourceIssues)) {
    errors.push('textbookAssetManifest.sourceIssues 必须是数组');
    return knownMalformedImageReferences;
  }

  for (const [index, issue] of sourceIssues.entries()) {
    const label = `textbookAssetManifest.sourceIssues[${index}]`;
    if (!isRecord(issue)) {
      errors.push(`${label} 必须是对象`);
      continue;
    }

    validateStableId(issue.id, `${label}.id`, errors);
    validateEnum(issue.volumeId, `${label}.volumeId`, new Set(volumesById.keys()), errors);
    validateProjectRelativePath(issue.sourcePath, `${label}.sourcePath`, errors);
    validateEnum(issue.issueType, `${label}.issueType`, new Set(['malformed-markdown-image']), errors);
    validateEnum(issue.resolutionStatus, `${label}.resolutionStatus`, new Set(['rejected']), errors);
    validateRequiredText(issue.rawReference, `${label}.rawReference`, errors);
    validateRequiredText(issue.reviewerNotes, `${label}.reviewerNotes`, errors);

    if (!Number.isInteger(issue.lineNumber) || issue.lineNumber < 1) {
      errors.push(`${label}.lineNumber 必须是正整数`);
    }

    if (issue.issueType === 'malformed-markdown-image' && issue.resolutionStatus === 'rejected') {
      knownMalformedImageReferences.add(`${issue.sourcePath}:${issue.lineNumber}`);
    }
  }

  return knownMalformedImageReferences;
}

function validateVolumes(volumes, errors) {
  const volumesById = new Map();

  if (!Array.isArray(volumes) || volumes.length === 0) {
    errors.push('textbookAssetManifest.volumes 必须是非空数组');
    return volumesById;
  }

  for (const [index, volume] of volumes.entries()) {
    const label = `textbookAssetManifest.volumes[${index}]`;
    if (!isRecord(volume)) {
      errors.push(`${label} 必须是对象`);
      continue;
    }

    validateStableId(volume.volumeId, `${label}.volumeId`, errors);
    validateRequiredText(volume.displayName, `${label}.displayName`, errors);
    validateRequiredText(volume.sourceVolume, `${label}.sourceVolume`, errors);
    validateProjectRelativePath(volume.sourcePath, `${label}.sourcePath`, errors);
    validateProjectRelativePath(volume.imageRoot, `${label}.imageRoot`, errors);
    validateRequiredText(volume.publisher, `${label}.publisher`, errors);
    validateRequiredText(volume.edition, `${label}.edition`, errors);

    if (typeof volume.volumeId === 'string' && volumesById.has(volume.volumeId)) {
      errors.push(`textbookAssetManifest.volumes 包含重复 volumeId：${volume.volumeId}`);
    }

    if (typeof volume.volumeId === 'string') {
      volumesById.set(volume.volumeId, volume);
    }
  }

  return volumesById;
}

async function validateAssets(assets, volumesById, errors, counters) {
  const assetsById = new Map();

  if (!Array.isArray(assets)) {
    errors.push('textbookAssetManifest.assets 必须是数组');
    return assetsById;
  }

  for (const [index, asset] of assets.entries()) {
    const label = `textbookAssetManifest.assets[${index}]`;
    if (!isRecord(asset)) {
      errors.push(`${label} 必须是对象`);
      continue;
    }

    validateStableId(asset.id, `${label}.id`, errors);
    validateRequiredText(asset.sourceVolume, `${label}.sourceVolume`, errors);
    validateRequiredText(asset.imagePath, `${label}.imagePath`, errors);
    validateRequiredText(asset.nearbyHeading, `${label}.nearbyHeading`, errors);
    validateEnum(asset.assetType, `${label}.assetType`, allowedAssetTypes, errors);
    validateEnum(asset.extractionStatus, `${label}.extractionStatus`, allowedExtractionStatuses, errors);
    validateNullableText(asset.extractedFormulaText, `${label}.extractedFormulaText`, errors);
    validateNullableText(asset.diagramSummary, `${label}.diagramSummary`, errors);
    validateRequiredText(asset.reviewerNotes, `${label}.reviewerNotes`, errors);
    validateRequiredText(asset.sourceNotes, `${label}.sourceNotes`, errors);

    const volume = volumesById.get(asset.volumeId);
    if (!volume) {
      errors.push(`${label}.volumeId 未在 volumes 中定义：${String(asset.volumeId)}`);
    } else {
      await validateManifestImagePath(asset, volume, label, errors);
    }

    if (asset.assetType === 'formula' && asset.extractionStatus === 'reviewed') {
      validateRequiredText(asset.extractedFormulaText, `${label}.extractedFormulaText`, errors);
    }

    if (['experiment-flow', 'apparatus-diagram'].includes(asset.assetType) && asset.extractionStatus === 'reviewed') {
      validateRequiredText(asset.diagramSummary, `${label}.diagramSummary`, errors);
    }

    if (typeof asset.id === 'string' && assetsById.has(asset.id)) {
      errors.push(`textbookAssetManifest.assets 包含重复 id：${asset.id}`);
    }

    if (typeof asset.id === 'string') {
      assetsById.set(asset.id, asset);
    }
    counters.manifestAssets += 1;
  }

  return assetsById;
}

async function validateMarkdownImageLinks(volumes, markdownFixtures, sourceIssues, errors, counters) {
  for (const volume of volumes) {
    const bookPath = resolveProjectPath(volume.sourcePath);
    const imageRoot = resolveProjectPath(volume.imageRoot);

    await assertReadableFile(bookPath, `volume ${volume.volumeId} sourcePath`, errors);
    await assertDirectory(imageRoot, `volume ${volume.volumeId} imageRoot`, errors);

    const markdown = await readFile(bookPath, 'utf8').catch((error) => {
      errors.push(`${volume.volumeId} 无法读取 Markdown：${error.message}`);
      return '';
    });
    await validateMarkdownTextImageLinks(markdown, volume.sourcePath, path.dirname(bookPath), volume.volumeId, sourceIssues, errors, counters);
  }

  for (const fixture of markdownFixtures) {
    await validateMarkdownTextImageLinks(
      fixture.markdown,
      fixture.sourcePath,
      resolveProjectPath(path.dirname(fixture.sourcePath)),
      fixture.volumeId,
      sourceIssues,
      errors,
      counters
    );
  }
}

async function validateMarkdownTextImageLinks(markdown, sourcePath, sourceDirectory, volumeId, sourceIssues, errors, counters) {
  const imagePattern = /!\[[^\]\n]*\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g;

  for (const match of markdown.matchAll(imagePattern)) {
    const rawTarget = match[1];
    const lineNumber = getLineNumber(markdown, match.index ?? 0);
    counters.markdownImageLinks += 1;

    if (!rawTarget || rawTarget.includes('](')) {
      if (sourceIssues.has(`${sourcePath}:${lineNumber}`)) {
        continue;
      }
      errors.push(`${sourcePath}:${lineNumber} 包含无法解析的 Markdown 图片路径：${rawTarget}`);
      continue;
    }

    if (/^[a-z][a-z0-9+.-]*:/i.test(rawTarget) || path.isAbsolute(rawTarget)) {
      errors.push(`${sourcePath}:${lineNumber} 图片路径必须是相对本书目录的本地路径：${rawTarget}`);
      continue;
    }

    const normalizedTarget = rawTarget.startsWith('./') ? rawTarget.slice(2) : rawTarget;
    if (!normalizedTarget.startsWith('images/')) {
      errors.push(`${sourcePath}:${lineNumber} 图片路径必须位于 images/ 下：${rawTarget}`);
      continue;
    }

    const resolvedTarget = path.resolve(sourceDirectory, normalizedTarget);
    if (!isSubpath(resolvedTarget, sourceDirectory)) {
      errors.push(`${sourcePath}:${lineNumber} 图片路径不能跳出教材目录：${rawTarget}`);
      continue;
    }

    await assertReadableFile(resolvedTarget, `${volumeId} Markdown image ${rawTarget}`, errors);
  }
}

async function validateManifestImagePath(asset, volume, label, errors) {
  const imageRoot = resolveProjectPath(volume.imageRoot);
  const relativeImagePath = asset.imagePath.startsWith('./') ? asset.imagePath.slice(2) : asset.imagePath;

  if (!relativeImagePath.startsWith('images/')) {
    errors.push(`${label}.imagePath 必须以 images/ 或 ./images/ 开头：${asset.imagePath}`);
    return;
  }

  const imageFileName = relativeImagePath.slice('images/'.length);
  const resolvedPath = path.resolve(imageRoot, imageFileName);
  if (!isSubpath(resolvedPath, imageRoot)) {
    errors.push(`${label}.imagePath 不能跳出 volume imageRoot：${asset.imagePath}`);
    return;
  }

  await assertReadableFile(resolvedPath, `${label}.imagePath`, errors);
}

function validateRuntimeAssetReferences(items, datasetName, assetsById, errors, counters) {
  if (!Array.isArray(items)) {
    errors.push(`${datasetName} 必须是数组`);
    return;
  }

  for (const [itemIndex, item] of items.entries()) {
    if (!isRecord(item) || item.textbookAssetReferences === undefined) {
      continue;
    }

    const label = `${datasetName}[${itemIndex}].textbookAssetReferences`;
    if (!Array.isArray(item.textbookAssetReferences)) {
      errors.push(`${label} 必须是数组`);
      continue;
    }

    for (const [referenceIndex, reference] of item.textbookAssetReferences.entries()) {
      const referenceLabel = `${label}[${referenceIndex}]`;
      if (!isRecord(reference)) {
        errors.push(`${referenceLabel} 必须是对象`);
        continue;
      }

      validateStableId(reference.assetId, `${referenceLabel}.assetId`, errors);
      validateRequiredText(reference.usage, `${referenceLabel}.usage`, errors);
      validateEnum(reference.usage, `${referenceLabel}.usage`, allowedReferenceUsages, errors);
      validateReviewedTextField(reference.reviewedTextField, `${referenceLabel}.reviewedTextField`, errors);

      const asset = assetsById.get(reference.assetId);
      if (!asset) {
        errors.push(`${referenceLabel}.assetId 未在 textbookAssetManifest.assets 中定义：${String(reference.assetId)}`);
        continue;
      }

      if (referenceRequiresReviewedAsset(reference, asset) && asset.extractionStatus !== 'reviewed') {
        errors.push(`${referenceLabel} 使用 ${asset.assetType} 教材图片内容时必须引用 reviewed 资产：${asset.id} 当前为 ${asset.extractionStatus}`);
      }

      counters.reviewedReferences += 1;
    }
  }
}

function referenceRequiresReviewedAsset(reference, asset) {
  return referenceUsagesRequiringReview.has(reference.usage)
    || assetTypesRequiringReviewWhenReferenced.has(asset.assetType)
    || Boolean(reference.reviewedTextField);
}

function validateReviewedTextField(value, label, errors) {
  if (value === undefined) {
    return;
  }

  validateRequiredText(value, label, errors);
  if (typeof value === 'string' && !notationTextFields.has(value)) {
    errors.push(`${label} 必须指向 formulaText 或 equationText：${value}`);
  }
}

function finishValidation(result) {
  if (result.errors.length > 0) {
    console.error('教材图片资产校验失败：');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`markdownImages: valid (${result.counters.markdownImageLinks} links checked)`);
  console.log(`manifestImagePaths: valid (${result.counters.manifestAssets} assets checked)`);
  console.log(`assetReviewStatus: valid (${result.counters.reviewedReferences} runtime references checked)`);
}

function finishSelfCheck(mode, errors) {
  if (errors.length === 0) {
    console.error(`教材图片资产非法夹具自检失败：${mode} 未被拒绝`);
    process.exit(1);
  }

  console.log(`selfCheckInvalid: rejected ${mode}`);
  for (const error of errors) {
    console.log(`- ${error}`);
  }
}

async function assertReadableFile(filePath, label, errors) {
  try {
    await access(filePath, fsConstants.R_OK);
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      errors.push(`${label} 不是文件：${path.relative(projectRoot, filePath)}`);
    }
  } catch {
    errors.push(`${label} 不存在或不可读：${path.relative(projectRoot, filePath)}`);
  }
}

async function assertDirectory(directoryPath, label, errors) {
  try {
    const directoryStat = await stat(directoryPath);
    if (!directoryStat.isDirectory()) {
      errors.push(`${label} 不是目录：${path.relative(projectRoot, directoryPath)}`);
    }
  } catch {
    errors.push(`${label} 不存在或不可读：${path.relative(projectRoot, directoryPath)}`);
  }
}

function validateStableId(value, label, errors) {
  validateRequiredText(value, label, errors);
  if (typeof value === 'string' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    errors.push(`${label} 必须是稳定 kebab-case 机器 ID：${value}`);
  }
}

function validateRequiredText(value, label, errors) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label} 必须是非空字符串`);
  } else if (value !== value.trim()) {
    errors.push(`${label} 不能包含首尾空白`);
  }
}

function validateNullableText(value, label, errors) {
  if (value === null) {
    return;
  }
  validateRequiredText(value, label, errors);
}

function validateProjectRelativePath(value, label, errors) {
  validateRequiredText(value, label, errors);
  if (typeof value !== 'string') {
    return;
  }
  if (path.isAbsolute(value) || value.includes('..')) {
    errors.push(`${label} 必须是项目内相对路径，且不能包含 ..：${value}`);
  }
}

function validateEnum(value, label, allowedValues, errors) {
  if (!allowedValues.has(value)) {
    errors.push(`${label} 必须是以下值之一：${[...allowedValues].join(', ')}；实际为 ${String(value)}`);
  }
}

function ensureObject(value, label, errors) {
  if (!isRecord(value)) {
    errors.push(label);
    return null;
  }
  return value;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveProjectPath(projectRelativePath) {
  return path.resolve(projectRoot, projectRelativePath);
}

function isSubpath(candidatePath, parentPath) {
  const relativePath = path.relative(parentPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function getLineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}
