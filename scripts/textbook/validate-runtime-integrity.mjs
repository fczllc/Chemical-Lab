import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isFormulaText } from './reaction-equation-normalizer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const dataRoot = path.join(projectRoot, 'src', 'data');
const paths = {
  elements: path.join(dataRoot, 'elements.json'),
  quiz: path.join(dataRoot, 'quizData.json'),
  learningPath: path.join(dataRoot, 'learningPath.json'),
  reactions: path.join(dataRoot, 'reactions.json'),
  achievements: path.join(dataRoot, 'achievementsData.json'),
  curriculum: path.join(dataRoot, 'curriculum.js'),
  contentMeta: path.join(dataRoot, 'contentMeta.js')
};
const fixtures = new Map([
  ['broken-runtime-reference', path.join(projectRoot, 'scripts', 'textbook', 'fixtures', 'broken-runtime-reference.json')]
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

  const errors = [];
  const warnings = [];
  const runtime = await loadRuntime(errors);
  if (!runtime) {
    finish(errors, warnings, []);
    return;
  }

  if (options.fixture) {
    const fixturePath = fixtures.get(options.fixture);
    if (!fixturePath) {
      throw new Error(`Unknown runtime integrity fixture: ${options.fixture}`);
    }
    applyFixture(runtime, await readJson(fixturePath, 'runtime integrity fixture', errors));
  }

  validateRuntime(runtime, errors);
  warnings.push(...await collectBundleWarnings());
  finish(errors, warnings, Object.values(paths).map(relative));
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      fixture: { type: 'string' }
    },
    strict: true
  });
  return { help: values.help === true, fixture: values.fixture ?? null };
}

function printHelp() {
  console.log(`Textbook runtime integrity validator / 教材运行时完整性校验器

Usage:
  node scripts/textbook/validate-runtime-integrity.mjs
  node scripts/textbook/validate-runtime-integrity.mjs --fixture broken-runtime-reference`);
}

async function loadRuntime(errors) {
  const [elements, quiz, learningPath, reactions, achievements] = await Promise.all([
    readJson(paths.elements, 'elements', errors),
    readJson(paths.quiz, 'quizData', errors),
    readJson(paths.learningPath, 'learningPath', errors),
    readJson(paths.reactions, 'reactions', errors),
    readJson(paths.achievements, 'achievementsData', errors)
  ]);
  const curriculum = await importJs(paths.curriculum, 'curriculum', errors);
  const contentMeta = await importJs(paths.contentMeta, 'contentMeta', errors);

  if (!elements || !quiz || !learningPath || !reactions || !achievements || !curriculum || !contentMeta) {
    return null;
  }

  return {
    elements: structuredClone(elements.elements ?? []),
    quiz: structuredClone(quiz.quizData ?? []),
    stages: structuredClone(learningPath.learningPath?.stages ?? []),
    reactions: structuredClone(reactions.reactions ?? []),
    achievements: structuredClone(achievements.achievementsData ?? []),
    curriculumTags: curriculum.curriculumTags ?? {},
    gameKeys: contentMeta.GAME_KEYS ?? {},
    gameMeta: contentMeta.GAME_META ?? {},
    allowedSafetyLevels: new Set(elements.allowedSafetyLevels ?? Object.keys(contentMeta.SAFETY_LABELS ?? {}))
  };
}

function applyFixture(runtime, fixture) {
  if (!fixture) return;
  runtime.quiz.push(...structuredClone(fixture.quizData ?? []));
  runtime.stages.push(...structuredClone(fixture.learningPath?.stages ?? []));
  runtime.reactions.push(...structuredClone(fixture.reactions ?? []));
  runtime.achievements.push(...structuredClone(fixture.achievementsData ?? []));
  runtime.gameMeta = { ...runtime.gameMeta, ...(fixture.contentMeta?.gameMeta ?? {}) };
}

