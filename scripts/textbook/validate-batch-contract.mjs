import { constants as fsConstants } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const expectedStatuses = ['sourceImported', 'drafted', 'partiallyReviewed', 'reviewed', 'promoted'];
const expectedStatusesSet = new Set(expectedStatuses);
const knownTextbookBatches = new Map([
  [
    'rj-chemistry-grade9-2024-vol1',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'rj-chemistry-grade9-2024-vol1.json'),
      expectedSourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
      expectedAssetRoot: 'src/data/textbooks/2024版人教版九年级化学上册/'
    }
  ],
  [
    'rj-chemistry-grade9-2024-vol2',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'rj-chemistry-grade9-2024-vol2.json'),
      expectedSourcePath: 'src/data/textbooks/2024版人教版九年级化学下册/book.md',
      expectedAssetRoot: 'src/data/textbooks/2024版人教版九年级化学下册/'
    }
  ],
  [
    'rj-chemistry-g12-selective-3-organic-2019',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'rj-chemistry-g12-selective-3-organic-2019.json'),
      expectedSourcePath: 'src/data/textbooks/2019版人教版高中化学-选择性必修3 有机化学基础/book.md',
      expectedAssetRoot: 'src/data/textbooks/2019版人教版高中化学-选择性必修3 有机化学基础/'
    }
  ],
  [
    'rj-chemistry-grade8-54-2024-full',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'rj-chemistry-grade8-54-2024-full.json'),
      expectedSourcePath: 'src/data/textbooks/2024版人教版（五·四学制）八年级化学全一册/book.md',
      expectedAssetRoot: 'src/data/textbooks/2024版人教版（五·四学制）八年级化学全一册/'
    }
  ],
  [
    'pep-chemistry-g10-required-1',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'pep-chemistry-g10-required-1.json'),
      expectedSourcePath: 'src/data/textbooks/2019版人教版高中化学必修第1册/book.md',
      expectedAssetRoot: 'src/data/textbooks/2019版人教版高中化学必修第1册/'
    }
  ],
  [
    'pep-chemistry-g10-required-2',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'pep-chemistry-g10-required-2.json'),
      expectedSourcePath: 'src/data/textbooks/2019版人教版高中化学必修第2册/book.md',
      expectedAssetRoot: 'src/data/textbooks/2019版人教版高中化学必修第2册/'
    }
  ],
  [
    'pep-chemistry-g11-selective-1',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'pep-chemistry-g11-selective-1.json'),
      expectedSourcePath: 'src/data/textbooks/2019版人教版高中化学-选择性必修1 化学反应原理/book.md',
      expectedAssetRoot: 'src/data/textbooks/2019版人教版高中化学-选择性必修1 化学反应原理/'
    }
  ],
  [
    'pep-chemistry-g11-selective-2',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'pep-chemistry-g11-selective-2.json'),
      expectedSourcePath: 'src/data/textbooks/2019版人教版高中化学-选择性必修2 物质结构与性质/book.md',
      expectedAssetRoot: 'src/data/textbooks/2019版人教版高中化学-选择性必修2 物质结构与性质/'
    }
  ]
]);

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const options = parseCli(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.textbook) {
    throw new Error('--textbook is required');
  }

  const batchConfig = knownTextbookBatches.get(options.textbook);
  if (!batchConfig) {
    throw new Error(`Unknown textbook batch: ${options.textbook}`);
  }

  const result = await validateBatchContract(batchConfig, options.textbook);
  finishValidation(result);
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      textbook: { type: 'string' }
    },
    strict: true
  });

  return {
    help: values.help === true,
    textbook: values.textbook ?? null
  };
}

function printHelp() {
  console.log(`Textbook batch contract validator / 教材批次合同校验器

Usage:
  node scripts/textbook/validate-batch-contract.mjs --textbook <volumeId>

Options:
  --textbook <volumeId>                Validate one known textbook ingestion batch.
  --help                              Show this help.`);
}

