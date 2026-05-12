# MCQ Batch Inventory and Source-Context Map

Generated: 2026-05-11T17:54:46.621Z

## Summary

- Runtime quiz records in `src/data/quizData.json`: 538
- Runtime `shortAnswer` records mapped: 512
- Existing hand-authored non-shortAnswer MCQs: 26
- Status counts: ready 512, missing-source 0, duplicate 0, unsupported 0
- First batch: `rj-chemistry-g12-selective-3-organic-2019` has 91 records; status counts {"ready":91,"missing-source":0,"duplicate":0,"unsupported":0}

## Readiness by batch

| Batch | Readiness group | Runtime shortAnswer | Quiz candidates | Ready | Missing source | Duplicate | Unsupported | Reviewed quiz manifest entries | Ready for MCQ generation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rj-chemistry-g12-selective-3-organic-2019 | grade12-selective-3-organic | 91 | 91 | 91 | 0 | 0 | 0 | 91 | true |
| rj-chemistry-grade8-54-2024-full | grade8-full-textbook | 157 | 157 | 157 | 0 | 0 | 0 | 157 | true |
| rj-chemistry-grade9-2024-vol1 | grade9-volume-1 | 155 | 155 | 155 | 0 | 0 | 0 | 155 | true |
| rj-chemistry-grade9-2024-vol2 | grade9-volume-2 | 109 | 109 | 109 | 0 | 0 | 0 | 109 | true |

## Remaining records grouped by grade/textbook readiness

| Group | Batches | Runtime shortAnswer | Ready | Missing source | Duplicate | Unsupported | Ready for MCQ generation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| grade12-selective-3-organic | rj-chemistry-g12-selective-3-organic-2019 | 91 | 91 | 0 | 0 | 0 | true |
| grade8-full-textbook | rj-chemistry-grade8-54-2024-full | 157 | 157 | 0 | 0 | 0 | true |
| grade9-volume-1 | rj-chemistry-grade9-2024-vol1 | 155 | 155 | 0 | 0 | 0 | true |
| grade9-volume-2 | rj-chemistry-grade9-2024-vol2 | 109 | 109 | 0 | 0 | 0 | true |

## First organic batch findings

The first target batch `rj-chemistry-g12-selective-3-organic-2019` contains 91 runtime `shortAnswer` records. Each record has a unique runtime id and candidate id, resolves from runtime `sourceReferences[0].candidateId` to `quiz-candidates.json`, resolves candidate `sourceSectionId` to local source text in `draft-inventory.json` / `source-inventory.json`, and matches a quiz promotion manifest entry. All 91 records are `ready` for MCQ generation source-context purposes. The candidate answers remain placeholder text (`待复核：依据来源片段补全标准答案。`) and were not treated as usable MCQ answers.

## Risks and notes

- All four generated batches currently resolve to local source text and are marked `ready` in this source-context inventory.
- The inventory validates source availability only; it does not validate pedagogical quality, answer correctness, or generate MCQ options.
- Runtime `shortAnswer` placeholders contain one-item `options` arrays and `correctIndex: 0`, so existing hand-authored MCQ count is defined as non-`shortAnswer` records, not all records with options.
- Reviewed promotion manifests are present for all four batches and were used where available to cross-check `runtimeId` ↔ `candidateId`.

## Commands/checks used

Runtime count check:

```powershell
node -e "const fs=require('fs');const q=JSON.parse(fs.readFileSync('src/data/quizData.json','utf8')).quizData;console.log(JSON.stringify({total:q.length,shortAnswer:q.filter(x=>x.category==='shortAnswer').length,existingHandAuthoredMcq:q.filter(x=>x.category!=='shortAnswer').length},null,2));"
```

Inventory validation check:

```powershell
node -e "const fs=require('fs');const inv=JSON.parse(fs.readFileSync('.sisyphus/evidence/mcq-batch-inventory.json','utf8'));const statuses=new Set(['ready','missing-source','duplicate','unsupported']);const bad=inv.records.filter(r=>!statuses.has(r.status));const first=inv.records.filter(r=>r.batchId==='rj-chemistry-g12-selective-3-organic-2019');console.log(JSON.stringify({records:inv.records.length,badStatuses:bad.length,summary:inv.summary,firstBatch:{count:first.length,statusCounts:inv.summary.firstBatchStatusCounts,unmapped:first.filter(r=>r.status==='ready'?!r.source?.sourceTextAvailable:!r.nonReadyReason).length}},null,2));if(inv.summary.shortAnswerRuntimeRecords!==512||inv.summary.existingHandAuthoredMcqRecords!==26||first.length!==91||bad.length)process.exit(1);"
```

The machine-readable inventory is `.sisyphus/evidence/mcq-batch-inventory.json`; this markdown file is the human summary.
