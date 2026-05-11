import { parseArgs } from 'node:util';
import {
  createExperimentExcerpt,
  extractHighConfidenceChemistry,
  generateExperimentTitle,
  isVagueExperimentHeading,
  normalizeExperimentText
} from './experiment-enrichment.mjs';
import { buildExperimentCandidateForValidation } from './generate-drafts.mjs';

const cases = [
  {
    name: 'full-content-preservation',
    run() {
      const text = '## 标题\n' + '实验内容'.repeat(40) + '结束';
      const normalized = normalizeExperimentText(text);
      const excerpt = createExperimentExcerpt(text);

      assert(normalized.length > excerpt.length, 'normalized content should remain longer than the excerpt', {
        normalized,
        excerpt
      });
      assert(!excerpt.includes('…') && !excerpt.includes('...'), 'excerpt should not be ellipsis-truncated', {
        excerpt
      });
    }
  },
  {
    name: 'excerpt-cap-100',
    run() {
      const text = '甲'.repeat(101) + '。';
      const excerpt = createExperimentExcerpt(text);

      assert(countCjkChars(excerpt) <= 100, 'excerpt CJK count should be capped at 100', {
        excerpt,
        cjkCount: countCjkChars(excerpt)
      });
    }
  },
  {
    name: 'draft-experiment-candidate-shape',
    run() {
      const sourceText = '观察实验现象并记录变化。'.repeat(30);
      const candidate = buildExperimentCandidateForValidation(buildSourceSectionFixture({
        sourceHeading: '实验2-1',
        sourceText
      }));

      assert(candidate.textbookContent.length > candidate.summary.length, 'experiment candidate should preserve full textbookContent longer than card summary', candidate);
      assert(candidate.textbookContent === normalizeExperimentText(sourceText), 'textbookContent should equal full normalized source text', candidate);
      assert(candidate.description === candidate.summary, 'description should match summary excerpt for card compatibility', candidate);
      assert(countCjkChars(candidate.summary) <= 100, 'summary CJK count should be capped at 100', {
        summary: candidate.summary,
        cjkCount: countCjkChars(candidate.summary)
      });
      assert(!candidate.textbookContent.endsWith('…') && !candidate.textbookContent.endsWith('...'), 'textbookContent should not end with legacy ellipsis truncation', candidate);
      assert(!isVagueExperimentHeading(candidate.title), 'candidate title should use generated experiment title when possible', candidate);
    }
  },
  {
    name: 'generated-title-vague-heading',
    run() {
      const sourceHeading = '【实验9-1';
      const text = '【实验9-1 如图9-2所示,在 20 mL 水中加入一药匙蔗糖,用玻璃棒搅拌,观察现象。蔗糖放入水中后,蔗糖表面的分子在水分子的作用下,逐步向水里扩散。';
      const title = generateExperimentTitle({ sourceHeading, text });
      const fixture = buildPromotionFixture({ sourceHeading, name: title, text });

      assert(title !== sourceHeading, 'vague heading should become a meaningful title', {
        sourceHeading,
        title
      });
      assert(!isVagueExperimentHeading(title), 'generated title should not remain vague', { title });
      assert(fixture.sourceHeading === sourceHeading, 'fixture shape should preserve sourceHeading', fixture);
      assert(/蔗糖/u.test(fixture.name), 'generated title should be derived from the content', fixture);

      assert(isVagueExperimentHeading('【实验9-8’'), 'malformed opening-bracket experiment heading should be vague', {
        sourceHeading: '【实验9-8’'
      });
    }
  },
  {
    name: 'generated-title-generic-section-heading',
    run() {
      const headings = ['【实验目的】', '【实验用品】', '【实验步骤】', '【实验与记录】', '【实验与分析】'];

      for (const sourceHeading of headings) {
        assert(isVagueExperimentHeading(sourceHeading), 'generic experiment section heading should be vague', { sourceHeading });
      }

      const sourceHeading = '【实验目的】';
      const text = '【实验目的】 取少量碳酸钠固体加入稀盐酸中，观察产生气泡并判断生成的气体。';
      const title = generateExperimentTitle({ sourceHeading, text });

      assert(title !== sourceHeading, 'generic section heading should not be preserved as the title', {
        sourceHeading,
        title
      });
      assert(!title.startsWith('【实验'), 'generated title should not begin with a boilerplate experiment heading', { title });
      assert(!isVagueExperimentHeading(title), 'generated title should not remain vague', { title });
      assert(/碳酸钠|稀盐酸|气泡/u.test(title), 'generated title should be content-derived', { title });
    }
  },
  {
    name: 'generated-title-action-pattern',
    run() {
      const sourceHeading = '实验3-2';
      const text = '实验3-2\n检验蜡烛的可燃性。观察火焰颜色。';
      const title = generateExperimentTitle({ sourceHeading, text });

      assert(title === '检验蜡烛的可燃性', 'action text should become a concise Chinese title', {
        sourceHeading,
        title
      });
      assert(!isVagueExperimentHeading(title), 'action title should not remain vague', { title });
    }
  },
  {
    name: 'generated-title-meaningful-heading',
    run() {
      const sourceHeading = '氢气燃烧';
      const title = generateExperimentTitle({ sourceHeading, text: '氢气燃烧时发出淡蓝色火焰。' });

      assert(title === sourceHeading, 'meaningful heading should stay stable', {
        sourceHeading,
        title
      });
    }
  },
  {
    name: 'chemistry-high-confidence',
    run() {
      const zincEquation = extractHighConfidenceChemistry('反应方程式：Zn + 2HCl → ZnCl2 + H2。');
      const hydrogenEquation = extractHighConfidenceChemistry('化学方程式：2H₂ + O₂ -> 2H₂O。');
      const phraseChemistry = extractHighConfidenceChemistry('锌和稀盐酸反应生成氢气，观察气泡产生。');

      assertDeepEqual(zincEquation.equationText, 'Zn + 2HCl → ZnCl2 + H2', 'zinc equationText');
      assertDeepEqual(zincEquation.reactants, ['Zn', 'HCl'], 'zinc reactants');
      assertDeepEqual(zincEquation.products, ['ZnCl2', 'H2'], 'zinc products');
      assertDeepEqual(zincEquation.confidence, 'high', 'zinc confidence');
      assertDeepEqual(zincEquation.evidenceText, 'Zn + 2HCl → ZnCl2 + H2', 'zinc evidenceText');

      assertDeepEqual(hydrogenEquation.equationText, '2H2 + O2 -> 2H2O', 'hydrogen equationText');
      assertDeepEqual(hydrogenEquation.reactants, ['H2', 'O2'], 'hydrogen reactants');
      assertDeepEqual(hydrogenEquation.products, ['H2O'], 'hydrogen products');

      assert(!('equationText' in phraseChemistry), 'phrase rule should not invent equationText', phraseChemistry);
      assertDeepEqual(phraseChemistry.reactants, ['Zn', 'HCl'], 'phrase reactants');
      assertDeepEqual(phraseChemistry.products, ['H2'], 'phrase products');
      assertDeepEqual(phraseChemistry.confidence, 'high', 'phrase confidence');
    }
  },
  {
    name: 'chemistry-ambiguous-omitted',
    run() {
      const ambiguous = extractHighConfidenceChemistry('观察实验现象并记录变化。');
      const incompletePhrase = extractHighConfidenceChemistry('锌和盐酸反应，观察实验现象。');
      const malformedEquation = extractHighConfidenceChemistry('反应方程式：Zn + acid → ZnCl2 + H2。');
      const extraProductText = extractHighConfidenceChemistry('反应方程式：Zn + 2HCl → ZnCl2 + H2 + gas。');
      const unbalancedEquation = extractHighConfidenceChemistry('化学方程式：H2 + O2 -> H2O。');
      const combustionWithoutProduct = extractHighConfidenceChemistry('氢气在氧气中燃烧，观察火焰。');

      assertOmittedChemistry(ambiguous, 'ambiguous chemistry');
      assertOmittedChemistry(incompletePhrase, 'incomplete phrase chemistry');
      assertOmittedChemistry(malformedEquation, 'malformed equation chemistry');
      assertOmittedChemistry(extraProductText, 'extra product text chemistry');
      assertOmittedChemistry(unbalancedEquation, 'unbalanced equation chemistry');
      assertOmittedChemistry(combustionWithoutProduct, 'combustion without explicit product chemistry');
    }
  },
  {
    name: 'promotion-shape-compatibility',
    run() {
      const chemistry = extractHighConfidenceChemistry('反应方程式：Zn + 2HCl → ZnCl2 + H2。');
      const enrichedRecord = buildPromotionFixture({
        name: '锌与稀盐酸反应',
        description: '锌与稀盐酸反应生成氢气。',
        textbookContent: '反应方程式：Zn + 2HCl → ZnCl2 + H2。',
        sourceHeading: '实验2-1',
        reactants: chemistry.reactants,
        products: chemistry.products,
        equationText: chemistry.equationText
      });

      assertPromotionShape(enrichedRecord);
    }
  }
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      case: { type: 'string' }
    },
    strict: true
  });

  const selectedCase = values.case ?? null;
  if (selectedCase) {
    const testCase = cases.find((entry) => entry.name === selectedCase);
    if (!testCase) {
      console.error(`Unknown fixture case: ${selectedCase}`);
      process.exit(1);
    }

    testCase.run();
    console.log(`PASS ${testCase.name}`);
    return;
  }

  for (const testCase of cases) {
    testCase.run();
    console.log(`PASS ${testCase.name}`);
  }

  console.log('PASS textbook enrichment fixtures');
}

