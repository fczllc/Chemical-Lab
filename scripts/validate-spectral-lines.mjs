import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const elementsData = JSON.parse(
  await readFile(new URL('../src/data/elements.json', import.meta.url), 'utf8')
);

const spectralLinesPath = process.env.SPECTRAL_LINES_PATH
  ? resolve(process.env.SPECTRAL_LINES_PATH)
  : new URL('../src/data/spectralLines.json', import.meta.url);

const spectralLinesData = JSON.parse(await readFile(spectralLinesPath, 'utf8'));

const errors = [];
const expectedWavelengthRangeNm = [380, 780];
const maxLinesPerElement = 30;
const elementBySymbol = new Map(elementsData.elements.map((element) => [element.symbol, element]));
const expectedSymbols = elementsData.elements.map((element) => element.symbol);
const allowedWrapperKeys = new Set(['spectralLines']);
const allowedSpectralLinesKeys = new Set(['generatedAt', 'source', 'query', 'elements']);
const allowedSourceKeys = new Set(['name', 'url', 'citation']);
const allowedQueryKeys = new Set(['wavelengthRangeNm', 'ionizationStage', 'maxLinesPerElement', 'unit']);
const allowedElementEntryKeys = new Set(['atomicNumber', 'symbol', 'spectrum', 'lines']);
const allowedLineKeys = new Set([
  'wavelengthNm',
  'wavelengthSource',
  'observedWavelengthNm',
  'ritzWavelengthNm',
  'wavenumberCm1',
  'intensityRaw',
  'intensity',
  'relativeIntensity',
  'akiS1',
  'fik',
  'accuracy',
  'lower',
  'upper',
  'transitionType',
  'references'
]);
const allowedLevelKeys = new Set(['energyEv', 'configuration', 'term', 'j', 'g']);
const allowedReferencesKeys = new Set(['transitionProbability', 'line']);
const optionalLineNumericFields = [
  'observedWavelengthNm',
  'ritzWavelengthNm',
  'wavenumberCm1',
  'intensity',
  'relativeIntensity',
  'akiS1',
  'fik'
];
const optionalLineTextFields = [
  'wavelengthSource',
  'intensityRaw',
  'accuracy',
  'transitionType'
];
const optionalLevelNumericFields = ['energyEv', 'g'];
const optionalLevelTextFields = ['configuration', 'term', 'j'];
const optionalReferenceTextFields = ['transitionProbability', 'line'];

const spectralLinesWrapper = ensureObject(spectralLinesData, '光谱线数据顶层必须是对象');
validateAllowedKeys(spectralLinesWrapper, 'dataset', allowedWrapperKeys);

const spectralLines = ensureObject(spectralLinesWrapper?.spectralLines, 'spectralLines 顶层字段必须存在且为对象');
validateAllowedKeys(spectralLines, 'spectralLines', allowedSpectralLinesKeys);

const source = ensureObject(spectralLines?.source, 'spectralLines.source 必须是对象');
const query = ensureObject(spectralLines?.query, 'spectralLines.query 必须是对象');
const entries = ensureObject(spectralLines?.elements, 'spectralLines.elements 必须是对象');

validateSource(source);
validateQuery(query);
validateElementKeys(entries);

for (const symbol of expectedSymbols) {
  const entry = entries?.[symbol];
  const expectedElement = elementBySymbol.get(symbol);

  if (!isRecord(entry)) {
    errors.push(`光谱元素 ${symbol} 条目必须是对象`);
    continue;
  }

  validateElementEntry(symbol, entry, expectedElement);
}

if (errors.length > 0) {
  console.error('光谱线数据校验失败：');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`光谱线数据校验通过：共 ${expectedSymbols.length} 个元素，波长范围 ${expectedWavelengthRangeNm[0]}-${expectedWavelengthRangeNm[1]} nm。`);

