# PLAN.md — Stick RTS

Cross-session context carrier. **In-progress state and dirty-tree
warnings live in Status — never in `HISTORY.md`**, which holds completed
session narratives only and is read only when debugging needs history.
Briefs: `stick-rts-brief.md` (v1), `stick-rts-v2-updates.md` (v2).

## Status

**S1–S10 complete and committed** at `4bb9589`. Engine, units/combat,
economy, heroes, AI (3 difficulties), formations, production queue,
menus, Watch AI, seeded PRNG, dynamic camera/zoom, full visibility,
3× map (`WORLD_WIDTH` 4200).

**Next and only active session: S11 — HUD & build-UI redesign** (§5).
Render-only.

**Parked, do not start:** owner playtest of map length, and S12's AI
re-tune. §6 has the standing balance finding they depend on. Neither is
in scope for S11; don't fold pieces of them in.

---

## 1. Stack

Vanilla JS (ES modules) + Canvas 2D. No framework, bundler, or runtime
deps. No sprite sheets — stick figures are procedural line segments, so
the renderer can draw miniature glyphs for UI without assets. Zero build
step; serve with `python3 -m http.server`.

---

## 2. Architecture

- `main.js`: rAF render loop + fixed-timestep accumulator calling
  `sim.tick(dt)` at 60Hz.
- **`/src/sim` has zero browser/DOM references** (hard constraint — it's
  what lets `tools/headless.js` import the same modules under Node).
  **`/src/render` only reads sim state, never mutates it.**
- Entities are plain objects in flat arrays on one `world` object; one
  shared unit shape with a `kind` discriminator. Behavior lives in
  per-tick system functions, not entity methods.
- **Every tunable lives in `config.js`.** No magic numbers in system or
  render code.
- Zoom is render-time scale only; the sim stays in unscaled world px.
  UI must be drawn in screen space, unaffected by `camera.zoom`.
- Only randomness is `sim/rng.js` (AI decision-interval jitter).
  `Math.random` is banned in `src/`.

### Files S11 touches

```
src/render/ui.js          # HUD, build menu, disabled-reason labels
src/render/renderer.js    # draw order
src/render/stickFigure.js # procedural figures — reuse for glyphs
src/render/parallax.js    # zoom-unaware, see §5's audit item
src/config.js             # any new layout constants
```

---

## 3. Binding Decisions (relevant to S11)

1. Army readout is **own-team-only**. With v3 full visibility this is
   now a design preference rather than an intel rule, but it stays
   unless explicitly changed.
2. Keep the S6 disabled-reason pattern (`getBuildButtonDisabledReason` /
   `PURCHASE_REASON_TEXT`) — good UX, restyle only.
3. Watch AI hides the build bar (`isWatchAiMatch(world)`).
4. Cap math: 15 base + 13 × 5 structures = **80 unit cap**. Structures
   300g. Build times: miner 5s, warrior 10s, archer 12s, structure 20s,
   hero 30s. Gold deducts at enqueue.

Full decision list (combat 1D, formation slotting, targeting priority,
production semantics, visibility policy) is unchanged since S10 — see
`HISTORY.md` if a question about sim behavior comes up.

---

## 4. Open Items

- **Commit at every stop condition without asking.** S6–S10 each sat
  uncommitted pending a request. It's now a checkable stop-condition
  line (`git status` clean, hash in Status), not an aspiration.
- **`tasks/todo.md` is a third source of truth and has already caused
  drift.** Treat it as ephemeral scratch — generate at session start,
  delete at close.
- **Balance finding (S10, parked):** the difficulty hierarchy doesn't
  survive the shorter map even with jitter off — Easy beats Hard
  (239.3s), Medium beats Hard (517.0s). At first contact (~110s) Hard
  spends equal-or-more gold than its opponent but fields fewer combat
  units (2 vs 3–4), while out-earning both. Hypothesis, unconfirmed:
  Hard's build order assumed the old 7000px runway. Margins are thin
  (one unit, ~200g) yet outcomes invert completely — the contact moment
  is a knife edge, so S12 should target robustness, not just flipping
  the table back. Unchecked and cheap: is 2 the *starting* combat-unit
  count? That decides whether Hard buys zero combat units in 110s.
- **Baseline, map-isolated only** (seed=42, jitter forced to 0, 1 trial,
  4200px): E/E 305.1s · M/M 422.6s · H/H 1131.9s · E/M Medium 270.6s ·
  E/H **Easy** 239.3s · M/H **Medium** 517.0s. **Not a shipping-regime
  baseline** — normal play runs jitter at 0.125. A jitter-on baseline is
  deferred until after the AI re-tune.
- **H-vs-H pre-jitter asymmetry** unidentified, and map-length-sensitive
  (reverses winner at 4200 vs 7000). Only matters if AI internals become
  a focus again.
- **Game speed / fast-forward** — future settings item, most valuable in
  Watch AI.

---

## 5. S11 — HUD & build-UI redesign

Render-only: zero sim changes. If a sim read needs a new helper (e.g.
per-kind queue counts), add it as a pure read-only function.

**Diagnose first.** Screenshot the current HUD at its worst case (full
army + full queue + hero + statue warning) before changing anything, so
the fix is against the real failure mode rather than an assumed one.

**Redesign (owner-approved):**
- Per-kind unit counts as small procedural stick-figure glyphs + count,
  in one row.
- Build buttons gain per-kind icons with cost; active build shows a
  progress ring/bar on its own button; queued items render as small
  chips with stacked counts (`×3`) instead of text lines.
- Consolidate to **one bottom bar** (build + queue) and **one compact
  top strip** (gold, cap, command, army counts, statue warning).

**Parallax audit — carried over from S10.** S10's audit list included
parallax tiling; every other item on it was verified live, this one
wasn't. `parallax.js` reads only `camera.x` and canvas size and has no
zoom awareness — it was written when zoom was a fixed 0.7. At
`CAMERA_ZOOM_MIN` the visible world is several times wider, so tiling
may not cover the viewport and layer rates scroll against an unscaled
`camera.x`. Look at it at min zoom; fix if broken (render-only, in
scope), otherwise say so and close the item.

**Stop condition:**
- Screenshot at 80 units + full queue + hero + statue warning
  simultaneously: nothing overflows, truncates, or overlaps — at min
  zoom, max zoom, and default. (First time UI renders against a dynamic
  zoom.)
- Every build-button state walked live per S6's method:
  icon, cost, disabled-reason, progress, queue badge.
- Watch AI still hides the build bar.
- Parallax audit closed either way, stated explicitly.
- Headless untouched and passing. Zero console errors.
- `git status` clean, commit hash recorded in Status.

**Independence:** depends on neither the balance finding nor the final
`WORLD_WIDTH`. If the map length later changes, only the parallax check
needs redoing — one screenshot.
