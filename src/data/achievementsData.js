export const achievementsData = [
  {
    "id": "achievement-first-element",
    "title": "初识元素",
    "description": "第一次学习并点亮一个元素。",
    "condition": "learnedElements >= 1",
    "icon": "spark",
    "rarity": "common",
    "relatedElements": [
      1
    ]
  },
  {
    "id": "achievement-apprentice",
    "title": "元素小学徒",
    "description": "累计学习 10 个元素。",
    "condition": "learnedElements >= 10",
    "icon": "beaker",
    "rarity": "common",
    "relatedElements": [
      1,
      8,
      20
    ]
  },
  {
    "id": "achievement-explorer",
    "title": "周期表探索者",
    "description": "累计学习 30 个元素，开始看懂元素世界。",
    "condition": "learnedElements >= 30",
    "icon": "orbit",
    "rarity": "uncommon",
    "relatedElements": [
      6,
      14,
      26
    ]
  },
  {
    "id": "achievement-collector",
    "title": "元素收藏家",
    "description": "收集 50 个元素，解锁更完整的收藏柜。",
    "condition": "collectedElements >= 50",
    "icon": "cabinet",
    "rarity": "rare",
    "relatedElements": [
      29,
      47,
      79
    ]
  },
  {
    "id": "achievement-all-elements",
    "title": "化学小博士",
    "description": "学习全部 118 个元素，完成一次完整的周期表旅程。",
    "condition": "learnedElements >= 118",
    "icon": "crown",
    "rarity": "very rare",
    "relatedElements": [
      1,
      60,
      118
    ]
  },
  {
    "id": "achievement-first-lab",
    "title": "实验新手",
    "description": "完成 1 个虚拟实验。",
    "condition": "completedExperiments >= 1",
    "icon": "flask",
    "rarity": "common",
    "relatedElements": [
      1,
      8
    ]
  },
  {
    "id": "achievement-lab-master",
    "title": "实验达人",
    "description": "完成全部 5 个虚拟实验。",
    "condition": "completedExperiments >= 5",
    "icon": "shield",
    "rarity": "rare",
    "relatedElements": [
      11,
      17,
      26
    ]
  },
  {
    "id": "achievement-quiz-expert",
    "title": "测验高手",
    "description": "任意一次测验得分率达到 80% 以上。",
    "condition": "quizScorePercentage >= 80",
    "icon": "medal",
    "rarity": "uncommon",
    "relatedElements": [
      3,
      14,
      53
    ]
  },
  {
    "id": "achievement-memory-master",
    "title": "记忆大师",
    "description": "完成一次元素记忆翻牌游戏。",
    "condition": "gameCompleted:memory-game",
    "icon": "cards",
    "rarity": "uncommon",
    "relatedElements": [
      2,
      10,
      18
    ]
  },
  {
    "id": "achievement-reaction-expert",
    "title": "反应专家",
    "description": "完成一次反应配对游戏并全部答对。",
    "condition": "gamePerfect:reaction-match-game",
    "icon": "bolt",
    "rarity": "rare",
    "relatedElements": [
      1,
      11,
      17
    ]
  }
];
