const fs = require('fs');

const baseline = JSON.parse(fs.readFileSync('.sisyphus/evidence/quiz-clarity-baseline.json', 'utf8'));
const quizDataFile = 'src/data/quizData.json';
const quizDataRaw = JSON.parse(fs.readFileSync(quizDataFile, 'utf8'));

const blockerIds = new Set(baseline.blockingFindings.map(f => f.id));
const beforeTotal = quizDataRaw.quizData.length;
const filtered = quizDataRaw.quizData.filter(q => !blockerIds.has(q.id));
const afterTotal = filtered.length;
const removedCount = beforeTotal - afterTotal;

console.log(`Original count: ${beforeTotal}`);
console.log(`Filtered count: ${afterTotal}`);
console.log(`Removed count: ${removedCount}`);

if (removedCount !== blockerIds.size) {
    console.error(`Warning: Expected to remove ${blockerIds.size} but removed ${removedCount}`);
}

quizDataRaw.quizData = filtered;
fs.writeFileSync(quizDataFile, JSON.stringify(quizDataRaw, null, 2) + '\n');

const removalEvidence = {
    checkedAt: new Date().toISOString(),
    beforeTotal,
    afterTotal,
    removedCount,
    removedIds: Array.from(blockerIds)
};

fs.writeFileSync('.sisyphus/evidence/quiz-clarity-removal.json', JSON.stringify(removalEvidence, null, 2) + '\n');
