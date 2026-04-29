# Task 1 Classification: Phone-Only vs Tablet-Safe Code

Timestamp: 2026-04-29T09:59:00Z
Plan: remove-mobile-adaptation
Tablet support floor: `>=768px` CSS width

## Summary

This inventory classifies mobile/responsive candidates as:
- `REMOVE_PHONE_ONLY`: phone/app/narrow viewport adaptation that should be removed.
- `PRESERVE_TABLET_SAFE`: generic desktop/tablet responsive, viewport, resize, accessibility, or pointer behavior to keep.
- `REWRITE_FOR_TABLET_DESKTOP`: behavior that should remain only for desktop/tablet, not for `<768px` phone layouts.

## JS / HTML Runtime and Markup

### index.html
- `index.html:5` viewport meta: `REWRITE_FOR_TABLET_DESKTOP`.
  - Keep standard responsive viewport (`width=device-width, initial-scale=1.0`).
  - Remove phone/app assumptions: `maximum-scale=1.0`, `user-scalable=no`, `viewport-fit=cover`.
- `index.html:60-64` mobile hamburger button and `.hamburger-line` spans: `REMOVE_PHONE_ONLY`.
  - Used by `src/modules/mobile.js:initMobileMenu()`.

### src/main.js
- `src/main.js:26` import `{ initMobile } from './modules/mobile.js'`: `REMOVE_PHONE_ONLY`.
- `src/main.js:85` `initMobile();`: `REMOVE_PHONE_ONLY`.

### src/modules/mobile.js
- Entire file: `REMOVE_PHONE_ONLY` unless a later implementation proves and migrates a generic tablet-safe helper under non-phone naming.
- `src/modules/mobile.js:3-14` initialization state and `initMobile()`: `REMOVE_PHONE_ONLY`.
- `src/modules/mobile.js:17-47` hamburger menu, `.main-nav.open`, `#mobile-menu-toggle`, `window.innerWidth <= 767`: `REMOVE_PHONE_ONLY`.
- `src/modules/mobile.js:50-76` double-tap zoom prevention and `.touch-active` touch feedback: `REMOVE_PHONE_ONLY` as currently implemented because it is tied to phone/mobile module. Tablet pointer support may be preserved elsewhere only under non-phone naming if needed.
- `src/modules/mobile.js:79-118` touch swipe close for phone bottom-sheet detail panel with `window.innerWidth > 767` guards: `REMOVE_PHONE_ONLY`.
- `src/modules/mobile.js:121-145` iOS/Android keyboard layout with `navigator.userAgent` and `.keyboard-open`: `REMOVE_PHONE_ONLY`.
- `src/modules/mobile.js:148-152` `isTouchDevice()`: `REMOVE_PHONE_ONLY` unless migrated under a non-phone tablet-safe helper; no current usage found in the reviewed source.
- `src/modules/mobile.js:155-157` `isMobileViewport()` returning `window.innerWidth <= 767`: `REMOVE_PHONE_ONLY`.

### src/modules/router.js
- Route section switching and detail panel close-on-route-change: `PRESERVE_TABLET_SAFE`.
- `.open`, `.closing`, and `.panel-opening` class toggles are generic panel lifecycle; remove phone bottom-sheet styling in CSS, not this route behavior.

### src/modules/renderTable.js
- Tooltip clamping with `window.innerWidth` / `window.innerHeight`: `PRESERVE_TABLET_SAFE`.
- Detail panel opening/closing hooks: `PRESERVE_TABLET_SAFE`; only CSS bottom-sheet interpretation is phone-only.
- `scrollIntoView` and Escape-close behavior: `PRESERVE_TABLET_SAFE`.

### src/modules/timeline.js
- Timeline tooltip pointer tracking and viewport clamping: `PRESERVE_TABLET_SAFE`.
- `scrollIntoView`, focus, and `IntersectionObserver`: `PRESERVE_TABLET_SAFE`.

