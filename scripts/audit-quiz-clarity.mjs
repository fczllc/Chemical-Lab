import { parseArgs } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { quizData } from '../src/data/index.js';

// Configuration
// Exact pattern: 学习“...”这一片段，应该掌握哪条事实？
// variants: “”, "", 「」
// pattern: 学习[“"「].*?[”"」]\s*这一(段|片段)\s*[，,]?\s*应该掌握哪条事实[？?]
const blockingPattern = /学习[“"「].*?[”"」]\s*这一(段|片段)\s*[，,]?\s*应该掌握哪条事实[？?]/u;
const sourceAnchors = [
  '教材图', '根据教材', '教材正文', '教材介绍', '教材提醒', '教材指出', '教材说明',
  '课文', '课本', '文中', '材料', '上述材料', '片段'
];

async function main() {
  const options = parseCli(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  let classifications = [];
  if (options.classification) {
    classifications = JSON.parse(fs.readFileSync(options.classification, 'utf-8'));
  }

  const results = runAudit(quizData, classifications);


  if (options.report) {
    const report = generateReport(results);
    fs.mkdirSync(path.dirname(options.report), { recursive: true });
    fs.writeFileSync(options.report, JSON.stringify(report, null, 2));
    console.log(`Report written to ${options.report}`);
  } else {
    console.log(`Audit complete: ${results.blockingFindings.length} blocking issues, ${results.unclassifiedSourceAnchors.length} unclassified source anchors.`);
  }

  if (options.failOnBlocking && results.blockingFindings.length > 0) {
    console.error('Blocking issues found.');
    process.exit(1);
  }

  if (options.failOnUnclassified && results.unclassifiedSourceAnchors.length > 0) {
    console.error('Unclassified source anchors found.');
    process.exit(1);
  }
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      report: { type: 'string' },
      classification: { type: 'string' },
      'fail-on-blocking': { type: 'boolean' },
      'fail-on-unclassified': { type: 'boolean' }
    },
    strict: true
  });

  return {
    help: values.help === true,
    report: values.report,
    classification: values.classification,
    failOnBlocking: values['fail-on-blocking'] === true,
    failOnUnclassified: values['fail-on-unclassified'] === true
  };
}

function printHelp() {
  console.log(`Quiz clarity auditor
Usage: node scripts/audit-quiz-clarity.mjs [options]
Options:
  --report <file>            Write report to file
  --classification <file>    Use JSON classification file
  --fail-on-blocking         Exit 1 if blocking issues found
  --fail-on-unclassified     Exit 1 if unclassified source anchors found
  --help                     Show this help`);
}

function runAudit(data, classifications) {
  const results = {
    blockingFindings: [],
    reviewQueue: [],
    allowedSourceMentions: [],
    remediatedRecords: [],
    unclassifiedSourceAnchors: [],
    totalRecords: data.length
  };

  const reviewQueueKeys = new Set();
  const unclassifiedKeys = new Set();

  for (const quiz of data) {
    // Only scan learner-facing fields: question, options, explanation
    const fields = [
      { name: 'question', value: quiz.question },
      ...((quiz.options || []).map((opt, i) => ({ name: `options[${i}]`, value: opt }))),
      { name: 'explanation', value: quiz.explanation }
    ];
    
    for (const field of fields) {
      let text = field.value;
      if (!text) continue;
      if (typeof text !== 'string') text = String(text);
      
      // Check blocking pattern
      if (blockingPattern.test(text)) {
        results.blockingFindings.push({ id: quiz.id, field: field.name, text, pattern: 'vague-fragment', disposition: 'remove' });
      }

      // Check source anchors
      if (sourceAnchors.some(anchor => text.includes(anchor))) {
        const key = `${quiz.id}|${field.name}|${text}`;
        
        if (!reviewQueueKeys.has(key)) {
          results.reviewQueue.push({ id: quiz.id, field: field.name, text });
          reviewQueueKeys.add(key);
        }

        const match = classifications.find(c => c.id === quiz.id && c.field === field.name && c.text === text);
        if (match) {
          if (match.disposition === 'allowed') {
            results.allowedSourceMentions.push({ id: quiz.id, field: field.name, text });
          } else if (match.disposition === 'rewrite' || match.disposition === 'remove') {
            results.remediatedRecords.push({ id: quiz.id, field: field.name, text, disposition: match.disposition });
          }
        } else {
          if (!unclassifiedKeys.has(key)) {
            results.unclassifiedSourceAnchors.push({ id: quiz.id, field: field.name, text });
            unclassifiedKeys.add(key);
          }
        }
      }
    }
  }

  return results;
}

function generateReport(results) {
  return {
    checkedAt: new Date().toISOString(),
    totalQuizRecords: results.totalRecords,
    runtimeEligibleQuestionCount: results.totalRecords, // Canonical quizData records are all considered runtime-eligible for this audit
    explicitVagueFragmentCount: results.blockingFindings.length,
    blockingFindings: results.blockingFindings,
    reviewQueue: results.reviewQueue,
    allowedSourceMentions: results.allowedSourceMentions,
    remediatedRecords: results.remediatedRecords,
    unclassifiedSourceAnchors: results.unclassifiedSourceAnchors
  };
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
