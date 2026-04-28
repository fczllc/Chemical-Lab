import { readFile } from 'node:fs/promises';

const elementsData = JSON.parse(
  await readFile(new URL('../src/data/elements.json', import.meta.url), 'utf8')
);

const {
  elements,
  allowedCategories,
  allowedRarities,
  allowedSafetyLevels
} = elementsData;

const requiredFields = [
  'atomicNumber',
  'symbol',
  'chineseName',
  'englishName',
  'atomicMass',
  'category',
  'period',
  'electronConfiguration',
  'discoveredBy',
  'discoveryYear',
  'funFact',
  'story',
  'rarity',
  'safety',
  'applications',
  'color'
];

const errors = [];

if (elements.length !== 118) {
  errors.push(`元素数量错误：期望 118，实际 ${elements.length}`);
}

const atomicNumbers = new Set();
const symbols = new Set();

for (const element of elements) {
  for (const field of requiredFields) {
    const value = element[field];
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    if (value === undefined || value === null || value === '' || isEmptyArray) {
      errors.push(`元素 ${element.symbol || element.atomicNumber} 缺少必填字段：${field}`);
    }
  }

  if (!Number.isInteger(element.atomicNumber) || element.atomicNumber < 1 || element.atomicNumber > 118) {
    errors.push(`元素 ${element.symbol} 的 atomicNumber 非法：${element.atomicNumber}`);
  }

  if (atomicNumbers.has(element.atomicNumber)) {
    errors.push(`重复的原子序数：${element.atomicNumber}`);
  }
  atomicNumbers.add(element.atomicNumber);

  if (symbols.has(element.symbol)) {
    errors.push(`重复的元素符号：${element.symbol}`);
  }
  symbols.add(element.symbol);

  if (!allowedCategories.includes(element.category)) {
    errors.push(`元素 ${element.symbol} 的 category 非法：${element.category}`);
  }

  if (!allowedRarities.includes(element.rarity)) {
    errors.push(`元素 ${element.symbol} 的 rarity 非法：${element.rarity}`);
  }

  if (!allowedSafetyLevels.includes(element.safety)) {
    errors.push(`元素 ${element.symbol} 的 safety 非法：${element.safety}`);
  }

  if (!Array.isArray(element.applications) || !element.applications.every((item) => typeof item === 'string' && item.trim())) {
    errors.push(`元素 ${element.symbol} 的 applications 必须是非空字符串数组`);
  }

  const isSeries = element.category === 'lanthanide' || element.category === 'actinide';
  if (isSeries) {
    const validSeriesPosition = Number.isInteger(element.x) && element.x >= 4 && element.x <= 18 && Number.isInteger(element.y) && (element.y === 8 || element.y === 9);
    if (!validSeriesPosition) {
      errors.push(`镧系/锕系元素 ${element.symbol} 的 x/y 位置非法：(${element.x}, ${element.y})`);
    }
    if (element.group !== null) {
      errors.push(`镧系/锕系元素 ${element.symbol} 的 group 应为 null`);
    }
  } else {
    const validMainPosition = Number.isInteger(element.x) && element.x >= 1 && element.x <= 18 && Number.isInteger(element.y) && element.y >= 1 && element.y <= 7;
    if (!validMainPosition) {
      errors.push(`主表元素 ${element.symbol} 的 x/y 位置非法：(${element.x}, ${element.y})`);
    }
    if (!Number.isInteger(element.group) || element.group < 1 || element.group > 18) {
      errors.push(`主表元素 ${element.symbol} 的 group 非法：${element.group}`);
    }
  }
}

for (let atomicNumber = 1; atomicNumber <= 118; atomicNumber += 1) {
  if (!atomicNumbers.has(atomicNumber)) {
    errors.push(`缺少原子序数：${atomicNumber}`);
  }
}

if (errors.length > 0) {
  console.error('元素数据校验失败：');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`元素数据校验通过：共 ${elements.length} 个元素，原子序数与符号均唯一。`);
