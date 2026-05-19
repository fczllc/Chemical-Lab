

## 2026-05-19 follow-up: align story media attribution value with label

### Why
- User reported that `.story-media-source-value` was indented relative to `.story-media-source-label` ("图片来源：").
- The value had `padding-left: 12px`, causing a visible offset.

### What changed
- `src/styles/games.css`:
  - Changed `.story-media-source-value { padding-left: 12px; }` to `padding-left: 0;`.
  - This makes the source value start at the same left edge as the label above it.

### Verification
- `npm run build` passed (exit 0).


## 2026-05-19 follow-up: force-scale story media card images to container ratio

### Why
- User reported that story/element media card images should fill the container's full width and height according to the container ratio, instead of being letterboxed with empty space.

### What changed
- src/styles/games.css:
  - .story-media-frame img: changed object-fit: contain to object-fit: fill.
  - .story-media-frame img: changed object-position: left top to object-position: center.
  - This forces the image to stretch and fill the 1:1 aspect-ratio container completely, eliminating letterboxing.

### Scope discipline
- .story-media-modal-preview img left untouched (object-fit: contain) so modal preview behavior remains unchanged.

### Verification
- 
pm run build passed (exit 0).

