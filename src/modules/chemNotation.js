import katex from 'katex';

const ELEMENT_SYMBOLS = new Set([
  'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
  'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
  'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
  'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr',
  'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn',
  'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd',
  'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb',
  'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
  'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th',
  'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm',
  'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds',
  'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'
]);

const SUBSCRIPT_DIGITS = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9'
};

const SUPERSCRIPT_CHARS = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁺': '+',
  '⁻': '-'
};

const OPERATOR_LATEX = {
  '+': '+',
  '=': '=',
  '→': '\\rightarrow',
  '->': '\\rightarrow',
  '⟶': '\\rightarrow',
  '←': '\\leftarrow',
  '<-': '\\leftarrow',
  '↔': '\\leftrightarrow',
  '⇌': '\\rightleftharpoons',
  '↑': '\\uparrow',
  '↓': '\\downarrow'
};

const CACHE_LIMIT = 250;
const renderCache = new Map();

const BASE_KATEX_OPTIONS = Object.freeze({
  throwOnError: false,
  trust: false,
  output: 'htmlAndMathml',
  maxSize: 10,
  maxExpand: 200,
  strict: 'ignore'
});

export function plainChemText(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .trim()
    .replace(/\\rightarrow/g, '→')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\leftrightarrow/g, '↔')
    .replace(/\\rightleftharpoons/g, '⇌')
    .replace(/\\uparrow/g, '↑')
    .replace(/\\downarrow/g, '↓')
    .replace(/\\mathrm\{([^{}]*)\}/g, '$1')
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (char) => SUBSCRIPT_DIGITS[char])
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/g, (char) => SUPERSCRIPT_CHARS[char])
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ');
}

export function unicodeSubscriptsToText(value) {
  return normalizeInput(value).replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (char) => SUBSCRIPT_DIGITS[char]);
}

export function unicodeSuperscriptsToLatex(value) {
  return normalizeInput(value).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, (match) => {
    const normalized = [...match].map((char) => SUPERSCRIPT_CHARS[char]).join('');
    return `^{${normalized}}`;
  });
}

export function formulaToLatex(value) {
  const input = normalizeFormulaInput(value);
  if (!input) {
    return '';
  }

  const match = input.match(/^(\d*)(.+)$/);
  if (!match) {
    return '';
  }

  const coefficient = match[1] || '';
  const formula = match[2];
  const parsed = convertFormulaBodyWithCharge(formula);
  if (!parsed) {
    return '';
  }

  return `${coefficient}\\mathrm{${parsed.body}}${parsed.suffix}`;
}

export function equationToLatex(value) {
  const input = normalizeFormulaInput(value);
  if (!input) {
    return '';
  }

  const tokens = tokenizeEquation(input);
  if (tokens.length === 0) {
    return '';
  }

  const converted = [];
  let hasFormula = false;

  for (const token of tokens) {
    if (OPERATOR_LATEX[token]) {
      converted.push(OPERATOR_LATEX[token]);
      continue;
    }

    const formula = formulaToLatex(token);
    if (!formula) {
      return '';
    }

    hasFormula = true;
    converted.push(formula);
  }

  return hasFormula ? converted.join(' ') : '';
}

export function electronConfigToLatex(value) {
  const input = normalizeInput(value);
  if (!input || !/^[\[\]A-Za-z0-9\s^{}⁰¹²³⁴⁵⁶⁷⁸⁹]+$/.test(input)) {
    return '';
  }

  return unicodeSuperscriptsToLatex(input)
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(convertElectronConfigToken)
    .filter(Boolean)
    .join('\\;');
}

export function renderFormulaToElement(value, element, options = {}) {
  return renderToElement('formula', value, element, formulaToLatex, options);
}

export function renderEquationToElement(value, element, options = {}) {
  return renderToElement('equation', value, element, equationToLatex, options);
}

export function formulaHTML(value, options = {}) {
  return renderHTML('formula', value, formulaToLatex, options);
}

export function equationHTML(value, options = {}) {
  return renderHTML('equation', value, equationToLatex, options);
}

export function electronConfigHTML(value, options = {}) {
  return renderHTML('electron-config', value, electronConfigToLatex, options);
}

function renderToElement(category, value, element, converter, options) {
  if (!element) {
    return null;
  }

  const plain = plainChemText(value);
  setWrapperAttributes(element, category, plain, options);

  if (!plain) {
    element.replaceChildren?.();
    if (!element.replaceChildren) {
      element.textContent = '';
    }
    return element;
  }

  const latex = converter(value);
  if (!latex) {
    element.textContent = plain;
    return element;
  }

  const katexOptions = safeKatexOptions(options);
  const key = cacheKey(category, value, katexOptions.displayMode);
  const cached = renderCache.get(key);

  if (cached?.html) {
    element.innerHTML = cached.html;
    return element;
  }

  try {
    katex.render(latex, element, katexOptions);
    rememberRender(key, { latex, html: element.innerHTML });
  } catch (error) {
    element.textContent = plain;
  }

  return element;
}

function renderHTML(category, value, converter, options) {
  const plain = plainChemText(value);
  if (!plain) {
    return '';
  }

  const latex = converter(value);
  const className = wrapperClassName(category, options);
  const attrs = `class="${escapeAttribute(className)}" data-plain-text="${escapeAttribute(plain)}" aria-label="${escapeAttribute(plain)}"`;

  if (!latex) {
    return `<span ${attrs}>${escapeHTML(plain)}</span>`;
  }

  const katexOptions = safeKatexOptions(options);
  const key = cacheKey(category, value, katexOptions.displayMode);
  const cached = renderCache.get(key);
  if (cached?.html) {
    return `<span ${attrs}>${cached.html}</span>`;
  }

  try {
    const html = katex.renderToString(latex, katexOptions);
    rememberRender(key, { latex, html });
    return `<span ${attrs}>${html}</span>`;
  } catch (error) {
    return `<span ${attrs}>${escapeHTML(plain)}</span>`;
  }
}