function assert(condition, message, context) {
  if (condition) {
    return;
  }

  const detail = context ? `\n${JSON.stringify(context, null, 2)}` : '';
  throw new Error(`${message}${detail}`);
}

function assertDeepEqual(actual, expected, label) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${label} to equal ${expectedJson}, got ${actualJson}`);
  }
}

function assertOmittedChemistry(chemistry, label) {
  assert(!('equationText' in chemistry), `${label} should omit equationText`, chemistry);
  assertDeepEqual(chemistry.reactants, [], `${label} reactants`);
  assertDeepEqual(chemistry.products, [], `${label} products`);
}

function countCjkChars(value) {
  return (String(value ?? '').match(/[\u3400-\u9fff]/gu) ?? []).length;
}

function buildPromotionFixture(fields) {
  return {
    name: fields.name,
    description: fields.description ?? '教材片段',
    textbookContent: fields.textbookContent ?? '教材内容',
    sourceHeading: fields.sourceHeading,
    reactants: fields.reactants,
    products: fields.products,
    ...(fields.equationText ? { equationText: fields.equationText } : {})
  };
}

function buildSourceSectionFixture(fields) {
  return {
    sectionId: 'fixture-section-1',
    sourceVolumeId: 'fixture-volume',
    sourcePath: 'fixture.md',
    sourceHeading: fields.sourceHeading,
    sourceLineStart: 1,
    sourceLineEnd: 10,
    sourceHash: 'sha256:' + '0'.repeat(64),
    sectionHash: 'sha256:' + '1'.repeat(64),
    sourceSectionId: 'fixture-source-section-1',
    sourceText: fields.sourceText,
    assets: []
  };
}

function assertPromotionShape(record) {
  assert(isPlainObject(record), 'promotion record should be a plain object', record);
  assert(typeof record.name === 'string' && record.name.length > 0, 'promotion record needs a name', record);
  assert(typeof record.description === 'string' && record.description.length > 0, 'promotion record needs a description', record);
  assert(typeof record.textbookContent === 'string' && record.textbookContent.length > 0, 'promotion record needs textbookContent', record);
  assert(typeof record.sourceHeading === 'string' && record.sourceHeading.length > 0, 'promotion record needs sourceHeading', record);
  assert(Array.isArray(record.reactants), 'promotion record reactants must be an array', record);
  assert(Array.isArray(record.products), 'promotion record products must be an array', record);

  if ('equationText' in record) {
    assert(typeof record.equationText === 'string' && record.equationText.length > 0, 'promotion record equationText must be a string when present', record);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
