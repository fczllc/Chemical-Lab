// Business-side modules must consume content through this file to keep a single content boundary for future migrations.
import elementsData from './elements.json' with { type: 'json' };
import achievementsDataset from './achievementsData.json' with { type: 'json' };
import quizDataset from './quizData.json' with { type: 'json' };
import learningPathData from './learningPath.json' with { type: 'json' };
import curriculumDataset from './curriculum.js';
import textbookAssetManifest, {
  textbookAssetExtractionStatuses,
  textbookAssetTypes
} from './textbookAssets.js';
import reactionsData from './reactions.json' with { type: 'json' };
import spectralLinesDataset from './spectralLines.json' with { type: 'json' };
import storyMediaData from './storyMedia/media.json' with { type: 'json' };

// Stable element-level shape for UI consumers
export const storyMedia = storyMediaData.elements.map((el) => ({
  atomicNumber: el.atomicNumber,
  symbol: el.symbol,
  discoveryMedia: el.discoveryImage,
  specimenMedia: el.specimenImage
}));

export const storyMediaByAtomicNumber = new Map(storyMedia.map((record) => [record.atomicNumber, record]));

export const {
  allowedCategories,
  allowedRarities,
  allowedSafetyLevels,
  elements
} = elementsData;

export const { quizData } = quizDataset;
export const { learningPath } = learningPathData;
export const { curriculumTags } = curriculumDataset;
export { textbookAssetExtractionStatuses, textbookAssetManifest, textbookAssetTypes };
export const { reactions } = reactionsData;
export const { achievementsData } = achievementsDataset;
export const { spectralLines } = spectralLinesDataset;

