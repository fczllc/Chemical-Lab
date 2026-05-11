import {
  equationHTML,
  equationToLatex,
  formulaHTML,
  formulaToLatex,
  mixedProseFormulaHTML,
  plainChemText
} from '../src/modules/chemNotation.js';
import { quizData, reactions } from '../src/data/index.js';

const requiredGroups = [
  {
    name: 'hydrates',
    cases: [
      { kind: 'formula', value: 'CuSO4·5H2O', latexIncludes: ['\\cdot', '5H_2O'] },
      { kind: 'formula', value: 'Fe2(SO4)3', latexIncludes: ['Fe_2', '(SO_4)_3'] }
    ]
  },
  {
    name: 'states',
    cases: [
      {
        kind: 'equation',
        value: 'NaOH(aq) + HCl(aq) → NaCl(aq) + H2O(l)',
        latexIncludes: ['\\mathrm{(aq)}', '\\mathrm{(l)}', '\\rightarrow']
      }
    ]
  },
  {
    name: 'ions',
    cases: [
      { kind: 'formula', value: 'NH4+', latexIncludes: ['NH_4^{+}'] },
      { kind: 'formula', value: 'SO4^2-', latexIncludes: ['SO_4^{2-}'] },
      { kind: 'equation', value: 'Ag+ + Cl- → AgCl↓', latexIncludes: ['Ag^{+}', 'Cl^{-}', 'AgCl', '\\downarrow'] }
    ]
  },
  {
    name: 'reactionSymbols',
    cases: [
      { kind: 'equation', value: 'CaCO3 → CaO + CO2↑', latexIncludes: ['CaCO_3', '\\rightarrow'] },
      { kind: 'equation', value: 'N2 + 3H2 ⇌ 2NH3', latexIncludes: ['\\rightleftharpoons', '3\\mathrm{H_2}', '2\\mathrm{NH_3}'] },
      { kind: 'equation', value: 'CaCO3 --heat--> CaO + CO2↑', latexIncludes: ['\\xrightarrow{\\mathrm{heat}}', 'CaO'] }
    ]
  }
];

const errors = [];
const REACTION_PROSE_FORMULA_PATTERN = /\$\$[\s\S]+?\$\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]|\\mathrm\{[^{}]*\}|\\frac\{[^{}]*\}\{[^{}]*\}|\$[^$]+\$/;

const mixedCases = [
  {
    name: 'mixed-prose-valid',
    value: String.raw`向试管加入 $2 \mathrm{~mL}$ 水，并补充 raw \mathrm{mL} 与 \frac{1}{4}。`,
    expectContains: [String.raw`\mathrm{~mL}`, String.raw`\frac`],
    expectKatex: true
  },
  {
    name: 'mixed-prose-malformed',
    value: String.raw`向试管加入 $\frac{1}{`,
    expectContains: ['向试管加入', String.raw`$\frac{1}{`],
    expectKatex: false
  }
];

const reactionProseDiagnosticsEnabled = process.argv.includes('--diagnose-reaction-prose');
const reactionProseDiagnosticsShouldFail = process.argv.includes('--fail-diagnostics');

for (const testCase of mixedCases) {
  validateMixedCase(testCase);
}


for (const group of requiredGroups) {
  for (const testCase of group.cases) {
    validateCase(group.name, testCase);
  }
  console.log(`${group.name}: valid`);
}

validateReviewedNotationFields('quizData', quizData);
validateReviewedNotationFields('reactions', reactions);
validateReactionProseFields('reactions', reactions, errors);

if (reactionProseDiagnosticsEnabled) {
  const diagnosticErrors = emitReactionProseDiagnostics();
  if (reactionProseDiagnosticsShouldFail) {
    errors.push(...diagnosticErrors);
  }
}

