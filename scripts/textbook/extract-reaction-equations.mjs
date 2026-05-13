import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const textbooksRoot = path.join(projectRoot, 'src', 'data', 'textbooks');
const reviewManifestPath = path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'reactionEquationReview.json');
const contextRadius = 2;

const equationOperatorPatterns = [
  ['equals', /=/u],
  ['unicodeArrow', /→/u],
  ['asciiArrow', /->/u],
  ['latexRightArrow', /\\(?:right|longright)arrow/u],
  ['latexXRightArrow', /\\xrightarrow(?:\s*\{[^}]*\})?/u],
  ['latexXLongEqual', /\\xlongequal(?:\s*\{[^}]*\})?/u],
  ['latexReversibleArrow', /\\rightleftharpoons|\\leftrightharpoons|\\rightleftarrows|\\leftrightarrow/u],
  ['unicodeReversibleArrow', /⇌|↔/u],
  ['latexStackrelOperator', /\\stackrel\s*\{[^}]*\}\s*\{(?:=|\\(?:right|longright)arrow|\\rightleftharpoons)\}/u]
];

const gasMarkerPatterns = [
  ['latexUpArrow', /\\uparrow/u],
  ['unicodeUpArrow', /↑/u],
  ['gasText', /\(g\)|气体/u]
];

const precipitateMarkerPatterns = [
  ['latexDownArrow', /\\downarrow/u],
  ['unicodeDownArrow', /↓/u],
  ['solidText', /\(s\)|沉淀/u]
];

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  const options = parseCli(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const report = await buildExtractionReport();

  if (options.check) {
    report.reviewCheck = await checkAgainstReviewManifest(report);
  }

  if (options.report) {
    await writeJson(resolveProjectPath(options.report), report);
  }

  if (options.check) {
    return;
  }

  printStableSummary(report, options.report);
}

function parseCli(args) {
  const values = {
    help: false,
    report: null,
    check: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      values.help = true;
      continue;
    }

    if (arg === '--check') {
      values.check = true;
      continue;
    }

    if (arg === '--report') {
      const reportPath = args[index + 1];

      if (!reportPath || reportPath.startsWith('--')) {
        throw new Error('--report requires a path');
      }

      values.report = reportPath;
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return {
    help: values.help,
    report: values.report,
    check: values.check
  };
}

function printHelp() {
  console.log(`Textbook reaction equation candidate extractor / 教材反应方程式候选提取器

Usage:
  node scripts/textbook/extract-reaction-equations.mjs [--report <path>] [--check]

Options:
  --report <path>  Write deterministic JSON report to the given path.
  --check          Compare extracted candidates with reactionEquationReview.json when present.
  --help           Show this help.`);
}

async function buildExtractionReport() {
  const bookFiles = await findBookFiles(textbooksRoot);
  const fileReports = [];
  const candidates = [];

  for (const bookPath of bookFiles) {
    const sourceFile = relativeProjectPath(bookPath);
    const sourceBuffer = await readFile(bookPath);
    const sourceText = sourceBuffer.toString('utf8');
    const lines = splitLines(sourceText);
    const volume = parseVolume(sourceText, bookPath);
    const sourceHash = `sha256:${hashBuffer(sourceBuffer)}`;
    const fileCandidates = extractCandidatesFromBook({
      sourceFile,
      sourceText,
      sourceHash,
      lines,
      volume
    });

    fileReports.push({
      sourceFile,
      volume,
      sourceHash,
      candidateCount: fileCandidates.length
    });
    candidates.push(...fileCandidates);
  }

  candidates.sort(compareCandidates);

  return {
    schemaVersion: 1,
    status: 'generated',
    extractor: 'scripts/textbook/extract-reaction-equations.mjs',
    textbooksRoot: 'src/data/textbooks',
    fileCount: fileReports.length,
    candidateCount: candidates.length,
    perFileCounts: fileReports,
    candidates
  };
}

async function findBookFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const bookFiles = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))) {
    if (!entry.isDirectory()) {
      continue;
    }

    bookFiles.push(path.join(root, entry.name, 'book.md'));
  }

  return bookFiles;
}

