## 2026-05-08 - Task 10 safe validation blocker
- `npm run validate:all:safe` failed in the current worktree because `scripts/validate-supporting-data.mjs` rejects the reviewed/runtime textbook promotion fields that already exist in promoted data (`sourceReferences`, `volumeId`, and related provenance fields).
- The failure is outside the new workflow wiring; `npm run validate:chem-notation` still passes.

## 2026-05-08 - Task 10 blocker resolved
- The reviewed textbook provenance mismatch is resolved by canonicalizing comparison-topic source ranges in promotion output and allowlisting the reviewed provenance fields in supporting/curriculum validators.
- `npm run validate:all:safe` now passes in this worktree.

## 2026-05-08 - Task 11 transient promotion helper issue
- While adding promoted-status writeback, promote-topic.mjs initially referenced a missing elativeProjectPath helper after writing the manifest; adding the same project-relative helper pattern used by other textbook scripts resolved the rerun, and the final promotion command is idempotent with promoted manifest entries.

## 2026-05-08 - Task 11 issue note correction
- Correction for escaped inline code above: while adding promoted-status writeback, `promote-topic.mjs` initially referenced a missing `relativeProjectPath` helper after writing the manifest; adding the shared project-relative helper pattern resolved the rerun.


## 2026-05-08 - Final Verification Wave rejection resolved
- F1/F2 rejection root cause was `buildSurfaceCell()` treating source-matched generated candidates as required surface coverage; fixed by driving coverage from manifest policies and requiring manifest-approved candidate IDs for covered reviewed surfaces.
- F4 dirty-worktree concern is documented in `.sisyphus/evidence/task-final-scope-inventory.txt`; unrelated prior-slice/session files were not reverted.
- Pilot story and lab/reaction are no longer false positives: story is `notApplicable` with current-runtime rationale, and lab/reaction is `deferred` with safety/runtime rationale.
