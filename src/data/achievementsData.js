export const achievementsData = [
  {
    "id": "achievement-first-element",
    "category": "learning",
    "title": "初识元素",
    "description": "第一次学习一个元素，正式踏入元素探索之旅。",
    "unlockText": "学习第 1 个元素",
    "icon": "sparkles",
    "rarity": "common",
    "condition": {
      "type": "learnedElements",
      "count": 1
    },
    "curriculumTags": [
      "intro-element-symbols"
    ],
    "difficulty": "入门"
  },
  {
    "id": "achievement-learning-apprentice",
    "category": "learning",
    "title": "初级探索者",
    "description": "累计学习 10 个元素，已经能认出许多常见元素。",
    "unlockText": "学习 10 个元素",
    "icon": "compass",
    "rarity": "common",
    "condition": {
      "type": "learnedElements",
      "count": 10
    },
    "curriculumTags": [
      "intro-element-symbols"
    ],
    "difficulty": "入门"
  },
  {
    "id": "achievement-element-collector",
    "category": "learning",
    "title": "元素收集家",
    "description": "累计学习 50 个元素，收藏墙开始变得丰富起来。",
    "unlockText": "学习 50 个元素",
    "icon": "folder-open",
    "rarity": "rare",
    "condition": {
      "type": "learnedElements",
      "count": 50
    },
    "curriculumTags": [
      "intro-element-symbols"
    ],
    "difficulty": "初中"
  },
  {
    "id": "achievement-element-master",
    "category": "learning",
    "title": "元素大师",
    "description": "学习全部 118 个元素，完成完整的周期表探索。",
    "unlockText": "学习全部 118 个元素",
    "icon": "crown",
    "rarity": "legendary",
    "condition": {
      "type": "learnedElements",
      "count": 118
    },
    "curriculumTags": [
      "intro-element-symbols"
    ],
    "difficulty": "高中基础"
  },
  {
    "id": "achievement-first-experiment",
    "category": "experiment",
    "title": "实验室新手",
    "description": "完成第一个虚拟实验，开始理解元素反应。",
    "unlockText": "完成 1 个实验",
    "icon": "flask-conical",
    "rarity": "common",
    "condition": {
      "type": "completedExperiments",
      "count": 1
    },
    "curriculumTags": [
      "g10-redox-valence-change"
    ],
    "difficulty": "入门"
  },
  {
    "id": "achievement-lab-safety",
    "category": "experiment",
    "title": "实验观察员",
    "description": "完成 5 个虚拟实验，已经能安全、细致地记录实验现象。",
    "unlockText": "完成 5 个实验",
    "icon": "shield",
    "rarity": "rare",
    "condition": {
      "type": "completedExperiments",
      "count": 5
    },
    "curriculumTags": [
      "g10-redox-valence-change"
    ],
    "difficulty": "初中"
  },
  {
    "id": "achievement-experiment-assistant",
    "category": "experiment",
    "title": "实验小助手",
    "description": "完成 20 个实验，能主动比较不同实验中的现象与规律。",
    "unlockText": "完成 20 个实验",
    "icon": "microscope",
    "rarity": "rare",
    "condition": {
      "type": "completedExperiments",
      "count": 20
    },
    "curriculumTags": [
      "g10-redox-valence-change"
    ],
    "difficulty": "初中"
  },
  {
    "id": "achievement-experiment-researcher",
    "category": "experiment",
    "title": "实验研究员",
    "description": "完成 50 个实验，已经能持续追踪实验问题并整理结论。",
    "unlockText": "完成 50 个实验",
    "icon": "clipboard-check",
    "rarity": "rare",
    "condition": {
      "type": "completedExperiments",
      "count": 50
    },
    "curriculumTags": [
      "g10-redox-valence-change"
    ],
    "difficulty": "高中基础"
  },
  {
    "id": "achievement-experiment-master",
    "category": "experiment",
    "title": "实验大师",
    "description": "完成全部 92 个实验，建立完整的实验探索记录。",
    "unlockText": "完成全部 92 个实验",
    "icon": "trophy",
    "rarity": "legendary",
    "condition": {
      "type": "completedExperiments",
      "count": 92
    },
    "curriculumTags": [
      "g10-redox-valence-change"
    ],
    "difficulty": "高中基础"
  },
  {
    "id": "achievement-first-quiz",
    "category": "quiz",
    "title": "求知者",
    "description": "完成第一次测验，开始用答题巩固自己的知识。",
    "unlockText": "完成 1 次测验",
    "icon": "book-open",
    "rarity": "common",
    "condition": {
      "type": "quizAttempts",
      "count": 1
    },
    "curriculumTags": [
      "intro-element-symbols"
    ],
    "difficulty": "入门"
  },
  {
    "id": "achievement-perfect-quiz",
    "category": "quiz",
    "title": "满分学霸",
    "description": "任意一次测验获得满分，知识掌握非常扎实。",
    "unlockText": "任意一次测验获得满分",
    "icon": "trophy",
    "rarity": "rare",
    "condition": {
      "type": "quizPerfectScore"
    },
    "curriculumTags": [
      "intro-element-symbols"
    ],
    "difficulty": "初中"
  },
  {
    "id": "achievement-first-game",
    "category": "game",
    "title": "游戏新手",
    "description": "完成第一次学习游戏，用游戏巩固化学知识。",
    "unlockText": "完成 1 次任意游戏",
    "icon": "gamepad-2",
    "rarity": "common",
    "condition": {
      "type": "gamePlays",
      "count": 1
    },
    "curriculumTags": [
      "intro-element-symbols"
    ],
    "difficulty": "入门"
  },
  {
    "id": "achievement-memory-master",
    "category": "game",
    "title": "记忆大师",
    "description": "在元素记忆翻牌中拿到高分，说明你已经建立了牢固的元素记忆。",
    "unlockText": "元素记忆翻牌最高分达到 120",
    "icon": "brain",
    "rarity": "rare",
    "condition": {
      "type": "gameScore",
      "gameKey": "game-memory",
      "count": 120
    },
    "curriculumTags": [
      "intro-element-symbols"
    ],
    "difficulty": "初中"
  },
  {
    "id": "achievement-reaction-expert",
    "category": "game",
    "title": "反应专家",
    "description": "在反应配对中稳定高分，已经能快速识别典型反应结果。",
    "unlockText": "反应配对最高分达到 50",
    "icon": "zap",
    "rarity": "legendary",
    "condition": {
      "type": "gameScore",
      "gameKey": "game-reaction",
      "count": 50
    },
    "curriculumTags": [
      "g10-redox-valence-change"
    ],
    "difficulty": "高中基础"
  }
];
