import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { execSync } from 'node:child_process';

const { values } = parseArgs({
  options: {
    allow: { type: 'string' },
    file: { type: 'string' }
  }
});

if (!values.allow) {
  console.error('Usage: node scripts/guard-achievements-data-scope.mjs --allow <categories>');
  process.exit(1);
}

const allowedCategories = values.allow.split(',');

function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const sorted = {};
  for (const k of keys) {
    sorted[k] = stableStringify(obj[k]);
  }
  return JSON.stringify(sorted);
}

async function run() {
  const indexJs = await readFile('src/data/index.js', 'utf8');
  if (!indexJs.includes("from './achievementsData.json'")) {
    console.error('Error: src/data/index.js does not import achievementsData.json');
    process.exit(1);
  }

  const currentPath = values.file || 'src/data/achievementsData.json';
  const currentContent = await readFile(currentPath, 'utf8');
  const baselineContent = execSync('git show HEAD:src/data/achievementsData.json', { 
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20
  });

  const current = JSON.parse(currentContent).achievementsData;
  const baseline = JSON.parse(baselineContent).achievementsData;

  const currentMap = new Map(current.map(a => [a.id, a]));
  const baselineMap = new Map(baseline.map(a => [a.id, a]));

  const allIds = new Set([...currentMap.keys(), ...baselineMap.keys()]);
  const violations = [];

  for (const id of allIds) {
    const cur = currentMap.get(id);
    const base = baselineMap.get(id);

    if (cur && !base) {
      if (!allowedCategories.includes(cur.category)) {
        violations.push({ id, reason: 'Added achievement category not allowed', category: cur.category });
      }
    } else if (!cur && base) {
      if (!allowedCategories.includes(base.category)) {
        violations.push({ id, reason: 'Removed achievement category not allowed', category: base.category });
      }
    } else if (cur && base) {
      const curStr = stableStringify(cur);
      const baseStr = stableStringify(base);
      
      if (curStr !== baseStr) {
        // Content changed, verify category scope
        if (!allowedCategories.includes(base.category) || !allowedCategories.includes(cur.category)) {
          violations.push({ id, reason: 'Modified achievement content not in allowed category scope', from: base.category, to: cur.category });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('Policy violations detected:', JSON.stringify(violations, null, 2));
    process.exit(1);
  }

  console.log('Integrity guard passed.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
