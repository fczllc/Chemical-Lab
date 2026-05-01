import { access, readFile, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const elementsPath = path.join(projectRoot, 'src/data/elements.json');
const storyMediaDir = path.join(projectRoot, 'src/data/storyMedia');
const maxBytes = 160 * 1024;
const expectedWidth = 800;
const expectedHeight = 520;

const shardDefinitions = [
  { fileName: 'media-001-030.json', start: 1, end: 30 },
  { fileName: 'media-031-060.json', start: 31, end: 60 },
  { fileName: 'media-061-090.json', start: 61, end: 90 },
  { fileName: 'media-091-118.json', start: 91, end: 118 }
];

const allowedRanges = new Set(shardDefinitions.map((shard) => `${shard.start}-${shard.end}`));
const allowedKinds = new Set([
  'portrait',
  'discovery-scene',
  'ancient-scene',
  'instrument-scene',
  'specimen',
  'experiment-scene',
  'production-scene',
  'sealed-sample'
]);
const discoveryKinds = new Set(['portrait', 'discovery-scene', 'ancient-scene', 'instrument-scene']);
const specimenKinds = new Set(['specimen', 'experiment-scene', 'production-scene', 'sealed-sample']);
const allowedSourceOrigins = new Set([
  'nist',
  'wikimedia_commons',
  'wikidata_commons',
  'images_of_elements',
  'ai_generated',
  'project_generated',
  'other_open_source'
]);
const generatedSourceOrigins = new Set(['ai_generated', 'project_generated']);
const allowedLicenses = new Set([
  'Public Domain',
  'PD-USGov',
  'CC0-1.0',
  'CC-BY-2.0',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'CC-BY-SA-3.0',
  'CC-BY-SA-4.0',
  'Project-Generated'
]);
const allowedWrapperKeys = new Set(['items']);
const allowedMediaKeys = new Set([
  'atomicNumber',
  'symbol',
  'kind',
  'src',
  'altZh',
  'captionZh',
  'shortAttributionZh',
  'sourceOrigin',
  'sourceUrl',
  'creator',
  'license',
  'licenseUrl',
  'retrievedAt',
  'modifications',
  'fallbackReason',
  'aiDisclosureZh',
  'width',
  'height',
  'bytes'
]);
const localSrcPrefixes = ['/assets/elements/discovery/', '/assets/elements/specimens/'];
const allowedPublicAssetRoots = localSrcPrefixes.map((prefix) => path.resolve(projectRoot, 'public', prefix.slice(1)));

const errors = [];

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

  if (options.selfCheckInvalid) {
    await runInvalidSelfCheck();
    return;
  }

  const elementsData = JSON.parse(await readFile(elementsPath, 'utf8'));
  const elements = getAuthoritativeElements(elementsData);
  const selectedElements = selectElements(elements, options);
  const items = await loadStoryMediaItems(options);
  await validateItems(items, elements, selectedElements, options);
  finishValidation(items.length, selectedElements, options);
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      range: { type: 'string' },
      symbol: { type: 'string' },
      'allow-empty': { type: 'boolean' },
      'self-check-invalid': { type: 'boolean' }
    },
    strict: true
  });

  const range = values.range ?? null;
  if (range !== null && !allowedRanges.has(range)) {
    throw new Error(`--range must be one of: ${[...allowedRanges].join(', ')}`);
  }

  return {
    help: values.help === true,
    range,
    symbol: values.symbol ?? null,
    allowEmpty: values['allow-empty'] === true,
    selfCheckInvalid: values['self-check-invalid'] === true
  };
}

function printHelp() {
  console.log(`Story media validator / 元素故事媒体校验器

Usage:
  node scripts/validate-story-media.mjs [options]

Modes:
  full mode (default)                 Validate all 118 elements and require complete media entries.
  --range=1-30|31-60|61-90|91-118    Validate one shard/range only.
  --symbol=H                          Validate one element symbol; may be combined with --range.
  --allow-empty                       Permit empty scaffold data for selected range/symbol and report scaffold mode.
  --self-check-invalid                Run deterministic invalid fixture; exits non-zero when unsafe metadata is rejected.
  --help                              Show this help.

Required media policy:
  Runtime src must be local under /assets/elements/discovery/ or /assets/elements/specimens/.
  Final images must be 800x520 .webp and <= ${maxBytes} bytes.
  Full mode without --allow-empty requires two media entries per selected element.`);
}