function validateSource(source) {
  if (!source) {
    return;
  }

  validateAllowedKeys(source, 'spectralLines.source', allowedSourceKeys);

  validateRequiredText(source.name, 'spectralLines.source.name');
  validateRequiredText(source.url, 'spectralLines.source.url');
  validateRequiredText(source.citation, 'spectralLines.source.citation');

  const sourceText = `${source.name || ''} ${source.citation || ''}`;
  if (!sourceText.includes('NIST') || !sourceText.includes('Atomic Spectra Database')) {
    errors.push('spectralLines.source.name/citation 必须说明 NIST Atomic Spectra Database 来源');
  }

  if (!String(source.citation || '').includes('doi.org/10.18434/T4W30F')) {
    errors.push('spectralLines.source.citation 必须包含 NIST ASD DOI：https://doi.org/10.18434/T4W30F');
  }
}

function validateQuery(query) {
  if (!query) {
    return;
  }

  validateAllowedKeys(query, 'spectralLines.query', allowedQueryKeys);

  if (!Array.isArray(query.wavelengthRangeNm) || query.wavelengthRangeNm.length !== 2 || query.wavelengthRangeNm[0] !== expectedWavelengthRangeNm[0] || query.wavelengthRangeNm[1] !== expectedWavelengthRangeNm[1]) {
    errors.push('spectralLines.query.wavelengthRangeNm 必须严格等于 [380, 780]');
  }

  if (query.ionizationStage !== 'I') {
    errors.push(`spectralLines.query.ionizationStage 必须为 I，实际 ${String(query.ionizationStage)}`);
  }

  if (query.maxLinesPerElement !== maxLinesPerElement) {
    errors.push(`spectralLines.query.maxLinesPerElement 必须为 ${maxLinesPerElement}，实际 ${String(query.maxLinesPerElement)}`);
  }

  if (query.unit !== 'nm') {
    errors.push(`spectralLines.query.unit 必须为 nm，实际 ${String(query.unit)}`);
  }
}

function validateElementKeys(entries) {
  if (!entries) {
    return;
  }

  validateAllowedKeys(entries, 'spectralLines.elements', new Set(expectedSymbols));

  const actualSymbols = Object.keys(entries);
  if (actualSymbols.length !== expectedSymbols.length) {
    errors.push(`光谱元素键数量错误：期望 ${expectedSymbols.length}，实际 ${actualSymbols.length}`);
  }

  for (const symbol of expectedSymbols) {
    if (!Object.hasOwn(entries, symbol)) {
      errors.push(`光谱数据缺少元素键：${symbol}`);
    }
  }

  for (const symbol of actualSymbols) {
    if (!elementBySymbol.has(symbol)) {
      errors.push(`光谱数据包含未知元素键：${symbol}`);
    }
  }
}

function validateElementEntry(symbol, entry, expectedElement) {
  validateAllowedKeys(entry, symbol, allowedElementEntryKeys);

  if (entry.atomicNumber !== expectedElement.atomicNumber) {
    errors.push(`光谱元素 ${symbol} 的 atomicNumber 应为 ${expectedElement.atomicNumber}，实际 ${String(entry.atomicNumber)}`);
  }

  if (entry.symbol !== symbol) {
    errors.push(`光谱元素 ${symbol} 的 symbol 不匹配：${String(entry.symbol)}`);
  }

  if (entry.spectrum !== `${symbol} I`) {
    errors.push(`光谱元素 ${symbol} 的 spectrum 必须为 ${symbol} I，实际 ${String(entry.spectrum)}`);
  }

  if (!Array.isArray(entry.lines)) {
    errors.push(`光谱元素 ${symbol} 的 lines 必须是数组`);
    return;
  }

  if (entry.lines.length > maxLinesPerElement) {
    errors.push(`光谱元素 ${symbol} 的 lines 最多 ${maxLinesPerElement} 条，实际 ${entry.lines.length}`);
  }

  const roundedWavelengths = new Set();
  let previousWavelengthNm = -Infinity;
  for (const [lineIndex, line] of entry.lines.entries()) {
    validateLine(symbol, lineIndex, line, roundedWavelengths, previousWavelengthNm);
    if (isRecord(line) && isFiniteNumber(line.wavelengthNm)) {
      previousWavelengthNm = line.wavelengthNm;
    }
  }
}

