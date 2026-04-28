export const ELEMENT_CATEGORY_META = {
  'alkali metal': {
    label: '碱金属',
    tableColor: '#ff6b6b',
    overviewColor: 'var(--alkali)'
  },
  'alkaline earth metal': {
    label: '碱土金属',
    tableColor: '#ffa94d',
    overviewColor: 'var(--alkaline)'
  },
  'transition metal': {
    label: '过渡金属',
    tableColor: '#ffd43b',
    overviewColor: 'var(--transition)'
  },
  'post-transition metal': {
    label: '后过渡金属',
    tableColor: '#69db7c',
    overviewColor: 'var(--post-transition)'
  },
  metalloid: {
    label: '类金属',
    tableColor: '#38d9a9',
    overviewColor: 'var(--metalloid)'
  },
  'reactive nonmetal': {
    label: '非金属',
    tableColor: '#4dabf7',
    overviewColor: 'var(--nonmetal)'
  },
  'noble gas': {
    label: '稀有气体',
    tableColor: '#9775fa',
    overviewColor: 'var(--noble)'
  },
  halogen: {
    label: '卤素',
    tableColor: '#f06595',
    overviewColor: 'var(--halogen)'
  },
  lanthanide: {
    label: '镧系',
    tableColor: '#ff6b9d',
    overviewColor: 'var(--lanthanide)'
  },
  actinide: {
    label: '锕系',
    tableColor: '#ff8fab',
    overviewColor: 'var(--actinide)'
  },
  unknown: {
    label: '未知',
    tableColor: '#868e96'
  }
};

export const ELEMENT_CATEGORY_LABELS = Object.fromEntries(
  Object.entries(ELEMENT_CATEGORY_META).map(([key, meta]) => [key, meta.label])
);

export const ELEMENT_CATEGORY_TABLE_COLORS = Object.fromEntries(
  Object.entries(ELEMENT_CATEGORY_META).map(([key, meta]) => [key, meta.tableColor])
);

export const ELEMENT_RARITY_LABELS = {
  common: '常见',
  uncommon: '较少见',
  rare: '稀有',
  'very rare': '非常稀有',
  synthetic: '人工合成'
};

export const COMPARE_RARITY_LABELS = {
  common: '常见',
  uncommon: '较常见',
  rare: '稀有',
  'very rare': '极稀有',
  synthetic: '人工合成'
};

export const SAFETY_LABELS = {
  safe: '安全',
  caution: '注意',
  dangerous: '危险',
  radioactive: '放射性',
  'extremely dangerous': '极度危险'
};

export const RENDER_TABLE_SAFETY_META = {
  safe: { label: SAFETY_LABELS.safe, color: '#69db7c' },
  caution: { label: SAFETY_LABELS.caution, color: '#ffd43b' },
  dangerous: { label: SAFETY_LABELS.dangerous, color: '#ffa94d' },
  radioactive: { label: SAFETY_LABELS.radioactive, color: '#ff6b6b' },
  'extremely dangerous': { label: SAFETY_LABELS['extremely dangerous'], color: '#ff4d6d' }
};

export const COMPARE_SAFETY_COLORS = {
  safe: '#22c55e',
  caution: '#eab308',
  dangerous: '#f97316',
  radioactive: '#a855f7',
  'extremely dangerous': '#ef4444'
};

export const LAB_SAFETY_THEME = {
  safe: { label: SAFETY_LABELS.safe, color: '#4ade80', glow: 'rgba(74, 222, 128, 0.35)', icon: '🟢' },
  caution: { label: SAFETY_LABELS.caution, color: '#facc15', glow: 'rgba(250, 204, 21, 0.35)', icon: '🟡' },
  dangerous: { label: SAFETY_LABELS.dangerous, color: '#fb923c', glow: 'rgba(251, 146, 60, 0.4)', icon: '🟠' },
  radioactive: { label: SAFETY_LABELS.radioactive, color: '#c084fc', glow: 'rgba(192, 132, 252, 0.4)', icon: '🟣' },
  'extremely dangerous': { label: SAFETY_LABELS['extremely dangerous'], color: '#ef4444', glow: 'rgba(239, 68, 68, 0.45)', icon: '🔴' }
};

export const GAME_KEYS = {
  drag: 'game-drag',
  memory: 'game-memory',
  reaction: 'game-reaction',
  collector: 'game-collector'
};

export const GAME_META = {
  drag: {
    title: '元素拖拽归位',
    kicker: 'PERIODIC DOCKING',
    description: '在 60 秒内把元素卡片拖到正确的周期表位置，答对加分，答错扣分。'
  },
  memory: {
    title: '元素记忆翻牌',
    kicker: 'MEMORY MATRIX',
    description: '翻出元素符号与中文名的正确配对，用更少步数和时间拿到更高评级。'
  },
  reaction: {
    title: '反应配对',
    kicker: 'REACTION LINK',
    description: '把反应物和正确生成物连接起来，建立化学反应的直觉。'
  },
  collector: {
    title: '元素收集',
    kicker: 'COLLECTION VAULT',
    description: '查看已学习元素的收集墙、完成率和阶段奖励，了解下一步学习目标。'
  }
};

export const GAME_LABELS = {
  [GAME_KEYS.drag]: GAME_META.drag.title,
  [GAME_KEYS.memory]: GAME_META.memory.title,
  [GAME_KEYS.reaction]: GAME_META.reaction.title,
  [GAME_KEYS.collector]: GAME_META.collector.title,
  'quiz-full': '完整测验挑战'
};

export const EXPERIMENT_LABELS = {
  'exp-hydrogen-combustion': '氢气燃烧',
  'exp-iron-rusting': '铁生锈',
  'exp-sodium-water': '钠遇水',
  'exp-salt-formation': '盐的形成',
  'exp-oxygen-supports-combustion': '氧气助燃'
};

export const FEATURE_LABELS = {
  'detail-panel': '元素详情面板',
  'basic-quiz': '基础测验',
  'collection-board': '收藏墙',
  filters: '分类筛选',
  search: '元素搜索',
  'category-legend': '类别图例',
  'compare-view': '元素对比',
  'applications-preview': '用途预览',
  'mini-stats': '迷你统计概览',
  'lab-view': '实验室入口',
  'reaction-library': '反应库',
  'safety-guide': '安全指南',
  'timeline-view': '发现时间线',
  'story-mode': '故事模式',
  'advanced-quiz': '高级测验',
  'achievement-center': '成就中心',
  'progress-dashboard': '进度仪表板'
};

export const ACHIEVEMENT_CATEGORY_META = {
  learning: { label: '学习类', icon: '📚' },
  experiment: { label: '实验类', icon: '🧪' },
  game: { label: '游戏类', icon: '🎮' },
  quiz: { label: '测验类', icon: '📝' }
};

export const ACHIEVEMENT_RARITY_LABELS = {
  common: '普通',
  rare: '稀有',
  legendary: '传说'
};
