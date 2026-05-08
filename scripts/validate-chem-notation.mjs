import {
  equationHTML,
  equationToLatex,
  formulaHTML,
  formulaToLatex,
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

for (const group of requiredGroups) {
  for (const testCase of group.cases) {
    validateCase(group.name, testCase);
  }
  console.log(`${group.name}: valid`);
}

validateReviewedNotationFields('quizData', quizData);
validateReviewedNotationFields('reactions', reactions);

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