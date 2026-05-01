import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const elementsPath = path.join(projectRoot, 'src/data/elements.json');
const spectralLinesPath = path.join(projectRoot, 'src/data/spectralLines.json');
const cacheDir = path.join(projectRoot, '.cache/nist-asd');
const nistLinesUrl = 'https://physics.nist.gov/cgi-bin/ASD/lines1.pl';
const minLiveDelayMs = 1500;
const requestTimeoutMs = 30000;
const maxRetries = 3;
const maxLinesPerElement = 30;

const exactQueryParameters = {
  low_w: '380',
  upp_w: '780',
  unit: '1',
  format: '2',
  output_type: '0',
  line_out: '0',
  order_out: '0',
  en_unit: '1',
  show_obs_wl: '1',
  show_calc_wl: '1',
  show_wn: '1',
  intens_out: 'on',
  A_out: '0',
  f_out: 'on',
  conf_out: 'on',
  term_out: 'on',
  enrg_out: 'on',
  J_out: 'on',
  bibrefs: '1',
  remove_js: 'on',
  submit: 'Retrieve Data',
  // NIST's current lines form posts these defaults; omitting them can make
  // lines1.pl return HTTP 500 instead of CSV for otherwise valid requests.
  show_av: '2',
  allowed_out: '1',
  forbid_out: '1'
};

