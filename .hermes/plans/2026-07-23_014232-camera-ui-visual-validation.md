# Stick RTS Camera, HUD, and Visual Polish Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Fix zoom-dependent visual composition, make the stats/build UI reliably scannable with no overflow, and add a restrained readability-focused visual pass.

**Architecture:** Keep all work render-only. Camera world transforms remain in `src/render/camera.js` and `src/render/renderer.js`; parallax must be visually consistent with those transforms but remains simulation-independent. HUD/build controls remain screen-space in `src/render/ui.js`. Do not alter simulation, AI, balance, or map length.

**Tech Stack:** Vanilla JavaScript ES modules, Canvas 2D, Node headless invariants, browser screenshot verification.

---

## Context and priority

The owner reports that composition does not remain visually consistent while zooming, that the game needs more color/detail, and that the stats UI can overflow and is not easy to understand. These reports supersede the ordering in `PLAN.md`.

The current head commit (`8806c50`) already added an initial S11 bottom-bar/HUD redesign and a parallax zoom scaling change. Treat both as unverified candidate fixes, not completed work. `node tools/headless.js` passes before work begins.

## Non-negotiable constraints

- `src/sim/` remains untouched.
- UI is screen-space and must not inherit `camera.zoom`.
- All new tunables live in `src/config.js`.
- No assets, frameworks, build steps, or random visual behavior.
- Work on an isolated branch/worktree; commit only verified checkpoints.

## Task 1: Establish reproducible visual evidence

**Objective:** Capture the current failure modes before changing code.

**Files:**
- Create: `artifacts/visual-baseline/` (untracked evidence directory or external run artifacts)
- Read: `src/main.js`, `src/input/mouse.js`, `src/render/camera.js`, `src/render/renderer.js`, `src/render/parallax.js`, `src/render/ui.js`

**Steps:**
1. Serve the app on a fresh port to avoid the documented browser disk-cache problem.
2. Capture screenshots at `CAMERA_ZOOM_MIN`, starting zoom, and `CAMERA_ZOOM_MAX` for the same world/camera anchor.
3. Capture the HUD at its worst case: 80 units, an active production item, a long heterogeneous queue, hero cooldown, and statue warning.
4. Record a short evidence table: zoom, camera `x`, world feature locations, parallax behavior, UI bounds, overlaps, clipping, and console errors.
5. Preserve the baseline images before edits.

**Acceptance:** Evidence identifies concrete visual defects or verifies that a reported symptom is reproduced under a defined state.

## Task 2: Fix composition at zoom boundaries

**Objective:** Make world, parallax, ground, and retained screen-space UI read as one coherent composition at min/default/max zoom.

**Files:**
- Modify only as necessary: `src/render/parallax.js`, `src/render/renderer.js`, `src/render/camera.js`, `src/config.js`
- Test: browser visual evidence; `tools/headless.js` remains unchanged

**Steps:**
1. Use the Task 1 evidence to determine whether the fault is parallax scale, parallax origin/rate, world-to-screen composition, ground/footer overlap, or camera anchoring.
2. Keep camera coordinates in world pixels and preserve the cursor-anchor invariant:
   `worldX = camera.x + mouseX / camera.zoom` before and after `zoomAt()`.
3. If parallax changes, make its scale/origin intentional relative to the world transform and ensure tiling covers the whole canvas at every zoom.
4. Verify no transform leaks into UI rendering after `ctx.restore()`.
5. Capture the same three zoom states and compare them with baseline.

**Acceptance:** No gaps in parallax, no obvious foreground/background scale contradiction, no footer/world bleed-through, cursor anchor has zero drift, pan clamps remain correct, and UI pixel bounds stay unchanged across zoom levels.

## Task 3: Complete the HUD and build UI stress pass

**Objective:** Make the player’s current resources, capacity, command, army composition, warning state, build state, and queue understandable without overflow or ambiguity.

**Files:**
- Modify: `src/render/ui.js`, `src/render/renderer.js`, `src/config.js`
- Read: `src/render/stickFigure.js`, `src/sim/systems/economy.js`, `src/sim/systems/supply.js`

**Steps:**
1. Render the real worst-case state from Task 1, not mocked static text.
2. Inspect the latest glyph/chip design for actual clipping, unreadable labels, icon ambiguity, incorrect alignment, and collision with the legend.
3. Establish clear priority: economy/cap and critical warning first; command/army composition second; production/build controls third; instructions lowest contrast.
4. Bound every dynamic string or count. Use deliberate wrapping, truncation, chip overflow indication, or layout reflow—never accidental canvas clipping.
5. Verify all seven build buttons in enabled, disabled-reason, active-progress, and queued states. Verify Watch AI hides the build bar.
6. Verify min/default/max zoom render the exact same screen-space layout.

**Acceptance:** At 80 units plus full queue, hero cooldown, and statue warning, nothing overlaps, clips, or becomes illegible; every visible indicator has a clear purpose; no console errors.

## Task 4: Add restrained visual-detail and color hierarchy

**Objective:** Improve visual clarity and game feel without obscuring combat state or turning the renderer into an asset pipeline.

**Files:**
- Modify as evidence requires: `src/render/parallax.js`, `src/render/stickFigure.js`, `src/render/structures.js`, `src/render/renderer.js`, `src/config.js`

**Steps:**
1. Define a limited palette: low-contrast environment, team-distinct units/structures, one primary interaction accent, and a high-salience danger color.
2. Add only details that improve readability: ground/terrain separation, depth layers, structure silhouettes, selection/controlled-hero emphasis, and clearer health/status contrast where needed.
3. Avoid random decoration, new assets, or color overload.
4. Compare before/after screenshots at default and zoomed-out views.

**Acceptance:** Units, bases, threats, and UI controls are faster to distinguish; environmental detail adds depth without competing with gameplay; contrast stays adequate at min zoom.

## Task 5: Verify, review, and checkpoint

**Objective:** Produce a trustworthy morning report and a safe code checkpoint.

**Steps:**
1. Run `node tools/headless.js`.
2. Serve on a fresh port and perform browser verification: zoom anchor, min/default/max screenshots, max HUD stress state, build-state matrix, Watch AI layout, and console error check.
3. Inspect `git diff` for render-only scope and config-centralization.
4. Commit a verified checkpoint with a concise message.
5. Report: files changed, screenshots/evidence paths, commands/results, remaining visual concerns, commit hash, and whether further human art direction is needed.

**Acceptance:** Headless invariants pass, browser checks have evidence, no console errors, working tree is clean after the commit, and the report distinguishes verified improvements from subjective next-step options.

## Risks and decisions

- The latest S11 commit may have fixed some overflow structurally but not aesthetically; do not rewrite it without visual evidence.
- Browser cache can hide source updates. Always use a fresh server port for final verification.
- Backgrounded browser rAF is unreliable; use `window.__forceTicks(n)` for deterministic scenario setup.
- The owner’s camera concern may be an artistic composition issue rather than a math bug; evaluate screenshots rather than assuming the existing zoom-anchor test is sufficient.