function validateLine(symbol, lineIndex, line, roundedWavelengths, previousWavelengthNm) {
  const lineLabel = `${symbol} lines[${lineIndex}]`;
  if (!isRecord(line)) {
    errors.push(`${lineLabel} 必须是对象`);
    return;
  }

  validateAllowedKeys(line, lineLabel, allowedLineKeys);

  if (!isFiniteNumber(line.wavelengthNm)) {
    errors.push(`${lineLabel}.wavelengthNm 必须是有限数字`);
  } else {
    if (line.wavelengthNm < expectedWavelengthRangeNm[0] || line.wavelengthNm > expectedWavelengthRangeNm[1]) {
      errors.push(`${lineLabel}.wavelengthNm 超出 ${expectedWavelengthRangeNm[0]}-${expectedWavelengthRangeNm[1]} nm，value=${line.wavelengthNm}`);
    }

    if (line.wavelengthNm < previousWavelengthNm) {
      errors.push(`${lineLabel}.wavelengthNm 必须按升序排列：${line.wavelengthNm} 小于前一条 ${previousWavelengthNm}`);
    }

    const rounded = line.wavelengthNm.toFixed(4);
    if (roundedWavelengths.has(rounded)) {
      errors.push(`${lineLabel}.wavelengthNm 四舍五入到 4 位后重复：${rounded}`);
    }
    roundedWavelengths.add(rounded);
  }

  if (line.wavelengthSource !== 'observed' && line.wavelengthSource !== 'ritz') {
    errors.push(`${lineLabel}.wavelengthSource 必须为 observed 或 ritz`);
  }

  for (const field of optionalLineNumericFields) {
    validateOptionalNumber(line[field], `${lineLabel}.${field}`);
  }

  if (line.relativeIntensity !== undefined && line.relativeIntensity !== null && isFiniteNumber(line.relativeIntensity) && (line.relativeIntensity < 0 || line.relativeIntensity > 1)) {
    errors.push(`${lineLabel}.relativeIntensity 必须在 0..1 范围内：${line.relativeIntensity}`);
  }

  for (const field of optionalLineTextFields) {
    validateOptionalText(line[field], `${lineLabel}.${field}`);
  }

  validateLevel(requireObject(line.lower, `${lineLabel}.lower`), `${lineLabel}.lower`);
  validateLevel(requireObject(line.upper, `${lineLabel}.upper`), `${lineLabel}.upper`);
  validateReferences(requireObject(line.references, `${lineLabel}.references`), `${lineLabel}.references`);
}

function validateLevel(level, label) {
  if (!level) {
    return;
  }

  validateAllowedKeys(level, label, allowedLevelKeys);

  for (const field of optionalLevelNumericFields) {
    validateOptionalNumber(level[field], `${label}.${field}`);
  }

  for (const field of optionalLevelTextFields) {
    validateOptionalText(level[field], `${label}.${field}`);
  }
}

function validateReferences(references, label) {
  if (!references) {
    return;
  }

  validateAllowedKeys(references, label, allowedReferencesKeys);

  for (const field of optionalReferenceTextFields) {
    validateOptionalText(references[field], `${label}.${field}`);
  }
}

function validateRequiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label} 必须是非空字符串`);
  }
}

function validateOptionalNumber(value, label) {
  if (value === undefined || value === null) {
    return;
  }

  if (!isFiniteNumber(value)) {
    errors.push(`${label} 必须是有限数字、null 或省略`);
  }
}

function validateOptionalText(value, label) {
  if (value === undefined || value === null) {
    return;
  }

  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label} 必须是非空字符串、null 或省略`);
  }
}

function ensureObject(value, errorMessage) {
  if (isRecord(value)) {
    return value;
  }

  errors.push(errorMessage);
  return null;
}

function requireObject(value, label) {
  if (isRecord(value)) {
    return value;
  }

  errors.push(`${label} 必须是对象`);
  return null;
}

function validateAllowedKeys(value, label, allowedKeys) {
  if (!isRecord(value)) {
    return;
  }

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(`${label}.${key} is not allowed`);
    }
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}