let lastLiveRequestAt = 0;

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const elementsData = JSON.parse(await readFile(elementsPath, 'utf8'));
  const spectralData = JSON.parse(await readFile(spectralLinesPath, 'utf8'));
  const elementEntries = getAuthoritativeElements(elementsData);
  ensureSpectralElementEntries(spectralData, elementEntries);
  const targetElements = selectTargetElements(elementEntries, options.symbols);

  if (options.fromCache) {
    const missing = [];
    for (const element of targetElements) {
      const cachePath = getCachePath(element);
      if (!(await fileExists(cachePath))) {
        missing.push(path.relative(projectRoot, cachePath));
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing NIST cache file(s) in --from-cache mode; no network requests were made:\n- ${missing.join('\n- ')}`);
    }
  }

  if (!options.fromCache) {
    await mkdir(cacheDir, { recursive: true });
  }

  for (const element of targetElements) {
    const cachePath = getCachePath(element);
    const csv = await loadCsvForElement(element, cachePath, options);
    const lines = selectSpectralLines(parseNistCsv(csv));
    spectralData.spectralLines.elements[element.symbol] = {
      ...spectralData.spectralLines.elements[element.symbol],
      atomicNumber: element.atomicNumber,
      symbol: element.symbol,
      spectrum: `${element.symbol} I`,
      lines
    };
    console.log(`${element.symbol}: selected ${lines.length} spectral line(s)`);
  }

  await writeFile(spectralLinesPath, `${JSON.stringify(spectralData, null, 2)}\n`, 'utf8');
}

function parseArguments(args) {
  const options = {
    refresh: false,
    fromCache: false,
    symbols: null
  };

  for (const arg of args) {
    if (arg === '--refresh') {
      options.refresh = true;
    } else if (arg === '--from-cache') {
      options.fromCache = true;
    } else if (arg.startsWith('--symbols=')) {
      const symbols = arg.slice('--symbols='.length).split(',').map((symbol) => symbol.trim()).filter(Boolean);
      if (symbols.length === 0) {
        throw new Error('--symbols requires at least one element symbol, for example --symbols=H,He');
      }
      options.symbols = symbols;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.refresh && options.fromCache) {
    throw new Error('Use only one of --refresh or --from-cache.');
  }

  return options;
}

function selectTargetElements(elements, symbols) {
  if (!symbols) {
    return [...elements].sort((left, right) => left.atomicNumber - right.atomicNumber);
  }

  const bySymbol = new Map(elements.map((element) => [element.symbol, element]));
  const unknown = symbols.filter((symbol) => !bySymbol.has(symbol));
  if (unknown.length > 0) {
    throw new Error(`Unknown element symbol(s): ${unknown.join(', ')}`);
  }

  return symbols.map((symbol) => bySymbol.get(symbol));
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

function ensureSpectralElementEntries(spectralData, elements) {
  const existingElements = spectralData.spectralLines.elements || {};
  const nextElements = {};

  for (const element of [...elements].sort((left, right) => left.atomicNumber - right.atomicNumber)) {
    const existing = existingElements[element.symbol] || {};
    nextElements[element.symbol] = {
      ...existing,
      atomicNumber: element.atomicNumber,
      symbol: element.symbol,
      spectrum: `${element.symbol} I`,
      lines: Array.isArray(existing.lines) ? existing.lines : []
    };
  }

  spectralData.spectralLines.elements = nextElements;
}

async function loadCsvForElement(element, cachePath, options) {
  if (!options.refresh && await fileExists(cachePath)) {
    return readFile(cachePath, 'utf8');
  }

  if (options.fromCache) {
    return readFile(cachePath, 'utf8');
  }

  const csv = await fetchNistCsv(element);
  await writeFile(cachePath, csv, 'utf8');
  return csv;
}

async function fetchNistCsv(element) {
  const url = buildNistUrl(element.symbol);
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    await waitForLiveRequestSlot();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    lastLiveRequestAt = Date.now();

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`NIST request failed for ${element.symbol} with HTTP ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await sleep(500 * (2 ** (attempt - 1)));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Unable to fetch NIST CSV for ${element.symbol} after ${maxRetries} attempt(s): ${lastError?.message || 'unknown error'}`);
}

function buildNistUrl(symbol) {
  const url = new URL(nistLinesUrl);
  url.searchParams.set('spectra', `${symbol} I`);
  for (const [key, value] of Object.entries(exactQueryParameters)) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function waitForLiveRequestSlot() {
  const elapsed = Date.now() - lastLiveRequestAt;
  if (lastLiveRequestAt > 0 && elapsed < minLiveDelayMs) {
    await sleep(minLiveDelayMs - elapsed);
  }
}

function parseNistCsv(csv) {
  const rows = parseCsvRows(csv);
  const headerIndex = findHeaderIndex(rows);
  if (headerIndex < 0) {
    return [];
  }

  const headers = rows[headerIndex].map((header) => normalizeHeader(cleanCell(header)));
  const records = [];

  for (const row of rows.slice(headerIndex + 1)) {
    if (row.every((cell) => cleanCell(cell) === '')) {
      continue;
    }

    const record = {};
    headers.forEach((header, index) => {
      if (header) {
        record[header] = cleanCell(row[index] || '');
      }
    });
    records.push(record);
  }

  return records.map(toSpectralLine).filter(Boolean);
}

function parseCsvRows(csv) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((csvRow) => csvRow.some((value) => cleanCell(value) !== ''));
}

function findHeaderIndex(rows) {
  return rows.findIndex((row) => {
    const normalized = row.map((cell) => normalizeHeader(cleanCell(cell)));
    return normalized.some((header) => header.includes('obs') || header.includes('observed'))
      && normalized.some((header) => header.includes('ritz') || header.includes('calc'));
  });
}

function toSpectralLine(record) {
  const observed = getNumber(record, ['observed', 'obs wl', 'obs wl air nm', 'obs wl vac nm', 'obs_wl_air nm', 'obs_wl_vac nm']);
  const ritz = getNumber(record, ['ritz', 'calc', 'ritz wl', 'ritz wl air nm', 'ritz wl vac nm', 'ritz_wl_air nm', 'ritz_wl_vac nm']);
  const wavelengthNm = observed ?? ritz;

  if (wavelengthNm === null || wavelengthNm < 380 || wavelengthNm > 780) {
    return null;
  }

  const intensityText = getText(record, ['rel int', 'rel intensity', 'intens', 'intensity']);
  const intensity = parseOptionalNumber(intensityText);

  return {
    wavelengthNm: roundTo(wavelengthNm, 4),
    wavelengthSource: observed !== null ? 'observed' : 'ritz',
    observedWavelengthNm: observed === null ? null : roundTo(observed, 4),
    ritzWavelengthNm: ritz === null ? null : roundTo(ritz, 4),
    wavenumberCm1: getNumber(record, ['wn', 'wavenumber', 'wave number', 'ritz wn', 'obs wn']),
    intensityRaw: intensityText,
    intensity,
    relativeIntensity: null,
    akiS1: getNumber(record, ['aki', 'a ki', 'a_ki', 'transition probability']),
    fik: getNumber(record, ['fik', 'f ik', 'f_ik', 'oscillator strength']),
    accuracy: getText(record, ['accuracy', 'acc']),
    lower: {
      energyEv: getNumber(record, ['ei', 'e i', 'lower energy', 'lower level energy']),
      configuration: getText(record, ['lower conf', 'lower configuration', 'conf i', 'configuration lower']),
      term: getText(record, ['lower term', 'term i']),
      j: getText(record, ['lower j', 'j i']),
      g: getNumber(record, ['lower g', 'g i'])
    },
    upper: {
      energyEv: getNumber(record, ['ek', 'e k', 'upper energy', 'upper level energy']),
      configuration: getText(record, ['upper conf', 'upper configuration', 'conf k', 'configuration upper']),
      term: getText(record, ['upper term', 'term k']),
      j: getText(record, ['upper j', 'j k']),
      g: getNumber(record, ['upper g', 'g k'])
    },
    transitionType: getText(record, ['transition type', 'type']),
    references: {
      transitionProbability: getText(record, ['tp ref', 'transition probability ref', 'a ref', 'aki ref']),
      line: getText(record, ['line ref', 'reference', 'ref', 'bibrefs', 'bibref'])
    }
  };
}

function selectSpectralLines(lines) {
  const deduped = new Map();

  for (const line of lines) {
    const key = line.wavelengthNm.toFixed(4);
    const existing = deduped.get(key);
    if (!existing || compareLineQuality(line, existing) < 0) {
      deduped.set(key, line);
    }
  }

  const selected = Array.from(deduped.values())
    .sort(compareForSelection)
    .slice(0, maxLinesPerElement)
    .sort((left, right) => left.wavelengthNm - right.wavelengthNm);

  return withRelativeIntensity(selected);
}

function withRelativeIntensity(lines) {
  const maxIntensity = lines.reduce((max, line) => {
    return Number.isFinite(line.intensity) && line.intensity > max ? line.intensity : max;
  }, 0);

  return lines.map((line) => ({
    ...line,
    relativeIntensity: Number.isFinite(line.intensity) && maxIntensity > 0
      ? roundTo(line.intensity / maxIntensity, 6)
      : null
  }));
}

function compareLineQuality(left, right) {
  if (left.wavelengthSource !== right.wavelengthSource) {
    return left.wavelengthSource === 'observed' ? -1 : 1;
  }
  return compareIntensityDescending(left, right) || left.wavelengthNm - right.wavelengthNm;
}

function compareForSelection(left, right) {
  return compareIntensityDescending(left, right) || left.wavelengthNm - right.wavelengthNm;
}

function compareIntensityDescending(left, right) {
  const leftIntensity = Number.isFinite(left.intensity) ? left.intensity : -Infinity;
  const rightIntensity = Number.isFinite(right.intensity) ? right.intensity : -Infinity;
  return rightIntensity - leftIntensity;
}

function cleanCell(value) {
  let cleaned = String(value ?? '').replace(/^\uFEFF/, '').trim();
  if (cleaned.startsWith('=')) {
    cleaned = cleaned.slice(1).trim();
  }
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  cleaned = cleaned.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return cleaned || '';
}

function normalizeHeader(value) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getText(record, candidates) {
  const value = getRawValue(record, candidates);
  return normalizeText(value);
}

function getNumber(record, candidates) {
  return parseOptionalNumber(getRawValue(record, candidates));
}

function getRawValue(record, candidates) {
  for (const candidate of candidates.map(normalizeHeader)) {
    if (Object.prototype.hasOwnProperty.call(record, candidate)) {
      return record[candidate];
    }
  }

  for (const [header, value] of Object.entries(record)) {
    if (candidates.some((candidate) => header.includes(normalizeHeader(candidate)))) {
      return value;
    }
  }

  return '';
}

function normalizeText(value) {
  const text = cleanCell(value).replace(/^\[(.*)]$/, '$1').trim();
  return text === '' ? null : text;
}

function parseOptionalNumber(value) {
  const text = normalizeText(value);
  if (text === null) {
    return null;
  }

  const match = text.replace(/,/g, '').match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?/);
  if (!match) {
    return null;
  }

  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function roundTo(value, decimals) {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

function getCachePath(element) {
  return path.join(cacheDir, `${element.atomicNumber}-${element.symbol}-I-380-780.csv`);
}

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
