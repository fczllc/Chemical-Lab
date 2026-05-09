import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { validateDraftInventory, validatePromotionManifest } from '../../src/data/textbookIngestion/schemas/draftSchemas.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const knownTextbookBatches = new Map([
  [
    'rj-chemistry-grade9-2024-vol1',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'rj-chemistry-grade9-2024-vol1.json'),
      draftInventoryPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', 'rj-chemistry-grade9-2024-vol1', 'draft-inventory.json'),
      promotionManifestPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', 'rj-chemistry-grade9-2024-vol1', 'promotion-manifest.json')
    }
  ],
  [
    'rj-chemistry-grade9-2024-vol2',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'rj-chemistry-grade9-2024-vol2.json'),
      draftInventoryPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', 'rj-chemistry-grade9-2024-vol2', 'draft-inventory.json'),
      promotionManifestPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', 'rj-chemistry-grade9-2024-vol2', 'promotion-manifest.json')
    }
  ],
  [
    'rj-chemistry-g12-selective-3-organic-2019',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'rj-chemistry-g12-selective-3-organic-2019.json'),
      draftInventoryPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', 'rj-chemistry-g12-selective-3-organic-2019', 'draft-inventory.json'),
      promotionManifestPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', 'rj-chemistry-g12-selective-3-organic-2019', 'promotion-manifest.json')
    }
  ],
  [
    'rj-chemistry-grade8-54-2024-full',
    {
      batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', 'rj-chemistry-grade8-54-2024-full.json'),
      draftInventoryPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', 'rj-chemistry-grade8-54-2024-full', 'draft-inventory.json'),
      promotionManifestPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated', 'rj-chemistry-grade8-54-2024-full', 'promotion-manifest.json')
    }
  ]
]);

const knownFixtures = new Map([
  [
    'valid-generated-inventory',
    path.join(projectRoot, 'scripts', 'textbook', 'fixtures', 'valid-generated-inventory.json')
  ],
  [
    'missing-provenance-source-line-start',
    path.join(projectRoot, 'scripts', 'textbook', 'fixtures', 'missing-provenance-source-line-start.json')
  ],
  [
    'missing-reviewed-metadata',
    path.join(projectRoot, 'scripts', 'textbook', 'fixtures', 'missing-reviewed-metadata.json')
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

  if (options.fixture) {
    const fixturePath = knownFixtures.get(options.fixture);
    if (!fixturePath) {
      throw new Error(`Unknown draft schema fixture: ${options.fixture}`);
    }

    const result = await validateFixture(fixturePath, options.fixture);
    finishValidation(result);
    return;
  }

  if (!options.textbook) {
    throw new Error('--textbook is required unless --fixture is provided');
  }

  const paths = knownTextbookBatches.get(options.textbook);
  if (!paths) {
    throw new Error(`Unknown textbook batch: ${options.textbook}`);
  }

  const result = await validateTextbook(paths, options.textbook);
  finishValidation(result);
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      textbook: { type: 'string' },
      fixture: { type: 'string' }
    },
    strict: true
  });

  return {
    help: values.help === true,
    textbook: values.textbook ?? null,
    fixture: values.fixture ?? null
  };
}

function printHelp() {
  console.log(`Textbook draft schema validator / 教材草稿结构校验器

Usage:
  node scripts/textbook/validate-draft-schema.mjs --textbook <volumeId>
  node scripts/textbook/validate-draft-schema.mjs --fixture <fixtureName>

Options:
  --textbook <volumeId>                Validate generated draft inventory and promotion manifest for a known textbook.
  --fixture <fixtureName>              Validate a schema fixture by stable fixture name.
  --help                              Show this help.`);
}

async function validateTextbook(paths, expectedVolumeId) {
  const errors = [];
  const batch = await readJsonFile(paths.batchPath, 'batch contract', errors);
  const expectedSourceHash = batch?.sourceHash;
  const identity = { expectedVolumeId, expectedSourceHash };

  const draftInventory = await readJsonFile(paths.draftInventoryPath, 'draft inventory', errors);
  const promotionManifest = await readJsonFile(paths.promotionManifestPath, 'promotion manifest', errors);

  errors.push(...validateDraftInventory(draftInventory, identity));
  errors.push(...validatePromotionManifest(promotionManifest, identity));

  return {
    errors,
    label: expectedVolumeId,
    checked: [
      relativeProjectPath(paths.draftInventoryPath),
      relativeProjectPath(paths.promotionManifestPath)
    ]
  };
}

async function validateFixture(fixturePath, fixtureName) {
  const errors = [];
  const fixture = await readJsonFile(fixturePath, 'draft schema fixture', errors);

  if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) {
    errors.push('fixture top level must be an object');
    return { errors, label: fixtureName, checked: [relativeProjectPath(fixturePath)] };
  }

  if (fixture.kind === 'draftInventory') {
    errors.push(...validateDraftInventory(fixture.data ?? null));
  } else if (fixture.kind === 'promotionManifest') {
    errors.push(...validatePromotionManifest(fixture.data ?? null));
  } else {
    errors.push(`fixture kind must be draftInventory or promotionManifest: ${String(fixture.kind)}`);
  }

  return { errors, label: fixtureName, checked: [relativeProjectPath(fixturePath)] };
}

async function readJsonFile(filePath, label, errors) {
  try {
    const source = await readFile(filePath, 'utf8');
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${label} cannot be read or parsed: ${error.message}`);
    return null;
  }
}

function finishValidation(result) {
  if (result.errors.length > 0) {
    console.error('Draft schema validation failed:');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Draft schema valid: ${result.label}`);
  for (const checkedPath of result.checked) {
    console.log(`checked: ${checkedPath}`);
  }
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}