if (errors.length > 0) {
  console.error('Chemical notation validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('chemicalNotation: valid');

function validateCase(groupName, testCase) {
  const converter = testCase.kind === 'formula' ? formulaToLatex : equationToLatex;
  const renderer = testCase.kind === 'formula' ? formulaHTML : equationHTML;
  const latex = converter(testCase.value);
  const html = renderer(testCase.value);
  const plain = plainChemText(testCase.value);

  if (!latex) {
    errors.push(`${groupName} ${testCase.value} did not produce LaTeX`);
    return;
  }

  for (const expected of testCase.latexIncludes) {
    if (!latex.includes(expected)) {
      errors.push(`${groupName} ${testCase.value} LaTeX missing ${expected}; got ${latex}`);
    }
  }

  if (!html.includes('class="katex')) {
    errors.push(`${groupName} ${testCase.value} rendered without KaTeX markup`);
  }
  if (!html.includes(`data-plain-text="${escapeAttribute(plain)}"`)) {
    errors.push(`${groupName} ${testCase.value} missing plain-text metadata`);
  }

  const fallbackMarkup = `<span class="chem-notation chem-notation--${testCase.kind}" data-plain-text="${escapeAttribute(plain)}" aria-label="${escapeAttribute(plain)}">${escapeHTML(plain)}</span>`;
  if (html === fallbackMarkup) {
    errors.push(`${groupName} ${testCase.value} silently fell back to plain text`);
  }
}

function validateMixedCase(testCase) {
  let html = '';
  try {
    html = mixedProseFormulaHTML(testCase.value);
  } catch (error) {
    errors.push(`${testCase.name} threw: ${error.message}`);
    return;
  }

  const hasKatex = html.includes('class="katex');
  if (testCase.expectKatex && !hasKatex) {
    errors.push(`${testCase.name} did not render KaTeX markup`);
  }
  if (!testCase.expectKatex && hasKatex) {
    errors.push(`${testCase.name} unexpectedly rendered KaTeX markup`);
  }

  for (const expected of testCase.expectContains) {
    if (!html.includes(expected)) {
      errors.push(`${testCase.name} missing ${expected}; got ${html}`);
    }
  }

  if (html.includes('<script') || html.includes('<img') || html.includes('onerror=')) {
    errors.push(`${testCase.name} injected unsafe HTML`);
  }
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

function validateReviewedNotationFields(datasetName, records) {
  for (const record of records) {
    validateReviewedNotationField(datasetName, record, 'formulaText', formulaToLatex, formulaHTML);
    validateReviewedNotationField(datasetName, record, 'equationText', equationToLatex, equationHTML);
  }
}

function validateReviewedNotationField(datasetName, record, fieldName, converter, renderer) {
  if (record[fieldName] === undefined) {
    return;
  }

  const label = `${datasetName}.${record.id || 'unknown'}.${fieldName}`;
  if (record.notationReviewStatus !== 'reviewed') {
    errors.push(`${label} must carry notationReviewStatus=reviewed`);
  }

  const latex = converter(record[fieldName]);
  const html = renderer(record[fieldName]);
  if (!latex) {
    errors.push(`${label} did not produce LaTeX`);
  }
  if (!html.includes('class="katex')) {
    errors.push(`${label} rendered without KaTeX markup`);
  }
}

function validateReactionProseFields(datasetName, records, sink) {
  for (const record of records) {
    validateReactionProseField(datasetName, record, 'name', record?.name, sink);
    validateReactionProseField(datasetName, record, 'description', record?.description, sink);
    validateReactionProseField(datasetName, record, 'textbookContent', record?.textbookContent, sink);
    validateReactionProseField(datasetName, record, 'visualDescription', record?.visualDescription, sink);

    if (Array.isArray(record?.steps)) {
      for (const [index, step] of record.steps.entries()) {
        validateReactionProseField(datasetName, record, `steps[${index}]`, step, sink);
      }
    }

    if (Array.isArray(record?.safetyNotes)) {
      for (const [index, note] of record.safetyNotes.entries()) {
        validateReactionProseField(datasetName, record, `safetyNotes[${index}]`, note, sink);
      }
    }

    validateUnlockRequirementProseFields(datasetName, record, sink);
  }
}

function validateUnlockRequirementProseFields(datasetName, record, sink) {
  const unlockRequirements = record?.unlockRequirements;
  if (unlockRequirements === undefined || unlockRequirements === null) {
    return;
  }

  validateReactionProseField(datasetName, record, 'unlockRequirements.summary', unlockRequirements.summary, sink);
  validateReactionProseField(datasetName, record, 'unlockRequirements.grade', unlockRequirements.grade, sink);
  validateReactionProseField(datasetName, record, 'unlockRequirements.chapter', unlockRequirements.chapter, sink);

  if (Array.isArray(unlockRequirements.requirements)) {
    for (const [index, requirement] of unlockRequirements.requirements.entries()) {
      validateReactionProseField(datasetName, record, `unlockRequirements.requirements[${index}]`, requirement, sink);
    }
  }

  if (Array.isArray(unlockRequirements.labels)) {
    for (const [index, label] of unlockRequirements.labels.entries()) {
      validateReactionProseField(datasetName, record, `unlockRequirements.labels[${index}]`, label, sink);
    }
  }
}

function validateReactionProseField(datasetName, record, fieldPath, value, sink) {
  if (typeof value !== 'string' || value.trim() === '') {
    return;
  }

  const label = buildReactionProseLabel(datasetName, record, fieldPath);
  let html = '';
  try {
    html = mixedProseFormulaHTML(value);
  } catch (error) {
    sink.push(`${label} mixedProseFormulaHTML threw: ${error.message}`);
    return;
  }

  if (REACTION_PROSE_FORMULA_PATTERN.test(value) && !html.includes('class="katex')) {
    sink.push(`${label} contains formula-like prose but rendered without KaTeX markup`);
  }

  if (html.includes('<script') || html.includes('<img') || html.includes('onerror=')) {
    sink.push(`${label} rendered unsafe HTML`);
  }
}

function buildReactionProseLabel(datasetName, record, fieldPath) {
  const id = record?.id || 'unknown-reaction';
  const name = record?.name || record?.title || 'unknown-name';
  const experimentId = record?.experimentId || 'unknown-experiment';
  return `${datasetName}.${id} (name=${name}, experimentId=${experimentId}).${fieldPath}`;
}

function emitReactionProseDiagnostics() {
  const diagnosticErrors = [];
  const diagnosticRecord = {
    id: 'diagnostic-reaction-prose',
    name: 'diagnostic sample',
    experimentId: 'diagnostic-experiment',
    description: '向试管加入 $\\frac{1}{2}$ mL 水。',
    steps: ['第一步：加入 $H_2O$。'],
    safetyNotes: ['保持通风。'],
    unlockRequirements: {
      summary: '达到 $2$ 个学习元素后解锁。',
      grade: '高一',
      chapter: '氧化还原',
      requirements: ['完成 $NaCl$ 主题。']
    }
  };

  validateReactionProseField('reactions', diagnosticRecord, 'steps[0]', diagnosticRecord.steps[0], diagnosticErrors);
  diagnosticErrors.push(`${buildReactionProseLabel('reactions', diagnosticRecord, 'steps[0]')} mixedProseFormulaHTML threw: synthetic dry-run failure`);

  console.log('reactionProseDiagnostics: dry-run');
  for (const error of diagnosticErrors) {
    console.log(`- ${error}`);
  }

  return diagnosticErrors;
}