function parseVolume(sourceText, bookPath) {
  const frontmatterMatch = /^---\n([\s\S]*?)\n---/u.exec(sourceText.replace(/^\uFEFF/u, ''));
  const frontmatter = frontmatterMatch?.[1] ?? '';
  const volumeId = /^volumeId:\s*(.+)$/mu.exec(frontmatter)?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? null;
  const bookTitle = /^bookTitle:\s*(.+)$/mu.exec(frontmatter)?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? path.basename(path.dirname(bookPath));

  return {
    volumeId: volumeId ?? slugifyPathSegment(path.basename(path.dirname(bookPath))),
    bookTitle,
    directoryName: path.basename(path.dirname(bookPath))
  };
}

function extractCandidatesFromBook({ sourceFile, sourceText, sourceHash, lines, volume }) {
  const seen = new Set();
  const candidates = [];
  const occupiedRanges = [];

  for (const block of extractDisplayMathBlocks(sourceText)) {
    addCandidate(candidates, seen, occupiedRanges, {
      sourceFile,
      sourceHash,
      lines,
      volume,
      lineStart: block.lineStart,
      lineEnd: block.lineEnd,
      rawEquationText: block.rawEquationText,
      contextKind: block.contextKind
    });
  }

  for (const tableCandidate of extractHtmlTableCellCandidates(lines)) {
    addCandidate(candidates, seen, occupiedRanges, {
      sourceFile,
      sourceHash,
      lines,
      volume,
      ...tableCandidate
    });
  }

  for (const tableCandidate of extractMarkdownTableCellCandidates(lines)) {
    addCandidate(candidates, seen, occupiedRanges, {
      sourceFile,
      sourceHash,
      lines,
      volume,
      ...tableCandidate
    });
  }

  for (const inlineCandidate of extractInlineMathCandidates(lines)) {
    addCandidate(candidates, seen, occupiedRanges, {
      sourceFile,
      sourceHash,
      lines,
      volume,
      ...inlineCandidate
    });
  }

  for (const plainCandidate of extractPlainTextCandidates(lines, occupiedRanges)) {
    addCandidate(candidates, seen, occupiedRanges, {
      sourceFile,
      sourceHash,
      lines,
      volume,
      ...plainCandidate
    });
  }

  return candidates.sort(compareCandidates);
}

function extractDisplayMathBlocks(sourceText) {
  const blocks = [];
  const patterns = [
    { contextKind: 'displayMath', regex: /(^|\n)(\$\$)\n?([\s\S]*?)\n?\2(?=\n|$)/gu },
    { contextKind: 'displayMath', regex: /(^|\n)(\\\[)\n?([\s\S]*?)\n?\\\](?=\n|$)/gu },
    { contextKind: 'latexEquationBlock', regex: /(^|\n)(\\begin\{(?:equation\*?|align\*?|array)\})([\s\S]*?\\end\{(?:equation\*?|align\*?|array)\})(?=\n|$)/gu }
  ];

  for (const pattern of patterns) {
    for (const match of sourceText.matchAll(pattern.regex)) {
      const rawEquationText = match[3].trim();

      if (!hasEquationOperator(rawEquationText)) {
        continue;
      }

      const before = sourceText.slice(0, match.index + match[1].length);
      const lineStart = countLineBreaks(before) + 1;
      const lineEnd = lineStart + countLineBreaks(match[0].slice(match[1].length));

      blocks.push({
        contextKind: pattern.contextKind,
        lineStart,
        lineEnd,
        rawEquationText
      });
    }
  }

  return blocks;
}

function extractInlineMathCandidates(lines) {
  const candidates = [];
  const inlineMathPattern = /(?<!\$)\$([^$\n]+?)\$(?!\$)/gu;

  for (const [index, line] of lines.entries()) {
    for (const match of line.matchAll(inlineMathPattern)) {
      const rawEquationText = match[1].trim();

      if (!hasEquationOperator(rawEquationText)) {
        continue;
      }

      candidates.push({
        contextKind: 'inlineMath',
        lineStart: index + 1,
        lineEnd: index + 1,
        rawEquationText
      });
    }
  }

  return candidates;
}

function extractMarkdownTableCellCandidates(lines) {
  const candidates = [];

  for (const [index, line] of lines.entries()) {
    if (!isMarkdownTableLine(line)) {
      continue;
    }

    for (const cell of splitMarkdownTableCells(line)) {
      for (const rawEquationText of extractEquationSegments(cell)) {
        candidates.push({
          contextKind: 'markdownTableCell',
          lineStart: index + 1,
          lineEnd: index + 1,
          rawEquationText
        });
      }
    }
  }

  return candidates;
}

