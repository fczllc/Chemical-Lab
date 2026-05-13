import process from 'node:process';
import { fileURLToPath } from 'node:url';

const elementSymbols = new Set([
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

const subscriptDigits = {
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

const reversiblePattern = /\\rightleftharpoons|\\leftrightharpoons|\\rightleftarrows|\\leftrightarrow|⇌|↔|<=>|<->|←|\\leftarrow/u;
const supportedOperatorPattern = /--[^-]+-->|->|→|⟶|=/gu;
const blankPattern = /_{2,}|…{2,}|\\_{2,}|填空|待填|空白|□|◻|____|\\square|\\boxed\s*\{\s*\}|\\underline\s*\{\s*\}/u;
const genericSchemaPattern = /(?:^|[+\s=→-])(?:A|B|D|E|G|M|Q|R|X|Y|Z)(?:\d*)?(?=$|[+\s=→-])/u;
const ionicPattern = /\\(?:mathrm\s*)?\{?e\}?\s*(?:\^\s*\{?[-+]|[-+])|\^\s*\{?\s*\d*\s*[-+]\s*\}?|[⁺⁻]|(?:[A-Z][a-z]?\d*|\))\s*(?:\^\s*)?[+-](?=\s*(?:\+|=|→|$))/u;
const phaseDefinitions = new Map([
  ['↑', { type: 'gas', marker: '↑' }],
  ['↓', { type: 'precipitate', marker: '↓' }],
  ['(g)', { type: 'gas', marker: '(g)' }],
  ['(s)', { type: 'precipitate', marker: '(s)' }]
]);

export function normalizeReactionEquation(value) {
  const originalEquation = String(value ?? '');
  const earlyUnsupported = unsupportedBeforeNormalization(originalEquation);

  if (earlyUnsupported) {
    return unsupportedResult(originalEquation, '', earlyUnsupported);
  }

  const conditions = [];
  const normalizedText = normalizeEquationText(originalEquation, conditions);
  const textUnsupported = unsupportedAfterNormalization(normalizedText);

  if (textUnsupported) {
    return unsupportedResult(originalEquation, normalizedText, textUnsupported);
  }

  const split = splitNormalizedEquation(normalizedText);
  if (split.unsupportedReason) {
    return unsupportedResult(originalEquation, normalizedText, split.unsupportedReason);
  }

  const reactantSide = parseEquationSide(split.left, 'reactants');
  const productSide = parseEquationSide(split.right, 'products');

  if (reactantSide.unsupportedReason) {
    return unsupportedResult(originalEquation, normalizedText, reactantSide.unsupportedReason);
  }

  if (productSide.unsupportedReason) {
    return unsupportedResult(originalEquation, normalizedText, productSide.unsupportedReason);
  }

  if (reactantSide.formulas.length === 0 || productSide.formulas.length === 0) {
    return unsupportedResult(originalEquation, normalizedText, reason('empty-side', 'Equation must have non-empty reactants and products.'));
  }

  const normalizedEquation = buildNormalizedEquation(reactantSide.terms, split.operator, productSide.terms);

  return {
    originalEquation,
    normalizedEquation,
    reactants: reactantSide.formulas,
    products: productSide.formulas,
    conditions: uniqueStrings([...conditions, ...split.conditions]),
    phaseMarkers: [...reactantSide.phaseMarkers, ...productSide.phaseMarkers],
    unsupportedReason: null,
    gameUsable: true
  };
}

export function normalizeEquationText(value, conditions = []) {
  let text = String(value ?? '')
    .replace(/^\uFEFF/u, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\\\[|\\\]|\\\(|\\\)/g, ' ')
    .replace(/\$\$/g, ' ')
    .replace(/\$/g, ' ')
    .replace(/\\begin\s*\{[^{}]+\}|\\end\s*\{[^{}]+\}/g, ' ')
    .replace(/\\(?:Bigg|bigg|Big|big|left|right)\s*(?=[()\[\]{}|])/g, '')
    .replace(/\\(?:,|;|:|!|quad|qquad|~)/g, ' ')
    .replace(/[＋]/g, '+')
    .replace(/[＝]/g, '=')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[｛]/g, '{')
    .replace(/[｝]/g, '}')
    .replace(/[；]/g, ';')
    .replace(/[：]/g, ':')
    .replace(/[，、]/g, ',')
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (character) => subscriptDigits[character]);

  text = replaceTextCommands(text);
  text = replaceMathRomanCommands(text);
  text = replaceConditionOperators(text, conditions);

  return text
    .replace(/\\(?:long)?rightarrow/g, '→')
    .replace(/\\uparrow/g, '↑')
    .replace(/\\downarrow/g, '↓')
    .replace(/_\s*\{\s*([0-9]+)\s*\}/g, '$1')
    .replace(/_\s*([0-9]+)/g, '$1')
    .replace(/\^\s*\{\s*([^{}]+?)\s*\}/g, '^$1')
    .replace(/\s*([+＝=→⟶])\s*/g, ' $1 ')
    .replace(/\s*((?<!-)->)\s*/g, ' $1 ')
    .replace(/\s*(--[^-]+-->)\s*/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitNormalizedEquation(normalizedText) {
  const matches = [...String(normalizedText ?? '').matchAll(supportedOperatorPattern)];

  if (matches.length !== 1) {
    return {
      unsupportedReason: reason('operator-count', `Expected exactly one supported equation operator, found ${matches.length}.`)
    };
  }

  const match = matches[0];
  const rawOperator = match[0];
  const left = normalizedText.slice(0, match.index).trim();
  const right = normalizedText.slice((match.index ?? 0) + rawOperator.length).trim();
  const conditionMatch = rawOperator.match(/^--(.+)-->$/u);

  return {
    left,
    right,
    operator: conditionMatch ? `--${conditionMatch[1]}-->` : normalizeOperator(rawOperator),
    conditions: conditionMatch ? [conditionMatch[1]] : []
  };
}

export function parseEquationSide(sideText, sideName = 'side') {
  if (!sideText || /[,;:。！？?]/u.test(sideText)) {
    return { unsupportedReason: reason('malformed-side', `${sideName} contains punctuation or is empty.`) };
  }

  const terms = String(sideText).split('+').map((term) => term.trim()).filter(Boolean);
  const formulas = [];
  const parsedTerms = [];
  const phaseMarkers = [];

  if (terms.length === 0) {
    return { unsupportedReason: reason('empty-side', `${sideName} has no formula terms.`) };
  }

  for (const termText of terms) {
    const parsed = parseEquationTerm(termText);
    if (parsed.unsupportedReason) {
      return parsed;
    }

    formulas.push(parsed.formula);
    parsedTerms.push(parsed.term);

    for (const marker of parsed.phaseMarkers) {
      phaseMarkers.push({
        side: sideName,
        formula: marker.formula,
        marker: marker.marker,
        type: marker.type
      });
    }
  }

  return {
    formulas,
    terms: parsedTerms,
    phaseMarkers
  };
}

export function parseEquationTerm(value) {
  const phaseMarkers = [];
  let term = compactTerm(value);
  term = extractTrailingPhaseMarkers(term, phaseMarkers);

  const match = term.match(/^(?:(\d+))?(.+)$/u);
  if (!match) {
    return { unsupportedReason: reason('malformed-term', `Could not parse term: ${value}`) };
  }

  const coefficient = match[1] || '';
  const formula = match[2];

  if (!isFormulaText(formula)) {
    return { unsupportedReason: reason('invalid-formula', `Unsupported formula term: ${value}`) };
  }

  for (const marker of phaseMarkers) {
    marker.formula = formula;
  }

  return {
    formula,
    term: {
      coefficient,
      formula,
      text: `${coefficient}${formula}`
    },
    phaseMarkers
  };
}

export function isFormulaText(value) {
  const formula = String(value ?? '');
  if (!formula || /[^A-Za-z0-9()[\]·.]/u.test(formula)) {
    return false;
  }

  const stack = [];
  let index = 0;
  let sawElement = false;

  while (index < formula.length) {
    const character = formula[index];

    if (/[A-Z]/u.test(character)) {
      let symbol = character;
      if (/[a-z]/u.test(formula[index + 1] || '')) {
        symbol += formula[index + 1];
        index += 1;
      }

      if (!elementSymbols.has(symbol)) {
        return false;
      }

      sawElement = true;
      index = readDigits(formula, index + 1).nextIndex;
      continue;
    }

    if (character === '(' || character === '[') {
      stack.push(character);
      index += 1;
      continue;
    }

    if (character === ')' || character === ']') {
      const expectedOpen = character === ')' ? '(' : '[';
      if (stack.pop() !== expectedOpen) {
        return false;
      }

      index = readDigits(formula, index + 1).nextIndex;
      continue;
    }

    if (character === '·' || character === '.') {
      const hydrate = readDigits(formula, index + 1);
      if (!hydrate.value) {
        return false;
      }

      index = hydrate.nextIndex;
      continue;
    }

    if (/\d/u.test(character)) {
      return false;
    }

    return false;
  }

  return sawElement && stack.length === 0;
}

function unsupportedBeforeNormalization(originalEquation) {
  if (!String(originalEquation ?? '').trim()) {
    return reason('empty-input', 'Equation text is empty.');
  }

  if (reversiblePattern.test(originalEquation)) {
    return reason('reversible-equilibrium', 'Reversible or equilibrium equations are not game-usable.');
  }

  if (blankPattern.test(originalEquation)) {
    return reason('fill-in-blank', 'Fill-in-blank equations are not normalized.');
  }

  if (ionicPattern.test(originalEquation)) {
    return reason('ionic-or-half-reaction', 'Ionic, charged, electron, or half-reaction notation is not game-usable.');
  }

  return null;
}

function unsupportedAfterNormalization(normalizedText) {
  if (!normalizedText) {
    return reason('empty-input', 'Equation text is empty after normalization.');
  }

  if (reversiblePattern.test(normalizedText)) {
    return reason('reversible-equilibrium', 'Reversible or equilibrium equations are not game-usable.');
  }

  if (blankPattern.test(normalizedText)) {
    return reason('fill-in-blank', 'Fill-in-blank equations are not normalized.');
  }

  if (ionicPattern.test(normalizedText)) {
    return reason('ionic-or-half-reaction', 'Ionic, charged, electron, or half-reaction notation is not game-usable.');
  }

  if (/\\|[{}]|\^/u.test(normalizedText)) {
    return reason('unsupported-latex', 'Unsupported LaTeX or superscript syntax remains after normalization.');
  }

  if (genericSchemaPattern.test(normalizedText)) {
    return reason('generic-schema', 'Generic symbolic reaction schemas are not game-usable.');
  }

  if (!/[A-Z]/u.test(normalizedText)) {
    return reason('word-only', 'No chemical formula tokens were found.');
  }

  return null;
}

function replaceTextCommands(text) {
  return text.replace(/\\text\s*\{([^{}]*)\}/g, (_, inner) => sanitizeCondition(inner));
}

function replaceMathRomanCommands(text) {
  let previous;
  let current = text;

  do {
    previous = current;
    current = current.replace(/\\mathrm\s*\{([^{}]*)\}/g, (_, inner) => compactFormulaLikeText(inner));
  } while (current !== previous);

  return current;
}

function replaceConditionOperators(text, conditions) {
  return text
    .replace(/\\xlongequal\s*\{([^{}]*)\}/g, (_, condition) => conditionOperator(condition, conditions))
    .replace(/\\xrightarrow\s*\{([^{}]*)\}/g, (_, condition) => conditionOperator(condition, conditions))
    .replace(/\\stackrel\s*\{([^{}]*)\}\s*\{\s*(?:=|\\(?:right|longright)arrow)\s*\}/g, (_, condition) => conditionOperator(condition, conditions));
}

function conditionOperator(value, conditions) {
  const condition = sanitizeCondition(value);
  if (condition) {
    conditions.push(condition);
    return ` --${condition}--> `;
  }

  return ' → ';
}

function sanitizeCondition(value) {
  return String(value ?? '')
    .replace(/\\text\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\mathrm\s*\{([^{}]*)\}/g, '$1')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function compactFormulaLikeText(value) {
  return String(value ?? '').replace(/\s+/g, '');
}

function compactTerm(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/_\{([0-9]+)\}/g, '$1')
    .replace(/_([0-9]+)/g, '$1');
}

function extractTrailingPhaseMarkers(value, phaseMarkers) {
  let term = value;
  let found = true;

  while (found) {
    found = false;

    for (const [suffix, definition] of phaseDefinitions) {
      if (term.endsWith(suffix)) {
        phaseMarkers.unshift({ marker: definition.marker, type: definition.type, formula: '' });
        term = term.slice(0, -suffix.length);
        found = true;
        break;
      }
    }
  }

  return term;
}

function buildNormalizedEquation(leftTerms, operator, rightTerms) {
  return `${formatTerms(leftTerms)} ${operator} ${formatTerms(rightTerms)}`;
}

function formatTerms(terms) {
  return terms.map((term) => term.text).join(' + ');
}

function normalizeOperator(value) {
  return value === '->' || value === '⟶' ? '→' : value;
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function readDigits(value, startIndex) {
  let index = startIndex;
  let digits = '';

  while (/\d/u.test(value[index] || '')) {
    digits += value[index];
    index += 1;
  }

  return { value: digits, nextIndex: index };
}

function reason(code, message) {
  return { code, message };
}

function unsupportedResult(originalEquation, normalizedText, unsupportedReason) {
  return {
    originalEquation,
    normalizedEquation: normalizedText || '',
    reactants: [],
    products: [],
    conditions: [],
    phaseMarkers: [],
    unsupportedReason,
    gameUsable: false
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runSelfTest() {
  const supported = [
    {
      name: 'combustion-xlongequal',
      input: String.raw`C + O2 \xlongequal{点燃} CO2`,
      reactants: ['C', 'O2'],
      products: ['CO2'],
      conditions: ['点燃']
    },
    {
      name: 'displacement-equals',
      input: String.raw`Fe + CuSO4 = Cu + FeSO4`,
      reactants: ['Fe', 'CuSO4'],
      products: ['Cu', 'FeSO4'],
      conditions: []
    },
    {
      name: 'carbonate-acid-spaced-gas',
      input: String.raw`N a _ { 2 } C O _ { 3 } + 2 H C l = 2 N a C l + C O _ { 2 } \uparrow + H _ { 2 } O`,
      reactants: ['Na2CO3', 'HCl'],
      products: ['NaCl', 'CO2', 'H2O'],
      phaseMarkers: [{ side: 'products', formula: 'CO2', marker: '↑', type: 'gas' }]
    },
    {
      name: 'carbonate-base-spaced-precipitate',
      input: String.raw`N a _ { 2 } C O _ { 3 } + C a ( O H ) _ { 2 } = C a C O _ { 3 } \downarrow + 2 N a O H`,
      reactants: ['Na2CO3', 'Ca(OH)2'],
      products: ['CaCO3', 'NaOH'],
      phaseMarkers: [{ side: 'products', formula: 'CaCO3', marker: '↓', type: 'precipitate' }]
    },
    {
      name: 'textbook-mathrm-condition',
      input: String.raw`\mathrm {C} + \mathrm {O} _ {2} \xlongequal {\text {点 燃}} \mathrm {C O} _ {2}`,
      reactants: ['C', 'O2'],
      products: ['CO2'],
      conditions: ['点燃']
    },
    {
      name: 'stackrel-condition',
      input: String.raw`2 H2 + O2 \stackrel{点燃}{=} 2 H2O`,
      reactants: ['H2', 'O2'],
      products: ['H2O'],
      conditions: ['点燃']
    }
  ];

  const unsupported = unsupportedFixtures();
  const supportedResults = supported.map((fixture) => {
    const result = normalizeReactionEquation(fixture.input);
    assert(!result.unsupportedReason, `${fixture.name} unexpectedly unsupported: ${JSON.stringify(result.unsupportedReason)}`);
    assert(JSON.stringify(result.reactants) === JSON.stringify(fixture.reactants), `${fixture.name} reactants mismatch: ${JSON.stringify(result.reactants)}`);
    assert(JSON.stringify(result.products) === JSON.stringify(fixture.products), `${fixture.name} products mismatch: ${JSON.stringify(result.products)}`);
    assert(result.reactants.length > 0 && result.products.length > 0, `${fixture.name} must have non-empty sides`);

    if (fixture.conditions) {
      assert(JSON.stringify(result.conditions) === JSON.stringify(fixture.conditions), `${fixture.name} conditions mismatch: ${JSON.stringify(result.conditions)}`);
    }

    if (fixture.phaseMarkers) {
      assert(JSON.stringify(result.phaseMarkers) === JSON.stringify(fixture.phaseMarkers), `${fixture.name} phase markers mismatch: ${JSON.stringify(result.phaseMarkers)}`);
    }

    return { name: fixture.name, result };
  });

  const unsupportedResults = unsupported.map((fixture) => {
    const result = normalizeReactionEquation(fixture.input);
    assert(result.unsupportedReason, `${fixture.name} should be unsupported`);
    assert(result.reactants.length === 0 && result.products.length === 0, `${fixture.name} should not expose gameplay sides`);
    assert(result.gameUsable === false, `${fixture.name} should not be game usable`);

    if (fixture.code) {
      assert(result.unsupportedReason.code === fixture.code, `${fixture.name} code mismatch: ${result.unsupportedReason.code}`);
    }

    return { name: fixture.name, result };
  });

  return {
    status: 'pass',
    supportedCount: supportedResults.length,
    unsupportedCount: unsupportedResults.length,
    supportedResults,
    unsupportedResults
  };
}

function unsupportedFixtures() {
  return [
    {
      name: 'incomplete-blank',
      input: String.raw`C + O2 = ____`,
      code: 'fill-in-blank'
    },
    {
      name: 'word-only',
      input: '碳在氧气中燃烧生成二氧化碳',
      code: 'word-only'
    },
    {
      name: 'reversible-equilibrium',
      input: String.raw`CO3^2- + H2O \rightleftharpoons HCO3^- + OH^-`,
      code: 'reversible-equilibrium'
    },
    {
      name: 'ionic-equation',
      input: String.raw`Ag+ + Cl- = AgCl\downarrow`,
      code: 'ionic-or-half-reaction'
    },
    {
      name: 'generic-schema',
      input: 'A + B = AB',
      code: 'generic-schema'
    },
    {
      name: 'multiple-equation-array',
      input: String.raw`\begin{array}{c}H2O \rightleftharpoons OH^- + H^+\\Na2CO3 = 2Na^+ + CO3^2-\end{array}`,
      code: 'reversible-equilibrium'
    }
  ];
}

function printHelp() {
  console.log(`Reaction equation normalizer / 教材反应方程式规范化工具

Usage:
  node scripts/textbook/reaction-equation-normalizer.mjs --self-test
  node scripts/textbook/reaction-equation-normalizer.mjs --unsupported-fixtures

Options:
  --self-test             Run built-in supported and unsupported fixtures.
  --unsupported-fixtures  Print unsupported fixture outputs as JSON.
  --help                  Show this help.`);
}

function main(args) {
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  if (args.includes('--self-test')) {
    const result = runSelfTest();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (args.includes('--unsupported-fixtures')) {
    const result = unsupportedFixtures().map((fixture) => ({
      name: fixture.name,
      input: fixture.input,
      result: normalizeReactionEquation(fixture.input)
    }));
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printHelp();
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
