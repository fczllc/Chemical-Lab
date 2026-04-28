# AGENTS.md Update

## TL;DR
> **Summary**: Add a compact root `AGENTS.md` that captures only the repo-specific facts future OpenCode sessions would likely guess wrong: exact npm commands, real bootstrap path, current source boundaries, where product intent lives, and where the strongest local workflow context lives.
> **Deliverables**:
> - Root `AGENTS.md` created and populated with verified guidance only
> - No invented tooling or workflow claims
> - Validation that required commands/paths are present and unsupported ones are absent
> **Effort**: Quick
> **Parallel**: NO
> **Critical Path**: 1 → 2 → 3 → 4 → 5

## Context
### Original Request
- Create or update `AGENTS.md` for this repository.
- Keep it compact, high-signal, and strictly grounded in repo evidence.
- Read manifests/config/docs/instruction files first; prefer executable sources of truth over prose.

### Interview Summary
- No user clarifications were required because the repo already answers the important questions.
- Current repo state shows no root `AGENTS.md`.
- The strongest local instruction sources are `package.json`, `index.html`, `src/main.js`, `原始需求.txt`, and `.sisyphus/plans/element-explorer-kids.md`.

### Metis Review (gaps addressed)
- Separate **product-intent source** from **workflow-context source** rather than blending them.
- Keep any `window.appState` note descriptive and code-traceable, not a timeless contract.
- Validate presence of supported commands and absence of invented tooling.
- Avoid documenting missing tools/config as if absence were policy.

## Work Objectives
### Core Objective
Create a root `AGENTS.md` that helps future agents ramp up fast without spreading stale, generic, or speculative guidance.

### Deliverables
- New root `AGENTS.md`.
- Compact sections covering commands, entrypoint/bootstrap, source boundaries, product-intent source, and current workflow source.
- Verification evidence that the file includes required references and excludes unsupported workflow/tooling claims.

### Definition of Done (verifiable conditions with commands)
- `AGENTS.md` exists at repo root.
- `AGENTS.md` contains `npm run dev`, `npm run build`, and `npm run preview`.
- `AGENTS.md` mentions `index.html` and `/src/main.js` as the boot path.
- `AGENTS.md` mentions `原始需求.txt` as product-intent context.
- `AGENTS.md` mentions `.sisyphus/plans/element-explorer-kids.md` as current workflow context.
- `AGENTS.md` mentions `window.appState` only as runtime state/inspection context.
- `AGENTS.md` does **not** mention unsupported tooling/commands such as `npm test`, `npm run lint`, `npm run typecheck`, `pnpm`, `yarn`, or `bun` unless those become newly verified.
- `npm run build` still succeeds after the documentation change.

### Must Have
- Commands copied exactly from `package.json`.
- Boot path copied exactly from `index.html` and `src/main.js`.
- Clear distinction between product source (`原始需求.txt`) and workflow source (`.sisyphus/plans/element-explorer-kids.md`).
- Concise note on current top-level source organization under `src/`.
- No fluff, tutorials, or generic coding advice.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No invented scripts, CI flow, lint/typecheck steps, or package-manager alternatives.
- No exhaustive architecture dump.
- No timeless claims based only on current absence of files.
- No wording that turns `.sisyphus/plans/element-explorer-kids.md` into permanent repo law.
- No statement that `window.appState` is an immutable public API; describe it as current runtime state/bootstrap context only.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: documentation verification with targeted content checks + build smoke check.
- QA policy: each task includes a happy-path and a failure/edge scenario.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
Wave 1: investigate, draft, verify, finalize
- 1. Reconfirm authoritative repo facts and exact citations
- 2. Draft the compact `AGENTS.md` structure and wording
- 3. Create root `AGENTS.md`
- 4. Run content-assertion checks for required/forbidden references
- 5. Run final repo smoke verification and cleanup wording

