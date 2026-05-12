# Learnings - remaining-shortanswer-mcq-conversion

## 2026-05-12T01:06:24.814Z - Task 1 preflight snapshot
- Live runtime quizData.json matched expected counts: total=538, organicGenerated=91, handAuthored=26, shortAnswer=421.
- Remaining batch counts matched expected: grade8=157, grade9vol1=155, grade9vol2=109.
- Protected MCQ snapshot contains 117 entries, no shortAnswer records, SHA-256 hashes from stable sorted-key canonical JSON. Discrepancy: none.

## 2026-05-12: JSON Migration/Validation Best Practices Research

### Research Scope
Investigated safe JSON data migration/validation workflows in Node.js relevant to:
- scripts/convert-short-answer-mcqs.mjs
- scripts/validate-quiz-data.mjs
- Evidence generation for plan: remaining-shortanswer-mcq-conversion

### Verified Patterns (Node.js built-ins only)

#### 1. Atomic File Writes
- **Pattern**: Write to temp file in same directory, then rename over target
- **Why**: fs.writeFile is NOT atomic; crashes leave truncated/empty files
- **Implementation**:
  `js
  const tmp = targetPath + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
  await fs.promises.writeFile(tmp, json, 'utf8');
  await fs.promises.rename(tmp, targetPath);
  `
- **Windows safety**: Retry rename on EPERM/EACCES/EBUSY with exponential backoff
- **Evidence**: Tested successfully on Node v24.15.0

#### 2. Content Hash Snapshots
- **Pattern**: SHA256 hash of JSON.stringify(data) for integrity verification
- **Implementation**:
  `js
  const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  `
- **Use cases**:
  - Detect if data changed before writing (idempotency)
  - Verify file integrity after read
  - Include in evidence files for audit trail

#### 3. Dry-Run Mode
- **Pattern**: Validate + compute hash + log report, skip actual file write
- **Benefits**:
  - Preview changes without side effects
  - Catch validation errors before modifying data
  - Generate evidence for review
- **Implementation**: Check --dry-run flag before fs.rename

#### 4. JSON Schema-like Validation (No Dependencies)
- **Pattern**: Pure JavaScript validation function
- **Implementation**:
  `js
  function validateQuizItem(item) {
    const errors = [];
    if (!item.question || typeof item.question !== 'string') errors.push('missing question');
    if (!Array.isArray(item.options) || item.options.length < 2) errors.push('needs >=2 options');
    if (typeof item.correctIndex !== 'number') errors.push('missing correctIndex');
    if (item.correctIndex < 0 || item.correctIndex >= item.options.length) errors.push('correctIndex out of bounds');
    return errors;
  }
  `
- **Why no dependencies**: Plan forbids new packages unless unavoidable

#### 5. Reconciliation (Preserve Existing Records)
- **Pattern**: Map-based merge that preserves existing items not in generated set
- **Implementation**:
  `js
  const existingMap = new Map(existing.map(e => [e.id, e]));
  const generatedMap = new Map(generated.map(g => [g.id, g]));
  const preserved = existing.filter(e => !generatedMap.has(e.id));
  const merged = [...preserved, ...generated];
  `
- **Benefits**: Existing 117 MCQs preserved, only new/updated items changed

#### 6. Additional Guardrails
- **Duplicate ID detection**: Use Set to find duplicate IDs before write
- **Cross-reference validation**: Verify element references exist in canonical dataset
- **Schema version check**: Reject data with unexpected schemaVersion
- **Backup creation**: Copy existing file with timestamp before overwrite

#### 7. Evidence Generation
- **Pattern**: Structured JSON with migration metadata
- **Fields**:
  - task: task name
  - plan: plan name
  - timestamp: ISO 8601
  - mode: 'dry-run' | 'live'
  - recordCount: number of items
  - contentHash: SHA256 hash
  - validationPassed: boolean
  - atomicWrite: boolean

### External References
- TheLinuxCode (2026-02-08): Atomic writes, validation, versioning patterns
- NodeBook (2026-02-22): fs.watch, atomic writes, OS-level details
- OpenClaw PR #40508: Real-world atomic write fix for JSON corruption
- npm/write-file-atomic: Reference implementation (but we use built-ins)

### Recommendations for This Plan
1. Use atomic write (tmp + rename) in convert script
2. Always run dry-run first, review evidence, then run with --write
3. Validate generated MCQs before any write
4. Compute and log content hash for audit trail
5. Preserve existing 117 MCQs via reconciliation
6. Add duplicate ID and cross-reference validation
7. Generate evidence file in .sisyphus/evidence/
8. No new dependencies needed - all patterns use Node.js built-ins

## 2026-05-12T03:31:52.563Z - Task 2 grade8 generated MCQ JSON
- Generated 157 MCQ entries for rj-chemistry-grade8-54-2024-full; skipped=0; SHA-256=b10e5a556cfaaee2c4d8c3c63985711fa2697a8470971f8d029ce07cc226dcd9.
- Accounting evidence confirmed all 157 runtime shortAnswer IDs are represented once with no outside IDs.
- Validation evidence confirmed converter-facing field rules: 4 unique options, valid correctIndex/difficulty, preserved provenance, no answer fields, and no placeholder strings.

