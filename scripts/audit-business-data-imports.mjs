import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.resolve(rootDir, 'src/data');
const modulesDir = path.resolve(rootDir, 'src/modules');
const allowedImports = new Set([
  path.resolve(dataDir, 'index.js'),
  path.resolve(dataDir, 'contentMeta.js')
]);
const businessFiles = [
  path.resolve(rootDir, 'src/main.js'),
  ...(await collectJavaScriptFiles(modulesDir))
];
const violations = [];

for (const filePath of businessFiles) {
  const source = await readFile(filePath, 'utf8');
  const importSpecifiers = extractImportSpecifiers(source);

  for (const specifier of importSpecifiers) {
    if (!specifier.startsWith('.')) {
      continue;
    }

    const resolvedPath = path.resolve(path.dirname(filePath), specifier);
    if (!resolvedPath.startsWith(dataDir)) {
      continue;
    }

    const normalizedImportPath = resolvedPath.endsWith('.js') || resolvedPath.endsWith('.json')
      ? resolvedPath
      : `${resolvedPath}.js`;

    if (!allowedImports.has(normalizedImportPath)) {
      violations.push({
        filePath,
        specifier
      });
    }
  }
}

if (violations.length > 0) {
  console.error('业务模块数据导入审计失败：');
  for (const violation of violations) {
    console.error(`- ${path.relative(rootDir, violation.filePath)} -> ${violation.specifier}`);
  }
  console.error('只允许业务模块直接导入 src/data/index.js 与 src/data/contentMeta.js。');
  process.exit(1);
}

console.log(`业务模块数据导入审计通过：已检查 ${businessFiles.length} 个入口/模块文件。`);

function extractImportSpecifiers(source) {
  const matches = [];
  const patterns = [
    /import\s+(?:[\s\S]*?\s+from\s+)?['\"]([^'\"]+)['\"]/g,
    /export\s+(?:\*|\{[\s\S]*?\})\s+from\s+['\"]([^'\"]+)['\"]/g,
    /import\s*\(\s*['\"]([^'\"]+)['\"]\s*\)/g
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      matches.push(match[1]);
    }
  }

  return [...new Set(matches)];
}

async function collectJavaScriptFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const filePaths = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      filePaths.push(...await collectJavaScriptFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
}
