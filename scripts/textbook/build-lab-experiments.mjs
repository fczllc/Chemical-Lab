import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const volumeIds = [
  'rj-chemistry-grade9-2024-vol1',
  'rj-chemistry-grade9-2024-vol2',
  'rj-chemistry-grade8-54-2024-full',
  'rj-chemistry-g12-selective-3-organic-2019'
];

const defaultOutputPath = 'src/data/labExperiments.json';
const defaultCheckEvidencePath = '.sisyphus/evidence/task-2-build-lab-experiments-check.json';
const defaultWriteEvidencePath = '.sisyphus/evidence/task-2-build-lab-experiments-write.json';
const generatedRoot = path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'generated');
const experimentNumberLabelPattern = /【实验[^】\s，。；;:：]*(?:】|\s+)?/gu;
const experimentNumberLabelTestPattern = /【实验[^】\s，。；;:：]*(?:】|\s+)?/u;
const rawIdFragmentPattern = /\b(?:experiment|lab|backlog|reaction)-[a-z0-9][a-z0-9-]{6,}\b/iu;
const sourceSectionIdFragmentPattern = /\b\d{4}-(?:source-section|[a-z0-9-]*l\d+-l\d+)-[a-f0-9]{8,}\b/iu;
const hashFragmentPattern = /\b(?:sha256:)?[a-f0-9]{32,}\b/iu;
const genericTitleKeys = new Set([
  '',
  '观察现象',
  '实验现象',
  '观察现象和数据',
  '记录',
  '实验内容',
  '现象和数据',
  '实验记录',
  '实验记录和数据处理',
  '数据处理',
  '项目现象和数据',
  '记录实验现象',
  '观察并记录实验现象',
  '的观察与描述',
  '实验现象的观察与描述'
]);
const substanceTitleKeywords = [
  '酸性高锰酸钾',
  '溴的四氯化碳溶液',
  '无水乙醇',
  '蒸馏水',
  '粗苯甲酸',
  '苯甲酸',
  '乙酸乙酯',
  '乙酸',
  '乙醇',
  '乙醛',
  '乙烯',
  '乙炔',
  '电石',
  '甲烷',
  '氯气',
  '氢气',
  '氧气',
  '二氧化碳',
  '高锰酸钾',
  '硫酸铜',
  '石灰水',
  '盐酸',
  '硫酸',
  '氢氧化钠',
  '碳酸钠',
  '碳酸氢钠',
  '葡萄糖',
  '淀粉',
  '蛋白质',
  '油脂',
  '钠',
  '铁',
  '铜',
  '镁',
  '锌',
  '木炭',
  '蜡烛',
  '石蜡',
  '水'
];

const coreReactiveSubstances = new Map([
  ['盐酸', [/盐酸|hcl/u]],
  ['硫酸', [/硫酸|h2so4/u]],
  ['硝酸', [/硝酸|hno3/u]],
  ['氢氧化钠', [/氢氧化钠|naoh/u]],
  ['氢氧化钙', [/氢氧化钙|ca\(oh\)2|澄清石灰水|石灰水/u]],
  ['碳酸钠', [/碳酸钠|na2co3/u]],
  ['碳酸氢钠', [/碳酸氢钠|nahco3/u]],
  ['高锰酸钾', [/高锰酸钾|kmno4/u]],
  ['过氧化氢', [/过氧化氢|双氧水|h2o2/u]],
  ['二氧化锰', [/二氧化锰|mno2/u]],
  ['氯酸钾', [/氯酸钾|kclo3/u]],
  ['铁', [/铁钉|铁丝|\bfe\b/u]],
  ['铜', [/铜片|铜丝|\bcu\b/u]],
  ['镁', [/镁条|\bmg\b/u]],
  ['锌', [/锌粒|\bzn\b/u]],
  ['钠', [/金属钠|\b钠\b|\bna\b/u]],
  ['乙醇', [/乙醇|酒精|c2h5oh/u]],
  ['乙酸', [/乙酸|醋酸|ch3cooh/u]],
  ['乙醛', [/乙醛|ch3cho/u]],
  ['乙烯', [/乙烯|c2h4/u]],
  ['乙炔', [/乙炔|c2h2/u]],
  ['甲烷', [/甲烷|ch4/u]],
  ['石蜡', [/石蜡|蜡烛/u]],
  ['硫酸铜', [/硫酸铜|cuso4/u]],
  ['水', [/蒸馏水|\b水\b|h2o/u]]
]);

const gasIdentityTerms = new Map([
  ['氧气', [/氧气|o2/u]],
  ['氢气', [/氢气|h2/u]],
  ['二氧化碳', [/二氧化碳|co2/u]],
  ['氯气', [/氯气|cl2/u]],
  ['氨气', [/氨气|nh3/u]],
  ['甲烷', [/甲烷|ch4/u]],
  ['乙烯', [/乙烯|c2h4/u]],
  ['乙炔', [/乙炔|c2h2/u]],
  ['二氧化硫', [/二氧化硫|so2/u]],
  ['一氧化碳', [/一氧化碳|co/u]]
]);

const apparatusProcedureFamilies = new Map([
  ['gas-generation-collection', [/集气瓶|导管|排水法|向上排空气|向下排空气|发生装置|收集.*气/u]],
  ['heating-flame', [/酒精灯|加热|点燃|燃烧|灼烧/u]],
  ['filtration-separation', [/过滤|漏斗|滤纸|蒸发皿|结晶|蒸馏|分液/u]],
  ['titration-dropping', [/滴管|滴入|逐滴|滴定|酸碱指示剂/u]],
  ['electrolysis', [/电解|电极|电源/u]],
  ['test-tube-reaction', [/试管|试管夹/u]]
]);

const nonConflictingSubstancePairs = new Set([
  pairKey('过氧化氢', '二氧化锰'),
  pairKey('盐酸', '碳酸钠'),
  pairKey('盐酸', '碳酸氢钠'),
  pairKey('盐酸', '锌'),
  pairKey('硫酸', '锌'),
  pairKey('硫酸铜', '铁'),
  pairKey('氢氧化钙', '二氧化碳')
]);

const nonConflictingGasPairs = new Set();
const nonConflictingApparatusPairs = new Set([
  pairKey('gas-generation-collection', 'test-tube-reaction'),
  pairKey('heating-flame', 'test-tube-reaction'),
  pairKey('titration-dropping', 'test-tube-reaction')
]);

function pairKey(left, right) {
  return [left, right].sort(compareText).join('|');
}

const legacyCuratedExperiments = [
  {
    id: 'exp-hydrogen-combustion',
    title: '氢气燃烧',
    description: '展示氢气和氧气结合生成水的过程，重点观察火焰与水蒸气的形成。',
    materials: ['氢气', '氧气', '点火装置'],
    steps: ['在虚拟实验舱中少量引入氢气和氧气。', '远程点火后观察蓝色火焰。', '记录反应后出现的水雾。'],
    observedPhenomena: ['氢气燃烧时出现淡蓝色火焰。', '反应后容器壁附近出现水雾。'],
    visualDescription: '蓝色火焰迅速闪亮，随后出现细小水雾与发光粒子。',
    safetyLevel: 'dangerous',
    safetyNotes: ['氢气极易燃，真实实验必须远离明火和静电。', '这里只保留为虚拟演示，不在现实中自行复现。'],
    curriculumTags: ['legacy-curated-lab'],
    difficulty: '高中基础',
    unlockRequirements: { curriculumTags: ['legacy-curated-lab'], stageIds: ['stage-4'], minimumLearnedElements: 80 }
  },
  {
    id: 'exp-iron-rusting',
    title: '铁生锈',
    description: '观察铁在氧气和水分作用下慢慢生成锈迹，理解缓慢氧化。',
    materials: ['铁钉', '水', '空气'],
    steps: ['把洁净铁钉置于潮湿空气条件中。', '持续观察铁钉表面颜色变化。', '记录铁生锈需要氧气和水共同参与。'],
    observedPhenomena: ['铁钉表面逐渐出现红褐色锈迹。'],
    visualDescription: '银灰色铁片表面逐步出现橙褐色纹理，颜色一层层扩散。',
    safetyLevel: 'caution',
    safetyNotes: ['避免直接触摸生锈金属边缘，防止划伤。'],
    curriculumTags: ['legacy-curated-lab'],
    difficulty: '初中基础',
    unlockRequirements: { curriculumTags: ['legacy-curated-lab'], stageIds: ['stage-2'], minimumLearnedElements: 10 }
  },
  {
    id: 'exp-sodium-water',
    title: '钠遇水',
    description: '用动画呈现金属钠在水面快速移动并放出气泡的现象，强调必须远程演示。',
    materials: ['金属钠', '水', '防护罩'],
    steps: ['在虚拟防护罩中加入少量水。', '远程放入极少量金属钠。', '观察钠在水面移动和产生气泡。'],
    observedPhenomena: ['钠在水面快速移动并产生气泡。', '反应放热，可能伴随亮光。'],
    visualDescription: '银白色小球在水面滑动，发出亮光和气泡，随后出现提示性的安全警报。',
    safetyLevel: 'extremely dangerous',
    safetyNotes: ['金属钠不能徒手接触，也不能直接暴露在潮湿空气中。', '真实实验必须使用防护罩、护目镜和远程操作。'],
    curriculumTags: ['legacy-curated-lab'],
    difficulty: '高中基础',
    unlockRequirements: { curriculumTags: ['legacy-curated-lab'], stageIds: ['stage-4'], minimumLearnedElements: 80 }
  },
  {
    id: 'exp-salt-formation',
    title: '盐的形成',
    description: '通过钠和氯的模型结合，帮助学生理解离子化合物的形成。',
    materials: ['钠模型', '氯气模型', '晶体模型'],
    steps: ['显示钠和氯粒子模型。', '演示电子转移与离子形成。', '观察晶体结构逐步排列。'],
    observedPhenomena: ['金属与黄绿色气体图标靠近后形成整齐的晶体方块。'],
    visualDescription: '金属与黄绿色气体图标靠近后形成整齐的晶体方块。',
    safetyLevel: 'dangerous',
    safetyNotes: ['氯气有刺激性，真实环境下绝不能随意吸入。', '虚拟实验只演示原理，不代表现实操作难度。'],
    curriculumTags: ['legacy-curated-lab'],
    difficulty: '高中基础',
    unlockRequirements: { curriculumTags: ['legacy-curated-lab'], stageIds: ['stage-3'], minimumLearnedElements: 25 }
  },
  {
    id: 'exp-oxygen-supports-combustion',
    title: '氧气助燃',
    description: '展示氧气如何让燃烧更旺盛，帮助理解助燃和可燃的区别。',
    materials: ['氧气', '燃着木条', '集气瓶'],
    steps: ['点燃木条并记录普通空气中的燃烧状态。', '把燃着木条伸入盛有氧气的集气瓶。', '观察火焰变化并总结氧气助燃。'],
    observedPhenomena: ['木条在氧气中燃烧更旺。'],
    visualDescription: '火焰在富氧环境中变得更明亮，周围粒子流动速度明显加快。',
    safetyLevel: 'caution',
    safetyNotes: ['富氧环境会让可燃物更快燃烧，真实实验需远离易燃物。'],
    curriculumTags: ['legacy-curated-lab'],
    difficulty: '初中基础',
    unlockRequirements: { curriculumTags: ['legacy-curated-lab'], stageIds: ['stage-1'], minimumLearnedElements: 0 }
  }
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
  if (options.selfCheck) {
    const result = runSelfCheck(options.selfCheck);
    const evidencePath = options.evidencePath ?? defaultSelfCheckEvidencePathFor(options.selfCheck);
    await writeJsonFile(projectPath(evidencePath), result);
    printSelfCheckResult(result);
    if (result.status !== 'pass') {
      process.exitCode = 1;
    }
    return;
  }
  if (!options.check && !options.write) {
    throw new Error('Either --check or --write is required');
  }

  const result = await buildLabExperimentPlan(options);
  if (options.write) {
    await writeJsonFile(projectPath(options.outputPath), { labExperiments: result.labExperiments });
  }

  const evidencePath = options.evidencePath ?? (options.write ? defaultWriteEvidencePath : defaultCheckEvidencePath);
  await writeJsonFile(projectPath(evidencePath), evidenceFor(result, options));
  printResult(result, options);
  if (result.status !== 'pass') {
    process.exitCode = 1;
  }
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      check: { type: 'boolean' },
      write: { type: 'boolean' },
      output: { type: 'string' },
      evidence: { type: 'string' },
      'self-check': { type: 'string' }
    },
    strict: true
  });

  if (values.check && values.write) {
    throw new Error('--check and --write cannot be used together');
  }

  return {
    help: values.help === true,
    check: values.check === true,
    write: values.write === true,
    selfCheck: values['self-check'] ?? null,
    outputPath: values.output ?? defaultOutputPath,
    evidencePath: values.evidence ?? null
  };
}

