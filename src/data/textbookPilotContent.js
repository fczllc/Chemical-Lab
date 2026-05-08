export const textbookPilotContent = [
  {
    id: 'pep-g9-2024-up-carbon-diamond-graphite-comparison',
    kind: 'source-inventory',
    sourceReviewStatus: 'reviewed',
    sourceReferences: [
      {
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3432-3462',
        note: '金刚石、石墨的碳单质性质比较核心来源，用于已审核 comparison 证据。'
      },
      {
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3494-3504',
        assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
        note: 'C60 的分子结构和足球相似仅作为已审核补充来源，不创建新的资产 ID。'
      }
    ]
  },
  {
    id: 'challenge-carbon-allotropes-comparison',
    kind: 'challenge',
    sourceReviewStatus: 'reviewed',
    sourceReferences: [
      {
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3432-3462',
        note: '碳单质比较挑战依托金刚石和石墨性质比较的已审核教材来源。'
      },
      {
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3494-3504',
        assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
        note: 'C60 结构补充来源仅用于比较主题挑战的已审核背景。'
      }
    ]
  },
  {
    id: 'draft-exp-carbon-allotropes-observation',
    kind: 'draft-experiment',
    runtimeStatus: 'draft-only',
    note: '课堂观察草稿：引导学生比较金刚石、石墨和 C60 都属于碳单质，同时记录金刚石和石墨因碳原子排列不同而性质有明显差异；C60 仅作分子结构与足球相似的模型讨论。',
    sourceReviewStatus: 'reviewed',
    sourceReferences: [
      {
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3432-3462',
        note: '金刚石和石墨性质比较、碳单质共同点与结构差异来自已审核教材区间。'
      },
      {
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3494-3504',
        assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
        note: 'C60 模型讨论仅引用已审核图6-4 公式资产和相邻正文。'
      }
    ]
  },
  {
    id: 'challenge-c60-carbon-topic',
    kind: 'challenge',
    sourceReviewStatus: 'reviewed',
    sourceReferences: [
      {
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3494-3504',
        assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
        note: 'C60 主题挑战依托第六单元正文与图6-4 的已审核来源。'
      }
    ]
  },
  {
    id: 'draft-exp-c60-model-observation',
    kind: 'draft-experiment',
    runtimeStatus: 'draft-only',
    sourceReviewStatus: 'reviewed',
    sourceReferences: [
      {
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3494-3504',
        assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
        note: '模型观察草稿仅作课堂讨论记录，不进入 runtime reactions。'
      }
    ]
  },
  {
    id: 'quiz-c60-carbon-allotrope',
    kind: 'quiz',
    sourceReviewStatus: 'reviewed',
    sourceReferences: [
      {
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3494-3504',
        assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
        note: 'C60 作为碳单质的文字说明出自同一已审核教材段落。'
      }
    ]
  },
  {
    id: 'quiz-c60-reviewed-formula-application',
    kind: 'quiz',
    sourceReviewStatus: 'reviewed',
    sourceReferences: [
      {
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3494-3504',
        assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
        reviewedTextField: 'formulaText',
        note: 'C60 公式与图6-4 相邻正文共同支撑公式型题目。'
      }
    ]
  },
  {
    id: 'quiz-c60-structure-source',
    kind: 'quiz',
    sourceReviewStatus: 'reviewed',
    sourceReferences: [
      {
        volumeId: 'pep-chemistry-g9-2024',
        sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
        lineRange: '3494-3504',
        assetId: 'pep-g9-2024-up-figure-6-4-c60-formula',
        note: 'C60 分子结构和足球相似的教材描述与图6-4 相互印证。'
      }
    ]
  }
];

export default textbookPilotContent;
