import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { equationToLatex, formulaToLatex } from '../src/modules/chemNotation.js';
import { normalizeReactionEquation, isFormulaText } from './textbook/reaction-equation-normalizer.mjs';

const projectRoot = process.cwd();
const reactionsPath = path.join(projectRoot, 'src', 'data', 'reactions.json');
const manifestPath = path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'reactionEquationReview.json');
const defaultMinimumGameUsable = 5;
const textbookSourcePattern = /^src\/data\/textbooks\/.+\/book\.md$/u;
const notationFields = new Map([
  ['formulaText', formulaToLatex],
  ['equationText', equationToLatex]
]);

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

  const reactionsPayload = await readJson(reactionsPath, 'runtime reactions');
  const manifest = await readOptionalJson(manifestPath);
  const result = validateGamePool(reactionsPayload, manifest, options);

  await maybeWriteReport(options.report, result);
  printResult(result);
  if (result.status !== 'pass') {
    process.exitCode = 1;
  }
}

function parseCli(args) {
  const options = {
    help: false,
    assertTextbookOnly: false,
    minGameUsable: defaultMinimumGameUsable,
    report: null
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--assert-textbook-only') {
      options.assertTextbookOnly = true;
      continue;
    }
    if (arg === '--min-game-usable') {
      const value = Number(args[index + 1]);
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('--min-game-usable requires a non-negative integer');
      }
      options.minGameUsable = value;
      index += 1;
      continue;
    }
    if (arg === '--report') {
      const reportPath = args[index + 1];
      if (!reportPath || reportPath.startsWith('--')) {
        throw new Error('--report requires a path');
      }
      options.report = reportPath;
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Reaction game-pool purity validator / 反应配对游戏池纯度校验器

Usage:
  node scripts/validate-reaction-game-pool.mjs [--assert-textbook-only] [--min-game-usable <n>] [--report <path>]

Options:
  --assert-textbook-only  Require every actual reaction-game-usable record to be reviewed textbook content.
  --min-game-usable <n>   Minimum actual reaction-game-usable records required; default 5.
  --report <path>         Write JSON validation report.
  --help                  Show this help.`);
}

function validateGamePool(reactionsPayload, manifest, options) {
  const errors = [];
  const reactions = Array.isArray(reactionsPayload?.reactions) ? reactionsPayload.reactions : [];
  const allowedDuplicateEquations = new Set(manifest?.duplicatePolicy?.allowedDuplicateNormalizedEquations ?? []);
  const playableReactions = reactions.filter(isReactionGameUsable);
  const details = {
    nonTextbookGameReactions: [],
    unreviewedGameReactions: [],
    emptyReactantsOrProducts: [],
    missingCurriculumTags: [],
    invalidNotationReactions: [],
    invalidSourceReferences: [],
    duplicateNormalizedEquations: []
  };
  const normalizedRuntimeRecords = new Map();

  for (const reaction of playableReactions) {
    const id = reaction.id || 'unknown-reaction';
    const reactants = stringArray(reaction.reactants);
    const products = stringArray(reaction.products);

    if (reaction.sourceKind !== 'textbook') {
      details.nonTextbookGameReactions.push(id);
    }
    if (reaction.sourceReviewStatus !== 'reviewed') {
      details.unreviewedGameReactions.push(id);
    }
    if (reactants.length === 0 || products.length === 0) {
      details.emptyReactantsOrProducts.push(id);
    }
    if (stringArray(reaction.curriculumTags).length === 0) {
      details.missingCurriculumTags.push(id);
    }

    validateSourceReferences(reaction, details.invalidSourceReferences);
    validateNotation(reaction, reactants, products, details.invalidNotationReactions);

    const normalizedEquation = runtimeNormalizedEquation(reaction, reactants, products);
    if (normalizedEquation) {
      pushMapArray(normalizedRuntimeRecords, normalizedEquation, id);
    } else {
      details.invalidNotationReactions.push(`${id}: missing normalized equation`);
    }
  }

  for (const [normalizedEquation, ids] of normalizedRuntimeRecords.entries()) {
    if (ids.length > 1 && !allowedDuplicateEquations.has(normalizedEquation)) {
      details.duplicateNormalizedEquations.push({ normalizedEquation, reactionIds: ids });
    }
  }

  if (playableReactions.length < options.minGameUsable) {
    errors.push(`gameUsableReactions ${playableReactions.length} is below --min-game-usable ${options.minGameUsable}`);
  }
  if (details.nonTextbookGameReactions.length > 0) {
    errors.push(`${details.nonTextbookGameReactions.length} actual game-usable reaction(s) are not sourceKind=textbook`);
  }
  if (details.unreviewedGameReactions.length > 0) {
    errors.push(`${details.unreviewedGameReactions.length} actual game-usable reaction(s) are not sourceReviewStatus=reviewed`);
  }
  if (details.emptyReactantsOrProducts.length > 0) {
    errors.push(`${details.emptyReactantsOrProducts.length} actual game-usable reaction(s) have empty reactants/products`);
  }
  if (details.missingCurriculumTags.length > 0) {
    errors.push(`${details.missingCurriculumTags.length} actual game-usable reaction(s) have empty curriculumTags`);
  }
  if (details.invalidNotationReactions.length > 0) {
    errors.push(`${details.invalidNotationReactions.length} notation/formula issue(s) in actual game-usable reactions`);
  }
  if (details.invalidSourceReferences.length > 0) {
    errors.push(`${details.invalidSourceReferences.length} source reference issue(s) in actual game-usable reactions`);
  }
  if (details.duplicateNormalizedEquations.length > 0) {
    errors.push(`${details.duplicateNormalizedEquations.length} normalized equation(s) have multiple runtime game records`);
  }

  return {
    schemaVersion: 1,
    validator: 'scripts/validate-reaction-game-pool.mjs',
    source: relativeProjectPath(reactionsPath),
    status: errors.length === 0 ? 'pass' : 'fail',
    options: {
      assertTextbookOnly: options.assertTextbookOnly,
      minGameUsable: options.minGameUsable
    },
    counters: {
      totalReactions: reactions.length,
      gameUsableReactions: playableReactions.length,
      nonTextbookGameReactions: details.nonTextbookGameReactions.length,
      unreviewedGameReactions: details.unreviewedGameReactions.length,
      emptyReactantsOrProducts: details.emptyReactantsOrProducts.length,
      missingCurriculumTags: details.missingCurriculumTags.length,
      invalidNotationReactions: details.invalidNotationReactions.length,
      invalidSourceReferences: details.invalidSourceReferences.length,
      duplicateNormalizedEquations: details.duplicateNormalizedEquations.length
    },
    errors,
    details
  };
}

function isReactionGameUsable(reaction) {
  return typeof reaction?.id === 'string' && reaction.id.trim()
    && typeof reaction.name === 'string' && reaction.name.trim()
    && typeof reaction.description === 'string' && reaction.description.trim()
    && Array.isArray(reaction.reactants) && reaction.reactants.some((item) => typeof item === 'string' && item.trim())
    && Array.isArray(reaction.products) && reaction.products.some((item) => typeof item === 'string' && item.trim())
    && Array.isArray(reaction.curriculumTags) && reaction.curriculumTags.some((item) => typeof item === 'string' && item.trim())
    && (reaction.sourceReviewStatus === undefined || reaction.sourceReviewStatus === 'reviewed');
}

function validateSourceReferences(reaction, issues) {
  const id = reaction.id || 'unknown-reaction';
  if (!Array.isArray(reaction.sourceReferences) || reaction.sourceReferences.length === 0) {
    issues.push(`${id}: missing non-empty sourceReferences`);
    return;
  }

  for (const [index, reference] of reaction.sourceReferences.entries()) {
    const label = `${id}.sourceReferences[${index}]`;
    if (!isRecord(reference)) {
      issues.push(`${label}: must be an object`);
      continue;
    }
    if (!hasText(reference.sourcePath) || !textbookSourcePattern.test(reference.sourcePath)) {
      issues.push(`${label}: sourcePath must be under src/data/textbooks/**/book.md`);
    }
    if (!hasText(reference.candidateId)) {
      issues.push(`${label}: candidateId is required`);
    }
    if (!hasText(reference.lineRange) || !/^\d+-\d+$/u.test(reference.lineRange)) {
      issues.push(`${label}: lineRange must be start-end`);
    }
    if (!hasText(reference.sourceHash) || !/^sha256:[a-f0-9]{64}$/u.test(reference.sourceHash)) {
      issues.push(`${label}: sourceHash must be sha256:<64 hex>`);
    }
  }
}

function validateNotation(reaction, reactants, products, issues) {
  const id = reaction.id || 'unknown-reaction';
  for (const formula of [...reactants, ...products]) {
    if (!isFormulaText(formula) || !formulaToLatex(formula)) {
      issues.push(`${id}: invalid game formula ${formula}`);
    }
  }

  const presentNotationFields = [...notationFields.keys()].filter((fieldName) => reaction[fieldName] !== undefined);
  if (presentNotationFields.length > 0 && reaction.notationReviewStatus !== 'reviewed') {
    issues.push(`${id}: notationReviewStatus must be reviewed when notation fields are present`);
  }

  for (const fieldName of presentNotationFields) {
    const value = reaction[fieldName];
    const converter = notationFields.get(fieldName);
    if (!hasText(value) || !converter(value)) {
      issues.push(`${id}: ${fieldName} is not renderable`);
    }
  }
}

function runtimeNormalizedEquation(reaction, reactants, products) {
  if (hasText(reaction.normalizedEquation)) {
    return reaction.normalizedEquation.trim();
  }
  if (hasText(reaction.equationText)) {
    const normalized = normalizeReactionEquation(reaction.equationText);
    if (!normalized.unsupportedReason && hasText(normalized.normalizedEquation)) {
      return normalized.normalizedEquation;
    }
    return reaction.equationText.trim();
  }
  if (reactants.length > 0 && products.length > 0) {
    return `${reactants.join(' + ')} → ${products.join(' + ')}`;
  }
  return '';
}

function printResult(result) {
  console.log(`reactionGamePoolValidationStatus=${result.status}`);
  for (const [name, value] of Object.entries(result.counters)) {
    console.log(`${name}=${value}`);
  }
  for (const error of result.errors) {
    console.error(`ERROR ${error}`);
  }
  printSample('NON_TEXTBOOK_GAME_REACTION', result.details.nonTextbookGameReactions);
  printSample('UNREVIEWED_GAME_REACTION', result.details.unreviewedGameReactions);
  printSample('EMPTY_REACTANTS_OR_PRODUCTS', result.details.emptyReactantsOrProducts);
  printSample('INVALID_SOURCE_REFERENCE', result.details.invalidSourceReferences);
  printSample('INVALID_NOTATION', result.details.invalidNotationReactions);
}

async function maybeWriteReport(reportPath, result) {
  if (!reportPath) {
    return;
  }
  const absolutePath = path.resolve(projectRoot, reportPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read ${label} at ${relativeProjectPath(filePath)}: ${error.message}`);
  }
}

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter(hasText).map((item) => item.trim()) : [];
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pushMapArray(map, key, value) {
  map.set(key, [...(map.get(key) ?? []), value]);
}

function printSample(prefix, values) {
  for (const value of (values ?? []).slice(0, 20)) {
    console.error(`${prefix} ${typeof value === 'string' ? value : JSON.stringify(value)}`);
  }
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, '/');
}