function printHelp() {
  console.log(`Textbook lab experiment runtime builder / 教材实验运行时生成器

Usage:
  node scripts/textbook/build-lab-experiments.mjs --check
  node scripts/textbook/build-lab-experiments.mjs --write
  node scripts/textbook/build-lab-experiments.mjs --self-check duplicate-content-merge
  node scripts/textbook/build-lab-experiments.mjs --self-check duplicate-content-conflict
  node scripts/textbook/build-lab-experiments.mjs --self-check safety-risk-summary
  node scripts/textbook/build-lab-experiments.mjs --self-check safety-note-quality
  node scripts/textbook/build-lab-experiments.mjs --self-check source-reference-union

Options:
  --check             Preview generated lab records and validation counters without writing src/data/labExperiments.json.
  --write             Write src/data/labExperiments.json and evidence after validation passes.
  --self-check <name> Run a deterministic builder fixture without reading textbook generated data.
  --output <path>     Runtime lab experiment JSON path. Defaults to ${defaultOutputPath}.
  --evidence <path>   Evidence JSON path. Defaults to the Task 2 check/write evidence files.
  --help              Show this help.`);
}

async function buildLabExperimentPlan(options = {}) {
  const sourceGroups = new Map();
  const counters = {
    acceptedExperiments: 0,
    rejectedNonExperiments: 0,
    rejectedDuplicates: 0,
    rejectedMeaninglessTitle: 0,
    rejectedMeaninglessContent: 0,
    exactContentMerges: 0,
    looseContentMerges: 0,
    blockedContentMergeCandidates: 0,
    curatedLegacyPreserved: 0
  };
  const rejected = [];
  const mergeDetails = createMergeDetails();

  for (const volumeId of volumeIds) {
    const volumeRoot = path.join(generatedRoot, volumeId);
    const experimentCandidates = await readJsonFile(path.join(volumeRoot, 'experiment-candidates.json'), `${volumeId} experiment candidates`);
    const labCandidates = await readJsonFile(path.join(volumeRoot, 'lab-candidates.json'), `${volumeId} lab candidates`);
    const backlogPayload = await readJsonFile(path.join(volumeRoot, 'experiment-backlog.json'), `${volumeId} experiment backlog`);
    const backlogItems = Array.isArray(backlogPayload?.experimentBacklog) ? backlogPayload.experimentBacklog : [];

    ingestRecords(sourceGroups, experimentCandidates, 'experimentCandidate');
    ingestRecords(sourceGroups, labCandidates, 'labCandidate');
    ingestRecords(sourceGroups, backlogItems, 'experimentBacklog');
  }

  const records = [];
  const runtimeCandidates = [];
  const seenSections = new Set();
  const matchedLegacyIds = new Set();

  for (const group of [...sourceGroups.values()].sort(compareGroups)) {
    if (!isExplicitGroup(group)) {
      counters.rejectedNonExperiments += 1;
      rejected.push({ key: group.key, reason: 'not explicit experiment' });
      continue;
    }

    const sourceKey = `${textField(group, 'sourceVolumeId')}|${textField(group, 'sourceSectionId')}`;
    if (seenSections.has(sourceKey)) {
      counters.rejectedDuplicates += 1;
      rejected.push({ key: group.key, reason: 'duplicate source section' });
      continue;
    }

    const title = deriveTitle(group);
    if (!isMeaningfulTitle(title)) {
      counters.rejectedMeaninglessTitle += 1;
      rejected.push({ key: group.key, reason: 'meaningless title' });
      continue;
    }

    const description = deriveDescription(group, title);
    const textbookContent = cleanContent(textField(group, 'textbookContent') || textField(group, 'summary') || textField(group, 'description'));
    const steps = deriveSteps(group);
    const observedPhenomena = mergeStringArrays(group, ['observedPhenomena', 'observations'])
      .filter((item) => isCleanDisplayText(item) && !isGenericTitle(item));
    const materials = deriveMaterials(group, title, textbookContent);
    if (
      !isMeaningfulDescription(description) ||
      !textbookContent ||
      steps.length === 0 ||
      observedPhenomena.length === 0 ||
      !allCleanDisplayStrings([title, description, ...materials, ...steps, ...observedPhenomena])
    ) {
      counters.rejectedMeaninglessContent += 1;
      rejected.push({ key: group.key, reason: 'meaningless content' });
      continue;
    }

    const sourceVolumeId = textField(group, 'sourceVolumeId');
    const sourceSectionId = textField(group, 'sourceSectionId');
    const legacyId = matchLegacyExperimentId({ title, description, textbookContent, materials, observedPhenomena });
    const safetyLevel = safetyLevelFor(group);
    const curriculumTags = curriculumTagsFor(group, sourceVolumeId);

    runtimeCandidates.push({
      key: group.key,
      contentKey: contentKeyFor(textbookContent, steps, materials, observedPhenomena),
      legacyId,
      sourceVolumeId,
      sourceSectionId,
      title,
      description,
      textbookContent,
      materials,
      steps,
      observedPhenomena,
      visualDescription: visualDescriptionFor(title, observedPhenomena),
      safetyLevel,
      sourceSafetyNotes: sourceSafetyNotesFor(group),
      curriculumTags,
      difficulty: difficultyFor(sourceVolumeId),
      unlockRequirements: unlockRequirementsFor(curriculumTags, safetyLevel, sourceVolumeId),
      sourceReviewStatus: sourceReviewStatusFor(group),
      sourceReferences: sourceReferencesFor(group)
    });
    seenSections.add(sourceKey);
  }

  const mergedCandidates = mergeRuntimeCandidates(runtimeCandidates, counters, rejected, mergeDetails);
  for (const candidate of mergedCandidates) {
    const shouldPreserveLegacyId = candidate.legacyId && !matchedLegacyIds.has(candidate.legacyId);
    if (candidate.legacyId) {
      matchedLegacyIds.add(candidate.legacyId);
    }
    const id = shouldPreserveLegacyId ? candidate.legacyId : experimentIdFor(candidate.sourceVolumeId, candidate.sourceSectionId, candidate.title);
    const runtimeRecord = buildTextbookRuntimeRecord(candidate, id);
    registerRuntimeRecordForMergeReport(mergeDetails, candidate, runtimeRecord);
    records.push(runtimeRecord);
    counters.acceptedExperiments += 1;
  }

  for (const legacy of legacyCuratedExperiments) {
    if (matchedLegacyIds.has(legacy.id)) {
      continue;
    }
    records.push(buildCuratedLegacyRecord(legacy));
    counters.curatedLegacyPreserved += 1;
  }

  records.sort(compareRuntimeRecords);
  const validation = validateRuntimeRecords(records);

  return {
    schemaVersion: 1,
    builder: 'scripts/textbook/build-lab-experiments.mjs',
    status: validation.errors.length === 0 && counters.acceptedExperiments > 0 ? 'pass' : 'fail',
    mode: options.write ? 'write' : 'check',
    sourceVolumes: volumeIds,
    outputPath: options.outputPath ?? defaultOutputPath,
    counters,
    mergeDetails,
    validation,
    rejected,
    labExperiments: records
  };
}

function ingestRecords(groups, records, sourceKind) {
  if (!Array.isArray(records)) {
    return;
  }
  for (const record of records) {
    if (!isRecord(record)) {
      continue;
    }
    const key = groupKeyFor(record);
    if (!key) {
      continue;
    }
    const group = groups.get(key) ?? { key, records: [], recordsByKind: new Map() };
    group.records.push({ sourceKind, record });
    if (!group.recordsByKind.has(sourceKind)) {
      group.recordsByKind.set(sourceKind, []);
    }
    group.recordsByKind.get(sourceKind).push(record);
    groups.set(key, group);
  }
}

function groupKeyFor(record) {
  const sourceVolumeId = canonicalText(record.sourceVolumeId);
  const sourceSectionId = canonicalText(record.sourceSectionId);
  if (sourceVolumeId && sourceSectionId) {
    return `${sourceVolumeId}|${sourceSectionId}`;
  }
  const candidateId = canonicalText(record.candidateId);
  return candidateId || null;
}

function isExplicitGroup(group) {
  const explicitRecords = group.records.filter(({ record }) => isExplicitExperimentCandidate(record));
  if (explicitRecords.length > 0) {
    return true;
  }
  return group.records.some(({ sourceKind, record }) => sourceKind === 'experimentBacklog' && isExplicitHeading(record.sourceHeading));
}

function isExplicitExperimentCandidate(candidate) {
  const activityType = canonicalText(candidate.activityType);
  if (activityType === 'inquiryReview') return false;
  if (activityType === 'experimentReview') return true;
  return isExplicitHeading(candidate.sourceHeading);
}

function isExplicitHeading(value) {
  return /【实验(?:\s*\d+[-–]?\d*)?\s*】/u.test(canonicalText(value));
}

function deriveTitle(group) {
  const candidates = [
    ...valuesFor(group, 'title'),
    ...valuesFor(group, 'summary'),
    ...valuesFor(group, 'textbookContent'),
    ...mergeStringArrays(group, ['materials']),
    ...mergeStringArrays(group, ['observedPhenomena', 'observations'])
  ];

  for (const candidate of candidates) {
    const title = titleFromText(candidate);
    if (isMeaningfulTitle(title)) {
      return title;
    }
  }

  return '';
}

