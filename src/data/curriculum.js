export const curriculumTags = {
  'intro-element-symbols': {
    id: 'intro-element-symbols',
    grade: '入门',
    schoolLevel: '入门',
    chapter: '元素基础',
    topic: '元素符号',
    displayPath: '入门/元素基础/元素符号',
    difficulty: '入门',
    aliases: ['元素符号', '化学符号', '元素名称与符号'],
    sourceVolumeId: 'app-intro-core',
    sourceHeading: '入门/元素基础/元素符号',
    prerequisites: [],
    status: 'seed'
  },
  'g9-acid-base-salt-neutralization': {
    id: 'g9-acid-base-salt-neutralization',
    grade: '九年级',
    schoolLevel: '初中',
    chapter: '酸碱盐',
    topic: '中和反应',
    displayPath: '九年级/酸碱盐/中和反应',
    difficulty: '初中',
    aliases: ['中和反应', '酸碱中和', '酸和碱的反应'],
    sourceVolumeId: 'pep-chemistry-g9-2024',
    sourceHeading: '酸和碱的中和反应',
    prerequisites: ['intro-element-symbols'],
    status: 'seed'
  },
  'g10-redox-valence-change': {
    id: 'g10-redox-valence-change',
    grade: '高一',
    schoolLevel: '高中',
    chapter: '氧化还原',
    topic: '化合价变化',
    displayPath: '高一/氧化还原/化合价变化',
    difficulty: '高中基础',
    aliases: ['化合价变化', '氧化还原反应', '电子转移'],
    sourceVolumeId: 'pep-chemistry-g10-required-1',
    sourceHeading: '氧化还原反应中的化合价变化',
    prerequisites: ['intro-element-symbols'],
    status: 'seed'
  },
  'g9-carbon-c60-allotrope': {
    id: 'g9-carbon-c60-allotrope',
    grade: '九年级',
    schoolLevel: '初中',
    chapter: '碳和碳的氧化物',
    topic: 'C60 与碳单质',
    displayPath: '九年级/碳和碳的氧化物/C60 与碳单质',
    difficulty: '初中',
    aliases: ['C60', '碳单质', '足球状碳分子'],
    sourceVolumeId: 'pep-chemistry-g9-2024',
    sourceHeading: 'C60',
    prerequisites: ['intro-element-symbols'],
    status: 'reviewed'
  },
  'g9-carbon-allotropes-comparison': {
    id: 'g9-carbon-allotropes-comparison',
    grade: '九年级',
    schoolLevel: '初中',
    chapter: '碳和碳的氧化物',
    topic: '金刚石/石墨/C60 对比',
    displayPath: '九年级/碳和碳的氧化物/金刚石、石墨与 C60 对比',
    difficulty: '初中',
    aliases: ['金刚石', '石墨', 'C60', '碳单质比较'],
    sourceVolumeId: 'pep-chemistry-g9-2024',
    sourceHeading: '碳的单质',
    prerequisites: ['intro-element-symbols', 'g9-carbon-c60-allotrope'],
    status: 'reviewed'
  },

};

export default { curriculumTags };
