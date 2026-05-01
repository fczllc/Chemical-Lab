import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const targetWidth = 800;
const targetHeight = 520;
const targetBytes = 160 * 1024;
const minQuality = 35;
const maxQuality = 88;
const allowedOutputRoots = [
  path.resolve(projectRoot, 'public/assets/elements/discovery'),
  path.resolve(projectRoot, 'public/assets/elements/specimens')
];
const allowedManifestRoots = [
  path.resolve(projectRoot, '.cache'),
  path.resolve(projectRoot, '.sisyphus/evidence')
];

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

  if (options.inputs.length === 0) {
    throw new Error('Provide at least one local input image path. Use --help for examples.');
  }

  const outputs = planOutputs(options);
  const results = [];

  for (const [index, inputPath] of options.inputs.entries()) {
    const outputPath = outputs[index];
    const result = await normalizeImage(inputPath, outputPath);
    results.push(result);
    console.log(`${path.relative(projectRoot, result.outputPath)}: ${result.width}x${result.height}, ${result.bytes} bytes, quality=${result.quality}`);
  }

  if (options.manifest) {
    assertInsideAllowedRoots(options.manifest, allowedManifestRoots, '--manifest');
    await mkdir(path.dirname(options.manifest), { recursive: true });
    await writeFile(options.manifest, `${JSON.stringify({ items: results.map(toManifestEntry) }, null, 2)}\n`, 'utf8');
    console.log(`Wrote metadata manifest: ${path.relative(projectRoot, options.manifest)}`);
  }
}

function parseCli(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      output: { type: 'string', short: 'o' },
      'out-dir': { type: 'string' },
      manifest: { type: 'string' }
    },
    allowPositionals: true,
    strict: true
  });

  return {
    help: values.help === true,
    output: values.output ? resolveLocalPath(values.output, 'output') : null,
    outDir: values['out-dir'] ? resolveLocalPath(values['out-dir'], 'out-dir') : null,
    manifest: values.manifest ? resolveLocalPath(values.manifest, 'manifest') : null,
    inputs: positionals.map((input) => resolveLocalPath(input, 'input'))
  };
}

function printHelp() {
  console.log(`Story media normalizer / 元素故事媒体图片规范化工具

Usage:
  node scripts/normalize-story-media.mjs input.jpg --output public/assets/elements/discovery/001-h-discovery.webp
  node scripts/normalize-story-media.mjs input-a.png input-b.jpg --out-dir public/assets/elements/specimens --manifest .cache/story-media.json

Policy:
  Converts local input images to 800x520 WebP using cover/centre crop.
  Searches for the highest WebP quality between ${minQuality}-${maxQuality} that is <= ${targetBytes} bytes.
  Prints output dimensions, byte size, and quality for metadata curation.
  Optional --manifest writes a small JSON report with src, width, height, bytes, and quality.`);
}

function planOutputs(options) {
  if (options.output && options.inputs.length !== 1) {
    throw new Error('--output can only be used with exactly one input image. Use --out-dir for multiple inputs.');
  }

  if (options.output && options.outDir) {
    throw new Error('Use only one of --output or --out-dir.');
  }

  if (options.output) {
    const outputPath = ensureWebpExtension(options.output);
    assertInsideAllowedRoots(outputPath, allowedOutputRoots, '--output');
    return [outputPath];
  }

  const outDir = options.outDir ?? path.dirname(options.inputs[0]);
  assertInsideAllowedRoots(outDir, allowedOutputRoots, '--out-dir');
  return options.inputs.map((inputPath) => ensureWebpExtension(path.join(outDir, path.basename(inputPath, path.extname(inputPath)))));
}

async function normalizeImage(inputPath, outputPath) {
  const selected = await findBestWebp(inputPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, selected.buffer);

  const metadata = await sharp(selected.buffer).metadata();
  return {
    inputPath,
    outputPath,
    src: toPublicSrc(outputPath),
    width: metadata.width,
    height: metadata.height,
    bytes: selected.buffer.length,
    quality: selected.quality
  };
}

async function findBestWebp(inputPath) {
  let smallest = null;

  for (let quality = maxQuality; quality >= minQuality; quality -= 1) {
    const buffer = await renderWebp(inputPath, quality);
    if (!smallest || buffer.length < smallest.buffer.length) {
      smallest = { quality, buffer };
    }

    if (buffer.length <= targetBytes) {
      return { quality, buffer };
    }
  }

  throw new Error(`Unable to normalize ${inputPath} under ${targetBytes} bytes; smallest attempt was ${smallest?.buffer.length ?? 'unknown'} bytes at quality ${smallest?.quality ?? 'n/a'}.`);
}

function resolveLocalPath(value, label) {
  rejectRemotePath(value, label);
  return path.resolve(value);
}

function renderWebp(inputPath, quality) {
  return sharp(inputPath)
    .resize(targetWidth, targetHeight, { fit: 'cover', position: 'centre' })
    .webp({ quality, effort: 4 })
    .toBuffer();
}

function ensureWebpExtension(outputPath) {
  return outputPath.endsWith('.webp') ? outputPath : `${outputPath}.webp`;
}

function rejectRemotePath(value, label) {
  if (/^https?:\/\//i.test(value)) {
    throw new Error(`${label} image path must be local; remote URLs are not allowed: ${value}`);
  }
}

function assertInsideAllowedRoots(candidatePath, allowedRoots, label) {
  if (!allowedRoots.some((rootPath) => isPathInside(rootPath, candidatePath))) {
    throw new Error(`${label} must be inside one of: ${allowedRoots.map((rootPath) => path.relative(projectRoot, rootPath)).join(', ')}`);
  }
}

function isPathInside(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function toPublicSrc(outputPath) {
  const relative = path.relative(path.join(projectRoot, 'public'), outputPath).split(path.sep).join('/');
  return relative.startsWith('..') ? null : `/${relative}`;
}

function toManifestEntry(result) {
  return {
    src: result.src,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    quality: result.quality,
    output: path.relative(projectRoot, result.outputPath).split(path.sep).join('/')
  };
}