function titleFromText(value) {
  const text = cleanContent(value)
    .replace(/^图\d+[-–]\d+[^，。；;:：]*[，。；;:：]?\s*/u, '')
    .replace(/^\(?\d+\)?\s*/u, '')
    .replace(/^观察并记录实验现象[，。；;]?\s*/u, '')
    .replace(/^实验记录和数据处理[：:]?\s*/u, '')
    .replace(/^记录[：:]?\s*/u, '')
    .trim();

  if (!text) {
    return '';
  }

  const firstClause = text.split(/[。；;！!？?]/u).find((part) => part.trim()) ?? text;
  const compact = cleanTitlePhrase(firstClause);
  const keywordTitle = titleFromKeywords(text);
  if (!isMeaningfulTitle(compact) && keywordTitle) {
    return keywordTitle;
  }
  if (keywordTitle && (isGenericTitle(compact) || startsWithWeakTitleVerb(compact) || compact.length > 18)) {
    return keywordTitle;
  }
  if (compact.length <= 24) {
    return compact;
  }

  const phrase = compact.split(/[，,、]/u).map(cleanTitlePhrase).find((part) => isMeaningfulTitle(part)) ?? keywordTitle ?? compact;
  return cleanTitlePhrase(phrase.slice(0, 24));
}

function deriveDescription(group, title) {
  const content = cleanContent(textField(group, 'summary') || textField(group, 'description') || textField(group, 'textbookContent'));
  if (content && !isRawIdLike(content)) {
    const sentence = content.split(/[。！？!?]/u).map(cleanContent).find((part) => meaningfulChineseLength(part) >= 8 && !isGenericTitle(part)) ?? content;
    return `观察${title}：${sentence.slice(0, 80).trim()}。`;
  }
  return `观察${title}的实验过程，记录材料变化、现象和安全注意事项。`;
}

function deriveSteps(group) {
  const textbookContent = cleanContent(textField(group, 'textbookContent') || textField(group, 'summary'));
  const numberedSteps = [...textbookContent.matchAll(/(?:^|\s)[（(]?(\d+)[）)]\s*([^（()]+?)(?=\s*[（(]?\d+[）)]|$)/gu)]
    .map((match) => cleanContent(match[2]))
    .filter((step) => meaningfulChineseLength(step) >= 6)
    .slice(0, 6);
  if (numberedSteps.length > 0) {
    return numberedSteps;
  }

  const observations = mergeStringArrays(group, ['observedPhenomena', 'observations']);
  const steps = observations
    .map(cleanContent)
    .filter((step) => meaningfulChineseLength(step) >= 6 && !isGenericTitle(step))
    .slice(0, 4);
  if (steps.length > 0) {
    return steps;
  }

  const summary = cleanContent(textField(group, 'summary'));
  return summary ? [`阅读教材实验内容：${summary.slice(0, 60)}。`, '在虚拟实验中记录主要现象。'] : [];
}

function deriveMaterials(group, title, textbookContent) {
  const materials = mergeStringArrays(group, ['materials']);
  if (materials.length > 0) {
    return materials.filter((item) => isCleanDisplayText(item) && !isGenericTitle(item));
  }
  const extracted = [];
  const commonMaterials = ['试管', '烧杯', '集气瓶', '铁架台', '玻璃片', '酒精灯', '水', '氧气', '二氧化碳', '盐酸', '硫酸', '铁钉', '石蜡', '蜡烛', '木条', '钠', '乙醇'];
  for (const material of commonMaterials) {
    if (textbookContent.includes(material) || title.includes(material)) {
      extracted.push(material);
    }
  }
  return extracted.length > 0 ? extracted : ['教材实验材料'];
}

function safetyLevelFor(group) {
  const hazard = canonicalText(textField(group, 'hazardLevel') || textField(group, 'safetyClassification')).toLowerCase();
  if (hazard === 'high') return 'dangerous';
  if (hazard === 'medium') return 'caution';
  if (hazard === 'low') return 'safe';
  return 'caution';
}

function sourceSafetyNotesFor(group) {
  const notes = mergeStringArrays(group, ['safetyNotes']);
  return notes.map(cleanContent).filter((item) => isCleanDisplayText(item) && !isGenericTitle(item));
}

function safetyNotesForMergedCandidate(candidate) {
  const riskText = safetyRiskTextFor(candidate);
  const notes = [];

  if (hasToxicOrIrritatingGasRisk(riskText)) {
    notes.push('涉及有毒或刺激性气体时，必须通风并由教师演示，禁止直接闻气味。');
  }
  if (hasFlammableGasRisk(riskText)) {
    notes.push('点燃氢气、乙炔或甲烷前必须验纯，远离明火，防止爆炸或火灾。');
  }
  if (hasHeatingOrFlameRisk(riskText)) {
    notes.push('涉及加热或酒精灯时，远离可燃物，使用试管夹，防止明火和热玻璃烫伤。');
  }
  if (hasGasCollectionRisk(riskText)) {
    notes.push('真实操作需检查装置气密性，注意导管位置，防止倒吸并稳拿集气瓶。');
  }
  if (hasCorrosiveRisk(riskText)) {
    notes.push('酸碱或腐蚀性试剂需佩戴护目镜，避免接触皮肤和眼睛，少量洒出立即冲洗并报告教师。');
  }

  if (notes.length === 0) {
    notes.push(defaultSafetyNoteFor(candidate.safetyLevel));
  }

  return uniqueSafetyNotes(notes).slice(0, 4);
}

function safetyRiskTextFor(candidate) {
  return canonicalContentText([
    candidate.title,
    candidate.description,
    candidate.textbookContent,
    ...(candidate.materials ?? []),
    ...(candidate.steps ?? []),
    ...(candidate.observedPhenomena ?? []),
    ...(candidate.sourceSafetyNotes ?? []),
    candidate.safetyLevel
  ].join(' '));
}

function hasHeatingOrFlameRisk(text) {
  return /酒精灯|加热|点燃|燃烧|灼烧|火焰|明火|热玻璃|烫伤/u.test(text);
}

function hasGasCollectionRisk(text) {
  return /集气瓶|导管|排水法|排空气|水槽|收集气体|发生装置|倒吸|气密性/u.test(text);
}

function hasCorrosiveRisk(text) {
  return /盐酸|硫酸|硝酸|氢氧化钠|氢氧化钾|强酸|强碱|酸碱|腐蚀|灼伤/u.test(text);
}

function hasToxicOrIrritatingGasRisk(text) {
  return /氯气|氨气|二氧化硫|硫化氢|氮氧化物|一氧化氮|二氧化氮|刺激性气体|刺激性气味|有毒气体/u.test(text);
}

function hasFlammableGasRisk(text) {
  return /氢气|乙炔|甲烷|可燃性气体|易燃气体/u.test(text);
}

function defaultSafetyNoteFor(safetyLevel) {
  if (safetyLevel === 'dangerous' || safetyLevel === 'extremely dangerous') {
    return '该实验风险较高，真实操作需教师演示或全程监督，学生仅在虚拟环境学习。';
  }
  if (safetyLevel === 'safe') {
    return '按教师要求进行虚拟或课堂观察，不擅自改变化学试剂和操作条件。';
  }
  return '真实操作需教师确认器材、剂量和环境安全，本应用仅用于虚拟学习观察。';
}

function uniqueSafetyNotes(notes) {
  const seen = new Set();
  const values = [];
  for (const note of notes) {
    const cleaned = cleanContent(note);
    const key = canonicalContentText(cleaned);
    if (cleaned && !seen.has(key)) {
      values.push(cleaned);
      seen.add(key);
    }
  }
  return values;
}

function curriculumTagsFor(_group, sourceVolumeId) {
  if (sourceVolumeId.includes('grade8')) return ['g8-textbook-experiment'];
  if (sourceVolumeId.includes('grade9')) return ['g9-textbook-experiment'];
  if (sourceVolumeId.includes('organic')) return ['g12-organic-textbook-experiment'];
  return ['textbook-experiment'];
}

function difficultyFor(sourceVolumeId) {
  if (sourceVolumeId.includes('grade8')) return '初中基础';
  if (sourceVolumeId.includes('grade9')) return '初中进阶';
  return '高中进阶';
}

function unlockRequirementsFor(curriculumTags, safetyLevel, sourceVolumeId) {
  const grade = sourceVolumeId.includes('grade8') ? '八年级' : sourceVolumeId.includes('grade9') ? '九年级' : '高三';
  return {
    curriculumTags,
    safetyLevels: [safetyLevel],
    stageIds: [safetyLevel === 'safe' ? 'stage-1' : safetyLevel === 'caution' ? 'stage-2' : 'stage-3'],
    minimumLearnedElements: safetyLevel === 'safe' ? 0 : safetyLevel === 'caution' ? 8 : 20,
    grade
  };
}

function sourceReviewStatusFor(group) {
  return textField(group, 'reviewStatus') || 'needsReview';
}

function visualDescriptionFor(title, observedPhenomena) {
  const phenomenon = observedPhenomena.find((item) => meaningfulChineseLength(item) >= 6 && isCleanDisplayText(item)) ?? '';
  return cleanContent(`围绕“${title}”呈现实验器材、操作步骤和现象变化：${phenomenon.slice(0, 60)}。`);
}

function sourceReferencesFor(group) {
  const refs = new Map();
  for (const { sourceKind, record } of group.records) {
    const sourcePath = canonicalText(record.sourcePath);
    const sourceLineStart = Number(record.sourceLineStart);
    const sourceLineEnd = Number(record.sourceLineEnd);
    const candidateId = canonicalText(record.candidateId || record.backlogId);
    if (!sourcePath || !Number.isInteger(sourceLineStart) || !Number.isInteger(sourceLineEnd) || !candidateId) {
      continue;
    }
    const ref = {
      candidateId,
      sourceVolumeId: canonicalText(record.sourceVolumeId),
      sourceSectionId: canonicalText(record.sourceSectionId),
      sourceKind,
      sourcePath,
      sourceHeading: canonicalText(record.sourceHeading),
      lineRange: `${sourceLineStart}-${sourceLineEnd}`,
      sourceHash: canonicalText(record.sourceHash),
      sectionHash: canonicalText(record.sectionHash),
      assets: Array.isArray(record.assets) ? record.assets : []
    };
    refs.set(`${ref.candidateId}|${ref.sourcePath}|${ref.lineRange}|${ref.sourceKind}`, ref);
  }
  return [...refs.values()].sort(compareSourceReferences);
}

function contentKeyFor(textbookContent, steps, materials, observedPhenomena) {
  return hashText(exactFingerprintPayloadFor(canonicalContentFieldsFor({ textbookContent, steps, materials, observedPhenomena })));
}

function createMergeDetails() {
  return {
    exactContentMerges: [],
    looseContentMerges: [],
    blockedContentMergeCandidates: []
  };
}