async function validateBatchContract(batchConfig, expectedVolumeId) {
  const errors = [];
  const batch = await readJsonFile(batchConfig.batchPath, 'batch contract', errors);
  const contract = ensureObject(batch, 'batch contract 顶层必须是对象', errors) ?? {};

  validateRequiredKeys(contract, errors);
  validateExactKeys(contract, errors);
  validateStableId(contract.volumeId, 'volumeId', errors);
  validateRequiredText(contract.displayName, 'displayName', errors);
  validateProjectRelativePath(contract.sourcePath, 'sourcePath', errors);
  validateProjectRelativePath(contract.assetRoot, 'assetRoot', errors);
  validateSchemaVersion(contract.schemaVersion, errors);
  validateEnum(contract.status, 'status', expectedStatusesSet, errors);
  validateStableId(contract.activeBatchId, 'activeBatchId', errors);
  validateGeneratedAt(contract.generatedAt, errors);
  validateSourceHashFormat(contract.sourceHash, errors);
  validateAllowedStatuses(contract.allowedStatuses, errors);

  if (contract.volumeId !== expectedVolumeId) {
    errors.push(`volumeId 必须匹配 --textbook：${expectedVolumeId}`);
  }

  if (contract.sourcePath !== batchConfig.expectedSourcePath) {
    errors.push(`sourcePath 必须指向既定教材源文件：${contract.sourcePath}`);
  }

  if (contract.assetRoot !== batchConfig.expectedAssetRoot) {
    errors.push(`assetRoot 必须指向既定教材资产目录：${contract.assetRoot}`);
  }

  if (Array.isArray(contract.allowedStatuses) && !contract.allowedStatuses.includes(contract.status)) {
    errors.push(`status 必须包含在 allowedStatuses 中：${String(contract.status)}`);
  }

  await validateSourceFile(contract, errors);
  await validateRuntimeBoundary(errors);

  return { contract, errors };
}

