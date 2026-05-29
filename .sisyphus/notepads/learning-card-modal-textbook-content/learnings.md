Learnings: Generator implemented for learning segments. Verification passed for deterministic records. Exported via src/data/index.js.
## Learner Content Linkage Validation
- Added alidateLearningSegmentTextbookContentLinkage to scripts/validate-supporting-data.mjs.
- Implemented three self-check modes: 'missing-learning-segment-textbook-content', 'empty-learning-segment-textbook-content', 'invalid-learning-segment-textbook-content-block'.

## Formula Rendering in Modals
- Verified that deterministic segments with formula markup (e.g., in knowledge-topic-0008-1-l94-l129-9ca678fac3) correctly render .katex elements.
- Playwright tests can assert formula presence by querying for .katex child nodes within the modal body.

## Modal Contract Assertions
- Replaced broad toContain assertions with strict two-section header verification (['章节来源', '教材内容']).
- Forbidden metadata/internal labels are strictly excluded.
- Content segment knowledge-topic-0004-source-section-l63-l74-105f9964c8 is used as the deterministic source for the new modal contract assertions.

## Test Stability
- The intermittent timeouts in waitForShellReady appear environmental under heavy load when running the full suite. Tests pass consistently in isolation.

## XSS Safety
- Confirmed safety by asserting against injected metadata nodes; no rendering hooks were needed for the textbook segment itself as the content is structured and escaped.
