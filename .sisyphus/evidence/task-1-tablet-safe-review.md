Task 1 Tablet-Safe Review
Timestamp: 2026-04-29T09:59:00Z

Reviewed requirement: viewport-sensitive code must not be deleted solely because it uses viewport, resize, touch, pointer, `dvh`, or `innerWidth`.

PRESERVE_TABLET_SAFE findings:

- `src/modules/router.js`
  - Route section switching and detail panel close-on-route-change are generic app behavior.
  - `.open`, `.closing`, and `.panel-opening` class toggles remain valid for desktop/tablet panel lifecycle.

- `src/modules/renderTable.js`
  - Tooltip clamping with `window.innerWidth` / `window.innerHeight` is generic viewport boundary logic.
  - Detail panel open/close and Escape key handling are desktop/tablet-safe.

- `src/modules/timeline.js`
  - Tooltip pointer tracking/clamping, `scrollIntoView`, focus, and `IntersectionObserver` behavior are generic and should remain.

- `src/modules/detailPanel.js`
  - Resize listener and canvas/spectrum resizing are required for tablet/desktop panel rendering.

- `src/three/scene.js`
  - Renderer/camera sizing, mouse normalization, debounced resize, and lifecycle listeners are generic viewport behavior and should remain.

- `src/three/electronModel.js`
  - Container-based canvas resize and capped `devicePixelRatio` are generic rendering behavior and should remain.

- `src/styles/base.css:86-88`
  - `100vh`/`100dvh` and `overflow-x:hidden` are not phone-only by themselves and should remain unless implementation finds a specific conflict.

- `src/styles/base.css:71-77`
  - `touch-action: manipulation` and tap highlight removal may support touch tablets. Preserve unless implementation proves they are only tied to removed phone behavior.

- `src/styles/responsive.css:4-156`
  - Desktop/tablet breakpoints are required preserve/rewrite targets: `1600`, `1366-1599`, `1365`, and `1199`.

- `src/styles/responsive.css:761-829`
  - Reduced motion and print media are not phone-specific and should remain, aside from optional cleanup of dead `.mobile-menu-toggle` print selector.

Conclusion:
- Deletion should target phone runtime/module/markup/tests and CSS below the `768px` tablet floor.
- Generic viewport resize/clamping and tablet-responsive behavior must remain active.
