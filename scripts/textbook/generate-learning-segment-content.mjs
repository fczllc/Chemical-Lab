import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const assetManifest = (await import(pathToFileURL(path.join(projectRoot, 'src/data/textbookAssets.js')).href)).default;

function decodeHtmlEntities(text) {
  return String(text ?? '')
    .replace(/&#(\d+);/g, (_, code) => {
      const value = Number(code);
      return Number.isFinite(value) ? String.fromCodePoint(value) : _;
    })
    .replace(/&#x([\da-f]+);/gi, (_, code) => {
      const value = Number.parseInt(code, 16);
      return Number.isFinite(value) ? String.fromCodePoint(value) : _;
    })
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtmlTags(text) {
  return String(text ?? '').replace(/<[^>]+>/g, '');
}

function parseHtmlTable(text) {
  const rows = [];
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch = rowRegex.exec(String(text ?? ''));

  while (rowMatch !== null) {
    const cells = [];
    const cellRegex = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch = cellRegex.exec(rowMatch[1]);

    while (cellMatch !== null) {
      const cell = decodeHtmlEntities(stripHtmlTags(cellMatch[1]))
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(cell);
      cellMatch = cellRegex.exec(rowMatch[1]);
    }

    if (cells.some(Boolean)) {
      rows.push(cells);
    }

    rowMatch = rowRegex.exec(String(text ?? ''));
  }

  return rows;
}

function parseMarkdownTableRow(line) {
  const trimmed = String(line ?? '').trim();
  if (!trimmed.startsWith('|')) return null;

  const cells = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

  if (!cells.length || cells.every((cell) => !cell)) return null;
  if (cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')))) return null;

  return cells;
}

function isMarkdownTableSeparator(line) {
  const trimmed = String(line ?? '').trim();
  if (!trimmed.startsWith('|')) return false;

  const cells = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
    .filter(Boolean);

  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')));
}

function parseMarkdownToBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  
  const pushBlock = (type, data) => {
    if (type === 'heading') {
        if (data.level >= 1 && data.level <= 4 && data.text) {
            blocks.push({ type, level: data.level, text: data.text });
        } else if (data.text) {
            blocks.push({ type: 'paragraph', text: data.text });
        }
    } else if (type === 'paragraph') {
        if (data.text) blocks.push({ type, text: data.text });
    } else if (type === 'list') {
        if (data.items.length > 0) blocks.push({ type, style: data.style, items: data.items });
    } else if (type === 'table') {
        const rows = Array.isArray(data.rows)
          ? data.rows
              .filter(Array.isArray)
              .map((row) => row.map((cell) => String(cell ?? '').trim()))
              .filter((row) => row.some(Boolean))
          : [];
        const items = rows
          .map((row) => row.filter(Boolean).join(' / '))
          .filter(Boolean);
        if (items.length > 0) blocks.push({ type: 'list', style: 'unordered', items });
    }
  };

  let listBuffer = { active: false, style: 'unordered', items: [] };
  let tableBuffer = { active: false, rows: [] };
  let htmlTableBuffer = '';
  let displayMathBuffer = null;

  const flushBuffers = () => {
      if (listBuffer.active) {
          pushBlock('list', { style: listBuffer.style, items: listBuffer.items });
          listBuffer = { active: false, style: 'unordered', items: [] };
      }
      if (tableBuffer.active) {
          pushBlock('table', { rows: tableBuffer.rows });
          tableBuffer = { active: false, rows: [] };
      }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    if (htmlTableBuffer) {
      htmlTableBuffer += `\n${line}`;
      if (/<\/table>/i.test(line)) {
        pushBlock('table', { rows: parseHtmlTable(htmlTableBuffer) });
        htmlTableBuffer = '';
      }
      continue;
    }

    if (displayMathBuffer) {
      if (trimmedLine === displayMathBuffer.closer) {
        const body = displayMathBuffer.lines.join('\n').trim();
        pushBlock('paragraph', { text: `${displayMathBuffer.opener}\n${body}\n${displayMathBuffer.closer}` });
        displayMathBuffer = null;
      } else {
        displayMathBuffer.lines.push(line);
      }
      continue;
    }

    if (trimmedLine === '$$' || trimmedLine === '\\[') {
      flushBuffers();
      displayMathBuffer = {
        opener: trimmedLine,
        closer: trimmedLine === '$$' ? '$$' : '\\]',
        lines: []
      };
      continue;
    }

    if (!trimmedLine) {
      flushBuffers();
      continue;
    }

    if (/!\[.*?\]\(.*?\)/.test(line)) continue;

    const hMatch = /^(#{1,4})\s+(.*)$/.exec(line);
    if (hMatch) {
      flushBuffers();
      pushBlock('heading', { level: hMatch[1].length, text: hMatch[2].trim() });
      continue;
    }

    const markdownTableRow = parseMarkdownTableRow(line);
    if (markdownTableRow) {
        if (listBuffer.active) flushBuffers();
        tableBuffer.active = true;
        tableBuffer.rows.push(markdownTableRow);
        continue;
    }
    if (isMarkdownTableSeparator(line)) {
        continue;
    }

    if (/<table\b/i.test(line)) {
        flushBuffers();
        if (/<\/table>/i.test(line)) {
            pushBlock('table', { rows: parseHtmlTable(line) });
        } else {
            htmlTableBuffer = line;
        }
        continue;
    }

    const uMatch = /^[-*+]\s+(.*)$/.exec(line);
    const oMatch = /^\d+[.)]\s+(.*)$/.exec(line);
    if (uMatch || oMatch) {
        if (tableBuffer.active) flushBuffers();
        const style = uMatch ? 'unordered' : 'ordered';
        if (listBuffer.active && listBuffer.style !== style) {
            pushBlock('list', { style: listBuffer.style, items: listBuffer.items });
            listBuffer = { active: false, style: 'unordered', items: [] };
        }
        listBuffer.active = true;
        listBuffer.style = style;
        listBuffer.items.push((uMatch || oMatch)[1].trim());
        continue;
    }

    flushBuffers();
    
    let text = line.trim();
    pushBlock('paragraph', { text });
  }
  
  if (htmlTableBuffer) {
    pushBlock('table', { rows: parseHtmlTable(htmlTableBuffer) });
  }
  if (displayMathBuffer) {
    pushBlock('paragraph', {
      text: [displayMathBuffer.opener, ...displayMathBuffer.lines].join('\n').trim()
    });
  }
  flushBuffers();

  return blocks;
}