function extractHtmlTableCellCandidates(lines) {
  const candidates = [];
  const tableCellPattern = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/giu;

  for (const [index, line] of lines.entries()) {
    if (!/<t[dh]\b/i.test(line)) {
      continue;
    }

    for (const match of line.matchAll(tableCellPattern)) {
      const cell = stripHtml(match[1]).trim();

      for (const rawEquationText of extractEquationSegments(cell)) {
        candidates.push({
          contextKind: 'htmlTableCell',
          lineStart: index + 1,
          lineEnd: index + 1,
          rawEquationText
        });
      }
    }
  }

  return candidates;
}

function extractPlainTextCandidates(lines, occupiedRanges) {
  const candidates = [];

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    if (isLineInRanges(lineNumber, occupiedRanges) || isMarkdownTableLine(line) || /<t[dh]\b/i.test(line)) {
      continue;
    }

    for (const rawEquationText of extractEquationSegments(stripMarkdownImages(line))) {
      candidates.push({
        contextKind: 'plainText',
        lineStart: lineNumber,
        lineEnd: lineNumber,
        rawEquationText
      });
    }
  }

  return candidates;
}

function extractEquationSegments(text) {
  const normalized = String(text ?? '').trim();

  if (!hasEquationOperator(normalized)) {
    return [];
  }

  const segments = splitLooseEquationSegments(normalized)
    .map((segment) => trimEquationPunctuation(segment))
    .filter((segment) => segment && hasEquationOperator(segment));

  return segments.length > 0 ? segments : [normalized];
}

function splitLooseEquationSegments(text) {
  return text
    .split(/[；;。！？?，,]\s*/u)
    .flatMap((segment) => segment.split(/\s{2,}/u));
}

function addCandidate(candidates, seen, occupiedRanges, input) {
  const rawEquationText = String(input.rawEquationText ?? '').trim();
  const syntaxFeatures = detectSyntaxFeatures(rawEquationText, input.contextKind);

  if (!syntaxFeatures.hasEquationOperator || !isLikelyReactionEquation(rawEquationText, syntaxFeatures, input.contextKind)) {
    return;
  }

  const candidateId = buildCandidateId(input.sourceFile, input.lineStart, input.lineEnd, rawEquationText);

  if (seen.has(candidateId)) {
    return;
  }

  seen.add(candidateId);
  occupiedRanges.push({ lineStart: input.lineStart, lineEnd: input.lineEnd });

  candidates.push({
    candidateId,
    sourceFile: input.sourceFile,
    volume: input.volume,
    lineStart: input.lineStart,
    lineEnd: input.lineEnd,
    excerpt: buildExcerpt(input.lines, input.lineStart, input.lineEnd),
    rawEquationText,
    sourceContext: buildSourceContext(input.lines, input.lineStart, input.lineEnd, input.contextKind),
    syntaxFeatures,
    sourceHash: input.sourceHash,
    equationTextHash: `sha256:${hashText(rawEquationText)}`
  });
}

