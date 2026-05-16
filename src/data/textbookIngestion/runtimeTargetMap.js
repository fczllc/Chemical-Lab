export const TEXTBOOK_RUNTIME_TARGET_MAP = {
  schemaVersion: 1,
  preservationRules: [
    'Preserve hand-authored runtime records by default.',
    'Only upsert textbook-derived records within the textbook namespace.',
    'Never overwrite runtime records whose ids do not start with the textbook namespace.',
    'Apply deterministic ordering by targetRuntimeFile, textbookId, topicId, entryId, then candidateId.'
  ],
  namespaceRule: {
    prefix: 'textbook',
    format: 'textbook-{textbookId}-{topicId}-{entryId}',
    requiredParts: ['textbookId', 'topicId', 'entryId']
  },
  supportedDestinations: [
    {
      contentType: 'quiz',
      candidateType: 'quizCandidate',
      targetRuntimeFile: 'src/data/quizData.json',
      targetField: 'quizData'
    },
    {
      contentType: 'gameChallenge',
      candidateType: 'gameChallengeCandidate',
      targetRuntimeFile: 'src/data/contentMeta.js',
      targetField: 'comparisonChallengeMetadata'
    },
    {
      contentType: 'achievement',
      candidateType: 'achievementCandidate',
      targetRuntimeFile: 'src/data/achievementsData.json',
      targetField: 'achievementsData'
    },
    {
      contentType: 'learningPath',
      candidateType: 'learningPathCandidate',
      targetRuntimeFile: 'src/data/learningPath.json',
      targetField: 'learningPath.stages'
    },
    {
      contentType: 'labExperiment',
      candidateType: 'experimentCandidate',
      targetRuntimeFile: 'src/data/labExperiments.json',
      targetField: 'labExperiments'
    }
  ],
  unsupportedArtifactTypes: [
    {
      candidateType: 'curriculumTopic',
      classification: 'not-promotable: unsupported target'
    },
    {
      candidateType: 'sourceSection',
      classification: 'not-promotable: unsupported target'
    },
    {
      candidateType: 'storyCandidate',
      classification: 'not-promotable: unsupported target'
    },
    {
      candidateType: 'labCandidate',
      classification: 'not-promotable: unsupported target'
    },
    {
      candidateType: 'reviewedSourceReference',
      classification: 'not-promotable: provenance-only'
    }
  ]
};