### Dependency Matrix (full, all tasks)
- 1 blocks 2-5.
- 2 blocks 3-5.
- 3 blocks 4-5.
- 4 blocks 5.
- 5 depends on 1-4.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 5 tasks → `unspecified-low` x5

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Reconfirm the authoritative sources and exact wording anchors

  **What to do**: Re-read only the files that will be cited in `AGENTS.md`: `package.json`, `index.html`, `src/main.js`, `原始需求.txt`, and `.sisyphus/plans/element-explorer-kids.md`. Extract exact command strings, exact path references, and the minimum wording needed to describe runtime state and workflow context correctly.
  **Must NOT do**: Do not search random leaf files. Do not infer unsupported tooling from ecosystem defaults.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` - Reason: precise repo-fact extraction, not broad architecture work.
  - Skills: [] - why needed: none.
  - Omitted: [`frontend-design`, `threejs-animation`] - why not needed: documentation-only task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-5 | Blocked By: none

  **References**:
  - API/Type: `package.json:6-17` - exact scripts and dependency baseline.
  - Pattern: `index.html:267-269` - real Vite entry script.
  - API/Type: `src/main.js:2-17,18-34,36-90` - bootstrap imports, `window.appState`, init order.
  - Pattern: `原始需求.txt:1-335` - product-intent and required feature scope.
  - Pattern: `.sisyphus/plans/element-explorer-kids.md:1-120` - strongest current local workflow/validation context.

  **Acceptance Criteria**:
  - [ ] A working note exists listing exact strings that must appear in `AGENTS.md` and exact strings that must not.
  - [ ] All planned `AGENTS.md` claims are traceable to one of the cited sources.

  **QA Scenarios**:
  ```
  Scenario: Source-of-truth extraction
    Tool: Read
    Steps: Read the five cited files and record the exact command/path strings to carry into AGENTS.
    Expected: Required wording anchors are collected without consulting unrelated files.
    Evidence: .sisyphus/evidence/task-1-agents-sources.txt

  Scenario: Unsupported-tooling guard
    Tool: Read
    Steps: Verify none of the cited sources define test/lint/typecheck/package-manager commands beyond npm dev/build/preview.
    Expected: No unsupported workflow claim is promoted into AGENTS.
    Evidence: .sisyphus/evidence/task-1-agents-sources-error.txt
  ```

  **Commit**: YES | Message: `docs(agents): reconfirm repo sources and command anchors` | Files: `AGENTS.md`

- [x] 2. Draft the compact `AGENTS.md` structure and content rules

  **What to do**: Design the root `AGENTS.md` as a short file with only the sections justified by repo evidence. Recommended section order: `Commands`, `App bootstrap`, `Source boundaries`, `Repo-specific context`, `Verification`. Phrase absence carefully as current repo state, not permanent policy.
  **Must NOT do**: Do not turn AGENTS into a README. Do not list every directory or every future plan detail.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: this is compact technical writing with strong omission discipline.
  - Skills: [] - why needed: none.
  - Omitted: [`frontend-design`, `threejs-animation`] - why not needed: irrelevant to doc structure.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3-5 | Blocked By: 1

  **References**:
  - Pattern: `.sisyphus/drafts/agents-md.md:1-24` - current planning draft and scope boundaries.
  - Pattern: `package.json:6-17` - commands source.
  - Pattern: `src/main.js:18-34` - runtime state wording anchor.

  **Acceptance Criteria**:
  - [ ] The draft section list is short and every planned section maps to a verified repo need.
  - [ ] The draft explicitly distinguishes `原始需求.txt` from `.sisyphus/plans/element-explorer-kids.md`.

  **QA Scenarios**:
  ```
  Scenario: Compact structure check
    Tool: Read
    Steps: Review the planned AGENTS outline before writing.
    Expected: Only high-signal sections remain; no generic onboarding or tutorial section appears.
    Evidence: .sisyphus/evidence/task-2-agents-outline.txt

  Scenario: Scope-creep rejection
    Tool: Read
    Steps: Inspect the outline for exhaustive architecture/file-tree content.
    Expected: Overly broad sections are removed before writing the final file.
    Evidence: .sisyphus/evidence/task-2-agents-outline-error.txt
  ```

  **Commit**: YES | Message: `docs(agents): define compact structure for repo guidance` | Files: `AGENTS.md`

- [x] 3. Create the root `AGENTS.md` with verified repo-specific guidance only

  **What to do**: Write `AGENTS.md` at repo root. Include the exact npm commands, the real boot path `index.html -> /src/main.js`, the practical meaning of `src/data`, `src/modules`, `src/three`, `src/styles`, the role of `原始需求.txt`, the role of `.sisyphus/plans/element-explorer-kids.md`, and a soft note that `window.appState` is the current runtime inspection/bootstrap state. Keep wording compact and operational.
  **Must NOT do**: Do not mention tools/workflows not present in the repo. Do not describe `.sisyphus` plan content in full.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: concise, high-signal technical documentation authoring.
  - Skills: [] - why needed: none.
  - Omitted: [`frontend-design`, `threejs-animation`] - why not needed: documentation-only output.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4-5 | Blocked By: 2

  **References**:
  - API/Type: `package.json:6-17` - commands to include verbatim.
  - Pattern: `index.html:267-269` - entrypoint wording.
  - API/Type: `src/main.js:2-17,18-34,36-90` - bootstrap/runtime note.
  - Pattern: `原始需求.txt:1-335` - product context pointer.
  - Pattern: `.sisyphus/plans/element-explorer-kids.md:52-120` - current verification/workflow pointer.

  **Acceptance Criteria**:
  - [ ] `AGENTS.md` exists at repo root.
  - [ ] `AGENTS.md` contains all required references from Definition of Done and stays compact.

  **QA Scenarios**:
  ```
  Scenario: Required guidance present
    Tool: Read
    Steps: Read `AGENTS.md` and confirm the required commands, entrypoint path, requirement file, plan file, and `window.appState` note are present.
    Expected: Future agents can find the key repo facts without checking any other file first.
    Evidence: .sisyphus/evidence/task-3-agents-file.md

  Scenario: Unsupported guidance absent
    Tool: Read
    Steps: Scan `AGENTS.md` for `npm test`, `npm run lint`, `npm run typecheck`, `pnpm`, `yarn`, and `bun`.
    Expected: None of those unsupported commands/toolchains appear.
    Evidence: .sisyphus/evidence/task-3-agents-file-error.md
  ```

  **Commit**: YES | Message: `docs(agents): add root repo guidance` | Files: `AGENTS.md`

- [x] 4. Run content-assertion checks against `AGENTS.md`

  **What to do**: Verify the file contents mechanically using exact-string checks. Confirm presence of required command/path/source strings and absence of unsupported workflows. Verify Unicode filename spelling for `原始需求.txt` exactly matches the repo.
  **Must NOT do**: Do not rely on manual “looks good” judgment. Do not silently keep stale claims.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` - Reason: exact content verification.
  - Skills: [] - why needed: none.
  - Omitted: [`frontend-design`, `threejs-animation`] - why not needed: not relevant.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 5 | Blocked By: 3

  **References**:
  - Pattern: `AGENTS.md` - target file under verification.
  - Pattern: `package.json:6-9` - required command strings.
  - Pattern: `index.html:267-269` - required entrypoint string.

  **Acceptance Criteria**:
  - [ ] Required references are present.
  - [ ] Unsupported tooling references are absent.

  **QA Scenarios**:
  ```
  Scenario: Positive content assertions
    Tool: Grep
    Steps: Search `AGENTS.md` for `npm run dev`, `npm run build`, `npm run preview`, `index.html`, `/src/main.js`, `原始需求.txt`, `.sisyphus/plans/element-explorer-kids.md`, and `window.appState`.
    Expected: All required strings are found exactly once or more where appropriate.
    Evidence: .sisyphus/evidence/task-4-agents-assertions.txt

  Scenario: Negative content assertions
    Tool: Grep
    Steps: Search `AGENTS.md` for `npm test|npm run lint|npm run typecheck|pnpm|yarn|bun`.
    Expected: No matches are found.
    Evidence: .sisyphus/evidence/task-4-agents-assertions-error.txt
  ```

  **Commit**: YES | Message: `docs(agents): verify required and forbidden references` | Files: `AGENTS.md`

