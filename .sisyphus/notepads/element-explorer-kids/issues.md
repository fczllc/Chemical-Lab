
## 2026-05-11 experiment-formula-rendering final QA
- Existing evidence task-5-browser-token-sweep.txt reports PASS for raw formula tokens across lab/detail/steps/safety/visual/locked/simulation/result surfaces, excluding KaTeX annotations.
- Live Playwright replay could start Vite at 127.0.0.1:5185, but #/lab rendered nav-lab active while visible content remained periodic table/timeline content; targeted experiment surfaces were not independently reachable in this replay.