async function readJsonFile(filePath, label, errors) {
  try {
    const source = await readFile(filePath, 'utf8');
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${label} 无法读取或解析：${error.message}`);
    return null;
  }
}

function validateRequiredKeys(contract, errors) {
  const requiredKeys = [
    'volumeId',
    'displayName',
    'sourcePath',
    'assetRoot',
    'schemaVersion',
    'status',
    'activeBatchId',
    'generatedAt',
    'sourceHash',
    'allowedStatuses'
  ];

  for (const key of requiredKeys) {
    if (!(key in contract)) {
      errors.push(`缺少必填字段：${key}`);
    }
  }
}

function validateExactKeys(contract, errors) {
  const allowedKeys = new Set([
    'volumeId',
    'displayName',
    'sourcePath',
    'assetRoot',
    'schemaVersion',
    'status',
    'activeBatchId',
    'generatedAt',
    'sourceHash',
    'allowedStatuses'
  ]);

  for (const key of Object.keys(contract)) {
    if (!allowedKeys.has(key)) {
      errors.push(`不支持的字段：${key}`);
    }
  }
}

async function validateSourceFile(contract, errors) {
  if (typeof contract.sourcePath !== 'string' || typeof contract.assetRoot !== 'string') {
    return;
  }

  const sourcePath = resolveProjectPath(contract.sourcePath);
  const assetRoot = resolveProjectPath(contract.assetRoot);

  await assertReadableFile(sourcePath, 'sourcePath', errors);
  await assertDirectory(assetRoot, 'assetRoot', errors);

  const expectedSourceDirectory = path.dirname(sourcePath);
  if (path.normalize(assetRoot) !== path.normalize(expectedSourceDirectory)) {
    errors.push('assetRoot 必须是 sourcePath 所在目录');
  }

  if (typeof contract.sourceHash === 'string' && contract.sourceHash.startsWith('sha256:')) {
    const digest = await hashFile(sourcePath);
    if (contract.sourceHash !== `sha256:${digest}`) {
      errors.push(`sourceHash 与 sourcePath 内容不匹配：${contract.sourceHash}`);
    }
  }
}

async function validateRuntimeBoundary(errors) {
  const indexPath = path.join(projectRoot, 'src', 'data', 'index.js');
  const source = await readFile(indexPath, 'utf8');
  if (source.includes('textbookIngestion')) {
    errors.push('src/data/index.js 不得导出或导入 src/data/textbookIngestion/**');
  }
}

function validateSchemaVersion(value, errors) {
  if (!Number.isInteger(value) || value < 1) {
    errors.push('schemaVersion 必须是正整数');
  }
}

function validateGeneratedAt(value, errors) {
  validateRequiredText(value, 'generatedAt', errors);
  if (typeof value === 'string' && Number.isNaN(Date.parse(value))) {
    errors.push(`generatedAt 必须是有效 ISO 时间：${value}`);
  }
}

function validateSourceHashFormat(value, errors) {
  validateRequiredText(value, 'sourceHash', errors);
  if (typeof value === 'string' && !/^sha256:[a-f0-9]{64}$/.test(value)) {
    errors.push(`sourceHash 必须是 sha256:<64 hex>：${value}`);
  }
}

function validateAllowedStatuses(value, errors) {
  if (!Array.isArray(value)) {
    errors.push('allowedStatuses 必须是数组');
    return;
  }

  if (value.length !== expectedStatuses.length) {
    errors.push(`allowedStatuses 必须包含且只包含：${expectedStatuses.join(', ')}`);
    return;
  }

  for (const [index, status] of value.entries()) {
    if (status !== expectedStatuses[index]) {
      errors.push(`allowedStatuses[${index}] 必须是 ${expectedStatuses[index]}；实际为 ${String(status)}`);
    }
  }
}

async function assertReadableFile(filePath, label, errors) {
  try {
    await access(filePath, fsConstants.R_OK);
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      errors.push(`${label} 不是文件：${path.relative(projectRoot, filePath)}`);
    }
  } catch {
    errors.push(`${label} 不存在或不可读：${path.relative(projectRoot, filePath)}`);
  }
}

async function assertDirectory(directoryPath, label, errors) {
  try {
    const directoryStat = await stat(directoryPath);
    if (!directoryStat.isDirectory()) {
      errors.push(`${label} 不是目录：${path.relative(projectRoot, directoryPath)}`);
    }
  } catch {
    errors.push(`${label} 不存在或不可读：${path.relative(projectRoot, directoryPath)}`);
  }
}

async function hashFile(filePath) {
  const source = await readFile(filePath);
  return createHash('sha256').update(source).digest('hex');
}

function validateStableId(value, label, errors) {
  validateRequiredText(value, label, errors);
  if (typeof value === 'string' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    errors.push(`${label} 必须是稳定 kebab-case 机器 ID：${value}`);
  }
}

function validateRequiredText(value, label, errors) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label} 必须是非空字符串`);
  } else if (value !== value.trim()) {
    errors.push(`${label} 不能包含首尾空白`);
  }
}

function validateProjectRelativePath(value, label, errors) {
  validateRequiredText(value, label, errors);
  if (typeof value !== 'string') {
    return;
  }
  if (path.isAbsolute(value) || value.includes('..')) {
    errors.push(`${label} 必须是项目内相对路径，且不能包含 ..：${value}`);
  }
}

function validateEnum(value, label, allowedValues, errors) {
  if (!allowedValues.has(value)) {
    errors.push(`${label} 必须是以下值之一：${[...allowedValues].join(', ')}；实际为 ${String(value)}`);
  }
}

function ensureObject(value, label, errors) {
  if (!isRecord(value)) {
    errors.push(label);
    return null;
  }
  return value;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveProjectPath(projectRelativePath) {
  return path.resolve(projectRoot, projectRelativePath);
}

function finishValidation(result) {
  if (result.errors.length > 0) {
    console.error('教材批次合同校验失败：');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`batchContract: valid (${result.contract.volumeId})`);
  console.log(`sourcePath: ${result.contract.sourcePath}`);
  console.log(`status: ${result.contract.status}`);
}