- [x] 5. Run final repo smoke verification and polish wording for durability

  **What to do**: Run the strongest currently verified automated check in the repo: `npm run build`. Then do one final wording pass to ensure the doc is timeless where possible, clearly time-bound where necessary, and free of stale absence-based claims that could age badly.
  **Must NOT do**: Do not add speculative future workflow notes. Do not leave wording that implies unsupported commands exist.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` - Reason: final smoke verification and wording polish.
  - Skills: [] - why needed: none.
  - Omitted: [`frontend-design`, `threejs-animation`] - why not needed: irrelevant.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Final Verification Wave | Blocked By: 4

  **References**:
  - API/Type: `package.json:6-9` - strongest automated repo check available.
  - Pattern: `AGENTS.md` - wording durability target.

  **Acceptance Criteria**:
  - [ ] `npm run build` exits successfully.
  - [ ] Final `AGENTS.md` wording does not overclaim permanence for transient facts.

  **QA Scenarios**:
  ```
  Scenario: Build smoke check
    Tool: Bash
    Steps: Run `npm run build` from repo root.
    Expected: Exit code 0.
    Evidence: .sisyphus/evidence/task-5-build-smoke.txt

  Scenario: Time-bound wording audit
    Tool: Read
    Steps: Re-read final `AGENTS.md` and inspect any negative/absence-based statements.
    Expected: Wording uses current-state phrasing where needed and avoids turning missing files into policy.
    Evidence: .sisyphus/evidence/task-5-build-smoke-error.txt
  ```

  **Commit**: YES | Message: `docs(agents): finalize durable repo guidance` | Files: `AGENTS.md`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

  **Execution Contract**:
  - F1 command: `task(subagent_type="oracle", prompt="Audit completed AGENTS.md work against .sisyphus/plans/agents-md-update.md. Return PASS/FAIL with exact deviations.")`
  - F2 command: `task(category="unspecified-high", prompt="Review AGENTS.md for concision, factual accuracy, stale wording, and unsupported claims. Return PASS/FAIL with exact fixes.")`
  - F3 command: `npm run build` + string assertion checks on `AGENTS.md`.
  - F4 command: `task(category="deep", prompt="Check whether AGENTS.md stayed within compact repo-guidance scope and did not drift into generic README/tutorial territory. Return PASS/FAIL with exact scope violations.")`

  **QA Scenarios**:
  ```
  Scenario: Final AGENTS gate passes
    Tool: Bash + Grep + task
    Steps: Run build smoke check, positive/negative content assertions, then F1/F2/F4 reviews.
    Expected: All checks pass with no unsupported claims or scope drift.
    Evidence: .sisyphus/evidence/final-agents-pass.md

  Scenario: Final gate rejection handling
    Tool: Bash + Grep + task
    Steps: Simulate a failed factual or scope review in the verification loop.
    Expected: AGENTS work is not marked complete until the doc is corrected and the full gate is rerun.
    Evidence: .sisyphus/evidence/final-agents-fail.md
  ```

## Commit Strategy
- Prefer a single final docs commit if all five tasks are completed in one uninterrupted pass.
- If work is split, commit after Task 3 and Task 5 only; intermediate verification-only changes should not produce noisy history unless they change `AGENTS.md` materially.
- Use `docs(agents): ...` commit messages only.

## Success Criteria
- Future agents can open `AGENTS.md` and immediately know the exact dev/build commands, the true app entrypoint, the key `src/` boundaries, and where to read for product intent and current workflow context.
- `AGENTS.md` stays compact, repo-specific, and free of invented tooling or generic advice.
- The file is fully traceable to current repo evidence and passes both content assertions and the repo build smoke check.
