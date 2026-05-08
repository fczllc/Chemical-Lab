# Draft: Textbook Data Storage Architecture

## Requirements (confirmed)
- User asks: "前面我们已经完成了两个开发计划的测试。现在根据这前面的任务完成情况，判断一下，如果要把当前所有教材全产处理完，当前使用js保存数据的技术路线是否可以胜任，是否需要数据库？"
- User clarified: "教材" means all textbooks under `src/data/textbooks`.
- User intent: integrate textbook content into games and lab to help master textbook knowledge.
- User scope includes later implementing textbook experiments in the lab and making animations.
- User preferred workflow: automatic content processing, developer submits code, validation scripts review.

## Technical Decisions
- Recommendation direction: keep JS/JSON/static file route for current full-textbook processing and curated runtime content; do not introduce a database now.
- Add generated/intermediate content pipeline and stronger validators before considering a database.

## Research Findings
- Oracle: static JS/JSON file-backed content pipeline is preferred unless multi-user state, admin editing, live updates without redeploy, backend-shaped search, or Git collaboration bottlenecks become real requirements.
- Data-scale mapper: repo has 8 textbook volumes under `src/data/textbooks`, about 38.5k Markdown lines, 3,344 textbook images, about 58.5 MB of source assets.
- Current runtime gateway is `src/data/index.js`; content validators already exist and `validate:all:safe` chains validators/import audit/build.
- Main technical bottleneck is not storage technology; it is eager client bundling through `src/data/index.js`, especially large JSON imports such as `spectralLines.json`.
- Raw textbooks/images should remain source assets, not runtime imports; only reviewed curated slices should become runtime data.

## Open Questions
- None blocking for architecture recommendation.

## Scope Boundaries
- INCLUDE: architecture judgment, migration triggers, recommendation based on completed slice workflow.
- EXCLUDE: implementing database, changing storage route, modifying runtime code.
