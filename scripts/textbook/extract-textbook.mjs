import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const generatedRoot = path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated');

const knownTextbookBatches = new Map([
  [
    'rj-chemistry-grade9-2024-vol1',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'rj-chemistry-grade9-2024-vol1.json')
    }
  ],
  [
    'rj-chemistry-grade9-2024-vol2',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'rj-chemistry-grade9-2024-vol2.json')
    }
  ],
  [
    'rj-chemistry-g12-selective-3-organic-2019',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'rj-chemistry-g12-selective-3-organic-2019.json')
    }
  ],
  [
    'rj-chemistry-grade8-54-2024-full',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'rj-chemistry-grade8-54-2024-full.json')
    }
  ],
  [
    'pep-chemistry-g10-required-1',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'pep-chemistry-g10-required-1.json')
    }
  ],
  [
    'pep-chemistry-g10-required-2',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'pep-chemistry-g10-required-2.json')
    }
  ],
  [
    'pep-chemistry-g11-selective-1',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'pep-chemistry-g11-selective-1.json')
    }
  ],
  [
    'pep-chemistry-g11-selective-2',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'pep-chemistry-g11-selective-2.json')
    }
  ],
  [
    'fixture-missing-book',
    {
      batch: {
        volumeId: 'fixture-missing-book',
        sourcePath: 'src/data/textbookIngestion/fixtures/missing-book.md',
        assetRoot: 'src/data/textbookIngestion/fixtures/',
        schemaVersion: 1,
        sourceHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000'
      }
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

  const batch = await loadBatch(batchConfig);
  validateBatchForExtraction(batch, options.textbook);

  const sourcePath = resolveProjectPath(batch.sourcePath);
  const sourceBuffer = await readSourceBook(sourcePath);
  const sourceText = sourceBuffer.toString('utf8');
  const sourceHash = `sha256:${hashBuffer(sourceBuffer)}`;

  if (batch.sourceHash !== sourceHash) {
    throw new Error(`Batch sourceHash does not match source book: ${batch.sourceHash}`);
  }

  const sourceSections = extractSourceSections({
    sourceText,
    sourcePath: batch.sourcePath,
    sourceVolumeId: batch.volumeId,
    sourceHash,
    assetRoot: batch.assetRoot
  });
  const inventory = buildInventory(batch, sourceHash, sourceSections);
  const outputPath = path.join(generatedRoot, batch.volumeId, 'source-inventory.json');

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');

  console.log(`Extracted sections: ${sourceSections.length}`);
  console.log(`Referenced assets: ${sourceSections.reduce((total, section) => total + section.assets.length, 0)}`);
  console.log(`Wrote: ${relativeProjectPath(outputPath)}`);
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
  console.log(`Textbook source extractor / 教材来源切片提取器

Usage:
  node scripts/textbook/extract-textbook.mjs --textbook <volumeId>

Options:
  --textbook <volumeId>                Extract one known textbook source inventory.
  --help                              Show this help.`);
}

async function loadBatch(batchConfig) {
  if (batchConfig.batch) {
    return batchConfig.batch;
  }

  const source = await readFile(batchConfig.batchPath, 'utf8');
  return JSON.parse(source);
}

function validateBatchForExtraction(batch, expectedVolumeId) {
  if (!isRecord(batch)) {
    throw new Error('Batch contract must be an object');
  }

  for (const field of ['volumeId', 'sourcePath', 'assetRoot', 'sourceHash']) {
    if (typeof batch[field] !== 'string' || !batch[field].trim()) {
      throw new Error(`Batch contract missing required field: ${field}`);
    }
  }

  if (batch.volumeId !== expectedVolumeId) {
    throw new Error(`Batch volumeId must match --textbook: ${expectedVolumeId}`);
  }

  if (!/^sha256:[a-f0-9]{64}$/.test(batch.sourceHash)) {
    throw new Error(`Batch sourceHash must be sha256:<64 hex>: ${batch.sourceHash}`);
  }
}

async function readSourceBook(sourcePath) {
  try {
    return await readFile(sourcePath);
  } catch {
    throw new Error(`Source book not found: ${relativeProjectPath(sourcePath)}`);
  }
}

function extractSourceSections({ sourceText, sourcePath, sourceVolumeId, sourceHash, assetRoot }) {
  const lines = sourceText.split(/\r?\n/);
  const headingStarts = [];

  for (const [index, line] of lines.entries()) {
    const heading = parseMeaningfulHeading(line);
    if (heading) {
      headingStarts.push({ lineIndex: index, heading });
    }
  }

  if (headingStarts.length === 0) {
    headingStarts.push({ lineIndex: 0, heading: 'Untitled Source' });
  }

  return headingStarts.map((start, index) => {
    const nextStart = headingStarts[index + 1];
    const lineStart = start.lineIndex + 1;
    const lineEnd = nextStart ? nextStart.lineIndex : lines.length;
    const sectionText = lines.slice(start.lineIndex, lineEnd).join('\n');
    const sectionHash = `sha256:${hashText(sectionText)}`;
    const sectionId = buildSectionId(start.heading, lineStart, lineEnd, sectionHash, index);

    return {
      sectionId,
      sourceVolumeId,
      sourcePath,
      sourceHeading: start.heading,
      sourceLineStart: lineStart,
      sourceLineEnd: lineEnd,
      sourceHash,
      sectionHash,
      reviewStatus: 'needsReview',
      sourceText: sectionText,
      assets: extractAssets(sectionText, lineStart, sectionId, assetRoot)
    };
  });
}

function parseMeaningfulHeading(line) {
  const match = /^(#{1,6})\s+(.*)$/.exec(line);
  if (!match) {
    return null;
  }

  const headingText = match[2].trim();
  return headingText ? headingText : null;
}

function buildSectionId(heading, lineStart, lineEnd, sectionHash, index) {
  const headingSlug = slugifyHeading(heading) || 'source-section';
  const shortHash = sectionHash.slice('sha256:'.length, 'sha256:'.length + 10);
  const ordinal = String(index + 1).padStart(4, '0');
  return `${ordinal}-${headingSlug}-l${lineStart}-l${lineEnd}-${shortHash}`;
}

function slugifyHeading(heading) {
  return heading
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function extractAssets(sectionText, sectionLineStart, sectionId, assetRoot) {
  const assets = [];
  const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  for (const match of sectionText.matchAll(imagePattern)) {
    const rawReference = match[0];
    const assetPath = match[2];
    const sourceLineNumber = sectionLineStart + countLineBreaks(sectionText.slice(0, match.index));
    const assetIndex = assets.length + 1;

    assets.push({
      assetId: `${sectionId}-asset-${String(assetIndex).padStart(2, '0')}`,
      altText: match[1],
      rawReference,
      assetPath,
      sourceLineNumber,
      isLocalTextbookAsset: isLocalTextbookAsset(assetPath),
      projectRelativePath: buildProjectRelativeAssetPath(assetRoot, assetPath)
    });
  }

  return assets;
}

function countLineBreaks(text) {
  return (text.match(/\n/g) ?? []).length;
}

function isLocalTextbookAsset(assetPath) {
  return /^(?:\.\/)?images\//.test(assetPath) && !assetPath.includes('..');
}

function buildProjectRelativeAssetPath(assetRoot, assetPath) {
  if (!isLocalTextbookAsset(assetPath)) {
    return null;
  }

  const normalizedAssetPath = assetPath.replace(/^\.\//, '');
  const normalizedAssetRoot = assetRoot.replace(/\/+$/, '');
  return `${normalizedAssetRoot}/${normalizedAssetPath}`;
}

function buildInventory(batch, sourceHash, sourceSections) {
  return {
    schemaVersion: 1,
    volumeId: batch.volumeId,
    sourceHash,
    sourcePath: batch.sourcePath,
    assetRoot: batch.assetRoot,
    status: 'generated',
    sourceSections
  };
}

function hashBuffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function hashText(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function resolveProjectPath(projectRelativePath) {
  return path.resolve(projectRoot, projectRelativePath);
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