### src/modules/detailPanel.js
- `resize` listener and canvas/spectrum resizing: `PRESERVE_TABLET_SAFE`.

### src/three/scene.js
- Renderer/camera viewport dimensions, mouse normalization, debounced resize, lifecycle listeners: `PRESERVE_TABLET_SAFE`.

### src/three/electronModel.js
- Container-based resize and capped `devicePixelRatio`: `PRESERVE_TABLET_SAFE`.

## CSS

### src/styles/responsive.css
- `responsive.css:4-20` `@media (min-width: 1600px)`: `PRESERVE_TABLET_SAFE`.
- `responsive.css:23-27` `@media (min-width: 1366px) and (max-width: 1599px)`: `PRESERVE_TABLET_SAFE`.
- `responsive.css:30-47` `@media (max-width: 1365px)`: `REWRITE_FOR_TABLET_DESKTOP`; preserve for small desktop/tablet, not phone.
- `responsive.css:50-156` `@media (max-width: 1199px)`: `REWRITE_FOR_TABLET_DESKTOP`; preserve tablet behavior, ideally scoped to `min-width:768px` if needed.
- `responsive.css:159-487` `@media (max-width: 767px)`: `REMOVE_PHONE_ONLY`.
  - Includes phone safe-area header, mobile nav drawer, hamburger display, bottom-sheet detail panel, horizontal phone table scrolling, single-column feature layouts, phone modal/popup/canvas sizing.
- `responsive.css:490-587` `@media (max-width: 430px)`: `REMOVE_PHONE_ONLY`.
- `responsive.css:590-606` `@media (max-width: 390px)`: `REMOVE_PHONE_ONLY`.
- `responsive.css:609-733` coarse pointer/touch hover overrides: `REWRITE_FOR_TABLET_DESKTOP` only if tablet touch still needs them; otherwise remove with phone adaptation. Because tablet touch is explicitly preserved, implementation must avoid deleting tablet interaction affordances blindly.
- `responsive.css:736-758` safe-area support: mixed.
  - `737-740` main header left/right safe-area: `PRESERVE_TABLET_SAFE`.
  - `742-747` phone `max-width:767px` safe-area header: `REMOVE_PHONE_ONLY`.
  - `749-751` bottom module safe-area baseline: `PRESERVE_TABLET_SAFE`.
  - `753-757` phone `max-width:767px` bottom-module safe-area: `REMOVE_PHONE_ONLY`.
- `responsive.css:761-787` reduced motion: `PRESERVE_TABLET_SAFE`.
- `responsive.css:790-829` print rules: `PRESERVE_TABLET_SAFE`; remove only stale `.mobile-menu-toggle` selector if markup/styles are removed and implementation wants no dead selectors.

### src/styles/layout.css
- `layout.css:1-3` `--shell-header-offset` using `env(safe-area-inset-top)`: `PRESERVE_TABLET_SAFE`.
- `layout.css:6-22` fixed header with safe-area: `PRESERVE_TABLET_SAFE`.
- `layout.css:46-49` baseline `.main-nav`: `PRESERVE_TABLET_SAFE`.
- `layout.css:51-64` hidden `.mobile-menu-toggle`: `REMOVE_PHONE_ONLY`.
- `layout.css:66-87` `.hamburger-line` and active transforms: `REMOVE_PHONE_ONLY`.
- Baseline shell, app layout, periodic-table wrapper, detail panel docked side panel, bottom modules, modal, achievement popup: `PRESERVE_TABLET_SAFE`.

### src/styles/base.css
- `base.css:71-77` `touch-action: manipulation` and tap highlight removal: `PRESERVE_TABLET_SAFE` for tablet touch unless implementation proves it is harmful.
- `base.css:86-88` `100vh` / `100dvh` and `overflow-x:hidden`: `PRESERVE_TABLET_SAFE`.
- `base.css:215-219` `.touch-active`: `REMOVE_PHONE_ONLY` if mobile module is removed and no tablet-safe replacement uses it.
- `base.css:221-228` `body.keyboard-open`: `REMOVE_PHONE_ONLY`.