function validateRuntime(runtime, errors) {
  const elementIds = new Set(runtime.elements.map((element) => element.atomicNumber));
  const elementSymbols = new Set(runtime.elements.map((element) => element.symbol));
  const curriculumIds = new Set(Object.keys(runtime.curriculumTags));
  const runtimeCurriculumIds = new Set([
    ...curriculumIds,
    ...collectLearningPathCurriculumTags(runtime.stages)
  ]);
  const stageIds = new Set(runtime.stages.map((stage) => stage.id));
  const experimentIds = new Set(runtime.reactions.map((reaction) => reaction.experimentId));
  const gameIds = new Set(Object.values(runtime.gameKeys));
  const quizTags = new Set(runtime.quiz.flatMap((quiz) => array(quiz.curriculumTags)));

  validateUniqueIds(errors, [
    collection('src/data/quizData.json', 'quizData', runtime.quiz),
    collection('src/data/learningPath.json', 'learningPath.stages', runtime.stages),
    collection('src/data/reactions.json', 'reactions', runtime.reactions),
    collection('src/data/achievementsData.json', 'achievementsData', runtime.achievements),
    ...contentMetaCollections(runtime)
  ]);
  validateCurriculumGraph(runtime.curriculumTags, errors);
  validateQuizzes(runtime.quiz, elementIds, runtimeCurriculumIds, errors);
  validateLearningPath(runtime.stages, elementIds, runtimeCurriculumIds, gameIds, experimentIds, errors);
  validateReactions(runtime.reactions, elementSymbols, runtimeCurriculumIds, stageIds, runtime.allowedSafetyLevels, errors);
  validateAchievements(runtime.achievements, runtimeCurriculumIds, gameIds, experimentIds, quizTags, errors);
  validateContentMeta(runtime, runtimeCurriculumIds, stageIds, gameIds, errors);
}

function collectLearningPathCurriculumTags(stages) {
  return new Set(stages.flatMap((stage) => array(stage.curriculumTags)));
}

function collection(filePath, label, records) {
  return { filePath, label, records };
}

function contentMetaCollections(runtime) {
  const records = [];
  for (const [gameKey, meta] of Object.entries(runtime.gameMeta)) {
    for (const [field, value] of Object.entries(meta ?? {})) {
      if (field.endsWith('Metadata') && value?.challengeId) {
        records.push({ id: value.challengeId, source: `GAME_META.${gameKey}.${field}`, ...value });
      }
    }
  }
  return [collection('src/data/contentMeta.js', 'GAME_META.*.*Metadata', records)];
}

function validateUniqueIds(errors, collections) {
  const globalIds = new Map();
  for (const group of collections) {
    const localIds = new Map();
    for (const [index, record] of group.records.entries()) {
      const id = record?.id;
      const ref = `${group.filePath} ${group.label}[${index}]`;
      if (typeof id !== 'string' || !id.trim()) {
        errors.push(`${ref} is missing a stable id`);
        continue;
      }
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(id) || id !== id.normalize('NFKC')) {
        errors.push(`${ref} has non-ASCII or unsafe id: ${id}`);
      }
      const normalized = id.normalize('NFKC').toLowerCase();
      if (localIds.has(normalized)) {
        errors.push(`Duplicate runtime id in ${group.filePath}: ${id} conflicts with ${localIds.get(normalized)}`);
      }
      if (globalIds.has(normalized)) {
        const previous = globalIds.get(normalized);
        errors.push(`Duplicate runtime id across targets: ${id} in ${group.filePath} conflicts with ${previous.id} in ${previous.filePath}`);
      }
      localIds.set(normalized, id);
      globalIds.set(normalized, { id, filePath: group.filePath });
    }
  }
}

function validateQuizzes(quizData, elementIds, curriculumIds, errors) {
  for (const [index, quiz] of quizData.entries()) {
    const ref = `src/data/quizData.json quizData[${index}] ${quiz.id ?? 'unknown'}`;
    if (quiz.relatedElement != null && !elementIds.has(quiz.relatedElement)) {
      errors.push(`${ref} references missing relatedElement: ${quiz.relatedElement}`);
    }
    if (!Array.isArray(quiz.options) || quiz.options.length === 0) {
      errors.push(`${ref} must include answer options`);
    } else if (!Number.isInteger(quiz.correctIndex) || quiz.correctIndex < 0 || quiz.correctIndex >= quiz.options.length) {
      errors.push(`${ref} has correctIndex ${quiz.correctIndex} outside options range`);
    } else if (typeof quiz.options[quiz.correctIndex] !== 'string' || !quiz.options[quiz.correctIndex].trim()) {
      errors.push(`${ref} has an empty correct answer at options[${quiz.correctIndex}]`);
    }
    if (typeof quiz.correctAnswer === 'string' && quiz.options?.[quiz.correctIndex] !== quiz.correctAnswer) {
      errors.push(`${ref} correctAnswer mismatch: ${quiz.correctAnswer}`);
    }
    validateTags(ref, quiz.curriculumTags, curriculumIds, errors);
  }
}