## 2026-05-12T03:30:50.914Z - Task 3 grade9 volume1 MCQ JSON
- Generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json with 155 generated MCQ entries and 0 skipped entries for rj-chemistry-grade9-2024-vol1.
- Coverage evidence task-3-grade9-vol1-generated-json-check.txt passed: 155 runtime shortAnswer IDs accounted, 0 missing, 0 outside, 0 duplicates; generated JSON SHA-256 512e1402f42fff6a9a3272add4c926f376e498484c9cc893deda0e07a4ac9ba2.
- Validation evidence task-3-grade9-vol1-generated-json-validation.txt passed: 155 MCQs validated, 0 errors; provenance fields copied from runtime records and placeholder grep found no forbidden strings.

## 2026-05-12T03:35:49.331Z - Task 4 grade9 volume2 MCQ JSON
- Generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol2.json with 109 MCQs and 0 skipped entries for rj-chemistry-grade9-2024-vol2.
- Coverage evidence passed: 109 runtime target IDs, 109 inventory IDs, 109 accounted entries, 0 missing, 0 outside, 0 duplicates.
- Validation evidence passed: converter-style field/provenance checks found 0 validation errors; forbidden placeholder grep found no matches in generated/evidence outputs.

## 2026-05-12T04:30:45.443Z - Task 2 grade8 provenance fix
- Initial generation produced 157 MCQs with fabricated provenance fields (sourceReviewStatus=promoted, sourceReferences reconstructed from inventory).
- Converter dry-run failed with 157 invalid entries because provenance did not match runtime quizData.json exactly.
- Fix: Node script copied exact runtime provenance fields (sourceVolumeId, sourceReviewStatus, sourceReferences, textbookAssetReferences, formulaText, notationReviewStatus) from src/data/quizData.json to each generated MCQ.
- After fix: converter dry-run passes with converted=157, invalid=0, skipped=0.
- Coverage and validation evidence files updated and pass.

## 2026-05-12T05:08:17Z - Task 5 dry-run and invalid-input safety
- All three remaining converter dry-runs passed before any write: grade8 converted=157 invalid=0 skipped=0, grade9 vol1 converted=155 invalid=0 skipped=0, grade9 vol2 converted=109 invalid=0 skipped=0.
- Runtime `src/data/quizData.json` SHA-256 stayed `0a272abbf7d77724c0760e6d90bd6d485013ed2e4cda3f23f8cf067997d3cd5e` before and after each dry-run.
- Malformed generated JSON run used `--dry-run` only, exited 1 with invalid=1, reported explicit validation errors for `task-5-invalid-runtime-id`, and left the same runtime hash unchanged.
- Evidence files: `.sisyphus/evidence/task-5-all-batches-dry-run.txt` and `.sisyphus/evidence/task-5-invalid-generated-safety.txt`.

## 2026-05-12T05:15:51Z - Task 6 grade8 write
- Wrote 157 generated MCQs for rj-chemistry-grade8-54-2024-full to src/data/quizData.json with converter write mode; converted=157, skipped=0, invalid=0, missingGenerated=0.
- Post-write validation passed; Grade 8 remaining shortAnswer placeholders=0, grade9 volume1/volume2 shortAnswer counts stayed 155/109, and exactly 157 changed IDs were all Grade 8 targets.
- Protected Task 1 MCQ snapshot remained intact: 117 checked, 0 missing, 0 hash mismatches.

## 2026-05-12T05:21:40Z - Task 7 grade9 volume1 write
- Wrote 155 generated MCQs for rj-chemistry-grade9-2024-vol1 to src/data/quizData.json with converter write mode; converted=155, skipped=0, invalid=0, missingGenerated=0.
- Post-write validation passed; grade9 volume1 remaining shortAnswer placeholders=0, grade8 generated MCQ count stayed 157, and grade9 volume2 shortAnswer count stayed 109.
- Mutation boundary and preservation checks passed: exactly 155 changed IDs, all Grade 9 Vol 1 targets; protected Task 1 MCQ snapshot remained intact with 117 checked, 0 missing, 0 hash mismatches.


## 2026-05-12T05:30:05.922Z - Task 8 grade9 volume2 write
- Wrote 109 generated MCQs for rj-chemistry-grade9-2024-vol2 to src/data/quizData.json with converter write mode; converted=109, skipped=0, invalid=0, missingGenerated=0.
- Post-write validation passed; grade9 volume2 remaining shortAnswer placeholders=0, grade8 generated MCQ count stayed 157, and grade9 volume1 generated MCQ count stayed 155.
- Mutation boundary and preservation checks passed: exactly 109 changed IDs, all Grade 9 Vol 2 targets; protected Task 1 MCQ snapshot remained intact with 117 checked, 0 missing, 0 hash mismatches.

## 2026-05-12T05:45:00Z - Task 6 Grade 8 quality repair
- Repaired 98 Grade 8 generated/runtime MCQ prompts: all 90 exact-duplicate records plus 8 additional vague template matches. IDs, four options, correctIndex, explanations, difficulty/category, and exact provenance fields were preserved.
- Duplicate quality evidence passed: duplicateGroups=0, duplicateRecords=0, forbiddenPlaceholderMatches=0, vaguePromptMatches=0, runtimeGeneratedParityMismatches=0.
- Canonical validation and build passed after repair; runtime counts stayed total=538, grade8 generated=157/shortAnswer=0, grade9 vol1 generated=155/shortAnswer=0, grade9 vol2 generated=109/shortAnswer=0, protected snapshot mismatches=0.
- Converter write cannot be rerun after the original Grade 8 conversion because selected runtime IDs are no longer shortAnswer placeholders; repair-sync report/evidence documents the equivalent ID-matched synchronization.
