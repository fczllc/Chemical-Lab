# Learnings: lottie-loading-animation

## 2026-05-20 Task: plan-intake
- Plan file: `.sisyphus/plans/lottie-loading-animation.md`.
- Final animation size is `90px × 90px`, not 100px or 160px.
- Lottie asset source is `D:\迅雷下载\d4980_cat360.json`; source path is copy-only and must not appear in app source/tests.
- Runtime asset destination is `public/animations/d4980_cat360.json`, served as `/animations/d4980_cat360.json`.
- Preserve `#global-loader` and `.global-loader.hidden` because existing shell readiness tests depend on them.
- Functional progress UI is out of scope and must remain unchanged.

### Asset Installation: 2026-05-20 23:15:37
- Installed lottie-web as production dependency.
- Copied d4980_cat360.json to public/animations/d4980_cat360.json.
- Validated JSON structure.
- Confirmed no local download paths leaked into project files.


## Task 2 Learnings
- Replaced static spinner with Lottie container .loader-lottie (90px).
- Updated global loader text to 打滚加载中....
- Maintained #global-loader and .global-loader.hidden for test compatibility.

## Task 2 Learnings
- Verified loader markup location: must be before <script type=\
module\> tag in index.html to ensure DOM readiness.
- Manual verification of actual file content (grep) is required over cached/summary outputs.
Verified Lottie loader contract: selectors (global-loader, data-loader-lottie, loader-text), asset existence, style (90x90, 15px radius), readiness (hidden + appState elements), and no console errors for lottie assets. Passed mobile (390x844) and desktop (1440x900) views.
Learned: Avoid fs/path in Playwright tests; use command output capture for evidence.

## Task 3 Learnings
- Added `lottie-web` animation to `#global-loader`.
- Lifecycle management: Lottie animation destroyed via `loaderAnimation.destroy()` when loader hides.
- HMR/Init safety: `loaderAnimation` variable tracked and handled during repeat `init()` calls.
- Accessibility: Honor `prefers-reduced-motion` for loop/autoplay.
- Robustness: Async error listener added, fallback CSS class applied on failure.

No production files were modified in task 5. Tests pass: 3/3.
Correction: Updated no-scope-creep assertion to check document-wide [data-loader-lottie] count and placement.

- HMR/repeated-init guard: Always destroy and nullify existing lottie instances before creating new ones in initialization functions to prevent leaks and HMR issues.
- Nav cleanup: Keep nav structure strictly as baseline and avoid unnecessary text changes when implementing localized features.
