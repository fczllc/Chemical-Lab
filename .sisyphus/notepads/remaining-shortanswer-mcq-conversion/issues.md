# Issues - remaining-shortanswer-mcq-conversion

## 2026-05-12T05:30:00Z - Task 6 review content-quality finding
- Post-implementation data-quality review flagged substantial duplicated/vague Grade 8 generated MCQ content now present after the mechanical write: 26 duplicate MCQ groups covering 90/157 records, including repeated prompts such as 根据"想一想"的内容，下列说法正确的是？ and 思考与讨论 patterns.
- Mechanical Task 6 acceptance still passed (converted=157, skipped=0, invalid=0, validator pass, protected hashes match), but repairing this content would require modifying the Task 5 generated JSON/source MCQs, which Task 6 explicitly forbids unless the write fails due a concrete validation defect.
- Recommended follow-up: regenerate or manually repair duplicate/vague Grade 8 MCQs and add a duplicate {question, options, correctIndex} validation guard before accepting generated MCQs.