async function runInvalidSelfCheck() {
  const fixtureElements = [{ atomicNumber: 1, symbol: 'H' }];
  const fixtureItems = [
    {
      atomicNumber: 1,
      symbol: 'H',
      kind: 'portrait',
      src: 'https://example.com/hydrogen.jpg',
      captionZh: '非法远程图片示例',
      shortAttributionZh: '来源：示例',
      sourceOrigin: 'ai_generated',
      license: 'All Rights Reserved',
      width: 800,
      height: 520,
      bytes: 1024,
      fallbackReason: '自检用非法数据'
    }
  ];

  const wrappedFixtureItems = fixtureItems.map((item, index) => ({
    __rawItem: item,
    __sourceFile: 'invalidFixture',
    __sourceIndex: index,
    __shardStart: 1,
    __shardEnd: 1
  }));

  await validateItems(wrappedFixtureItems, fixtureElements, fixtureElements, { allowEmpty: false, selfCheckInvalid: true });

  if (errors.length > 0) {
    console.error('故事媒体数据校验失败：');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.error('故事媒体非法夹具自检失败：非法夹具未被拒绝');
  process.exit(1);
}

function getAuthoritativeElements(elementsData) {
  if (!Array.isArray(elementsData.elements)) {
    throw new Error('src/data/elements.json must contain an elements array.');
  }

  return elementsData.elements.map((element) => ({
    atomicNumber: element.atomicNumber,
    symbol: element.symbol
  }));
}

function selectElements(elements, options) {
  let selected = elements;

  if (options.range) {
    const [start, end] = options.range.split('-').map((value) => Number.parseInt(value, 10));
    selected = selected.filter((element) => element.atomicNumber >= start && element.atomicNumber <= end);
  }

  if (options.symbol) {
    selected = selected.filter((element) => element.symbol === options.symbol);
    if (selected.length === 0) {
      throw new Error(`Unknown element symbol for story media validation: ${options.symbol}`);
    }
  }

  return selected;
}

async function loadStoryMediaItems(options) {
  const shards = options.range
    ? shardDefinitions.filter((shard) => `${shard.start}-${shard.end}` === options.range)
    : shardDefinitions;
  const items = [];

  for (const shard of shards) {
    const shardPath = path.join(storyMediaDir, shard.fileName);
    const wrapper = ensureObject(JSON.parse(await readFile(shardPath, 'utf8')), `${shard.fileName} 顶层必须是对象`);
    validateAllowedKeys(wrapper, shard.fileName, allowedWrapperKeys);

    if (!Array.isArray(wrapper?.items)) {
      errors.push(`${shard.fileName}.items 必须是数组`);
      continue;
    }

    for (const [index, item] of wrapper.items.entries()) {
      items.push({
        __rawItem: item,
        __sourceFile: shard.fileName,
        __sourceIndex: index,
        __shardStart: shard.start,
        __shardEnd: shard.end
      });
    }
  }

  return items;
}

async function validateItems(items, allElements, selectedElements, options) {
  const allBySymbol = new Map(allElements.map((element) => [element.symbol, element]));
  const selectedBySymbol = new Map(selectedElements.map((element) => [element.symbol, element]));
  const entriesBySymbol = new Map(selectedElements.map((element) => [element.symbol, []]));

  for (const [index, wrappedItem] of items.entries()) {
    const label = getItemLabel(wrappedItem, index);
    const item = wrappedItem.__rawItem;
    if (!isRecord(item)) {
      errors.push(`${label} 必须是对象`);
      continue;
    }

    validateAllowedKeys(item, label, allowedMediaKeys);
    validateShardMembership(item, label, wrappedItem);
    validateMediaItem(item, label, allBySymbol, selectedBySymbol, entriesBySymbol);
    await validateMediaFile(item, label, options);
  }

  if (items.length === 0 && options.allowEmpty) {
    return;
  }

  for (const element of selectedElements) {
    const entries = entriesBySymbol.get(element.symbol) ?? [];
    const discoveryCount = entries.filter((item) => discoveryKinds.has(item.kind)).length;
    const specimenCount = entries.filter((item) => specimenKinds.has(item.kind)).length;

    if (entries.length !== 2) {
      errors.push(`元素 ${element.symbol} 必须有 2 条故事媒体，实际 ${entries.length}`);
    }
    if (discoveryCount !== 1) {
      errors.push(`元素 ${element.symbol} 必须有 1 条发现者/发现故事媒体，实际 ${discoveryCount}`);
    }
    if (specimenCount !== 1) {
      errors.push(`元素 ${element.symbol} 必须有 1 条实物/实验故事媒体，实际 ${specimenCount}`);
    }
  }
}

function validateMediaItem(item, label, allBySymbol, selectedBySymbol, entriesBySymbol) {
  validateRequiredInteger(item.atomicNumber, `${label}.atomicNumber`);
  validateRequiredText(item.symbol, `${label}.symbol`);

  const expectedElement = allBySymbol.get(item.symbol);
  if (!expectedElement) {
    errors.push(`${label}.symbol 未知：${String(item.symbol)}`);
  } else if (item.atomicNumber !== expectedElement.atomicNumber) {
    errors.push(`${label}.atomicNumber 与 ${item.symbol} 不匹配：期望 ${expectedElement.atomicNumber}，实际 ${String(item.atomicNumber)}`);
  } else if (selectedBySymbol.has(item.symbol)) {
    entriesBySymbol.get(item.symbol)?.push(item);
  }

  validateEnum(item.kind, `${label}.kind`, allowedKinds);
  validateRequiredText(item.src, `${label}.src`);
  validateLocalSrc(item.src, `${label}.src`);
  validateRequiredText(item.altZh, `${label}.altZh`);
  validateRequiredText(item.captionZh, `${label}.captionZh`);
  validateRequiredText(item.shortAttributionZh, `${label}.shortAttributionZh`);
  validateEnum(item.sourceOrigin, `${label}.sourceOrigin`, allowedSourceOrigins);
  validateEnum(item.license, `${label}.license`, allowedLicenses);
  validateRequiredInteger(item.width, `${label}.width`);
  validateRequiredInteger(item.height, `${label}.height`);
  validateRequiredInteger(item.bytes, `${label}.bytes`);

  if (item.width !== expectedWidth) {
    errors.push(`${label}.width 必须为 ${expectedWidth}，实际 ${String(item.width)}`);
  }
  if (item.height !== expectedHeight) {
    errors.push(`${label}.height 必须为 ${expectedHeight}，实际 ${String(item.height)}`);
  }
  if (Number.isInteger(item.bytes) && item.bytes > maxBytes) {
    errors.push(`${label}.bytes 不能超过 ${maxBytes}，实际 ${item.bytes}`);
  }

  if (!generatedSourceOrigins.has(item.sourceOrigin)) {
    validateRequiredText(item.sourceUrl, `${label}.sourceUrl`);
    validateRequiredText(item.creator, `${label}.creator`);
    validateRequiredText(item.licenseUrl, `${label}.licenseUrl`);
    validateRequiredText(item.retrievedAt, `${label}.retrievedAt`);
    validateRequiredText(item.modifications, `${label}.modifications`);
  }

  if (generatedSourceOrigins.has(item.sourceOrigin)) {
    validateRequiredText(item.fallbackReason, `${label}.fallbackReason`);
    if (item.sourceOrigin === 'ai_generated') {
      validateRequiredText(item.aiDisclosureZh, `${label}.aiDisclosureZh`);
    }
  }
}

function validateShardMembership(item, label, wrappedItem) {
  if (!Number.isInteger(item.atomicNumber)) {
    return;
  }

  if (item.atomicNumber < wrappedItem.__shardStart || item.atomicNumber > wrappedItem.__shardEnd) {
    errors.push(`${label}.atomicNumber 不属于 ${wrappedItem.__sourceFile} 范围 ${wrappedItem.__shardStart}-${wrappedItem.__shardEnd}：${item.atomicNumber}`);
  }
}

async function validateMediaFile(item, label, options) {
  if (!isLocalRuntimeSrc(item.src)) {
    return;
  }

  if (!String(item.src).endsWith('.webp')) {
    errors.push(`${label}.src 必须指向 .webp 文件`);
    return;
  }

  if (options.selfCheckInvalid) {
    return;
  }

  const publicPath = resolveRuntimeSrcPath(item.src, label);
  if (!publicPath) {
    return;
  }

  try {
    await access(publicPath, fsConstants.R_OK);
  } catch {
    errors.push(`${label}.src 指向的本地文件不存在：${item.src}`);
    return;
  }

  try {
    const fileStat = await stat(publicPath);
    if (fileStat.size !== item.bytes) {
      errors.push(`${label}.bytes 与文件大小不一致：metadata=${String(item.bytes)} actual=${fileStat.size}`);
    }
    if (fileStat.size > maxBytes) {
      errors.push(`${label}.src 文件不能超过 ${maxBytes} bytes，实际 ${fileStat.size}`);
    }

    const metadata = await sharp(publicPath).metadata();
    if (metadata.width !== expectedWidth) {
      errors.push(`${label}.src 实际宽度必须为 ${expectedWidth}，实际 ${String(metadata.width)}`);
    }
    if (metadata.height !== expectedHeight) {
      errors.push(`${label}.src 实际高度必须为 ${expectedHeight}，实际 ${String(metadata.height)}`);
    }
  } catch (error) {
    errors.push(`${label}.src 无法读取图片元数据：${error.message}`);
  }
}

function validateLocalSrc(value, label) {
  if (typeof value !== 'string') {
    return;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    errors.push(`${label} runtime media must be local, remote URL is forbidden: ${value}`);
    return;
  }

  if (!isLocalRuntimeSrc(value)) {
    errors.push(`${label} 必须以 ${localSrcPrefixes.join(' 或 ')} 开头`);
    return;
  }

  if (value.includes('..') || value.includes('\\') || value.includes('?') || value.includes('#') || /%2e|%5c|%2f/i.test(value)) {
    errors.push(`${label} 不能包含路径穿越、反斜杠、查询参数或片段：${value}`);
    return;
  }

  resolveRuntimeSrcPath(value, label);
}

function resolveRuntimeSrcPath(value, label) {
  const resolvedPath = path.resolve(projectRoot, 'public', value.slice(1));
  if (!allowedPublicAssetRoots.some((root) => isPathInside(root, resolvedPath))) {
    errors.push(`${label} 解析后必须位于允许的 public/assets/elements 目录内：${value}`);
    return null;
  }

  return resolvedPath;
}

function isLocalRuntimeSrc(value) {
  return typeof value === 'string' && localSrcPrefixes.some((prefix) => value.startsWith(prefix));
}

function finishValidation(itemCount, selectedElements, options) {
  if (errors.length > 0) {
    console.error('故事媒体数据校验失败：');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const mode = options.range ? `range ${options.range}` : 'full mode';
  const symbolText = options.symbol ? `，symbol=${options.symbol}` : '';
  if (itemCount === 0 && options.allowEmpty) {
    console.log(`故事媒体脚手架校验通过：${mode}${symbolText}，当前为空 items，仅确认 scaffold/range mode；这不是完整媒体完成状态。`);
    return;
  }

  console.log(`故事媒体数据校验通过：${mode}${symbolText}，共 ${selectedElements.length} 个元素、${itemCount} 条本地媒体。`);
}

function getItemLabel(item, index) {
  if (isRecord(item) && typeof item.__sourceFile === 'string') {
    return `${item.__sourceFile}.items[${item.__sourceIndex}]`;
  }

  return `invalidFixture.items[${index}]`;
}

function isPathInside(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function validateRequiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label} 必须是非空字符串`);
  }
}

function validateRequiredInteger(value, label) {
  if (!Number.isInteger(value)) {
    errors.push(`${label} 必须是有限整数`);
  }
}

function validateEnum(value, label, allowedValues) {
  if (!allowedValues.has(value)) {
    errors.push(`${label} 非法：${String(value)}`);
  }
}

function ensureObject(value, errorMessage) {
  if (isRecord(value)) {
    return value;
  }

  errors.push(errorMessage);
  return null;
}

function validateAllowedKeys(value, label, allowedKeys) {
  if (!isRecord(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith('__')) {
      continue;
    }
    if (!allowedKeys.has(key)) {
      errors.push(`${label}.${key} is not allowed`);
    }
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