function validateRecords(records) {
  if (!records.length) throw new Error('No records generated');
  for (const r of records) {
    if (!r.segmentId || !r.achievementId || !r.sourceVolumeId || !r.manifestVolumeId || !r.lineRange || !r.rangeLabel || !r.textbookName) throw new Error('Missing string field in record: ' + JSON.stringify(r));
    if (!Array.isArray(r.blocks) || r.blocks.length === 0) throw new Error('Empty blocks');
    for (const b of r.blocks) {
      if (typeof b !== 'object') throw new Error('Block not object');
      if (!['heading', 'paragraph', 'list'].includes(b.type)) throw new Error('Bad block type: ' + b.type);
      if (b.type === 'heading') { if (b.level < 1 || b.level > 4 || !b.text) throw new Error('Bad heading'); }
      else if (b.type === 'paragraph') { if (!b.text) throw new Error('Bad paragraph'); }
      else if (b.type === 'list') { if (!['ordered', 'unordered'].includes(b.style) || !b.items.length) throw new Error('Bad list'); }
      const str = JSON.stringify(b);
      if (str.includes('![](') || str.includes('images/')) throw new Error('Leaked images');
    }
  }
  const det = records.find(x => x.segmentId === 'knowledge-topic-0004-source-section-l63-l74-105f9964c8');
  if (!det) throw new Error('Deterministic record missing');
  if (det.textbookName !== '2019版人教版高中化学必修第1册' || det.rangeLabel !== 'L63-74' || !JSON.stringify(det.blocks).includes('世界是由物质构成的')) throw new Error('Deterministic validation failed');
  if (!JSON.stringify(records).includes('\\\\mathrm{C}_{60}') && !JSON.stringify(records).includes('\\mathrm{C}_{60}')) throw new Error('Formula missing');
}

async function main() {
  const achievements = JSON.parse(await readFile(path.join(projectRoot, 'src/data/achievementsData.json'), 'utf8'));
  const targetAchievements = achievements.achievementsData.filter(a => {
    if (a.category !== 'learning') return false;
    if (!a.curriculumTags || a.curriculumTags.length !== 1 || !a.curriculumTags[0]) throw new Error('Invalid curriculumTags for ' + a.id);
    return a.condition?.type === 'manualReviewAfterPromotion' && a.sourceReviewStatus === 'reviewed' && a.sourceReferences?.some(ref => ref.lineRange);
  });

  const textbookContent = [];

  for (const ach of targetAchievements) {
    for (const ref of ach.sourceReferences) {
      if (!ref.lineRange) continue;
      
      const sourcePath = path.join(projectRoot, ref.sourcePath);
      const content = await readFile(sourcePath, 'utf8');
      const lines = content.split(/\r?\n/);
      
      const [start, end] = ref.lineRange.split('-').map(Number);
      const sliced = lines.slice(start - 1, end);
      
      let startIdx = 0;
      if (sliced[0] === '---') {
        const nextDash = sliced.indexOf('---', 1);
        if (nextDash !== -1) startIdx = nextDash + 1;
      }
      
      const cleanContent = sliced.slice(startIdx).join('\n');
      const sourceVolumeId = ach.sourceVolumeId || ref.sourceVolumeId || ref.volumeId || '';
      const vol = assetManifest.volumes.find(v => v.volumeId === sourceVolumeId) || 
                  assetManifest.volumes.find(v => v.sourcePath === ref.sourcePath);
      
      textbookContent.push({
        segmentId: ach.curriculumTags[0],
        achievementId: ach.id,
        sourceVolumeId: sourceVolumeId,
        manifestVolumeId: vol ? vol.volumeId : sourceVolumeId,
        candidateId: ref.candidateId || '',
        sourceSectionId: ref.candidateId && ref.candidateId.startsWith('achievement-') ? ref.candidateId.slice('achievement-'.length) : '',
        sourcePath: ref.sourcePath,
        sourceHeading: ref.sourceHeading,
        lineRange: ref.lineRange,
        rangeLabel: `L${ref.lineRange}`,
        textbookName: vol ? (vol.displayName || vol.sourceVolume) : sourceVolumeId,
        blocks: parseMarkdownToBlocks(cleanContent)
      });
    }
  }

  validateRecords(textbookContent);

  const outputPath = path.join(projectRoot, 'src/data/learningSegmentTextbookContent.js');
  const fileContent = `// Generated by scripts/textbook/generate-learning-segment-content.mjs. Do not edit by hand.
export const learningSegmentTextbookContent = ${JSON.stringify(textbookContent, null, 2)};
export default learningSegmentTextbookContent;
`;
  await writeFile(outputPath, fileContent, 'utf8');
  console.log(`Generated ${textbookContent.length} records.`);
}

main().catch(error => { console.error(error); process.exit(1); });
