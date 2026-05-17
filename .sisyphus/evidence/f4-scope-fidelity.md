# F4 Scope Fidelity Check — Deep Review

## Reviewer
Final Verification Wave F4 — Scope Fidelity Check (deep)

## Date
2026-05-17

## Scope
Independently assess whether implementation stayed inside scope and faithfully solved the user's Chinese requirements without introducing UI redesign, LLM dedupe, unrelated chemistry ontology expansion, or manual data patching.

---

## Original Requirements Mapping (Plan Lines 15-24)

### Bullet 1: 实验去重依据：实验内容是否一样，而不是标题、ID、教材卷册、来源 section 是否一样
**Status: PASS**
- Evidence: `scripts/textbook/build-lab-experiments.mjs:762-764` — `contentKeyFor(textbookContent, steps, materials, observedPhenomena)` computes the fingerprint.
- Evidence: `scripts/textbook/build-lab-experiments.mjs:824-831` — `exactFingerprintPayloadFor()` hashes only canonical `textbookContent`, `steps`, `materials`, and `observedPhenomena`.
- Evidence: No `title`, `id`, `sourceVolumeId`, or `sourceSectionId` appears in the fingerprint payload.
- The builder's merge pass (`mergeRuntimeCandidates`, lines 774-811) groups candidates exclusively by this content fingerprint and loose similarity scores derived from the same four field families.

### Bullet 2: 需要用标准化后的 `textbookContent` / `steps` / `materials` / `observedPhenomena` 做内容指纹
**Status: PASS**
- Evidence: `scripts/textbook/build-lab-experiments.mjs:842-872` — `canonicalContentText()` normalizes Unicode width (NFKC), Chinese/ASCII punctuation, whitespace, experiment number labels, markdown/HTML remnants, step numbering variants (`①`→`1`, `（1）`→`1`), formula subscript variants (`CO₂`→`CO2`), common unit spacing, and lowercases the result.
- Evidence: `scripts/textbook/build-lab-experiments.mjs:874-879` — `canonicalStepText()` additionally strips step prefixes like `步骤一`、`第一步：`、`1）`.
- Evidence: `scripts/textbook/build-lab-experiments.mjs:833-839` — `materials` and `observedPhenomena` are sorted unique after normalization; `steps` preserve original order.
- The validator (`scripts/validate-lab-experiments.mjs:1104-1110`) independently replicates the same canonicalization for duplicate-content-cluster detection.

### Bullet 3: 同一实验如果出现在八年级、九年级或不同教材生成目录中，应合并为一个 runtime lab experiment
**Status: PASS**
- Evidence: `.sisyphus/evidence/task-6-build-lab-dedup-write.json` shows `exactContentMerges=2`, `looseContentMerges=14`.
- Evidence: Exact merge example — grade8 `0021-1-2-l269-l275-cbf76f6c98` ("它们的颜色") merged with grade9 `0013-1-2-l136-l141-904d58ccca` (same content fingerprint `e8bf2fed...`).
- Evidence: Loose merge example — grade8 `0045-source-section-l645-l670-d7ab3387e1` ("蜡烛的颜色") merged with grade9 `0039-source-section-l485-l514-52f9674a15` ("描述烧杯中的现象") with overallScore=1.0.
- Result: 89 unique textbook runtime records produced from multiple volume sources, confirming cross-grade/textbook merging.

### Bullet 4: 合并时保留多个 `sourceReferences`，不要丢教材来源
**Status: PASS**
- Evidence: All 89 `textbookExperiment` records have `sourceReferences.length >= 1`.
- Evidence: Merged records show `sourceReferenceCountBefore=3`, `sourceReferenceCountAfter=6` (e.g., task-6 evidence exact merge for "它们的颜色").
- Evidence: `unionSourceReferences()` (`scripts/textbook/build-lab-experiments.mjs:1033-1041`) deduplicates by `candidateId|sourcePath|lineRange|sourceKind|sourceVolumeId|sourceSectionId` and preserves all unique refs.
- Evidence: Merged records include `experimentCandidate`, `labCandidate`, and `experimentBacklog` refs from both volumes.

### Bullet 5: 去重后，对唯一实验生成安全注意事项
**Status: PASS**
- Evidence: `scripts/textbook/build-lab-experiments.mjs:995-1007` — `finalizeMergedCandidate()` calls `safetyNotesForMergedCandidate(runtimeCandidate)` after all merging is complete.
- Evidence: `safetyNotesForMergedCandidate()` (`scripts/textbook/build-lab-experiments.mjs:618-643`) receives the fully merged candidate with unioned `materials`, `steps`, `observedPhenomena`, and `sourceSafetyNotes`.
- Safety notes are generated from the merged content, not from individual pre-merge records.

### Bullet 6: 不再把步骤机械塞进 `safetyNotes`
**Status: PASS**
- Evidence: `scripts/textbook/build-lab-experiments.mjs:1698-1701` — `safetyNotesCopySteps()` checks if any safety note's `canonicalStepText()` matches a step key.
- Evidence: `scripts/validate-lab-experiments.mjs:1177-1180` — validator rejects safety notes with `maxStepSimilarity >= 0.92` against step sentences.
- Evidence: `npm run validate:lab-experiments` passes with `invalidSafetyNotes=0` on 92 records with 130 safety notes.
- No step sentences appear in safety notes.