function convertFormulaBodyWithCharge(value) {
  let body = value;
  let suffix = '';

  if (body.endsWith('↑') || body.endsWith('↓')) {
    suffix = OPERATOR_LATEX[body.at(-1)];
    body = body.slice(0, -1);
  }

  const chargeMatch = body.match(/\^([0-9]*[+-]|[+-][0-9]*)$/);
  if (chargeMatch) {
    body = body.slice(0, -chargeMatch[0].length);
    suffix = `${suffix ? `${suffix}` : ''}`;
    const parsedBody = parseFormulaBody(body);
    return parsedBody ? { body: `${parsedBody}^{${chargeMatch[1]}}`, suffix } : null;
  }

  const signedIonMatch = body.match(/([+-])$/);
  if (signedIonMatch) {
    body = body.slice(0, -1);
    const parsedBody = parseFormulaBody(body);
    return parsedBody ? { body: `${parsedBody}^{${signedIonMatch[1]}}`, suffix } : null;
  }

  const parsedBody = parseFormulaBody(body);
  return parsedBody ? { body: parsedBody, suffix } : null;
}

function parseFormulaBody(value) {
  if (!value) {
    return null;
  }

  let index = 0;
  let output = '';

  while (index < value.length) {
    const char = value[index];

    if (/[A-Z]/.test(char)) {
      let symbol = char;
      if (/[a-z]/.test(value[index + 1] || '')) {
        symbol += value[index + 1];
        index += 1;
      }

      if (!ELEMENT_SYMBOLS.has(symbol)) {
        return null;
      }

      const digits = readDigits(value, index + 1);
      output += `${symbol}${subscriptLatex(digits.value)}`;
      index = digits.nextIndex;
      continue;
    }

    if (char === '(' || char === '[' || char === '{') {
      output += char;
      index += 1;
      continue;
    }

    if (char === ')' || char === ']' || char === '}') {
      const digits = readDigits(value, index + 1);
      output += `${char}${subscriptLatex(digits.value)}`;
      index = digits.nextIndex;
      continue;
    }

    if (char === '·' || char === '.') {
      output += '\\cdot ';
      index += 1;
      continue;
    }

    return null;
  }

  return output;
}

function convertElectronConfigToken(token) {
  if (/^\[[A-Z][a-z]?\]$/.test(token)) {
    return `\\mathrm{${token}}`;
  }

  const orbitalMatch = token.match(/^(\d+)([spdfghij])(?:\^\{(\d+)\})?$/i);
  if (orbitalMatch) {
    const [, shell, orbital, electrons] = orbitalMatch;
    return electrons ? `${shell}${orbital}^{${electrons}}` : `${shell}${orbital}`;
  }

  return '';
}

function tokenizeEquation(value) {
  return value
    .replace(/(->|⟶|→|<-|←|↔|⇌|=)/g, ' $1 ')
    .replace(/\s\+\s/g, ' + ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeFormulaInput(value) {
  let input = unicodeSubscriptsToText(value)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+$/g, (match) => {
      const normalized = [...match].map((char) => SUPERSCRIPT_CHARS[char]).join('');
      return `^${normalized}`;
    })
    .replace(/[⁺⁻]/g, (char) => SUPERSCRIPT_CHARS[char])
    .replace(/\s+/g, ' ')
    .trim();

  input = input.replace(/\s*(->|⟶|→|<-|←|↔|⇌|=)\s*/g, ' $1 ');
  return input;
}

function readDigits(value, startIndex) {
  let index = startIndex;
  let digits = '';
  while (/\d/.test(value[index] || '')) {
    digits += value[index];
    index += 1;
  }

  return { value: digits, nextIndex: index };
}

function subscriptLatex(digits) {
  if (!digits) {
    return '';
  }

  return digits.length === 1 ? `_${digits}` : `_{${digits}}`;
}

function setWrapperAttributes(element, category, plain, options) {
  element.classList?.add('chem-notation', `chem-notation--${category}`);
  if (safeKatexOptions(options).displayMode) {
    element.classList?.add('chem-notation--display');
  }
  element.dataset.plainText = plain;
  element.setAttribute('aria-label', plain);
}

function wrapperClassName(category, options) {
  return [
    'chem-notation',
    `chem-notation--${category}`,
    safeKatexOptions(options).displayMode ? 'chem-notation--display' : ''
  ].filter(Boolean).join(' ');
}

function safeKatexOptions(options = {}) {
  return {
    ...BASE_KATEX_OPTIONS,
    displayMode: Boolean(options.displayMode)
  };
}

function cacheKey(category, value, displayMode) {
  return `${category}:${displayMode ? 'display' : 'inline'}:${normalizeInput(value)}`;
}

function rememberRender(key, value) {
  if (renderCache.has(key)) {
    renderCache.delete(key);
  }

  renderCache.set(key, value);
  if (renderCache.size > CACHE_LIMIT) {
    renderCache.delete(renderCache.keys().next().value);
  }
}

function normalizeInput(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value) {
  return escapeHTML(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