### src/styles/periodic-table.css
- Base periodic grid, element cell, wrapper, legend, periodic list: `PRESERVE_TABLET_SAFE`.
- Phone horizontal scroll/min-width behavior is in `responsive.css`, not this baseline file.

### src/styles/panel.css
- Base element hero, electron canvas, panel buttons: `PRESERVE_TABLET_SAFE`.
- Phone bottom-sheet/canvas/button shrink behavior is in `responsive.css`, not this baseline file.

### src/styles/achievements.css
- `achievements.css:427-445` `@media (max-width: 900px)`: `REWRITE_FOR_TABLET_DESKTOP`; preserve for `768px-900px` tablet range if needed.
- `achievements.css:447-466` `@media (max-width: 640px)`: `REMOVE_PHONE_ONLY`.

### src/styles/games.css
- `games.css:519-535` `@media (max-width: 900px)`: `REWRITE_FOR_TABLET_DESKTOP`; preserve for `768px-900px` tablet range if needed.

### src/styles/lab.css
- `lab.css:256-274` `@media (max-width: 900px)`: `REWRITE_FOR_TABLET_DESKTOP`; preserve for `768px-900px` tablet range if needed.

## Tests

### playwright.config.ts
- Single Chromium project using Desktop Chrome: `PRESERVE_TABLET_SAFE`.
- No mobile device project to remove.

### tests/ui/mobile-shell.spec.ts
- Entire file: `REMOVE_PHONE_ONLY` or replace with a renamed tablet/desktop shell spec.
- `390x844`, `430x932`, `#mobile-menu-toggle`, mobile shell overflow, mobile table wrapper scroll expectations: `REMOVE_PHONE_ONLY`.

### tests/shell/home-shell.spec.ts
- Desktop shell `1440x900`: `PRESERVE_TABLET_SAFE`.
- Tablet `1024x768`: `PRESERVE_TABLET_SAFE`.
- `390x844` hamburger/bottom-sheet/table-scroll tests: `REMOVE_PHONE_ONLY`.
- Viewport meta test expecting `maximum-scale=1.0` and `user-scalable=no`: `REWRITE_FOR_TABLET_DESKTOP` because viewport meta should no longer encode phone zoom-lock assumptions.

### tests/ui/periodic-table-controls.spec.ts
- Desktop controls coverage: `PRESERVE_TABLET_SAFE`.
- `390x844` mobile overflow/table-wrapper scroll regression and any helper used only by it: `REMOVE_PHONE_ONLY` or rewrite to tablet/desktop behavior.

### tests/ui/route-shells.spec.ts, visual-polish-regression.spec.ts, background-policy.spec.ts, content-data-smoke.spec.ts
- Existing desktop route/shell/content coverage: `PRESERVE_TABLET_SAFE`.
- Add or adjust tests to include `1366x768`, `1024x768`, and `768x1024` desktop/tablet coverage.

## Required Removal / Rewrite Targets Explicitly Confirmed

- `max-width: 767px`: `REMOVE_PHONE_ONLY`.
- `max-width: 430px`: `REMOVE_PHONE_ONLY`.
- `max-width: 390px`: `REMOVE_PHONE_ONLY`.
- Phone hamburger markup/JS/styles: `REMOVE_PHONE_ONLY`.
- Phone bottom-sheet detail panel CSS and swipe close: `REMOVE_PHONE_ONLY`.
- Phone keyboard resize behavior and `.keyboard-open`: `REMOVE_PHONE_ONLY`.
- Desktop/tablet breakpoints `1600`, `1366-1599`, `1365`, `1199`: preserve or rewrite for `>=768px` only.

## Current Workspace Note

`git diff --stat -- ':!node_modules'` shows a large pre-existing working-tree diff unrelated to Task 1. Task 1 itself is an inventory/evidence task and must not be treated as permission to modify application source.