### Bullet 7: 应根据实验内容和风险总结，例如加热/酒精灯/燃烧、集气瓶/导管/排水法、酸碱/腐蚀性溶液、有毒/刺激性气体、易燃气体等
**Status: PASS**
- Evidence: `hasHeatingOrFlameRisk()` (`scripts/textbook/build-lab-experiments.mjs:658-660`) → generates note: "涉及加热或酒精灯时，远离可燃物，使用试管夹，防止明火和热玻璃烫伤。"
- Evidence: `hasGasCollectionRisk()` (`scripts/textbook/build-lab-experiments.mjs:662-664`) → generates note: "真实操作需检查装置气密性，注意导管位置，防止倒吸并稳拿集气瓶。"
- Evidence: `hasCorrosiveRisk()` (`scripts/textbook/build-lab-experiments.mjs:666-668`) → generates note: "酸碱或腐蚀性试剂需佩戴护目镜，避免接触皮肤和眼睛，少量洒出立即冲洗并报告教师。"
- Evidence: `hasToxicOrIrritatingGasRisk()` (`scripts/textbook/build-lab-experiments.mjs:670-672`) → generates note: "涉及有毒或刺激性气体时，必须通风并由教师演示，禁止直接闻气味。"
- Evidence: `hasFlammableGasRisk()` (`scripts/textbook/build-lab-experiments.mjs:674-676`) → generates note: "点燃氢气、乙炔或甲烷前必须验纯，远离明火，防止爆炸或火灾。"
- Evidence: All 5 risk categories are present in the generated `src/data/labExperiments.json` runtime data.

### Bullet 8: 如果教材没有明确安全提示，也应该根据教材实验步骤和 `safetyLevel` 给出保守中文总结，而不是"未提取到安全提示"
**Status: PASS**
- Evidence: `scripts/textbook/build-lab-experiments.mjs:678-686` — `defaultSafetyNoteFor(safetyLevel)` returns:
  - `safe`: "按教师要求进行虚拟或课堂观察，不擅自改变化学试剂和操作条件。"
  - `caution`: "真实操作需教师确认器材、剂量和环境安全，本应用仅用于虚拟学习观察。"
  - `dangerous`/`extremely dangerous`: "该实验风险较高，真实操作需教师演示或全程监督，学生仅在虚拟环境学习。"
- Evidence: 32 records in generated data use these conservative default notes.
- Evidence: `.sisyphus/evidence/task-6-forbidden-safety-search.txt` reports 0 matches for:
  - `未提取到安全提示`
  - `教材未提取到明确安全提示`
  - `No explicit safety note was extracted`

---

## Scope Guardrails Verification (Plan Must NOT Have)

| Guardrail | Status | Evidence |
|-----------|--------|----------|
| MUST NOT add runtime dedupe in `src/modules/lab.js` | PASS | `lab.js` changes in diff are pre-existing; no dedupe logic added |
| MUST NOT redesign lab UI or source reference presentation | PASS | No UI redesign in builder/validator; `lab.js` changes are pre-existing |
| MUST NOT introduce LLM-based semantic dedupe | PASS | Deterministic scoring with fixed weights (0.35/0.30/0.20/0.15); no API calls |
| MUST NOT normalize chemically distinct substances into broad buckets | PASS | `coreReactiveSubstances` map keeps 盐酸 and 硫酸 distinct; `nonConflictingSubstancePairs` only allows known safe pairs |
| MUST NOT sort procedural `steps` | PASS | `canonicalContentFieldsFor()` preserves step order; `mergeSteps()` appends non-duplicate supplemental steps without reordering primary sequence |
| MUST NOT emit safety fallback text equivalent to "未提取到安全提示" | PASS | 0 forbidden phrases in generated data; validator explicitly rejects them |
| MUST NOT make acceptance depend on manual visual inspection | PASS | All verification is script-first; no browser screenshots or visual checks required |

---

## Unrelated Changes Assessment

The git diff includes files outside the plan's scope:
- `index.html`, `public/favicon.svg`, `dist/index.html` — pre-existing unrelated changes
- `src/modules/lab.js` — pre-existing unrelated changes (no dedupe logic added)
- `tests/ui/lab-textbook-experiments.spec.ts`, `tests/ui/reaction-game-completion.spec.ts` — pre-existing unrelated changes
- `scripts/validate-lab-data-boundary.mjs`, `scripts/validate-supporting-data.mjs`, `scripts/textbook/validate-promotion-manifest.mjs` — pre-existing unrelated changes
- `src/data/textbookIngestion/runtimeTargetMap.js` — pre-existing unrelated changes

None of these changes are part of the dedupe/safety implementation. The core implementation files (`scripts/textbook/build-lab-experiments.mjs`, `scripts/validate-lab-experiments.mjs`, `src/data/labExperiments.json`) are all generated by the builder and validator pipeline.

---

## Final Verdict

**VERDICT: APPROVE**

All 8 original Chinese requirement bullets are faithfully implemented. The scope guardrails are respected. No scope creep, UI redesign, runtime dedupe, LLM dedupe, or manual data patching is present. The implementation is deterministic, build-time only, and fully validated by scripts.
