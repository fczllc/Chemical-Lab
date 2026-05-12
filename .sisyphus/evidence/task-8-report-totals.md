# Task 8 Report Totals Reconciliation

Date: 2026-05-12

## Runtime count command

```bash
node -e "const fs=require('fs');const q=JSON.parse(fs.readFileSync('src/data/quizData.json','utf8')).quizData;const byVolume=q.reduce((m,r)=>{const k=r.sourceVolumeId||'none';m[k]=(m[k]||0)+1;return m;},{});const summary={total:q.length,generatedFromShortAnswer:q.filter(r=>r.generatedFromShortAnswer===true).length,shortAnswer:q.filter(r=>r.category==='shortAnswer').length,handAuthoredMcq:q.filter(r=>r.category!=='shortAnswer'&&r.generatedFromShortAnswer!==true).length,organicGenerated:q.filter(r=>r.sourceVolumeId==='rj-chemistry-g12-selective-3-organic-2019'&&r.generatedFromShortAnswer===true).length,organicShortAnswer:q.filter(r=>r.sourceVolumeId==='rj-chemistry-g12-selective-3-organic-2019'&&r.category==='shortAnswer').length,remainingShortAnswerByVolume:Object.fromEntries(Object.entries(byVolume).filter(([k])=>q.some(r=>r.sourceVolumeId===k&&r.category==='shortAnswer')).map(([k])=>[k,q.filter(r=>r.sourceVolumeId===k&&r.category==='shortAnswer').length]))};const checks={originalPlaceholders:512,converted:summary.generatedFromShortAnswer,skipped:0,remaining:summary.shortAnswer,reconciles:summary.generatedFromShortAnswer+0+summary.shortAnswer===512,handAuthoredPreserved:summary.handAuthoredMcq===26,totalRecordsStable:summary.total===538};console.log(JSON.stringify({summary,checks},null,2));if(!checks.reconciles||!checks.handAuthoredPreserved||!checks.totalRecordsStable||summary.organicGenerated!==91||summary.organicShortAnswer!==0)process.exit(1);"
```

## Runtime output

```json
{
  "summary": {
    "total": 538,
    "generatedFromShortAnswer": 91,
    "shortAnswer": 421,
    "handAuthoredMcq": 26,
    "organicGenerated": 91,
    "organicShortAnswer": 0,
    "remainingShortAnswerByVolume": {
      "rj-chemistry-grade9-2024-vol1": 155,
      "rj-chemistry-grade8-54-2024-full": 157,
      "rj-chemistry-grade9-2024-vol2": 109
    }
  },
  "checks": {
    "originalPlaceholders": 512,
    "converted": 91,
    "skipped": 0,
    "remaining": 421,
    "reconciles": true,
    "handAuthoredPreserved": true,
    "totalRecordsStable": true
  }
}
```

## Evidence source totals

| Source | Generated | Converted | Skipped | Invalid | Remaining | Hand-authored preserved |
|---|---:|---:|---:|---:|---:|---:|
| `.sisyphus/evidence/mcq-batch-inventory.md` Task 1 baseline | 0 | 0 | 0 | 0 | 512 original placeholders | 26 |
| `.sisyphus/evidence/mcq-conversion-rj-chemistry-g12-selective-3-organic-2019.md` | 91 | 91 | 0 | 0 | not reported there | not reported there |
| `.sisyphus/evidence/mcq-remaining-batches.md` | not reported there | not reported there | not reported there | not reported there | 421 | not reported there |
| `src/data/quizData.json` runtime count | 91 | 91 generated replacements present | 0 policy count | 0 validation count | 421 | 26 |

## Reconciliation

| Check | Formula | Result |
|---|---|---|
| Planned placeholder scope | Task 1 original placeholders | 512 |
| Converted plus skipped plus remaining | `91 + 0 + 421` | 512 |
| Invalid generated entries | Organic conversion report | 0 |
| Organic batch fully converted | `91 generated organic, 0 organic shortAnswer` | pass |
| Hand-authored MCQs preserved | Runtime non-shortAnswer and not generated count | 26 |
| Runtime total stable | Runtime records | 538 |

Result: report totals reconcile against `src/data/quizData.json` and the Task 1 baseline.
