import fs from 'fs';
const s = fs.readFileSync('src/modules/lab.js', 'utf8');
if (/filterGrade/.test(s)) process.exit(1);
if (!/data-lab-filter="textbook"/.test(s)) process.exit(2);
if (!/全部教材/.test(s)) process.exit(3);
if (/全部年级/.test(s)) process.exit(4);
console.log('PASS textbook filter static');