function validateLearningPath(stages, elementIds, curriculumIds, gameIds, experimentIds, errors) {
  const stageIds = new Set(stages.map((stage) => stage.id));
  const graph = new Map();
  for (const [index, stage] of stages.entries()) {
    const ref = `src/data/learningPath.json learningPath.stages[${index}] ${stage.id ?? 'unknown'}`;
    for (const id of array(stage.focusElements)) if (!elementIds.has(id)) errors.push(`${ref} references missing focusElement: ${id}`);
    for (const id of array(stage.unlockedGames)) if (!gameIds.has(id)) errors.push(`${ref} references missing unlockedGame: ${id}`);
    for (const id of array(stage.unlockedExperiments)) if (!experimentIds.has(id)) errors.push(`${ref} references missing unlockedExperiment: ${id}`);
    const dependencies = [...array(stage.prerequisiteStageIds), ...array(stage.prerequisites), ...array(stage.dependsOn), ...array(stage.parentStageId ? [stage.parentStageId] : [])];
    graph.set(stage.id, dependencies);
    for (const id of dependencies) if (!stageIds.has(id)) errors.push(`${ref} references orphan learning path dependency: ${id}`);
    validateTags(ref, stage.curriculumTags, curriculumIds, errors);
  }
  validateAcyclicGraph('src/data/learningPath.json learning path', graph, errors);
}

function validateReactions(reactions, elementSymbols, curriculumIds, stageIds, safetyLevels, errors) {
  for (const [index, reaction] of reactions.entries()) {
    const ref = `src/data/reactions.json reactions[${index}] ${reaction.id ?? 'unknown'}`;
    const isTextbookReaction = reaction?.sourceKind === 'textbook' && reaction?.sourceReviewStatus === 'reviewed';
    if (!isTextbookReaction && !reaction.experimentId) errors.push(`${ref} is missing experimentId`);
    for (const value of [...array(reaction.reactants), ...array(reaction.products)]) {
      if (typeof value !== 'string' || (!elementSymbols.has(value) && !isFormulaText(value))) errors.push(`${ref} references unsupported reactant/product: ${value}`);
    }
    if (reaction.safetyLevel && !safetyLevels.has(reaction.safetyLevel)) errors.push(`${ref} references unsupported safetyLevel: ${reaction.safetyLevel}`);
    validateTags(ref, reaction.curriculumTags, curriculumIds, errors);
    validateTags(`${ref} unlockRequirements`, reaction.unlockRequirements?.curriculumTags, curriculumIds, errors);
    for (const id of array(reaction.unlockRequirements?.stageIds)) if (!stageIds.has(id)) errors.push(`${ref} unlockRequirements references missing stageId: ${id}`);
    for (const id of array(reaction.unlockRequirements?.safetyLevels)) if (!safetyLevels.has(id)) errors.push(`${ref} unlockRequirements references unsupported safetyLevel: ${id}`);
  }
}

function validateAchievements(achievements, curriculumIds, gameIds, experimentIds, quizTags, errors) {
  for (const [index, achievement] of achievements.entries()) {
    const ref = `src/data/achievementsData.json achievementsData[${index}] ${achievement.id ?? 'unknown'}`;
    const condition = achievement.condition ?? {};
    validateTags(ref, achievement.curriculumTags, curriculumIds, errors);
    if (condition.curriculumTagId && !curriculumIds.has(condition.curriculumTagId)) errors.push(`${ref} condition references missing curriculumTagId: ${condition.curriculumTagId}`);
    if (condition.type === 'curriculumQuizComplete' && condition.curriculumTagId && !quizTags.has(condition.curriculumTagId)) errors.push(`${ref} condition references curriculumTagId with no quiz coverage: ${condition.curriculumTagId}`);
    if (condition.gameKey && !gameIds.has(condition.gameKey)) errors.push(`${ref} condition references missing gameKey: ${condition.gameKey}`);
    if (condition.experimentId && !experimentIds.has(condition.experimentId)) errors.push(`${ref} condition references missing experimentId: ${condition.experimentId}`);
  }
}

