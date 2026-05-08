export const ELEMENT_CATEGORY_META = {
  'alkali metal': {
    label: '碱金属',
    tableColor: '#ff2a6d',
    overviewColor: 'var(--alkali)'
  },
  'alkaline earth metal': {
    label: '碱土金属',
    tableColor: '#ff7e00',
    overviewColor: 'var(--alkaline)'
  },
  'transition metal': {
    label: '过渡金属',
    tableColor: '#ffd700',
    overviewColor: 'var(--transition)'
  },
  'post-transition metal': {
    label: '后过渡金属',
    tableColor: '#7ee787',
    overviewColor: 'var(--post-transition)'
  },
  metalloid: {
    label: '类金属',
    tableColor: '#00f0ff',
    overviewColor: 'var(--metalloid)'
  },
  'reactive nonmetal': {
    label: '非金属',
    tableColor: '#4dabf7',
    overviewColor: 'var(--nonmetal)'
  },
  'noble gas': {
    label: '稀有气体',
    tableColor: '#b829ff',
    overviewColor: 'var(--noble)'
  },
  halogen: {
    label: '卤素',
    tableColor: '#ff6b9d',
    overviewColor: 'var(--halogen)'
  },
  lanthanide: {
    label: '镧系',
    tableColor: '#ff44aa',
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
    description: '在 60 秒内把元素卡片拖到正确的周期表位置，答对加分，答错扣分。',
    curriculumTags: ['intro-element-symbols'],
    difficulty: '入门',
    challengeMetadata: {
      challengeId: 'periodic-docking-intro',
      curriculumTags: ['intro-element-symbols'],
      challengeGoals: [
        { id: 'place-elements', label: '把元素卡片归位到正确周期与族', target: 8, metric: 'correctPlacements' },
        { id: 'limit-errors', label: '减少错误放置次数', target: 3, metric: 'maximumWrongPlacements' }
      ],
      scoringThresholds: { s: 140, a: 90, b: 40 },
      unlockMetadata: { stageIds: ['stage-2'], requiresTags: ['intro-element-symbols'], minimumLearnedElements: 10 }
    }
  },
  memory: {
    title: '元素记忆翻牌',
    kicker: 'MEMORY MATRIX',
    description: '翻出元素符号与中文名的正确配对，用更少步数和时间拿到更高评级。',
    curriculumTags: ['intro-element-symbols'],
    difficulty: '入门',
    challengeMetadata: {
      challengeId: 'symbol-name-memory',
      curriculumTags: ['intro-element-symbols'],
      challengeGoals: [
        { id: 'match-pairs', label: '配对元素符号与中文名', target: 8, metric: 'matchedPairs' },
        { id: 'efficient-moves', label: '用更少步数完成翻牌', target: 16, metric: 'targetMoves' }
      ],
      scoringThresholds: { s: 130, a: 90, b: 50 },
      unlockMetadata: { stageIds: ['stage-1'], requiresTags: ['intro-element-symbols'], minimumLearnedElements: 0 }
    }
  },
  reaction: {
    title: '反应配对',
    kicker: 'REACTION LINK',
    description: '把反应物和正确生成物连接起来，建立化学反应的直觉。',
    curriculumTags: ['g10-redox-valence-change'],
    difficulty: '高中基础',
    challengeMetadata: {
      challengeId: 'reaction-product-link',
      curriculumTags: ['g10-redox-valence-change'],
      challengeGoals: [
        { id: 'match-products', label: '识别反应物对应的生成物', target: 5, metric: 'matchedReactions' },
        { id: 'finish-before-timeout', label: '在倒计时内完成全部配对', target: 75, metric: 'timeLimitSeconds' }
      ],
      scoringThresholds: { s: 45, a: 30, b: 10 },
      unlockMetadata: { stageIds: ['stage-4'], requiresTags: ['g10-redox-valence-change'], minimumLearnedElements: 80 }
    }
  },
  collector: {
    title: '元素收集',
    kicker: 'COLLECTION VAULT',
    description: '查看已学习元素的收集墙、完成率和阶段奖励，了解下一步学习目标。',
    curriculumTags: ['intro-element-symbols'],
    difficulty: '入门',
    challengeMetadata: {
      challengeId: 'challenge-c60-carbon-topic',
      curriculumTags: ['g9-carbon-c60-allotrope'],
      challengeGoals: [
        { id: 'complete-c60-quiz-set', label: '完成 C60 / 碳单质主题测验记录', target: 3, metric: 'c60QuestionIds' },
        { id: 'recognize-c60-source', label: '识别 C60 的碳单质与足球状结构来源', target: 1, metric: 'reviewedC60Topic' }
      ],
      scoringThresholds: { s: 90, a: 60, b: 30 },
      unlockMetadata: { stageIds: ['stage-3'], requiresTags: ['g9-carbon-c60-allotrope'], minimumLearnedElements: 50 },
      sourceReviewStatus: 'reviewed',
      sourceReferences: [
        {
          volumeId: 'pep-chemistry-g9-2024',
          sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
          lineRange: '3494-3504',
          assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
          note: 'C60 游戏挑战仅作为 collector 元数据，依据九年级上册第3494-3504行与图6-4已审核来源。'
        }
      ]
    },
    comparisonChallengeMetadata: {
        challengeId: 'challenge-carbon-allotropes-comparison',
        curriculumTags: ['g9-carbon-allotropes-comparison'],
        challengeGoals: [
          {
            id: 'complete-comparison-quiz-set',
            label: '完成碳单质比较主题测验记录',
            target: 3,
            metric: 'comparisonQuestionIds'
          },
          {
            id: 'recognize-graphite-conductivity',
            label: '识别石墨导电性与用途之间的关系',
            target: 1,
            metric: 'reviewedGraphiteProperty'
          }
        ],
        scoringThresholds: {
          s: 90,
          a: 60,
          b: 30
        },
        unlockMetadata: {
          stageIds: ['stage-3'],
          requiresTags: ['intro-element-symbols', 'g9-carbon-allotropes-comparison'],
          minimumLearnedElements: 50
        },
        sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
        sourceReviewStatus: 'reviewed',
        sourceReferences: [
          {
            sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
            volumeId: 'pep-chemistry-g9-2024',
            sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
            sourceHeading: '练习与应用',
            lineRange: '3432-3462',
            sourceHash: 'sha256:05fc966e6fa296ce1f240a2ea03f6556dd610dcc5563fce19fe42f5e9acba901',
            candidateId: 'game-0295-source-section-l3610-l3664-d45787521d',
            reviewedBy: 'textbook-reviewer',
            reviewedAt: '2026-05-08T00:00:00.000Z',
            assetReferences: [
              {
                assetId: '0295-source-section-l3610-l3664-d45787521d-asset-01',
                sourceLineNumber: 3651
              },
              {
                assetId: '0295-source-section-l3610-l3664-d45787521d-asset-02',
                sourceLineNumber: 3654
              }
            ],
            note: 'Reviewed promotion manifest entry promote-g9-carbon-allotropes-comparison-game'
          },
          {
            sourceVolumeId: 'rj-chemistry-grade9-2024-vol1',
            volumeId: 'pep-chemistry-g9-2024',
            sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
            sourceHeading: '练习与应用',
            lineRange: '3494-3504',
            sourceHash: 'sha256:05fc966e6fa296ce1f240a2ea03f6556dd610dcc5563fce19fe42f5e9acba901',
            candidateId: 'game-0295-source-section-l3610-l3664-d45787521d',
            reviewedBy: 'textbook-reviewer',
            reviewedAt: '2026-05-08T00:00:00.000Z',
            assetReferences: [
              {
                assetId: '0295-source-section-l3610-l3664-d45787521d-asset-01',
                sourceLineNumber: 3651
              },
              {
                assetId: '0295-source-section-l3610-l3664-d45787521d-asset-02',
                sourceLineNumber: 3654
              }
            ],
            assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
            note: 'Reviewed promotion manifest entry promote-g9-carbon-allotropes-comparison-game supplemental C60 evidence'
          }
        ]
      }
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