function mergeRuntimeCandidates(candidates, counters, rejected, mergeDetails) {
  const clusters = [];
  for (const candidate of candidates) {
    const prepared = prepareMergeCandidate(candidate);
    const exactCluster = clusters.find((cluster) => cluster.fingerprint === prepared.contentFingerprint);
    if (exactCluster) {
      counters.exactContentMerges += 1;
      counters.rejectedDuplicates += 1;
      rejected.push({ key: candidate.key, reason: 'duplicate exact content fingerprint', mergedInto: exactCluster.primary.key });
      mergeDetails.exactContentMerges.push(mergeDetailFor(exactCluster.primary, prepared, { mergeType: 'exactContentMerge', reason: 'exact-content-fingerprint', canMerge: true }));
      mergeCandidateIntoPrimary(exactCluster, prepared);
      continue;
    }

    const looseMatch = findLooseMergeCluster(clusters, prepared);
    if (looseMatch?.canMerge) {
      counters.looseContentMerges += 1;
      counters.rejectedDuplicates += 1;
      rejected.push({ key: candidate.key, reason: 'duplicate loose content similarity', mergedInto: looseMatch.cluster.primary.key });
      mergeDetails.looseContentMerges.push(mergeDetailFor(looseMatch.cluster.primary, prepared, { ...looseMatch, mergeType: 'looseContentMerge' }));
      mergeCandidateIntoPrimary(looseMatch.cluster, prepared);
      continue;
    }

    for (const blocked of looseMatch?.blocked ?? []) {
      counters.blockedContentMergeCandidates += 1;
      mergeDetails.blockedContentMergeCandidates.push(mergeDetailFor(blocked.cluster.primary, prepared, { ...blocked, mergeType: 'blockedContentMergeCandidate', canMerge: false }));
    }

    clusters.push({
      fingerprint: prepared.contentFingerprint,
      primary: prepared,
      members: [prepared]
    });
  }

  return clusters.map((cluster) => finalizeMergedCandidate(cluster.primary));
}

function prepareMergeCandidate(candidate) {
  const canonicalFields = canonicalContentFieldsFor(candidate);
  return {
    ...candidate,
    canonicalFields,
    contentFingerprint: hashText(exactFingerprintPayloadFor(canonicalFields)),
    conflictProfile: conflictProfileFor(candidate, canonicalFields),
    sourceReferences: unionSourceReferences(candidate.sourceReferences)
  };
}

function exactFingerprintPayloadFor(canonicalFields) {
  return JSON.stringify({
    textbookContent: canonicalFields.textbookContent,
    steps: canonicalFields.steps,
    materials: canonicalFields.materials,
    observedPhenomena: canonicalFields.observedPhenomena
  });
}

function canonicalContentFieldsFor(candidate) {
  return {
    textbookContent: canonicalContentText(candidate.textbookContent),
    steps: (candidate.steps ?? []).map(canonicalStepText).filter(Boolean),
    materials: uniqueSorted((candidate.materials ?? []).map(canonicalContentText).filter(Boolean)),
    observedPhenomena: uniqueSorted((candidate.observedPhenomena ?? []).map(canonicalContentText).filter(Boolean))
  };
}