function validateContentMeta(runtime, curriculumIds, stageIds, gameIds, errors) {
  for (const [gameKey, meta] of Object.entries(runtime.gameMeta)) {
    const ref = `src/data/contentMeta.js GAME_META.${gameKey}`;
    if (!gameIds.has(runtime.gameKeys[gameKey])) errors.push(`${ref} has no matching GAME_KEYS value`);
    validateTags(ref, meta?.curriculumTags, curriculumIds, errors);
    for (const [field, value] of Object.entries(meta ?? {})) {
      if (!field.endsWith('Metadata')) continue;
      validateTags(`${ref}.${field}`, value?.curriculumTags, curriculumIds, errors);
      validateTags(`${ref}.${field}.unlockMetadata`, value?.unlockMetadata?.requiresTags, curriculumIds, errors);
      for (const id of array(value?.unlockMetadata?.stageIds)) if (!stageIds.has(id)) errors.push(`${ref}.${field} unlockMetadata references missing stageId: ${id}`);
    }
  }
}

function validateCurriculumGraph(curriculumTags, errors) {
  const ids = new Set(Object.keys(curriculumTags));
  const graph = new Map();
  for (const [id, tag] of Object.entries(curriculumTags)) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(id)) errors.push(`src/data/curriculum.js curriculumTags.${id} has non-ASCII or unsafe id`);
    const prerequisites = array(tag.prerequisites);
    graph.set(id, prerequisites);
    for (const prerequisite of prerequisites) if (!ids.has(prerequisite)) errors.push(`src/data/curriculum.js curriculumTags.${id} references orphan prerequisite: ${prerequisite}`);
  }
  validateAcyclicGraph('src/data/curriculum.js curriculum prerequisite', graph, errors);
}

function validateAcyclicGraph(label, graph, errors) {
  const visiting = new Set();
  const visited = new Set();
  for (const node of graph.keys()) visit(node, []);
  function visit(node, stack) {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      errors.push(`${label} cycle: ${[...stack.slice(stack.indexOf(node)), node].join(' -> ')}`);
      return;
    }
    visiting.add(node);
    for (const next of graph.get(node) ?? []) if (graph.has(next)) visit(next, [...stack, node]);
    visiting.delete(node);
    visited.add(node);
  }
}

function validateTags(ref, tags, validTags, errors) {
  for (const tag of array(tags)) if (!validTags.has(tag)) errors.push(`${ref} references missing curriculumTag: ${tag}`);
}

async function collectBundleWarnings() {
  const warnings = [];
  for (const filePath of await collectFiles(path.join(projectRoot, 'dist', 'assets'), '.js')) {
    const source = await readFile(filePath);
    if (source.byteLength > 500 * 1024) warnings.push(`Bundle size warning: ${relative(filePath)} is ${Math.round(source.byteLength / 1024)} KiB; run npm run build for the current Vite report.`);
  }
  return warnings;
}

async function collectFiles(directory, extension) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return []; }
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(filePath, extension));
    else if (entry.isFile() && entry.name.endsWith(extension)) files.push(filePath);
  }
  return files;
}

async function readJson(filePath, label, errors) {
  try { return JSON.parse(await readFile(filePath, 'utf8')); }
  catch (error) { errors.push(`${label} cannot be read or parsed: ${relative(filePath)}: ${error.message}`); return null; }
}

async function importJs(filePath, label, errors) {
  try { return await import(`${pathToFileURL(filePath).href}?integrity=${Date.now()}`); }
  catch (error) { errors.push(`${label} cannot be imported: ${relative(filePath)}: ${error.message}`); return null; }
}

function finish(errors, warnings, checked) {
  if (errors.length > 0) {
    console.error('Textbook runtime integrity validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('Textbook runtime integrity valid');
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  for (const filePath of checked) console.log(`checked: ${filePath}`);
}

function array(value) { return Array.isArray(value) ? value : []; }
function relative(filePath) { return path.relative(projectRoot, filePath).replaceAll(path.sep, '/'); }
