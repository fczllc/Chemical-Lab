const fs = require('fs');

const quizDataFile = 'src/data/quizData.json';
const quizDataRaw = JSON.parse(fs.readFileSync(quizDataFile, 'utf8'));

let modifiedCount = 0;

for (const quiz of quizDataRaw.quizData) {
    if (typeof quiz.explanation === 'string' && quiz.explanation.includes('教材片段说明：')) {
        const parts = quiz.explanation.split('教材片段说明：');
        // If there's content after the prefix, move it to a standalone prefix.
        // For simplicity, replace with a neutral prefix or just the content itself.
        // The requirement says "rewrite only the dependent prefix into standalone wording while preserving the factual content".
        // Example: "教材片段说明：物质的变化和性质..." -> "考点解析：物质的变化和性质..."
        
        let newExplanation = parts[1].trim();
        // Remove trailing '...' if present, which seems common in these auto-generated strings
        if (newExplanation.endsWith('…')) {
            newExplanation = newExplanation.slice(0, -1);
        }
        
        // Use a generic neutral prefix
        quiz.explanation = `考点提示：${newExplanation}`;
        modifiedCount++;
    }
}

fs.writeFileSync(quizDataFile, JSON.stringify(quizDataRaw, null, 2) + '\n');
console.log(`Modified ${modifiedCount} explanations.`);