function canonicalContentText(value) {
  return canonicalText(value)
    .normalize('NFKC')
    .replace(/[“”]/gu, '"')
    .replace(/[‘’]/gu, "'")
    .replace(/[﹐，]/gu, ',')
    .replace(/[。]/gu, '.')
    .replace(/[；]/gu, ';')
    .replace(/[：]/gu, ':')
    .replace(/[、]/gu, ',')
    .replace(/[（]/gu, '(')
    .replace(/[）]/gu, ')')
    .replace(/[【［〔]/gu, '[')
    .replace(/[】］〕]/gu, ']')
    .replace(/[－–—]/gu, '-')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/[`*_#>]+/gu, ' ')
    .replace(/\$\s*([^$]+?)\s*\$/gu, '$$$1$$')
    .replace(experimentNumberLabelPattern, ' ')
    .replace(/\[实验[^\]\s,.，。;；:：]*(?:\]|\s+)?/gu, ' ')
    .replace(/\\mathrm\s*\{\s*([^}]+)\s*\}/gu, '$1')
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/gu, (match) => String('①②③④⑤⑥⑦⑧⑨⑩'.indexOf(match) + 1))
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/gu, (match) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(match)))
    .replace(/\b([A-Za-z]+)\s*([0-9]+)\b/gu, '$1$2')
    .replace(/(\d+(?:\.\d+)?)\s*(mL|L|g|kg|mg|mol|cm|mm|℃|°C)\b/giu, '$1$2')
    .replace(/\s*([,.!?;:()\[\]])\s*/gu, '$1')
    .replace(/[,.!?;:()\[\]]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

function canonicalStepText(value) {
  return canonicalContentText(value)
    .replace(/^(?:步骤)?(?:\d+|一|二|三|四|五|六|七|八|九|十)[).、:：-]?\s*/u, '')
    .replace(/^第(?:\d+|一|二|三|四|五|六|七|八|九|十)步[：:、]?\s*/u, '')
    .trim();
}

function findLooseMergeCluster(clusters, candidate) {
  const blocked = [];
  let best = null;
  for (const cluster of clusters) {
    const scores = similarityScoresFor(cluster.primary, candidate);
    if (!isLooseScoreCandidate(scores)) {
      continue;
    }

    const conflict = hardConflictFor(cluster.primary.conflictProfile, candidate.conflictProfile);
    if (conflict) {
      blocked.push({ cluster, scores, reason: conflict });
      continue;
    }

    if (!best || scores.overallScore > best.scores.overallScore || (scores.overallScore === best.scores.overallScore && compareText(cluster.primary.key, best.cluster.primary.key) < 0)) {
      best = { cluster, scores, reason: 'loose-content-similarity', canMerge: true };
    }
  }

  return best ?? (blocked.length > 0 ? { blocked } : null);
}

function isLooseScoreCandidate(scores) {
  const fieldScores = [scores.textbookContentScore, scores.stepsScore, scores.materialsScore, scores.phenomenaScore];
  return scores.overallScore >= 0.86 && fieldScores.filter((score) => score >= 0.82).length >= 2 && (scores.textbookContentScore >= 0.82 || scores.stepsScore >= 0.82);
}

function similarityScoresFor(left, right) {
  const textbookContentScore = sorensenDice(charTrigrams(left.canonicalFields.textbookContent), charTrigrams(right.canonicalFields.textbookContent));
  const stepsScore = indexedStepScore(left.canonicalFields.steps, right.canonicalFields.steps);
  const materialsScore = jaccard(left.canonicalFields.materials, right.canonicalFields.materials);
  const phenomenaScore = jaccard(left.canonicalFields.observedPhenomena, right.canonicalFields.observedPhenomena);
  const overallScore = 0.35 * textbookContentScore + 0.30 * stepsScore + 0.20 * materialsScore + 0.15 * phenomenaScore;
  return roundedScores({ textbookContentScore, stepsScore, materialsScore, phenomenaScore, overallScore });
}

function roundedScores(scores) {
  return Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, Number(value.toFixed(6))]));
}

function indexedStepScore(leftSteps, rightSteps) {
  const denominator = Math.max(leftSteps.length, rightSteps.length);
  if (denominator === 0) return 1;
  let total = 0;
  for (let index = 0; index < denominator; index += 1) {
    if (leftSteps[index] && rightSteps[index]) {
      total += sorensenDice(charTrigrams(leftSteps[index]), charTrigrams(rightSteps[index]));
    }
  }
  return total / denominator;
}

function charTrigrams(value) {
  const text = canonicalContentText(value).replace(/\s+/gu, '');
  if (!text) return [];
  if ([...text].length <= 3) return [text];
  const chars = [...text];
  const trigrams = [];
  for (let index = 0; index <= chars.length - 3; index += 1) {
    trigrams.push(chars.slice(index, index + 3).join(''));
  }
  return trigrams;
}

function sorensenDice(leftItems, rightItems) {
  if (leftItems.length === 0 && rightItems.length === 0) return 1;
  if (leftItems.length === 0 || rightItems.length === 0) return 0;
  const rightCounts = countedItems(rightItems);
  let overlap = 0;
  for (const item of leftItems) {
    const count = rightCounts.get(item) ?? 0;
    if (count > 0) {
      overlap += 1;
      rightCounts.set(item, count - 1);
    }
  }
  return (2 * overlap) / (leftItems.length + rightItems.length);
}

function countedItems(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return counts;
}

function jaccard(leftItems, rightItems) {
  const left = new Set(leftItems);
  const right = new Set(rightItems);
  if (left.size === 0 && right.size === 0) return 1;
  const union = new Set([...left, ...right]);
  let intersection = 0;
  for (const item of left) {
    if (right.has(item)) intersection += 1;
  }
  return intersection / union.size;
}

function mergeCandidateIntoPrimary(cluster, candidate) {
  const primary = cluster.primary;
  primary.sourceReferences = unionSourceReferences([...primary.sourceReferences, ...candidate.sourceReferences]);
  primary.curriculumTags = mergeStableDisplayArray(primary.curriculumTags, candidate.curriculumTags);
  primary.materials = mergeStableDisplayArray(primary.materials, candidate.materials);
  primary.observedPhenomena = mergeStableDisplayArray(primary.observedPhenomena, candidate.observedPhenomena);
  primary.sourceSafetyNotes = mergeStableDisplayArray(primary.sourceSafetyNotes, candidate.sourceSafetyNotes);
  primary.steps = mergeSteps(primary.steps, candidate.steps);
  primary.safetyLevel = maxSafetyLevel(primary.safetyLevel, candidate.safetyLevel);
  primary.unlockRequirements = upgradedUnlockRequirements(primary.unlockRequirements, primary.curriculumTags, primary.safetyLevel, primary.sourceVolumeId);
  primary.contentKey = primary.contentFingerprint;
  cluster.members.push(candidate);
}

function finalizeMergedCandidate(candidate) {
  const { canonicalFields, contentFingerprint, conflictProfile, ...runtimeCandidate } = candidate;
  return {
    ...runtimeCandidate,
    sourceReferences: unionSourceReferences(runtimeCandidate.sourceReferences),
    curriculumTags: mergeStableDisplayArray(runtimeCandidate.curriculumTags),
    materials: mergeStableDisplayArray(runtimeCandidate.materials),
    observedPhenomena: mergeStableDisplayArray(runtimeCandidate.observedPhenomena),
    steps: mergeSteps(runtimeCandidate.steps),
    unlockRequirements: upgradedUnlockRequirements(runtimeCandidate.unlockRequirements, runtimeCandidate.curriculumTags, runtimeCandidate.safetyLevel, runtimeCandidate.sourceVolumeId),
    safetyNotes: safetyNotesForMergedCandidate(runtimeCandidate)
  };
}

function mergeStableDisplayArray(left = [], right = []) {
  const values = new Map();
  for (const item of [...left, ...right]) {
    const cleaned = cleanContent(item);
    if (cleaned) {
      values.set(canonicalContentText(cleaned), cleaned);
    }
  }
  return [...values.values()].slice(0, 12);
}

function mergeSteps(left = [], right = []) {
  const values = [];
  const seen = new Set();
  for (const step of [...left, ...right]) {
    const key = canonicalStepText(step);
    if (key && !seen.has(key)) {
      values.push(cleanContent(step));
      seen.add(key);
    }
  }
  return values.slice(0, 12);
}

function unionSourceReferences(refs = []) {
  const byKey = new Map();
  for (const ref of refs) {
    if (!isRecord(ref)) continue;
    const key = [ref.candidateId, ref.sourcePath, ref.lineRange, ref.sourceKind, ref.sourceVolumeId, ref.sourceSectionId].map(canonicalText).join('|');
    byKey.set(key, ref);
  }
  return [...byKey.values()].sort(compareSourceReferences);
}

function mergeDetailFor(primary, candidate, match) {
  const sourceReferencesBefore = unionSourceReferences(primary.sourceReferences);
  const sourceReferencesAfter = unionSourceReferences([...primary.sourceReferences, ...candidate.sourceReferences]);
  return {
    mergeType: match.mergeType ?? (match.canMerge ? 'looseContentMerge' : 'blockedContentMergeCandidate'),
    kept: mergeParticipantFor(primary),
    mergedCandidate: mergeParticipantFor(candidate),
    mergedCandidates: uniqueSorted([primary.key, candidate.key]),
    mergedSources: uniqueSorted([sourceSectionFor(primary), sourceSectionFor(candidate)]),
    reason: match.reason,
    scores: match.scores ?? null,
    hardConflictStatus: {
      hasHardConflict: match.canMerge === false,
      reason: match.canMerge === false ? match.reason : null
    },
    sourceReferenceCountBefore: sourceReferencesBefore.length,
    sourceReferenceCountAfter: sourceReferencesAfter.length,
    sourceReferences: sourceReferencesAfter,
    safetyRiskCategories: mergeStableDisplayArray(safetyRiskCategoriesFor(primary), safetyRiskCategoriesFor(candidate)),
    primaryFingerprint: primary.contentFingerprint,
    candidateFingerprint: candidate.contentFingerprint,
    mergedOutput: null
  };
}

function registerRuntimeRecordForMergeReport(mergeDetails, candidate, runtimeRecord) {
  for (const detail of allMergeReportEntries(mergeDetails)) {
    if (detail.kept.key !== candidate.key) {
      continue;
    }
    detail.kept.id = runtimeRecord.id;
    if (!detail.hardConflictStatus.hasHardConflict) {
      detail.mergedOutput = {
        id: runtimeRecord.id,
        title: runtimeRecord.title,
        source: sourceSectionFor(candidate),
        sourceReferenceCount: runtimeRecord.sourceReferences.length,
        sourceReferences: runtimeRecord.sourceReferences
      };
    }
  }
}

function allMergeReportEntries(mergeDetails) {
  return [
    ...(mergeDetails.exactContentMerges ?? []),
    ...(mergeDetails.looseContentMerges ?? []),
    ...(mergeDetails.blockedContentMergeCandidates ?? [])
  ];
}

function mergeParticipantFor(candidate) {
  return {
    key: candidate.key,
    id: null,
    title: candidate.title,
    sourceVolumeId: candidate.sourceVolumeId,
    sourceSectionId: candidate.sourceSectionId,
    source: sourceSectionFor(candidate),
    sourceReferenceCount: unionSourceReferences(candidate.sourceReferences).length,
    safetyLevel: candidate.safetyLevel,
    safetyRiskCategories: safetyRiskCategoriesFor(candidate)
  };
}

function sourceSectionFor(candidate) {
  return `${candidate.sourceVolumeId}|${candidate.sourceSectionId}`;
}

function safetyRiskCategoriesFor(candidate) {
  const text = safetyRiskTextFor(candidate);
  const categories = [];
  if (hasToxicOrIrritatingGasRisk(text)) categories.push('toxic-or-irritating-gas');
  if (hasFlammableGasRisk(text)) categories.push('flammable-gas');
  if (hasHeatingOrFlameRisk(text)) categories.push('heating-or-flame');
  if (hasGasCollectionRisk(text)) categories.push('gas-collection-apparatus');
  if (hasCorrosiveRisk(text)) categories.push('corrosive-acid-base');
  if (safetyRank(candidate.safetyLevel) >= safetyRank('dangerous')) categories.push('high-safety-level');
  return categories.length > 0 ? categories : ['general-lab-safety'];
}

function maxSafetyLevel(left, right) {
  return safetyRank(left) >= safetyRank(right) ? left : right;
}

function safetyRank(safetyLevel) {
  return { safe: 0, caution: 1, dangerous: 2, 'extremely dangerous': 3 }[safetyLevel] ?? 1;
}

function upgradedUnlockRequirements(existing, curriculumTags, safetyLevel, sourceVolumeId) {
  const base = unlockRequirementsFor(curriculumTags, safetyLevel, sourceVolumeId);
  const grade = canonicalText(existing?.grade) || base.grade;
  return {
    ...base,
    grade
  };
}

function conflictProfileFor(candidate, canonicalFields) {
  const text = [candidate.title, candidate.description, candidate.textbookContent, ...candidate.materials, ...candidate.steps, ...candidate.observedPhenomena, ...canonicalFields.materials, ...canonicalFields.observedPhenomena].join(' ');
  return {
    substances: extractTerms(text, coreReactiveSubstances),
    gases: extractTerms(text, gasIdentityTerms),
    apparatusFamilies: extractTerms(text, apparatusProcedureFamilies),
    phenomenonPolarity: phenomenonPolarityFor(text)
  };
}

function hardConflictFor(left, right) {
  const substanceConflict = setConflict(left.substances, right.substances, nonConflictingSubstancePairs);
  if (substanceConflict) return `conflicting core reactive substances: ${substanceConflict}`;
  const gasConflict = gasIdentityConflict(left.gases, right.gases);
  if (gasConflict) return `conflicting gas identity: ${gasConflict}`;
  const apparatusConflict = setConflict(left.apparatusFamilies, right.apparatusFamilies, nonConflictingApparatusPairs);
  if (apparatusConflict) return `conflicting main apparatus/procedure family: ${apparatusConflict}`;
  if (left.phenomenonPolarity && right.phenomenonPolarity && left.phenomenonPolarity !== right.phenomenonPolarity) {
    return `contradictory observed phenomenon: ${left.phenomenonPolarity} vs ${right.phenomenonPolarity}`;
  }
  return null;
}

function gasIdentityConflict(left, right) {
  if (left.size === 0 || right.size === 0) return null;
  const leftKey = [...left].sort(compareText).join('+');
  const rightKey = [...right].sort(compareText).join('+');
  if (leftKey === rightKey) return null;
  return `${leftKey} vs ${rightKey}`;
}

function setConflict(left, right, allowedPairs = new Set()) {
  if (left.size === 0 || right.size === 0) return null;
  const onlyLeft = [...left].filter((item) => !right.has(item));
  const onlyRight = [...right].filter((item) => !left.has(item));
  if (onlyLeft.length === 0 || onlyRight.length === 0) return null;
  for (const leftItem of onlyLeft) {
    for (const rightItem of onlyRight) {
      if (!allowedPairs.has(pairKey(leftItem, rightItem))) {
        return `${leftItem} vs ${rightItem}`;
      }
    }
  }
  return null;
}

function extractTerms(text, terms) {
  const normalized = canonicalContentText(text);
  const found = new Set();
  for (const [term, patterns] of terms) {
    if (patterns.some((pattern) => pattern.test(normalized))) {
      found.add(term);
    }
  }
  return found;
}

function phenomenonPolarityFor(text) {
  const normalized = canonicalContentText(text);
  const positive = /(复燃|燃烧更旺|火焰|变蓝|变红|变浑浊|沉淀|气泡|褪色|红棕色|黄绿色|蓝色沉淀|白色沉淀)/u.test(normalized);
  const negative = /(不复燃|不能燃烧|无明显现象|没有明显变化|不变浑浊|未褪色|不产生气泡|不变色)/u.test(normalized);
  if (positive && !negative) return 'positive-change';
  if (negative && !positive) return 'negative-or-no-change';
  return null;
}

function uniqueSorted(values) {
  return [...new Set(values)].filter(Boolean).sort(compareText);
}

function buildTextbookRuntimeRecord(candidate, id) {
  return {
    id,
    experimentId: id,
    title: candidate.title,
    name: candidate.title,
    description: candidate.description,
    textbookContent: candidate.textbookContent,
    materials: candidate.materials,
    steps: candidate.steps,
    observedPhenomena: candidate.observedPhenomena,
    visualDescription: candidate.visualDescription,
    safetyLevel: candidate.safetyLevel,
    safetyNotes: candidate.safetyNotes,
    curriculumTags: candidate.curriculumTags,
    difficulty: candidate.difficulty,
    unlockRequirements: candidate.unlockRequirements,
    sourceKind: 'textbookExperiment',
    sourceReviewStatus: candidate.sourceReviewStatus,
    sourceVolumeId: candidate.sourceVolumeId,
    sourceReferences: candidate.sourceReferences
  };
}

function buildCuratedLegacyRecord(legacy) {
  return {
    id: legacy.id,
    experimentId: legacy.id,
    title: legacy.title,
    name: legacy.title,
    description: legacy.description,
    textbookContent: `原始五条精选虚拟实验之一；本次教材显式实验生成未找到可确定语义匹配，按策略保留为 curatedLegacy：${legacy.description}`,
    materials: legacy.materials,
    steps: legacy.steps,
    observedPhenomena: legacy.observedPhenomena,
    visualDescription: legacy.visualDescription,
    safetyLevel: legacy.safetyLevel,
    safetyNotes: legacy.safetyNotes,
    curriculumTags: legacy.curriculumTags,
    difficulty: legacy.difficulty,
    unlockRequirements: legacy.unlockRequirements,
    sourceKind: 'curatedLegacy',
    sourceReviewStatus: 'legacy-preserved',
    sourceVolumeId: 'curated-legacy',
    sourceReferences: [
      {
        candidateId: legacy.id,
        sourceVolumeId: 'curated-legacy',
        sourceSectionId: legacy.id,
        sourceKind: 'curatedLegacy',
        sourcePath: 'src/data/reactions.js',
        lineRange: '1-226',
        note: 'Original curated lab experiment preserved because no deterministic textbook semantic match was accepted.'
      }
    ]
  };
}

function matchLegacyExperimentId({ title, description, textbookContent, materials, observedPhenomena }) {
  const haystack = [title, description, textbookContent, ...materials, ...observedPhenomena].join(' ');
  // Require stronger signals: the title itself must suggest the specific experiment,
  // not just a passing mention in the textbook content.
  const heading = [title, description].join(' ');
  if (/铁钉生锈|铁生锈|生锈的条件/u.test(heading)) return 'exp-iron-rusting';
  if (/氧气|二氧化碳/u.test(heading) && /木条|燃烧更旺|助燃/u.test(heading)) return 'exp-oxygen-supports-combustion';
  if (/氢气/u.test(heading) && /燃着的木条|点燃|燃烧/u.test(heading)) return 'exp-hydrogen-combustion';
  if (/\b钠\b|金属钠/u.test(heading) && /水面|蒸馏水|放出氢气/u.test(heading)) return 'exp-sodium-water';
  return null;
}

function validateRuntimeRecords(records) {
  const errors = [];
  const details = {
    missingRequiredFields: [],
    invalidSourceKind: [],
    invalidSafetyLevel: [],
    missingUnlockRequirements: [],
    meaninglessTitles: [],
    meaninglessDescriptions: [],
    dirtyDisplayFields: [],
    nonArrayFields: [],
    emptyArrayFields: [],
    auditOnlyFields: []
  };
  const requiredFields = ['id', 'experimentId', 'title', 'name', 'description', 'textbookContent', 'materials', 'steps', 'observedPhenomena', 'visualDescription', 'safetyLevel', 'safetyNotes', 'curriculumTags', 'difficulty', 'unlockRequirements', 'sourceKind', 'sourceReviewStatus', 'sourceVolumeId', 'sourceReferences'];
  const allowedSourceKinds = new Set(['textbookExperiment', 'curatedLegacy']);
  const allowedSafetyLevels = new Set(['safe', 'caution', 'dangerous', 'extremely dangerous']);

  for (const record of records) {
    const id = record?.id || 'unknown-lab-record';
    for (const field of requiredFields) {
      if (!(field in record) || record[field] === undefined || record[field] === null) {
        details.missingRequiredFields.push(`${id}: missing ${field}`);
      }
    }
    if (!allowedSourceKinds.has(record?.sourceKind)) details.invalidSourceKind.push(`${id}: sourceKind ${record?.sourceKind}`);
    if (!allowedSafetyLevels.has(record?.safetyLevel)) details.invalidSafetyLevel.push(`${id}: safetyLevel ${record?.safetyLevel}`);
    if (!isNonEmptyObject(record?.unlockRequirements)) details.missingUnlockRequirements.push(`${id}: missing unlockRequirements`);
    if (!isMeaningfulTitle(record?.title)) details.meaninglessTitles.push(`${id}: title ${record?.title}`);
    if (!isMeaningfulTitle(record?.name)) details.meaninglessTitles.push(`${id}: name ${record?.name}`);
    if (!isMeaningfulDescription(record?.description)) details.meaninglessDescriptions.push(`${id}: description ${record?.description}`);
    for (const field of forbiddenRuntimeAuditFields()) {
      if (field in record) details.auditOnlyFields.push(`${id}: ${field}`);
    }
    for (const [field, value] of displayValuesFor(record)) {
      if (!isCleanDisplayText(value)) {
        details.dirtyDisplayFields.push(`${id}: ${field} ${value}`);
      }
    }
    for (const field of ['materials', 'steps', 'observedPhenomena', 'safetyNotes', 'curriculumTags', 'sourceReferences']) {
      if (!Array.isArray(record?.[field])) {
        details.nonArrayFields.push(`${id}: ${field}`);
      } else if (record[field].length === 0) {
        details.emptyArrayFields.push(`${id}: ${field}`);
      }
    }
  }

  for (const [name, values] of Object.entries(details)) {
    if (values.length > 0) errors.push(`${values.length} ${name}`);
  }
  return { status: errors.length === 0 ? 'pass' : 'fail', errors, details };
}

function evidenceFor(result, options) {
  return {
    schemaVersion: 1,
    builder: result.builder,
    command: `node scripts/textbook/build-lab-experiments.mjs ${options.write ? '--write' : '--check'}`,
    status: result.status,
    mode: result.mode,
    outputPath: result.outputPath,
    counters: result.counters,
    dedupeAudit: result.mergeDetails,
    mergeReport: result.mergeDetails,
    mergeDetails: result.mergeDetails,
    validation: result.validation,
    generatedRecordCount: result.labExperiments.length,
    acceptedRecordIds: result.labExperiments.filter((record) => record.sourceKind === 'textbookExperiment').map((record) => record.id),
    curatedLegacyRecordIds: result.labExperiments.filter((record) => record.sourceKind === 'curatedLegacy').map((record) => record.id)
  };
}

function printResult(result, options) {
  console.log(`labExperimentBuildStatus=${result.status}`);
  console.log(`mode=${options.write ? 'write' : 'check'}`);
  for (const [name, value] of Object.entries(result.counters)) {
    console.log(`${name}=${value}`);
  }
  console.log(`runtimeRecordCount=${result.labExperiments.length}`);
  for (const error of result.validation.errors) {
    console.error(`ERROR ${error}`);
  }
}

function runSelfCheck(checkName) {
  switch (checkName) {
    case 'duplicate-content-merge':
      return selfCheckDuplicateContentMerge();
    case 'duplicate-content-conflict':
      return selfCheckDuplicateContentConflict();
    case 'safety-risk-summary':
      return selfCheckSafetyRiskSummary();
    case 'safety-note-quality':
      return selfCheckSafetyNoteQuality();
    case 'source-reference-union':
      return selfCheckSourceReferenceUnion();
    default:
      throw new Error(`Unknown self-check: ${checkName}`);
  }
}

function defaultSelfCheckEvidencePathFor(checkName) {
  if (checkName === 'safety-risk-summary') return '.sisyphus/evidence/task-3-safety-risk-summary.json';
  if (checkName === 'safety-note-quality') return '.sisyphus/evidence/task-3-safety-quality.json';
  if (checkName === 'source-reference-union') return '.sisyphus/evidence/task-4-source-reference-union.json';
  return `.sisyphus/evidence/task-2-${checkName}.json`;
}

function selfCheckDuplicateContentMerge() {
  const counters = selfCheckCounters();
  const rejected = [];
  const mergeDetails = createMergeDetails();
  const candidates = [
    makeSelfCheckCandidate({
      key: 'vol1|section-a',
      sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
      sourceSectionId: 'section-a',
      sourceReferences: [makeSelfCheckReference('candidate-a', 'rj-chemistry-grade9-2024-vol1', 'section-a')]
    }),
    makeSelfCheckCandidate({
      key: 'vol2|section-b',
      sourceVolumeId: 'rj-chemistry-grade8-54-2024-full',
      sourceSectionId: 'section-b',
      textbookContent: '【实验2】（1）把带火星木条伸入盛有 O₂ 的集气瓶中。 （2）观察木条是否复燃。',
      steps: ['① 把带火星木条伸入盛有O₂的集气瓶中。', '② 观察木条是否复燃。'],
      materials: ['集气瓶', 'O₂', '带火星木条'],
      observedPhenomena: ['带火星木条在氧气中复燃。'],
      sourceReferences: [makeSelfCheckReference('candidate-b', 'rj-chemistry-grade8-54-2024-full', 'section-b')]
    })
  ];

  const merged = mergeRuntimeCandidates(candidates, counters, rejected, mergeDetails);
  const status = merged.length === 1 && merged[0].sourceReferences.length >= 2 && counters.exactContentMerges + counters.looseContentMerges >= 1 ? 'pass' : 'fail';
  return {
    schemaVersion: 1,
    builder: 'scripts/textbook/build-lab-experiments.mjs',
    check: 'duplicate-content-merge',
    status,
    counters,
    rejected,
    mergeDetails,
    mergedRecordCount: merged.length,
    sourceReferenceCount: merged[0]?.sourceReferences.length ?? 0,
    retainedPrimary: merged[0] ? { key: merged[0].key, title: merged[0].title, sourceVolumeId: merged[0].sourceVolumeId } : null,
    errors: status === 'pass' ? [] : ['Expected same canonical content from different sources to merge into one record with at least two sourceReferences.']
  };
}

function selfCheckDuplicateContentConflict() {
  const counters = selfCheckCounters();
  const rejected = [];
  const mergeDetails = createMergeDetails();
  const candidates = [
    makeSelfCheckCandidate({
      key: 'oxygen|section-a',
      title: '气体性质检验',
      sourceSectionId: 'oxygen-section',
      textbookContent: '步骤一 把带火星木条伸入盛有氧气的集气瓶中。步骤二 观察木条是否复燃。',
      steps: ['把带火星木条伸入盛有氧气的集气瓶中。', '观察木条是否复燃。'],
      materials: ['氧气', '带火星木条', '集气瓶'],
      observedPhenomena: ['带火星木条在氧气中复燃。'],
      sourceReferences: [makeSelfCheckReference('candidate-oxygen', 'rj-chemistry-grade9-2024-vol1', 'oxygen-section')]
    }),
    makeSelfCheckCandidate({
      key: 'hydrogen|section-b',
      title: '气体性质检验',
      sourceVolumeId: 'rj-chemistry-grade9-2024-vol2',
      sourceSectionId: 'hydrogen-section',
      textbookContent: '步骤一 把带火星木条伸入盛有氧气的集气瓶中。步骤二 观察木条是否复燃。实际气体标签为氢气。',
      steps: ['把带火星木条伸入盛有氧气的集气瓶中。', '观察木条是否复燃。'],
      materials: ['氢气', '氧气', '带火星木条', '集气瓶'],
      observedPhenomena: ['带火星木条在氧气中复燃。'],
      sourceReferences: [makeSelfCheckReference('candidate-hydrogen', 'rj-chemistry-grade9-2024-vol2', 'hydrogen-section')]
    })
  ];

  const merged = mergeRuntimeCandidates(candidates, counters, rejected, mergeDetails);
  const blockedReasons = mergeDetails.blockedContentMergeCandidates.map((item) => item.reason);
  const status = merged.length === 2 && counters.blockedContentMergeCandidates >= 1 && blockedReasons.some((reason) => /gas identity|observed phenomenon/u.test(reason)) ? 'pass' : 'fail';
  return {
    schemaVersion: 1,
    builder: 'scripts/textbook/build-lab-experiments.mjs',
    check: 'duplicate-content-conflict',
    status,
    counters,
    rejected,
    mergeDetails,
    mergedRecordCount: merged.length,
    blockedReasons,
    errors: status === 'pass' ? [] : ['Expected similar title/content with conflicting gas identity or phenomenon to remain two records and report a blocked merge.']
  };
}

function selfCheckSafetyRiskSummary() {
  const cases = safetyRiskSummaryFixtures();
  const results = cases.map((fixture) => {
    const candidate = finalizeMergedCandidate(prepareMergeCandidate(makeSelfCheckCandidate(fixture.candidate)));
    const notes = candidate.safetyNotes;
    return {
      name: fixture.name,
      safetyLevel: candidate.safetyLevel,
      notes,
      status: fixture.requiredPatterns.some((pattern) => notes.some((note) => pattern.test(note))) && !safetyNotesCopySteps(notes, candidate.steps) ? 'pass' : 'fail'
    };
  });
  const errors = results.filter((result) => result.status !== 'pass').map((result) => `${result.name}: expected normalized risk summary, got ${result.notes.join(' | ')}`);
  return {
    schemaVersion: 1,
    builder: 'scripts/textbook/build-lab-experiments.mjs',
    check: 'safety-risk-summary',
    status: errors.length === 0 ? 'pass' : 'fail',
    results,
    errors
  };
}

function selfCheckSafetyNoteQuality() {
  const cases = [
    ...safetyRiskSummaryFixtures(),
    {
      name: 'default caution fallback',
      candidate: {
        title: '溶解现象观察',
        textbookContent: '取少量食盐加入水中，搅拌并观察溶解过程。',
        steps: ['取少量食盐加入水中。', '搅拌并观察溶解过程。'],
        materials: ['食盐', '水', '烧杯'],
        observedPhenomena: ['食盐逐渐溶解。'],
        safetyLevel: 'caution',
        sourceSafetyNotes: ['取少量食盐加入水中。']
      }
    }
  ];
  const results = cases.map((fixture) => {
    const candidate = finalizeMergedCandidate(prepareMergeCandidate(makeSelfCheckCandidate(fixture.candidate)));
    const notes = candidate.safetyNotes;
    const qualityErrors = safetyNoteQualityErrors(notes, candidate.steps);
    return {
      name: fixture.name,
      notes,
      qualityErrors,
      status: qualityErrors.length === 0 ? 'pass' : 'fail'
    };
  });
  const errors = results.flatMap((result) => result.qualityErrors.map((error) => `${result.name}: ${error}`));
  return {
    schemaVersion: 1,
    builder: 'scripts/textbook/build-lab-experiments.mjs',
    check: 'safety-note-quality',
    status: errors.length === 0 ? 'pass' : 'fail',
    forbiddenPhrasePolicy: 'legacy empty-safety fallback text is rejected',
    results,
    errors
  };
}

function selfCheckSourceReferenceUnion() {
  const counters = selfCheckCounters();
  const rejected = [];
  const mergeDetails = createMergeDetails();
  const candidates = [
    makeSelfCheckCandidate({
      key: 'primary|safe-section',
      sourceVolumeId: 'rj-chemistry-grade8-54-2024-full',
      sourceSectionId: 'safe-section',
      title: '氧气性质检验',
      textbookContent: '【实验1】（1）检查集气瓶。（2）把带火星木条伸入盛有O2的集气瓶中。（3）观察木条是否复燃。（4）记录火焰变化。（5）整理实验现象。',
      steps: ['1）检查集气瓶。', '2）把带火星木条伸入盛有O2的集气瓶中。', '3）观察木条是否复燃。', '4）记录火焰变化。', '5）整理实验现象。'],
      materials: ['氧气', '带火星木条'],
      observedPhenomena: ['带火星木条在氧气中复燃。'],
      safetyLevel: 'safe',
      curriculumTags: ['g8-textbook-experiment'],
      unlockRequirements: unlockRequirementsFor(['g8-textbook-experiment'], 'safe', 'rj-chemistry-grade8-54-2024-full'),
      sourceReferences: [makeSelfCheckReference('primary-candidate', 'rj-chemistry-grade8-54-2024-full', 'safe-section')]
    }),
    makeSelfCheckCandidate({
      key: 'supplement|danger-section',
      sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
      sourceSectionId: 'danger-section',
      title: '氧气助燃观察',
      textbookContent: '【实验2】（1）检查集气瓶。（2）把带火星木条伸入盛有 O2 的集气瓶中。（3）观察木条是否复燃。（4）记录火焰变化。（5）整理实验现象。',
      steps: ['① 检查集气瓶。', '② 把带火星木条伸入盛有O2的集气瓶中。', '③ 观察木条是否复燃。', '④ 记录火焰变化。', '⑤ 整理实验现象。'],
      materials: ['氧气', '带火星木条'],
      observedPhenomena: ['带火星木条在氧气中复燃。'],
      safetyLevel: 'dangerous',
      curriculumTags: ['g9-textbook-experiment'],
      unlockRequirements: unlockRequirementsFor(['g9-textbook-experiment'], 'dangerous', 'rj-chemistry-grade9-2024-vol1'),
      sourceReferences: [makeSelfCheckReference('supplement-candidate', 'rj-chemistry-grade9-2024-vol1', 'danger-section')]
    })
  ];

  const merged = mergeRuntimeCandidates(candidates, counters, rejected, mergeDetails);
  const record = merged[0] ? buildTextbookRuntimeRecord(merged[0], 'self-check-source-reference-union') : null;
  if (record && merged[0]) registerRuntimeRecordForMergeReport(mergeDetails, merged[0], record);

  const mergedDetail = mergeDetails.exactContentMerges[0] ?? mergeDetails.looseContentMerges[0] ?? null;
  const auditFieldsPresent = record ? forbiddenRuntimeAuditFields().filter((field) => field in record) : [];
  const primaryStepsPreserved = record ? record.steps[0] === candidates[0].steps[0] && record.steps[1] === candidates[0].steps[1] : false;
  const status = record && merged.length === 1 && record.sourceReferences.length >= 2 && record.safetyLevel === 'dangerous' && record.unlockRequirements.safetyLevels.includes('dangerous') && record.unlockRequirements.grade === '八年级' && primaryStepsPreserved && auditFieldsPresent.length === 0 && mergedDetail?.sourceReferenceCountAfter >= mergedDetail?.sourceReferenceCountBefore && mergedDetail?.sourceReferences.length >= 2 ? 'pass' : 'fail';

  return {
    schemaVersion: 1,
    builder: 'scripts/textbook/build-lab-experiments.mjs',
    check: 'source-reference-union',
    status,
    counters,
    rejected,
    mergeReport: mergeDetails,
    mergedRecordCount: merged.length,
    runtimeRecord: record,
    assertions: {
      sourceReferenceCountBefore: mergedDetail?.sourceReferenceCountBefore ?? 0,
      sourceReferenceCountAfter: mergedDetail?.sourceReferenceCountAfter ?? 0,
      runtimeSourceReferenceCount: record?.sourceReferences.length ?? 0,
      safetyLevel: record?.safetyLevel ?? null,
      unlockRequirements: record?.unlockRequirements ?? null,
      primaryStepsPreserved,
      auditFieldsPresent
    },
    errors: status === 'pass' ? [] : ['Expected merged record to preserve primary identity/order, union source refs, max safety/unlock requirements, and exclude audit-only fields.']
  };
}

function forbiddenRuntimeAuditFields() {
  return ['canonicalFields', 'contentFingerprint', 'conflictProfile', 'scores', 'mergeDetails', 'sourceReferenceCountAfterMerge', 'sourceSafetyNotes', 'mergedOutput', 'hardConflictStatus'];
}

function safetyRiskSummaryFixtures() {
  return [
    {
      name: 'heating alcohol lamp fixture',
      candidate: {
        title: '酒精灯加热铜片实验',
        textbookContent: '用酒精灯加热铜片，观察铜片颜色变化和火焰。',
        steps: ['用试管夹夹住铜片。', '在酒精灯火焰上加热。', '观察铜片颜色变化。'],
        materials: ['酒精灯', '铜片', '试管夹'],
        observedPhenomena: ['铜片表面变黑。'],
        safetyLevel: 'dangerous',
        sourceSafetyNotes: ['在酒精灯火焰上加热。']
      },
      requiredPatterns: [/明火|热玻璃|烫伤|可燃/u]
    },
    {
      name: 'gas collection water displacement fixture',
      candidate: {
        title: '排水法收集氧气',
        textbookContent: '检查装置气密性后，将导管伸入水槽中的集气瓶，用排水法收集氧气。',
        steps: ['检查装置气密性。', '将导管伸入倒置集气瓶。', '用排水法收集气体。'],
        materials: ['集气瓶', '导管', '水槽', '氧气'],
        observedPhenomena: ['集气瓶内水面下降并收集到气体。'],
        safetyLevel: 'caution',
        sourceSafetyNotes: ['导管插入集气瓶。']
      },
      requiredPatterns: [/气密性|导管|倒吸|集气瓶/u]
    },
    {
      name: 'acid base corrosive fixture',
      candidate: {
        title: '盐酸与氢氧化钠反应',
        textbookContent: '向氢氧化钠溶液中滴加稀盐酸，观察酸碱中和现象。',
        steps: ['取氢氧化钠溶液。', '滴加稀盐酸。', '观察指示剂颜色变化。'],
        materials: ['稀盐酸', '氢氧化钠溶液', '酚酞'],
        observedPhenomena: ['溶液颜色逐渐变化。'],
        safetyLevel: 'dangerous',
        sourceSafetyNotes: ['佩戴护目镜。']
      },
      requiredPatterns: [/护目镜|皮肤|眼睛|腐蚀/u]
    },
    {
      name: 'toxic irritating gas fixture',
      candidate: {
        title: '氯气性质观察',
        textbookContent: '教师演示氯气使湿润有色布条褪色，氯气有刺激性气味。',
        steps: ['教师收集少量氯气。', '放入湿润有色布条。', '观察褪色现象。'],
        materials: ['氯气', '湿润有色布条', '集气瓶'],
        observedPhenomena: ['有色布条褪色。'],
        safetyLevel: 'dangerous',
        sourceSafetyNotes: ['不要闻氯气。']
      },
      requiredPatterns: [/通风|教师演示|禁止直接闻/u]
    },
    {
      name: 'flammable hydrogen fixture',
      candidate: {
        title: '氢气燃烧实验',
        textbookContent: '收集氢气并点燃，观察淡蓝色火焰，点燃前需要检验纯度。',
        steps: ['收集一试管氢气。', '点燃前检验纯度。', '观察淡蓝色火焰。'],
        materials: ['氢气', '试管', '火柴'],
        observedPhenomena: ['氢气燃烧产生淡蓝色火焰。'],
        safetyLevel: 'dangerous',
        sourceSafetyNotes: ['点燃前检验纯度。']
      },
      requiredPatterns: [/验纯|爆炸|火灾|明火/u]
    }
  ];
}

function safetyNoteQualityErrors(notes, steps) {
  const errors = [];
  if (!Array.isArray(notes) || notes.length < 1 || notes.length > 4) {
    errors.push(`expected 1-4 notes, got ${Array.isArray(notes) ? notes.length : 'non-array'}`);
    return errors;
  }
  for (const note of notes) {
    if (!isCleanDisplayText(note)) errors.push(`dirty display note: ${note}`);
    if (!/[\p{Script=Han}]/u.test(note)) errors.push(`expected Chinese note: ${note}`);
    if (note.length > 80) errors.push(`note too long: ${note}`);
    for (const phrase of forbiddenSafetyFallbackPhrases()) {
      if (note.includes(phrase)) errors.push(`forbidden fallback phrase: ${phrase}`);
    }
  }
  if (safetyNotesCopySteps(notes, steps)) {
    errors.push('safety note copies a step verbatim');
  }
  return errors;
}

function safetyNotesCopySteps(notes, steps) {
  const stepKeys = new Set((steps ?? []).map(canonicalStepText).filter(Boolean));
  return notes.some((note) => stepKeys.has(canonicalStepText(note)));
}

function forbiddenSafetyFallbackPhrases() {
  return [`未${'提取到安全提示'}`, `教材未${'提取到明确安全提示'}`, `No explicit safety note was ${'extracted'}`];
}

function selfCheckCounters() {
  return {
    acceptedExperiments: 0,
    rejectedNonExperiments: 0,
    rejectedDuplicates: 0,
    rejectedMeaninglessTitle: 0,
    rejectedMeaninglessContent: 0,
    exactContentMerges: 0,
    looseContentMerges: 0,
    blockedContentMergeCandidates: 0,
    curatedLegacyPreserved: 0
  };
}

function makeSelfCheckCandidate(overrides = {}) {
  const candidate = {
    key: 'self-check|section-a',
    contentKey: '',
    legacyId: null,
    sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
    sourceSectionId: 'section-a',
    title: '氧气性质检验',
    description: '观察氧气能让带火星木条复燃的现象，理解氧气助燃性质。',
    textbookContent: '【实验1】（1）把带火星木条伸入盛有O2的集气瓶中。（2）观察木条是否复燃。',
    materials: ['氧气', '带火星木条', '集气瓶'],
    steps: ['1）把带火星木条伸入盛有O2的集气瓶中。', '2）观察木条是否复燃。'],
    observedPhenomena: ['带火星木条在氧气中复燃。'],
    visualDescription: '木条靠近氧气后火星变亮并重新燃烧。',
    safetyLevel: 'caution',
    safetyNotes: ['燃烧实验需要教师指导并远离易燃物。'],
    curriculumTags: ['g9-textbook-experiment'],
    difficulty: '初中基础',
    unlockRequirements: {
      curriculumTags: ['g9-textbook-experiment'],
      safetyLevels: ['caution'],
      stageIds: ['stage-2'],
      minimumLearnedElements: 8,
      grade: '九年级'
    },
    sourceReviewStatus: 'reviewed',
    sourceReferences: [makeSelfCheckReference('candidate-a', 'rj-chemistry-grade9-2024-vol1', 'section-a')],
    ...overrides
  };
  candidate.contentKey = contentKeyFor(candidate.textbookContent, candidate.steps, candidate.materials, candidate.observedPhenomena);
  return candidate;
}

function makeSelfCheckReference(candidateId, sourceVolumeId, sourceSectionId) {
  return {
    candidateId,
    sourceVolumeId,
    sourceSectionId,
    sourceKind: 'experimentCandidate',
    sourcePath: `self-check/${sourceVolumeId}.md`,
    sourceHeading: '【实验】',
    lineRange: '1-3',
    sourceHash: hashText(candidateId),
    sectionHash: hashText(sourceSectionId),
    assets: []
  };
}

function printSelfCheckResult(result) {
  console.log(`${result.check}=${result.status}`);
  for (const [name, value] of Object.entries(result.counters ?? {})) {
    console.log(`${name}=${value}`);
  }
  for (const error of result.errors ?? []) {
    console.error(`ERROR ${error}`);
  }
}

function textField(group, fieldName) {
  return valuesFor(group, fieldName).find(Boolean) ?? '';
}

function valuesFor(group, fieldName) {
  return group.records.map(({ record }) => canonicalText(record[fieldName])).filter(Boolean);
}

function mergeStringArrays(group, fieldNames) {
  const values = [];
  for (const { record } of group.records) {
    for (const fieldName of fieldNames) {
      const value = record[fieldName];
      if (Array.isArray(value)) {
        values.push(...value.map(cleanContent).filter(Boolean));
      } else if (typeof value === 'string') {
        values.push(cleanContent(value));
      }
    }
  }
  return [...new Set(values)].filter(Boolean).sort(compareText).slice(0, 12);
}

function cleanContent(value) {
  return repairKnownGarbledFormulaText(canonicalText(value))
    .replace(experimentNumberLabelPattern, ' ')
    .replace(/…+/gu, '')
    .replace(/\$([^$]+)\$/gu, '$1')
    .replace(/\\mathrm\s*\{\s*([^}]+)\s*\}/gu, '$1')
    .replace(/\s*~\s*/gu, ' ')
    .replace(/\s+([，。；;：:、])/gu, '$1')
    .replace(/([（(])\s+/gu, '$1')
    .replace(/\s+/gu, ' ')
    .trim();
}

function repairKnownGarbledFormulaText(value) {
  if (!value || !value.includes('C O N a') || !value.includes('H - B r')) {
    return value;
  }

  const sodiumReaction = '$$ 2\\mathrm{CH_3CH_2OH}+2\\mathrm{Na}\\rightarrow2\\mathrm{CH_3CH_2ONa}+\\mathrm{H_2}\\uparrow $$';
  const hydrobromicReaction = '$$ \\mathrm{CH_3CH_2OH}+\\mathrm{HBr}\\xrightarrow{\\triangle}\\mathrm{CH_3CH_2Br}+\\mathrm{H_2O} $$';
  const leadIn = '另外，由于羟基中氧原子的电负性较大';
  const firstStart = value.indexOf('$$ 2 H \\xrightarrow');
  const leadInIndex = value.indexOf(leadIn);
  const secondStart = value.indexOf('$$ \\begin{array}{c}', Math.max(0, leadInIndex));
  const secondEnd = value.indexOf('$$', secondStart + 3);

  if (firstStart === -1 || leadInIndex === -1 || secondStart === -1 || secondEnd === -1) {
    return value;
  }

  return [
    value.slice(0, firstStart),
    sodiumReaction,
    ' ',
    value.slice(leadInIndex, secondStart),
    hydrobromicReaction,
    value.slice(secondEnd + 2)
  ].join('');
}

function cleanTitlePhrase(value) {
  return cleanContent(value)
    .replace(/^如图\d+[-–]\d+所示[，,]?\s*/u, '')
    .replace(/^观察(?:并记录)?/u, '')
    // Only strip "实验现象" when it is a standalone prefix (followed by punctuation/space/end),
    // not when it is part of a possessive phrase like "实验现象的观察与描述".
    .replace(/^实验(?:内容|现象|记录)?(?=[\s：:，,、]|$)/u, '')
    .replace(/^记录[：:]?\s*/u, '')
    .replace(/^现象和数据[：:]?\s*/u, '')
    .replace(/^项目\s*/u, '')
    .replace(/^[:：，,、\s]+/u, '')
    .trim();
}

function titleFromKeywords(value) {
  const text = cleanContent(value);
  const keywords = substanceTitleKeywords.filter((keyword) => text.includes(keyword));
  if (keywords.length === 0) {
    return '';
  }

  const uniqueKeywords = [...new Set(keywords)].slice(0, 3);
  const action = actionPhraseFor(text);
  return `${uniqueKeywords.join('、')}${action}`;
}

function actionPhraseFor(text) {
  if (/制取|实验室制法|实验室制取/u.test(text)) return '的制取与性质检验';
  if (/燃烧|点燃/u.test(text)) return '的燃烧现象';
  if (/通入|褪色|酸性高锰酸钾|溴的四氯化碳/u.test(text)) return '的性质检验';
  if (/加热|溶解|过滤|结晶|提纯/u.test(text)) return '的分离提纯';
  if (/加入|滴入|反应|放出|产生/u.test(text)) return '的反应现象';
  if (/鉴别|检验/u.test(text)) return '的鉴别检验';
  return '实验';
}

function isGenericTitle(value) {
  const originalKey = normalizeForDedupe(canonicalText(value));
  const cleanedKey = normalizeForDedupe(cleanTitlePhrase(value));
  return genericTitleKeys.has(originalKey) || genericTitleKeys.has(cleanedKey);
}

function startsWithWeakTitleVerb(value) {
  return /^(向|将|把|在|用|取|加入|滴入|分别|进行|如图)/u.test(canonicalText(value));
}

function isCleanDisplayText(value) {
  const text = canonicalText(value);
  if (!text) return false;
  if (experimentNumberLabelTestPattern.test(text)) return false;
  if (/教材已审核反应[：:]/u.test(text)) return false;
  if (rawIdFragmentPattern.test(text)) return false;
  if (sourceSectionIdFragmentPattern.test(text)) return false;
  if (hashFragmentPattern.test(text)) return false;
  return true;
}

function allCleanDisplayStrings(values) {
  return values.every((value) => isCleanDisplayText(value));
}

function displayValuesFor(record) {
  const values = [];
  for (const field of ['title', 'name', 'description', 'observedPhenomena', 'visualDescription', 'safetyNotes', 'steps', 'materials']) {
    const value = record?.[field];
    if (Array.isArray(value)) {
      for (const item of value) {
        values.push([field, item]);
      }
    } else {
      values.push([field, value]);
    }
  }
  return values;
}

function isMeaningfulTitle(value) {
  const trimmed = canonicalText(value);
  if (!trimmed) return false;
  if (isRawIdLike(trimmed)) return false;
  if (/^[a-f0-9]{10,}$/iu.test(trimmed)) return false;
  if (/-[a-f0-9]{8,}$/iu.test(trimmed)) return false;
  if (!isCleanDisplayText(trimmed)) return false;
  if (isGenericTitle(trimmed)) return false;
  if (/^(观察|记录|实验|现象|数据|项目)$/u.test(cleanTitlePhrase(trimmed))) return false;
  // Reject titles that start with a bare Chinese particle or common generic fragments
  if (/^[的与及和或之][\\p{Script=Han}]/u.test(trimmed)) return false;
  if (/^(观察与描述|实验与记录|步骤与现象|实验现象|实验记录|观察记录)$/u.test(trimmed)) return false;
  return meaningfulChineseLength(trimmed) >= 3;
}

function isMeaningfulDescription(value) {
  const trimmed = canonicalText(value);
  if (trimmed.length < 8) return false;
  if (/教材已审核反应[：:]/u.test(trimmed)) return false;
  if (/^【实验(?:\s*\d+[-–]?\d*)?\s*】$/u.test(trimmed)) return false;
  if (isRawIdLike(trimmed)) return false;
  return true;
}

function isRawIdLike(value) {
  return /^(experiment-|lab-|backlog-|reaction-)[a-z0-9-]+$/iu.test(value);
}

function meaningfulChineseLength(value) {
  return (canonicalText(value).match(/[\p{Script=Han}A-Za-z0-9]/gu) ?? []).length;
}

function experimentIdFor(sourceVolumeId, sourceSectionId, title) {
  const sectionSlug = slugify(sourceSectionId).replace(/-[a-f0-9]{8,}$/iu, '');
  return `lab-experiment-${slugify(sourceVolumeId)}-${sectionSlug}-${hashText(title).slice(0, 8)}`;
}

function slugify(value) {
  return canonicalText(value).toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '') || 'unknown';
}

function normalizeForDedupe(value) {
  return canonicalText(value).replace(/[\s，。；;:：、（）()【】\[\]-]/gu, '').toLowerCase();
}

function canonicalText(value) {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';
}

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyObject(value) {
  return isRecord(value) && Object.keys(value).length > 0;
}

function compareGroups(left, right) {
  return compareText(left.key, right.key);
}

function compareRuntimeRecords(left, right) {
  return compareText(left.sourceKind, right.sourceKind) || compareText(left.sourceVolumeId, right.sourceVolumeId) || compareText(left.id, right.id);
}

function compareSourceReferences(left, right) {
  return compareText(left.sourcePath, right.sourcePath) || compareText(left.lineRange, right.lineRange) || compareText(left.candidateId, right.candidateId) || compareText(left.sourceKind, right.sourceKind);
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), 'zh-Hans-CN');
}

async function readJsonFile(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read ${label} at ${relativeProjectPath(filePath)}: ${error.message}`);
  }
}

async function writeJsonFile(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function projectPath(relativePath) {
  return path.resolve(projectRoot, relativePath);
}

function relativeProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/gu, '/');
}
