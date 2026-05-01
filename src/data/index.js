// Business-side modules must consume content through this file to keep a single content boundary for future migrations.
import elementsData from './elements.json' with { type: 'json' };
import achievementsDataset from './achievementsData.json' with { type: 'json' };
import quizDataset from './quizData.json' with { type: 'json' };
import learningPathData from './learningPath.json' with { type: 'json' };
import reactionsData from './reactions.json' with { type: 'json' };
import spectralLinesDataset from './spectralLines.json' with { type: 'json' };

export const {
  allowedCategories,
  allowedRarities,
  allowedSafetyLevels,
  elements
} = elementsData;

export const { quizData } = quizDataset;
export const { learningPath } = learningPathData;
export const { reactions } = reactionsData;
export const { achievementsData } = achievementsDataset;
export const { spectralLines } = spectralLinesDataset;
