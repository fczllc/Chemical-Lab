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
      evidence: { type: 'string' }
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
    outputPath: values.output ?? defaultOutputPath,
    evidencePath: values.evidence ?? null
  };
}

function printHelp() {
  console.log(`Textbook lab experiment runtime builder / 教材实验运行时生成器

Usage:
  node scripts/textbook/build-lab-experiments.mjs --check
  node scripts/textbook/build-lab-experiments.mjs --write

Options:
  --check             Preview generated lab records and validation counters without writing src/data/labExperiments.json.
  --write             Write src/data/labExperiments.json and evidence after validation passes.
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
    curatedLegacyPreserved: 0
  };
  const rejected = [];

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
  const seenSections = new Set();
  const seenContent = new Set();
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

    const contentKey = `${normalizeForDedupe(title)}|${hashText(normalizeForDedupe(textbookContent)).slice(0, 16)}`;
    if (seenContent.has(contentKey)) {
      counters.rejectedDuplicates += 1;
      rejected.push({ key: group.key, reason: 'duplicate title/content' });
      continue;
    }

    const sourceVolumeId = textField(group, 'sourceVolumeId');
    const sourceSectionId = textField(group, 'sourceSectionId');
    const legacyId = matchLegacyExperimentId({ title, description, textbookContent, materials, observedPhenomena });
    const shouldPreserveLegacyId = legacyId && !matchedLegacyIds.has(legacyId);
    if (legacyId) {
      matchedLegacyIds.add(legacyId);
    }
    const id = shouldPreserveLegacyId ? legacyId : experimentIdFor(sourceVolumeId, sourceSectionId, title);
    const safetyLevel = safetyLevelFor(group);
    const curriculumTags = curriculumTagsFor(group, sourceVolumeId);

    records.push({
      id,
      experimentId: id,
      title,
      name: title,
      description,
      textbookContent,
      materials,
      steps,
      observedPhenomena,
      visualDescription: visualDescriptionFor(title, observedPhenomena),
      safetyLevel,
      safetyNotes: safetyNotesFor(group, safetyLevel),
      curriculumTags,
      difficulty: difficultyFor(sourceVolumeId),
      unlockRequirements: unlockRequirementsFor(curriculumTags, safetyLevel, sourceVolumeId),
      sourceKind: 'textbookExperiment',
      sourceReviewStatus: sourceReviewStatusFor(group),
      sourceVolumeId,
      sourceReferences: sourceReferencesFor(group)
    });
    seenSections.add(sourceKey);
    seenContent.add(contentKey);
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

function safetyNotesFor(group, safetyLevel) {
  const notes = mergeStringArrays(group, ['safetyNotes']);
  if (notes.length > 0) {
    return notes.map(cleanContent).filter((item) => isCleanDisplayText(item) && !isGenericTitle(item));
  }
  if (safetyLevel === 'dangerous' || safetyLevel === 'extremely dangerous') {
    return ['教材实验可能涉及加热、酸碱或可燃物，真实操作必须由教师指导并佩戴护目镜。'];
  }
  return ['仅用于应用内虚拟学习，真实实验需遵守课堂安全规范。'];
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
    emptyArrayFields: []
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
    command: `node scripts/textbook/build-lab-experiments.mjs ${options.write ? '--write' : '--check'}`,
    status: result.status,
    mode: result.mode,
    outputPath: result.outputPath,
    counters: result.counters,
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
  return canonicalText(value)
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