function isLikelyReactionEquation(rawEquationText, syntaxFeatures, contextKind) {
  const compact = normalizeForHeuristics(rawEquationText);

  if (/^(?:pH|PH|pOH|n|N|m|V|c|Mr|Ar|M|ρ|R|T|P)\s*=/u.test(compact)) {
    return false;
  }

  if (/^[A-Z][a-z]?=[A-Z][a-z]?(?:=[A-Z][a-z]?)*$/u.test(compact)) {
    return false;
  }

  if (/^(?:mA\+nB|aA\+bB)\s*(?:⇌|=|->|→)/u.test(compact)) {
    return false;
  }

  if (syntaxFeatures.operators.some((operator) => /arrow|reversible/i.test(operator)) || syntaxFeatures.gasMarkers.length > 0 || syntaxFeatures.precipitateMarkers.length > 0) {
    return true;
  }

  if (/displayMath|latexEquationBlock|inlineMath/u.test(contextKind) && /\\mathrm|[A-Z](?:\s*[_({]|[a-z]|\b)/u.test(rawEquationText) && /\+/u.test(rawEquationText)) {
    return true;
  }

  const formulaLikeTokens = compact.match(/(?:\d*)[A-Z][a-z]?(?:\d+|\([A-Za-z0-9]+\)\d*|[A-Z][a-z]?|[₀-₉])+|[A-Z][a-z]?/gu) ?? [];
  return formulaLikeTokens.length >= 3 && /\+/u.test(compact);
}

function detectSyntaxFeatures(rawEquationText, contextKind) {
  const operators = equationOperatorPatterns
    .filter(([, pattern]) => pattern.test(rawEquationText))
    .map(([name]) => name)
    .sort();
  const gasMarkers = gasMarkerPatterns
    .filter(([, pattern]) => pattern.test(rawEquationText))
    .map(([name]) => name)
    .sort();
  const precipitateMarkers = precipitateMarkerPatterns
    .filter(([, pattern]) => pattern.test(rawEquationText))
    .map(([name]) => name)
    .sort();
  const lowConfidenceReasons = [];

  if (/\.{2,}|_{2,}|（\s*）|\(\s*\)|填空|配平/u.test(rawEquationText)) {
    lowConfidenceReasons.push('exercise-or-fill-in-blank');
  }

  if (/^[a-zA-Z]\w*\s*(?:=|⇌|->|→)/u.test(normalizeForHeuristics(rawEquationText))) {
    lowConfidenceReasons.push('generic-symbolic-schema');
  }

  if (!/\\mathrm|[A-Z]|[A-Z]\s+[a-zA-Z]|[₀-₉]|\b(?:Na|Cl|CO|OH|H|O|Fe|Cu|Ca|Mg|Al|Zn|Ag|Ba|SO|NO)\b/u.test(rawEquationText)) {
    lowConfidenceReasons.push('weak-formula-signal');
  }

  return {
    contextKind,
    hasEquationOperator: operators.length > 0,
    operators,
    gasMarkers,
    precipitateMarkers,
    hasConditionAnnotation: /\\xlongequal|\\xrightarrow|\\stackrel|\{\s*\\text\s*\{|点\s*燃|加热|催化剂|高温|通电/u.test(rawEquationText),
    hasLatex: /\\[a-zA-Z]+/u.test(rawEquationText),
    hasMultilineLatex: /\\begin\{|\\\\/u.test(rawEquationText),
    hasHtmlSource: contextKind === 'htmlTableCell',
    hasMarkdownTableSource: contextKind === 'markdownTableCell',
    lowConfidenceReasons: lowConfidenceReasons.sort()
  };
}

function hasEquationOperator(text) {
  return equationOperatorPatterns.some(([, pattern]) => pattern.test(text));
}

function buildCandidateId(sourceFile, lineStart, lineEnd, rawEquationText) {
  const sourceSlug = slugifyPathSegment(path.basename(path.dirname(sourceFile))) || 'textbook';
  const hash = hashText(`${sourceFile}\n${lineStart}-${lineEnd}\n${rawEquationText}`).slice(0, 12);
  return `reaction-equation-${sourceSlug}-l${lineStart}-l${lineEnd}-${hash}`;
}

function buildExcerpt(lines, lineStart, lineEnd) {
  const start = Math.max(1, lineStart - contextRadius);
  const end = Math.min(lines.length, lineEnd + contextRadius);

  return lines.slice(start - 1, end).join('\n').trim();
}

function buildSourceContext(lines, lineStart, lineEnd, contextKind) {
  const start = Math.max(1, lineStart - contextRadius);
  const end = Math.min(lines.length, lineEnd + contextRadius);

  return {
    kind: contextKind,
    lineRange: `${lineStart}-${lineEnd}`,
    contextLineRange: `${start}-${end}`,
    before: lines.slice(start - 1, lineStart - 1).join('\n').trim(),
    source: lines.slice(lineStart - 1, lineEnd).join('\n').trim(),
    after: lines.slice(lineEnd, end).join('\n').trim()
  };
}

async function checkAgainstReviewManifest(report) {
  let manifest;

  try {
    manifest = JSON.parse(await readFile(reviewManifestPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Review manifest not found: ${relativeProjectPath(reviewManifestPath)}`);
      console.error(`Extracted candidates needing review: ${report.candidateCount}`);
      process.exitCode = 1;
      return {
        status: 'fail',
        reviewedCandidates: 0,
        unreviewedCandidates: report.candidateCount,
        staleReviewedCandidates: 0,
        unaccountedCandidates: report.candidateCount
      };
    }

    throw error;
  }

  const reviewedIds = new Set(extractReviewedCandidateIds(manifest));
  const currentIds = new Set(report.candidates.map((candidate) => candidate.candidateId));
  const unreviewedIds = [...currentIds].filter((candidateId) => !reviewedIds.has(candidateId)).sort();
  const staleReviewedIds = [...reviewedIds].filter((candidateId) => !currentIds.has(candidateId)).sort();

  if (unreviewedIds.length > 0 || staleReviewedIds.length > 0) {
    console.error(`Reaction equation review manifest mismatch: ${unreviewedIds.length} unreviewed current candidate(s), ${staleReviewedIds.length} stale reviewed candidate(s).`);

    for (const candidateId of unreviewedIds.slice(0, 20)) {
      console.error(`UNREVIEWED ${candidateId}`);
    }

    for (const candidateId of staleReviewedIds.slice(0, 20)) {
      console.error(`STALE ${candidateId}`);
    }

    process.exitCode = 1;
    return {
      status: 'fail',
      reviewedCandidates: reviewedIds.size,
      unreviewedCandidates: unreviewedIds.length,
      staleReviewedCandidates: staleReviewedIds.length,
      unaccountedCandidates: unreviewedIds.length
    };
  }

  console.log(`Reaction equation review check passed: ${report.candidateCount} reviewed candidate(s).`);
  return {
    status: 'pass',
    reviewedCandidates: reviewedIds.size,
    unreviewedCandidates: 0,
    staleReviewedCandidates: 0,
    unaccountedCandidates: 0
  };
}

function extractReviewedCandidateIds(manifest) {
  if (Array.isArray(manifest)) {
    return manifest.map((entry) => entry?.candidateId).filter(Boolean);
  }

  if (Array.isArray(manifest?.candidates)) {
    return manifest.candidates.map((entry) => entry?.candidateId).filter(Boolean);
  }

  if (Array.isArray(manifest?.reviewedCandidates)) {
    return manifest.reviewedCandidates.map((entry) => entry?.candidateId).filter(Boolean);
  }

  if (Array.isArray(manifest?.reviews)) {
    return manifest.reviews.map((entry) => entry?.candidateId).filter(Boolean);
  }

  return [];
}

function printStableSummary(report, reportPath) {
  console.log(`Textbook files scanned: ${report.fileCount}`);
  console.log(`Equation candidates extracted: ${report.candidateCount}`);

  for (const fileReport of report.perFileCounts) {
    console.log(`${fileReport.sourceFile}: ${fileReport.candidateCount}`);
  }

  if (reportPath) {
    console.log(`Wrote: ${relativeProjectPath(resolveProjectPath(reportPath))}`);
  }
}

async function writeJson(outputPath, value) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function isMarkdownTableLine(line) {
  return /^\s*\|.*\|\s*$/u.test(line) && !/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/u.test(line);
}

function splitMarkdownTableCells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/u)
    .map((cell) => cell.trim());
}

function stripHtml(value) {
  return String(value ?? '').replace(/<[^>]+>/gu, ' ');
}

function stripMarkdownImages(value) {
  return String(value ?? '').replace(/!\[[^\]]*\]\([^)]+\)/gu, ' ');
}

function trimEquationPunctuation(value) {
  return String(value ?? '')
    .replace(/^\s*(?:化学方程式|方程式|反应式|如下|为|：|:)\s*/u, '')
    .replace(/^[\s:：]+|[\s。；;,，]+$/gu, '')
    .trim();
}

function normalizeForHeuristics(value) {
  return String(value ?? '')
    .replace(/\\mathrm\s*\{([^}]*)\}/gu, '$1')
    .replace(/\\text\s*\{[^}]*\}/gu, '')
    .replace(/\\(?:xlongequal|xrightarrow|rightarrow|longrightarrow)\s*(?:\{[^}]*\})?/gu, '→')
    .replace(/\\(?:rightleftharpoons|leftrightarrow|rightleftarrows)/gu, '⇌')
    .replace(/\\(?:uparrow|downarrow|Delta|triangle)/gu, '')
    .replace(/[_{}\s]/gu, '')
    .trim();
}

function isLineInRanges(lineNumber, ranges) {
  return ranges.some((range) => lineNumber >= range.lineStart && lineNumber <= range.lineEnd);
}

function compareCandidates(left, right) {
  return left.sourceFile.localeCompare(right.sourceFile, 'zh-Hans-CN') || left.lineStart - right.lineStart || left.lineEnd - right.lineEnd || left.rawEquationText.localeCompare(right.rawEquationText, 'zh-Hans-CN');
}

function splitLines(text) {
  return String(text ?? '').split(/\r?\n/u);
}

function countLineBreaks(text) {
  return (text.match(/\n/gu) ?? []).length;
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

function slugifyPathSegment(value) {
  const asciiSlug = String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (asciiSlug) {
    return asciiSlug;
  }

  return hashText(String(value ?? '')).slice(0, 10);
}
