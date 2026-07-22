# S10 — Camera, visibility & map

Full plan/context: see PLAN.md §7's S10 block and
`/Users/simmer/.claude/plans/nifty-petting-moore.md`. Scope: dynamic
zoom (scroll-wheel, cursor-anchored, clamped to fit-whole-map at min),
free pan everywhere (promote Watch AI's drag-pan to normal play, keep
edge-scroll, hero-follow yields to manual input until re-toggled), full
player visibility (audit only — confirmed nothing to remove), shorter
map (`WORLD_WIDTH` 5×→3× viewport), full 6-pairing re-baseline.

## 1. `src/config.js`
- [ ] `WORLD_WIDTH: 7000` → `4200`
- [ ] `AI_HOME_X: 6900` → `4100`, `AI_FLEE_X: 6960` → `4160` (keep
      `// WORLD_WIDTH - N` comments accurate)
- [ ] Add `CAMERA_ZOOM_MIN` (`VIEWPORT_WIDTH / WORLD_WIDTH`) and
      `CAMERA_ZOOM_MAX` (1.4, tunable) near `CAMERA_ZOOM`

## 2. `src/render/camera.js` — zoom becomes runtime state
- [ ] `createCamera()` → `{ x: 0, zoom: CONFIG.CAMERA_ZOOM }`
- [ ] Replace stale module-level `VISIBLE_WORLD_WIDTH` const with
      `visibleWorldWidth(camera)` helper, used at all former call sites
- [ ] Add `camera.followBroken` flag; manual pan/zoom sets it, re-toggling
      hero control (`main.js`'s `toggleHeroControl`) clears it
- [ ] Restructure `updateCamera` so hero-follow only wins when
      `!camera.followBroken`; edge-scroll/drag can apply alongside a
      controlled hero
- [ ] Remove `isWatchAiMatch` gate on drag-pan consumption (bind is
      already global; only consumption was gated)
- [ ] Add `zoomAt(camera, mouseX, factor)`: cursor-anchored zoom, clamps
      zoom to `[CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX]`, re-solves `camera.x`
      to keep the same world point under the cursor, clamps `camera.x`
      to `[0, max(0, WORLD_WIDTH - visibleWorldWidth(camera))]`, sets
      `followBroken = true`

## 3. `src/input/mouse.js`
- [ ] New `bindWheel(canvas, handler)` — `wheel` event, `passive: false`,
      `preventDefault()`, passes `(deltaY, canvasX)`

## 4. `src/main.js`
- [ ] Import `bindWheel`, `zoomAt`
- [ ] Wire `bindWheel(canvas, (deltaY, x) => zoomAt(camera, x, Math.pow(1.1, -deltaY / 100)))`

## 5. `src/render/renderer.js`
- [ ] `ctx.scale(CONFIG.CAMERA_ZOOM, ...)` → `ctx.scale(camera.zoom, ...)`
- [ ] `visibleWorldWidth`/culling predicate → read `camera.zoom`

## 6. Full visibility — docs only
- [ ] `stick-rts-brief.md`: superseded-note on the Battlefield bullet
      pointing at PLAN.md §4 decision 11
- [ ] `stick-rts-brief.md`: same note on the matching acceptance criterion

## 7. Re-baseline & verification
- [ ] `node tools/headless.js` (invariant mode) passes
- [ ] `node tools/headless.js --batch` × 6 pairings (E/E, M/M, H/H, E/M,
      E/H, M/H), pinned seed, results recorded
- [ ] Live browser check: cursor-anchored zoom, full zoom-out shows whole
      map + both statues, zoom-in clamps, drag-pan (normal + Watch AI),
      edge-scroll, hero-follow break/resume via `H` toggle, formation/mine
      layout sanity at new map length, zero console errors
- [ ] PLAN.md §5 baseline table replaced; Status section's next entry
      point moved to S11; map-length value noted

## 8. Commit
- [ ] Commit at stop condition without asking (PLAN.md §6 session-
      discipline fix), `feat:` prefix
