const defaultExperimentHeading = '未命名教材片段';
const cjkPattern = /[\u3400-\u9fff]/gu;
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

export function normalizeExperimentText(value) {
  return String(value ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createExperimentExcerpt(text, { maxCjkChars = 100 } = {}) {
  const normalized = normalizeExperimentText(text);
  const limit = normalizeCjkLimit(maxCjkChars);

  if (!normalized || limit === 0) {
    return '';
  }

  if (countCjkChars(normalized) <= limit) {
    return normalized;
  }

  const boundedSentenceExcerpt = firstSentenceBoundaryExcerpt(normalized, limit);
  if (boundedSentenceExcerpt) {
    return boundedSentenceExcerpt;
  }

  return truncateByCjkChars(normalized, limit);
}

export function isVagueExperimentHeading(value) {
  const heading = cleanHeading(value);
  const candidates = [heading, stripPairedBrackets(heading)];

  return candidates.some((candidate) => {
    const compactCandidate = candidate.replace(/\s+/g, '');

    if (isNumberedExperimentHeading(compactCandidate) || isGenericExperimentSectionHeading(compactCandidate)) {
      return true;
    }

    for (const [open, close] of [['【', '】'], ['[', ']'], ['［', '］'], ['(', ')'], ['（', '）']]) {
      if (!candidate.startsWith(open)) {
        continue;
      }

      const closeIndex = candidate.indexOf(close, open.length);
      if (closeIndex > open.length) {
        const innerCandidate = candidate.slice(open.length, closeIndex).replace(/\s+/g, '');

        if (isNumberedExperimentHeading(innerCandidate) || isGenericExperimentSectionHeading(innerCandidate)) {
          return true;
        }
      }

      if (!candidate.endsWith(close)) {
        const unwrappedCandidate = candidate.slice(open.length).replace(/\s+/g, '');

        if (isNumberedExperimentHeading(unwrappedCandidate) || isGenericExperimentSectionHeading(unwrappedCandidate)) {
          return true;
        }
      }
    }

    return false;
  });
}

export function generateExperimentTitle({ sourceHeading, text } = {}) {
  const heading = cleanHeading(sourceHeading);

  if (!isVagueExperimentHeading(heading)) {
    return heading;
  }

  const normalizedText = normalizeExperimentText(text);
  const chemistryTitle = titleFromKnownChemistryPattern(normalizedText);
  if (chemistryTitle) {
    return chemistryTitle;
  }

  const actionTitle = titleFromActionPattern(normalizedText);
  if (actionTitle) {
    return actionTitle;
  }

  const excerptTitle = titleFromContentExcerpt(normalizedText, heading);
  if (excerptTitle) {
    return excerptTitle;
  }

  return heading;
}

export function extractHighConfidenceChemistry(text) {
  const normalizedText = normalizeChemistryText(text);
  const explicitEquation = extractExplicitEquation(normalizedText);

  if (explicitEquation) {
    return explicitEquation;
  }

  if (containsEquationArrow(normalizedText)) {
    return {
      reactants: [],
      products: []
    };
  }

  const allowlistedChemistry = extractAllowlistedChemistry(normalizedText);

  if (allowlistedChemistry) {
    return allowlistedChemistry;
  }

  return {
    reactants: [],
    products: []
  };
}

function cleanHeading(value) {
  const heading = normalizeExperimentText(value);
  return heading || defaultExperimentHeading;
}

function stripPairedBrackets(value) {
  let heading = String(value ?? '').trim();

  for (const [open, close] of [['【', '】'], ['[', ']'], ['［', '］'], ['(', ')'], ['（', '）']]) {
    if (heading.startsWith(open) && heading.endsWith(close)) {
      heading = heading.slice(open.length, -close.length).trim();
    }
  }

  return heading;
}

function normalizeCjkLimit(value) {
  if (!Number.isFinite(value)) {
    return 100;
  }

  return Math.max(0, Math.floor(value));
}

function countCjkChars(value) {
  return (String(value ?? '').match(cjkPattern) ?? []).length;
}

function firstSentenceBoundaryExcerpt(text, maxCjkChars) {
  let excerpt = '';

  for (const sentence of splitSentences(text)) {
    const candidate = `${excerpt}${sentence}`;
    const candidateCount = countCjkChars(candidate);

    if (candidateCount > maxCjkChars) {
      break;
    }

    excerpt = candidate;

    if (candidateCount === maxCjkChars) {
      break;
    }
  }

  return excerpt && excerpt.length < text.length ? excerpt : '';
}

function truncateByCjkChars(text, maxCjkChars) {
  let cjkCount = 0;
  let excerpt = '';

  for (const character of text) {
    if (isCjkChar(character)) {
      if (cjkCount >= maxCjkChars) {
        break;
      }

      cjkCount += 1;
    }

    excerpt += character;
  }

  return excerpt.trim();
}

function isCjkChar(character) {
  return /^[\u3400-\u9fff]$/u.test(character);
}

function splitSentences(text) {
  return String(text ?? '')
    .split(/(?<=[。！？?])\s*/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function titleFromKnownChemistryPattern(text) {
  if (/锌|Zn/u.test(text) && /稀盐酸|盐酸|HCl/u.test(text) && /氢气|H2|H₂/u.test(text)) {
    if (/制取|收集/u.test(text)) {
      return '锌与稀盐酸反应制取氢气';
    }

    return '锌与稀盐酸反应';
  }

  if (/氢气|H2|H₂/u.test(text) && /燃烧|可燃/u.test(text)) {
    return '氢气燃烧';
  }

  return '';
}

function titleFromActionPattern(text) {
  const match = text.match(/(?:^|[。！？?；;，,\s])(观察|探究|检验|制取|比较)([^。！？?；;]{2,24})/u);

  if (!match) {
    return '';
  }

  const action = match[1];
  const object = match[2]
    .replace(/^(一下|并|其|实验|活动|现象)/u, '')
    .split(/[，,、；;：:]/u)[0]
    .replace(/[，,；;：:]+$/u, '')
    .trim();

  const title = `${action}${object}`;
  if (countCjkChars(title) < 4 || isVagueExperimentHeading(title)) {
    return '';
  }

  return title;
}

function titleFromContentExcerpt(text, heading) {
  const content = stripLeadingHeading(text, heading)
    .replace(/^(?:实验内容|实验目的|实验用品|实验步骤|实验与记录|实验与分析|实验事实)\s*/u, '')
    .trim();
  const sentence = splitSentences(content)[0] || content;
  const title = truncateByCjkChars(sentence.split(/[。！？?；;：:]/u)[0], 18)
    .replace(/[，,、；;：:。！？?]+$/u, '')
    .trim();

  if (countCjkChars(title) < 4 || isVagueExperimentHeading(title)) {
    return '';
  }

  return title;
}

function stripLeadingHeading(text, heading) {
  const candidates = [heading, stripPairedBrackets(heading)]
    .filter(Boolean)
    .map((value) => escapeRegExp(value));

  if (candidates.length === 0) {
    return text;
  }

  return String(text ?? '').replace(new RegExp(`^(?:${candidates.join('|')})\\s*`, 'u'), '').trim();
}

function isNumberedExperimentHeading(value) {
  return /^实验(?:[0-9０-９一二三四五六七八九十]+(?:[-－—~～·.、][0-9０-９一二三四五六七八九十]+)*)?[’'′]?$/u.test(value);
}

function isGenericExperimentSectionHeading(value) {
  return /^实验(?:目的|用品|步骤|与记录|与分析|事实)$/u.test(value);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeChemistryText(value) {
  return normalizeExperimentText(value).replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (character) => subscriptDigits[character]);
}

function containsEquationArrow(text) {
  return /->|→|=/u.test(text);
}

function extractExplicitEquation(text) {
  for (const candidate of explicitEquationCandidates(text)) {
    const parsed = parseEquationCandidate(candidate);

    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function explicitEquationCandidates(text) {
  const candidates = [];
  const arrowPattern = /->|→|=/gu;
  let match;

  while ((match = arrowPattern.exec(text)) !== null) {
    const segmentStart = equationSegmentStart(text, match.index);
    const segmentEnd = equationSegmentEnd(text, match.index + match[0].length);
    const segment = text.slice(segmentStart, segmentEnd).trim();
    const candidate = trimEquationLabel(segment);

    if (candidate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

function equationSegmentStart(text, arrowIndex) {
  for (let index = arrowIndex - 1; index >= 0; index -= 1) {
    if (/[。！？?；;]/u.test(text[index])) {
      return index + 1;
    }
  }

  return 0;
}

function equationSegmentEnd(text, arrowEndIndex) {
  for (let index = arrowEndIndex; index < text.length; index += 1) {
    if (/[。！？?；;]/u.test(text[index])) {
      return index;
    }
  }

  return text.length;
}

function trimEquationLabel(segment) {
  const colonIndex = Math.max(segment.lastIndexOf('：'), segment.lastIndexOf(':'));

  if (colonIndex >= 0) {
    return segment.slice(colonIndex + 1).trim();
  }

  return segment.trim();
}

function parseEquationCandidate(candidate) {
  const arrowMatches = [...candidate.matchAll(/->|→|=/gu)];

  if (arrowMatches.length !== 1) {
    return null;
  }

  const arrowMatch = arrowMatches[0];
  const arrow = arrowMatch[0];
  const leftSide = candidate.slice(0, arrowMatch.index).trim();
  const rightSide = candidate.slice(arrowMatch.index + arrow.length).trim();
  const reactantSide = parseEquationSide(leftSide);
  const productSide = parseEquationSide(rightSide);

  if (!reactantSide || !productSide || !areEquationSidesBalanced(reactantSide, productSide)) {
    return null;
  }

  const equationText = `${reactantSide.text} ${arrow} ${productSide.text}`;

  return {
    equationText,
    reactants: reactantSide.formulas,
    products: productSide.formulas,
    confidence: 'high',
    evidenceText: equationText
  };
}

function parseEquationSide(side) {
  if (!side || /[，,、：:]/u.test(side)) {
    return null;
  }

  const terms = side.split('+').map((term) => parseEquationTerm(term));

  if (terms.length === 0 || terms.some((term) => !term)) {
    return null;
  }

  return {
    text: terms.map((term) => `${term.coefficient}${term.formula}`).join(' + '),
    formulas: terms.map((term) => term.formula),
    terms
  };
}

function areEquationSidesBalanced(leftSide, rightSide) {
  return atomCountsEqual(atomCountsForSide(leftSide), atomCountsForSide(rightSide));
}

function atomCountsForSide(side) {
  const counts = new Map();

  for (const term of side.terms) {
    const coefficient = Number(term.coefficient || '1');

    for (const [element, count] of atomCountsForFormula(term.formula)) {
      counts.set(element, (counts.get(element) ?? 0) + count * coefficient);
    }
  }

  return counts;
}

function atomCountsForFormula(formula) {
  const counts = new Map();
  const groupPattern = /([A-Z][a-z]?)([1-9]\d*)?/gu;
  let match;

  while ((match = groupPattern.exec(formula)) !== null) {
    const element = match[1];
    const count = Number(match[2] || '1');
    counts.set(element, (counts.get(element) ?? 0) + count);
  }

  return counts;
}

function atomCountsEqual(leftCounts, rightCounts) {
  if (leftCounts.size !== rightCounts.size) {
    return false;
  }

  for (const [element, count] of leftCounts) {
    if (rightCounts.get(element) !== count) {
      return false;
    }
  }

  return true;
}

function parseEquationTerm(value) {
  const match = String(value ?? '').trim().match(/^(?:(\d+)\s*)?((?:[A-Z][a-z]?(?:[1-9]\d*)?)+)$/u);

  if (!match || !isFormulaText(match[2])) {
    return null;
  }

  return {
    coefficient: match[1] ?? '',
    formula: match[2]
  };
}

function isFormulaText(value) {
  const formula = String(value ?? '');
  const groupPattern = /([A-Z][a-z]?)([1-9]\d*)?/gu;
  let consumed = 0;
  let match;

  while ((match = groupPattern.exec(formula)) !== null) {
    if (match.index !== consumed || !elementSymbols.has(match[1])) {
      return false;
    }

    consumed = groupPattern.lastIndex;
  }

  return consumed === formula.length && consumed > 0;
}

function extractAllowlistedChemistry(text) {
  if (mentionsZincHydrochloricHydrogen(text)) {
    return highConfidencePhraseChemistry(['Zn', 'HCl'], ['H2'], text);
  }

  if (mentionsHydrogenOxygenWaterOrCombustion(text)) {
    return highConfidencePhraseChemistry(['H2', 'O2'], ['H2O'], text);
  }

  return null;
}

function mentionsZincHydrochloricHydrogen(text) {
  return /锌|Zn/u.test(text) && /稀盐酸|盐酸|HCl/u.test(text) && /氢气|H2/u.test(text);
}

function mentionsHydrogenOxygenWaterOrCombustion(text) {
  return /氢气|H2/u.test(text) && /氧气|O2/u.test(text) && /水|H2O/u.test(text);
}

function highConfidencePhraseChemistry(reactants, products, evidenceText) {
  return {
    reactants,
    products,
    confidence: 'high',
    evidenceText
  };
}
