import { createServer } from 'http';
import { parse } from 'url';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');
const MEDIA_JSON_PATH = join(PROJECT_ROOT, 'src', 'data', 'storyMedia', 'media.json');

const ALLOWED_SIDES = new Set(['discovery', 'specimen']);
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_DIMENSION = 800;

function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let offset = 0;

  while (offset < buffer.length) {
    const boundaryIndex = buffer.indexOf(boundaryBuffer, offset);
    if (boundaryIndex === -1) break;

    const nextBoundaryIndex = buffer.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
    if (nextBoundaryIndex === -1) break;

    const partBuffer = buffer.slice(boundaryIndex + boundaryBuffer.length, nextBoundaryIndex);
    const headerEndIndex = partBuffer.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) {
      offset = nextBoundaryIndex;
      continue;
    }

    const headerBuffer = partBuffer.slice(0, headerEndIndex);
    const bodyBuffer = partBuffer.slice(headerEndIndex + 4);
    const headerText = headerBuffer.toString('utf-8');

    const nameMatch = headerText.match(/name="([^"]+)"/);
    const filenameMatch = headerText.match(/filename="([^"]*)"/);

    // Parse part headers into a lower-cased map
    const headers = {};
    headerText.split('\r\n').forEach((line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim().toLowerCase();
        const value = line.slice(colonIndex + 1).trim();
        headers[key] = value;
      }
    });

    parts.push({
      name: nameMatch ? nameMatch[1] : '',
      filename: filenameMatch ? filenameMatch[1] : null,
      headers,
      body: bodyBuffer.slice(0, bodyBuffer.length - 2) // trim trailing \r\n
    });

    offset = nextBoundaryIndex;
  }

  return parts;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function padAtomicNumber(n) {
  return String(n).padStart(3, '0');
}

function deriveCanonicalPath(atomicNumber, symbol, side) {
  const folder = side === 'discovery' ? 'discovery' : 'specimens';
  const filename = `${padAtomicNumber(atomicNumber)}-${symbol.toLowerCase()}-${side}.webp`;
  return {
    publicPath: `/assets/elements/${folder}/${filename}`,
    absolutePath: join(PUBLIC_DIR, 'assets', 'elements', folder, filename)
  };
}

async function handleStoryMediaUpload(req, res) {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=([^;\s]+)/);
  if (!boundaryMatch) {
    sendJson(res, 400, { error: '缺少 multipart boundary。' });
    return;
  }

  let body;
  try {
    body = await readRequestBody(req);
  } catch {
    sendJson(res, 400, { error: '读取请求体失败。' });
    return;
  }

  const parts = parseMultipart(body, boundaryMatch[1]);
  const fields = {};
  let imagePart = null;

  for (const part of parts) {
    if (part.filename !== null) {
      if (part.name === 'image') {
        imagePart = part;
      }
    } else {
      fields[part.name] = part.body.toString('utf-8').trim();
    }
  }

  const atomicNumberRaw = Number(fields.atomicNumber);
  if (!Number.isInteger(atomicNumberRaw) || atomicNumberRaw < 1 || atomicNumberRaw > 118) {
    sendJson(res, 400, { error: 'atomicNumber 必须是 1 到 118 的整数。' });
    return;
  }

  const side = fields.side;
  if (!ALLOWED_SIDES.has(side)) {
    sendJson(res, 400, { error: 'side 必须是 discovery 或 specimen。' });
    return;
  }

  const source = (fields.source || '').trim();
  if (!source) {
    sendJson(res, 400, { error: 'source 不能为空。' });
    return;
  }

  if (!imagePart) {
    sendJson(res, 400, { error: '请上传图片文件。' });
    return;
  }

  // Determine MIME type from part Content-Type header, falling back to filename extension
  const partContentType = imagePart.headers['content-type'];
  let inferredMime = null;
  if (partContentType) {
    inferredMime = partContentType.split(';')[0].trim().toLowerCase();
  }
  if (!inferredMime || !ALLOWED_MIME_TYPES.has(inferredMime)) {
    const ext = (imagePart.filename || '').split('.').pop().toLowerCase();
    inferredMime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : null;
  }
  if (!inferredMime || !ALLOWED_MIME_TYPES.has(inferredMime)) {
    sendJson(res, 400, { error: '仅支持 PNG、JPG 或 WebP 图片。' });
    return;
  }

  if (imagePart.body.length > MAX_FILE_BYTES) {
    sendJson(res, 400, { error: '图片大小不能超过 1 MiB。' });
    return;
  }

  let metadata;
  try {
    metadata = await sharp(imagePart.body).metadata();
  } catch {
    sendJson(res, 400, { error: '无法解析图片文件。' });
    return;
  }

  if ((metadata.width || 0) > MAX_DIMENSION || (metadata.height || 0) > MAX_DIMENSION) {
    sendJson(res, 400, { error: '图片宽高不能超过 800 × 800 像素。' });
    return;
  }

  // Read current media.json to find symbol and existing src/altZh
  let mediaJson;
  try {
    const raw = fs.readFileSync(MEDIA_JSON_PATH, 'utf-8');
    mediaJson = JSON.parse(raw);
  } catch {
    sendJson(res, 500, { error: '无法读取 storyMedia 数据文件。' });
    return;
  }

  const entry = (mediaJson.elements || []).find((e) => e.atomicNumber === atomicNumberRaw);
  if (!entry) {
    sendJson(res, 404, { error: '未找到对应元素的故事媒体记录。' });
    return;
  }

  const symbol = entry.symbol;
  const { publicPath, absolutePath } = deriveCanonicalPath(atomicNumberRaw, symbol, side);

  // Convert and save as WebP
  try {
    const dir = dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await sharp(imagePart.body)
      .webp({ quality: 85 })
      .toFile(absolutePath);
  } catch (error) {
    sendJson(res, 500, { error: '图片保存失败。' });
    return;
  }

  // Update media.json
  const sideKey = side === 'discovery' ? 'discoveryImage' : 'specimenImage';
  const existing = entry[sideKey] || {};
  entry[sideKey] = {
    src: publicPath,
    altZh: existing.altZh || `${entry.symbol}（${entry.atomicNumber}）${side === 'discovery' ? '发现故事' : '安全样品'}教育插图`,
    source
  };

  try {
    fs.writeFileSync(MEDIA_JSON_PATH, JSON.stringify(mediaJson, null, 2) + '\n', 'utf-8');
  } catch {
    sendJson(res, 500, { error: '更新 media.json 失败。' });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    src: publicPath,
    source,
    altZh: entry[sideKey].altZh,
    atomicNumber: atomicNumberRaw,
    side
  });
}

export function storyMediaUploadMiddleware(req, res, next) {
  const parsed = parse(req.url || '', true);
  if (parsed.pathname === '/api/story-media/upload' && req.method === 'POST') {
    handleStoryMediaUpload(req, res).catch((error) => {
      console.error('[story-media-upload] 未捕获错误:', error);
      sendJson(res, 500, { error: '服务器内部错误。' });
    });
    return;
  }
  next();
}
