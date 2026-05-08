export const textbookAssetTypes = [
  'formula',
  'experiment-flow',
  'apparatus-diagram',
  'table',
  'photo',
  'other'
];

export const textbookAssetExtractionStatuses = [
  'unreviewed',
  'machine-extracted',
  'reviewed',
  'rejected'
];

export const textbookAssetManifest = {
  schemaVersion: 1,
  volumes: [
    {
      volumeId: 'pep-chemistry-g9-2024',
      displayName: '2024版人教版九年级化学上册',
      sourceVolume: '九年级化学上册',
      sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
      imageRoot: 'src/data/textbooks/2024版人教版九年级化学上册/images',
      publisher: '人民教育出版社',
      edition: '2024'
    },
    {
      volumeId: 'pep-chemistry-g9-2024-volume-2',
      displayName: '2024版人教版九年级化学下册',
      sourceVolume: '九年级化学下册',
      sourcePath: 'src/data/textbooks/2024版人教版九年级化学下册/book.md',
      imageRoot: 'src/data/textbooks/2024版人教版九年级化学下册/images',
      publisher: '人民教育出版社',
      edition: '2024'
    },
    {
      volumeId: 'pep-chemistry-g8-2024-54-full',
      displayName: '2024版人教版（五·四学制）八年级化学全一册',
      sourceVolume: '八年级化学全一册（五四学制）',
      sourcePath: 'src/data/textbooks/2024版人教版（五·四学制）八年级化学全一册/book.md',
      imageRoot: 'src/data/textbooks/2024版人教版（五·四学制）八年级化学全一册/images',
      publisher: '人民教育出版社',
      edition: '2024'
    },
    {
      volumeId: 'pep-chemistry-g10-required-1',
      displayName: '2019版人教版高中化学必修第1册',
      sourceVolume: '高中化学必修第一册',
      sourcePath: 'src/data/textbooks/2019版人教版高中化学必修第1册/book.md',
      imageRoot: 'src/data/textbooks/2019版人教版高中化学必修第1册/images',
      publisher: '人民教育出版社',
      edition: '2019'
    },
    {
      volumeId: 'pep-chemistry-g10-required-2',
      displayName: '2019版人教版高中化学必修第2册',
      sourceVolume: '高中化学必修第二册',
      sourcePath: 'src/data/textbooks/2019版人教版高中化学必修第2册/book.md',
      imageRoot: 'src/data/textbooks/2019版人教版高中化学必修第2册/images',
      publisher: '人民教育出版社',
      edition: '2019'
    },
    {
      volumeId: 'pep-chemistry-g11-selective-1',
      displayName: '2019版人教版高中化学-选择性必修1 化学反应原理',
      sourceVolume: '高中化学选择性必修1 化学反应原理',
      sourcePath: 'src/data/textbooks/2019版人教版高中化学-选择性必修1 化学反应原理/book.md',
      imageRoot: 'src/data/textbooks/2019版人教版高中化学-选择性必修1 化学反应原理/images',
      publisher: '人民教育出版社',
      edition: '2019'
    },
    {
      volumeId: 'pep-chemistry-g11-selective-2',
      displayName: '2019版人教版高中化学-选择性必修2 物质结构与性质',
      sourceVolume: '高中化学选择性必修2 物质结构与性质',
      sourcePath: 'src/data/textbooks/2019版人教版高中化学-选择性必修2 物质结构与性质/book.md',
      imageRoot: 'src/data/textbooks/2019版人教版高中化学-选择性必修2 物质结构与性质/images',
      publisher: '人民教育出版社',
      edition: '2019'
    },
    {
      volumeId: 'pep-chemistry-g12-selective-3',
      displayName: '2019版人教版高中化学-选择性必修3 有机化学基础',
      sourceVolume: '高中化学选择性必修3 有机化学基础',
      sourcePath: 'src/data/textbooks/2019版人教版高中化学-选择性必修3 有机化学基础/book.md',
      imageRoot: 'src/data/textbooks/2019版人教版高中化学-选择性必修3 有机化学基础/images',
      publisher: '人民教育出版社',
      edition: '2019'
    }
  ],
  sourceIssues: [
    {
      id: 'pep-g9-2024-up-malformed-image-line-3193',
      volumeId: 'pep-chemistry-g9-2024',
      sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
      lineNumber: 3193,
      issueType: 'malformed-markdown-image',
      rawReference: '![](images/![image]())',
      resolutionStatus: 'rejected',
      reviewerNotes: 'Known source placeholder is malformed and has no resolvable image path; preserve source text but exclude from canonical asset references.'
    },
    {
      id: 'pep-g9-2024-up-malformed-image-line-3483',
      volumeId: 'pep-chemistry-g9-2024',
      sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
      lineNumber: 3483,
      issueType: 'malformed-markdown-image',
      rawReference: '![](images/![image]())',
      resolutionStatus: 'rejected',
      reviewerNotes: 'Known source placeholder is malformed and has no resolvable image path; preserve source text but exclude from canonical asset references.'
    },
    {
      id: 'pep-g9-2024-up-malformed-image-line-4923',
      volumeId: 'pep-chemistry-g9-2024',
      sourcePath: 'src/data/textbooks/2024版人教版九年级化学上册/book.md',
      lineNumber: 4923,
      issueType: 'malformed-markdown-image',
      rawReference: '![](images/![image]())',
      resolutionStatus: 'rejected',
      reviewerNotes: 'Known source placeholder is malformed and has no resolvable image path; preserve source text but exclude from canonical asset references.'
    }
  ],
  assets: [
    {
      id: 'pep-g9-2024-up-figure-1-1-water-boiling',
      volumeId: 'pep-chemistry-g9-2024',
      sourceVolume: '九年级化学上册',
      imagePath: 'images/9d6320cb6adc3289635beecd38799400643aad431bd049a223527216aceb9ad9.jpg',
      nearbyHeading: '第一单元走进化学世界 / 课题1 物质的变化和性质 / 图1-1 水的沸腾',
      assetType: 'apparatus-diagram',
      extractionStatus: 'unreviewed',
      extractedFormulaText: null,
      diagramSummary: null,
      reviewerNotes: 'Source image cataloged for later manual apparatus review; not available for quiz or experiment references until reviewed.',
      sourceNotes: 'book.md:35'
    },
    {
      id: 'pep-g9-2024-up-figure-1-3-naoh-cuso4',
      volumeId: 'pep-chemistry-g9-2024',
      sourceVolume: '九年级化学上册',
      imagePath: 'images/2d0250903f30129852fbeadbc54eadffc4039ab7c667f2b77bce7fa5c9267e04.jpg',
      nearbyHeading: '第一单元走进化学世界 / 课题1 物质的变化和性质 / 图1-3 氢氧化钠溶液与硫酸铜溶液反应',
      assetType: 'experiment-flow',
      extractionStatus: 'machine-extracted',
      extractedFormulaText: null,
      diagramSummary: 'Candidate experiment setup image for sodium hydroxide and copper sulfate solution observation.',
      reviewerNotes: 'Machine summary is a review queue note only and is not canonical experiment procedure text.',
      sourceNotes: 'book.md:59'
    },
    {
      id: 'pep-g9-2024-up-figure-6-3-activated-carbon',
      volumeId: 'pep-chemistry-g9-2024',
      sourceVolume: '九年级化学上册',
      imagePath: 'images/35c6c46031429bf6b8bf53ac793ea52366e08336e3a3a041c52da58519f197bb.jpg',
      nearbyHeading: '第六单元 碳和碳的氧化物 / 图6-3 活性炭的用途',
      assetType: 'photo',
      extractionStatus: 'reviewed',
      extractedFormulaText: null,
      diagramSummary: '活性炭用途配图，可作为已审核的来源说明图片引用。',
      reviewerNotes: 'Reviewed as a source illustration only; no chemical formula was extracted from the image.',
      sourceNotes: 'book.md:3480'
    },
    {
      id: 'pep-g9-2024-up-figure-6-4-c60-formula',
      volumeId: 'pep-chemistry-g9-2024',
      sourceVolume: '九年级化学上册',
      imagePath: 'images/1704a82b448479bac14079aa3eddce6233b24d9281fc59e2377c9e16583ed7b0.jpg',
      nearbyHeading: '第六单元 碳和碳的氧化物 / C60 / 图6-4 C60 的分子结构和足球相似',
      assetType: 'formula',
      extractionStatus: 'reviewed',
      extractedFormulaText: 'C60',
      diagramSummary: 'C60 分子结构示意图；公式文本 C60 已从相邻教材正文与图题人工复核。',
      reviewerNotes: 'Reviewed from adjacent Markdown lines 3494-3504; runtime uses reviewed formulaText, not raw image/OCR output.',
      sourceNotes: 'book.md:3494-3504'
    },
    {
      id: 'pep-g10-required-1-cover-reference',
      volumeId: 'pep-chemistry-g10-required-1',
      sourceVolume: '高中化学必修第一册',
      imagePath: 'images/0236f251747ec7540e397e360eb294a6be2025078d6b989a17044d894b6218be.jpg',
      nearbyHeading: '封面/目录前源图',
      assetType: 'other',
      extractionStatus: 'rejected',
      extractedFormulaText: null,
      diagramSummary: null,
      reviewerNotes: 'Catalogued to prove rejected source assets remain preserved but cannot be referenced as reviewed content.',
      sourceNotes: 'source fixture image listing'
    }
  ]
};

export default textbookAssetManifest;
