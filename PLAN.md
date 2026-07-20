# PLAN.md — Stick RTS

Cross-session context carrier. Updated at the end of every session with
state, decisions, and the next session's entry point. Product briefs:
`stick-rts-brief.md` (v1), `stick-rts-v2-updates.md` (v2). Completed
session narratives and specs live in `HISTORY.md` — read that only when
debugging needs historical context; this file carries everything a new
session needs.

## Status

**S1–S9 complete and committed.** Full v1 + v2 roadmap shipped: engine,
units/combat, economy/match loop, heroes, AI (3 difficulties), balance
pass, formation system, production queue, zoom, menus, Watch AI, seeded
PRNG. Owner playtesting of v2 surfaced four items of feedback, scoped
into v3 (S10–S11) below, plus this file's restructure (done: history
moved to `HISTORY.md`).

**Design change accepted for v3 (supersedes v1 brief §Battlefield and old
§2.4):** camera-limited intelligence is removed. Both sides are fully
visible — the player may pan/zoom anywhere and see everything at any
time. Scouting-as-information-gathering is no longer a player-side
mechanic. See §4 for knock-on decisions.

**Next entry point: S10 — Camera, visibility & map.** Session specs with
stop conditions in §7.

---

## 1. Stack Decision

**Vanilla JavaScript (ES modules) + Canvas 2D. No framework, no bundler,
no runtime dependencies.** Rendering needs are procedural line-segment
stick figures (no sprite sheets — no `/assets` dir by design); the
fixed-timestep sim is a small hand-written accumulator; scale (≤100
units) is well within unoptimized Canvas 2D at 60fps. Zero build step:
ES modules served by any static server (`python3 -m http.server`
default; `npx serve` fallback). No TypeScript by default; optional
`// @ts-check` + JSDoc via `tsc --noEmit` if ever wanted — a lint step,
not a build step.

---

## 2. Architecture (as built, through S9)

### 2.1 Sim / render separation
- `main.js` runs a rAF loop driving rendering every frame and a
  fixed-timestep accumulator calling `sim.tick(dt)` at 60Hz, independent
  of display refresh.
- `/src/sim` owns all authoritative state and has **zero** browser/DOM
  references — hard constraint; it's what lets `tools/headless.js`
  import the same modules under Node.
- `/src/render` only reads sim state; never mutates it.
- Input is captured into a plain state object each frame; the sim
  consumes it on its own tick (hero direct-control lives in the sim).

### 2.2 Entity model
- Plain JS objects from factory functions, stored in flat arrays on one
  `world` object. No ECS, no class hierarchies: one shared unit shape
  with a `kind` discriminator; per-kind stats in `config.js`. Heroes are
  units with `isHero: true` + a `special` handler keyed by hero id.
- Behavior lives in per-tick system functions (`movement`, `combat`,
  `mining`, `supply`, `heroes`, `commands`, `projectiles`, `formation`,
  `production`), not entity methods.

### 2.3 AI
- One shared parameterized behavior tree (`ai/behavior.js`); Easy/
  Medium/Hard differ only by data (`ai/difficulties.js`): decision-tick
  interval (now seed-jittered ±10–15%, the sim's only randomness),
  build-cycle table, retreat threshold, hero timing, composition-counter
  weighting, scouting frequency. No resource cheating — the AI calls the
  exact same economy functions as the player's UI.
- AI is scouting-gated via `ai/vision.js` (lightweight vision pulse, not
  a fog grid): it acts only on enemy intel its own units have seen,
  with staleness as a difficulty lever. Unconditional safeguard: at zero
  living miners the next purchase is always a miner (prevents the
  economic death spiral found in S8).

### 2.4 Visibility (v3 policy — supersedes the original rule)
- **Both sides fully visible.** Viewport culling remains purely a
  rendering optimization; there is no information-hiding design rule
  anymore. Camera pan/zoom are unrestricted (S10).
- The "statue under attack" banner stays — with free camera you can
  still be looking elsewhere.
- The AI's scouting gate (2.3) is retained deliberately despite the
  asymmetry (player sees all; AI must scout) — it's a difficulty lever
  and removing it would force an AI re-tune. Revisit only if playtests
  make Easy/Medium feel blind. (§4 decision 12.)

### 2.5 Headless evaluation
- `tools/headless.js` (Node, imports the same sim modules): default
  invariant mode (cap enforcement, gold never negative, statue immunity
  while structures stand, queue-aware gold accounting) and
  `--batch --player=<d> --enemy=<d> --trials=N [--ticks=N] [--seed=N]`
  AI-vs-AI evaluation reporting per-trial winner + match length and
  aggregates. Default tick budget 180000 (3000s) — the production queue
  roughly tripled match lengths; shorter budgets misreport slow-but-
  decided matches as undecided.

### 2.6 Config-driven balance
- Every tunable lives in `config.js`: unit costs/stats/build times,
  structure cost/cap math, hero kits/cooldown/escalation, formation
  spacing/screening/cohesion, AI parameter sets, camera/zoom, world
  width, parallax depths. No magic numbers in system code.

### 2.7 Determinism
- The only randomness source is `sim/rng.js` (mulberry32), threaded via
  `createWorld(seed)` into two independent per-team streams; its only
  consumer is the AI decision-interval jitter. Same seed ⇒ byte-identical
  match trace; different seeds diverge. `Math.random` is banned in
  `src/` (verified by grep at S9).

---

## 3. File Layout

```
stick-rts/
  index.html
  PLAN.md                    # this file (lean, forward-looking)
  HISTORY.md                 # archived session narratives + completed specs
  stick-rts-brief.md         # v1 brief (visibility rule superseded, see §4)
  stick-rts-v2-updates.md    # v2 brief + owner answers
  src/
    main.js                  # bootstrap, fixed-timestep loop, uiState routing
    config.js                # ALL balance constants (single source of truth)
    utils.js
    sim/
      world.js               # world state + factories, createWorld(seed)
      loop.js                # fixed-timestep accumulator
      rng.js                 # seeded PRNG — only sanctioned randomness
      tick.js
      systems/
        movement.js  combat.js  projectiles.js  mining.js
        economy.js   supply.js  heroes.js       commands.js
        production.js          # purchase queue (validate/deduct at enqueue)
        formation.js           # deterministic slot assignment (id-ordered)
      ai/
        behavior.js  difficulties.js  vision.js
    render/
      renderer.js  camera.js  stickFigure.js  parallax.js  ui.js
    input/
      keyboard.js  mouse.js
  tools/
    headless.js              # invariant mode + --batch + --seed
```

---

## 4. Settled Decisions (binding)

1. Combat range/acquisition stays **1D** (`x`-only); `y` is formation
   state only. Diagonal-looking projectiles are accepted, not a bug.
2. Formation slots are deterministic: kind-ranked (warriors front,
   archers back), `unit.id`-ordered, never RNG. Overflow columns grow
   **toward the enemy**; the back line anchors beyond the front line's
   occupied span, recomputed per tick (collision-free by construction).
3. Archer cohesion: hold if nearest living warrior >
   `ARCHER_COHESION_DISTANCE`; re-checked every tick; zero-warrior case
   holds in place.
4. Targeting priority: living combat units > miners > structures >
   statue, with retarget-on-threat each tick; statue-gating (structures
   must die first) unchanged.
5. Cap/supply: `BASE_UNIT_CAP` 15 + `STRUCTURE_CAP_BONUS` 13 ×
   `MAX_STRUCTURES` 5 = 80 cap; structures 300g; 100-unit stress target.
6. Production: single sequential per-team queue; gold deducted at
   enqueue, validated once (no completion-time re-check); build times
   miner 5s / warrior 10s / archer 12s / structure 20s / hero 30s; hero
   respawn cooldown runs in parallel with (not stacked on) build time.
7. Zoom is render-time scale only; sim stays in unscaled world px.
8. Randomness: exactly one variation point (AI decision-interval jitter
   ±10–15%) through `sim/rng.js`. Nothing else is randomized without an
   owner decision + dedicated tuning pass.
9. Army readout HUD is own-team-only. (With v3 full visibility this is
   now a design preference, not an intel rule — showing enemy counts is
   allowed if ever requested, but not built.)
10. Settings scope: FPS toggle + default difficulty. Game speed /
    fast-forward deferred — designated future settings item, most
    valuable in Watch AI mode.
11. **v3: full visibility** — no camera-limited intelligence, free
    pan/zoom everywhere (supersedes v1 brief §Battlefield and the
    original §2.4).
12. **v3: AI stays scouting-gated** despite player full visibility
    (asymmetry accepted as a difficulty lever; avoids an unforced AI
    re-tune).

---

## 5. Current Balance Baselines

Post-S8 re-tune, jitter disabled (deterministic), 180000-tick budget,
2 trials each — clean hierarchy Hard > Medium > Easy, zero stalemates:

- E vs E 1362.3s · M vs M 484.2s · H vs H 1229.7s (left/`player` wins)
- E vs M: Medium wins, 511.2s
- E vs H: Hard wins, 1376.9s
- M vs H: Hard wins, 895.6s

With jitter enabled (S9, normal gameplay): outcomes are seed-dependent —
H vs H measured a 5/10 split across 20 trials / 2 seeds. For
reproducible comparisons always pin `--seed=N`. **These baselines are
invalidated by S10's map-length change — full re-baseline at S10's end.**

---

## 6. Open Items

- **H-vs-H pre-jitter determinism mechanism unidentified.** Practical
  fix (jitter) shipped and verified; two hypotheses ruled out by direct
  ablation (team iteration order; unit-array iteration order in target
  search). Only matters if AI-vs-AI internals become a focus again —
  details in HISTORY.md §1 (S9 entry).
- **Deeper balance pass** deliberately open: `decisionInterval`,
  `heroPurchaseDelay`, `retreatThreshold` untouched since S5; no
  evidence yet they need changing.
- **Game speed / Watch AI fast-forward** — designated future settings
  item (decision 10).
- Session-discipline fix: commit at every stop condition **without
  asking** — S6/S7/S8/S9 checkpoints each sat uncommitted pending user
  request; the workflow rule already says commit, so just do it.

---

## 7. v3 Sessions (S10–S11)

Scoped from owner playtest feedback (2026-07-19): (a) full zoom-out +
natural navigation, (b) remove enemy-side visibility restriction
entirely, (c) shorter map, (d) HUD overflow + build-UI rework. Same
session discipline: commit at the stop condition (no ask), update this
file's Status with the next entry point, human gate between sessions.

### S10 — Camera, visibility & map
**Build:** dynamic zoom + free pan, full-visibility policy, shorter map.
- **Dynamic zoom:** `camera.zoom` becomes runtime state (config default
  stays as the starting value). Scroll-wheel zoom **anchored at the
  cursor's world position** (zoom toward/away from the pointer — this is
  what makes it feel natural), clamped to
  [`CAMERA_ZOOM_MIN`, `CAMERA_ZOOM_MAX`] where `CAMERA_ZOOM_MIN` is
  computed so the **entire map fits the viewport** (full zoom-out is a
  hard requirement, not a nice-to-have). Audit every consumer of
  `VIEWPORT_WIDTH/ZOOM` (clamp, cull width, hero-follow, edge-scroll
  bounds, parallax tiling) for the now-dynamic value — S8 converted
  them to divide by zoom, but they've only ever run against a constant.
- **Free pan everywhere:** promote Watch AI's `bindDrag` click-drag pan
  to all match modes (keep edge-scroll too). Remove any pan clamp
  behavior that assumed fixed zoom. Hero-follow on direct control stays,
  but manual pan/zoom input breaks the follow until control is toggled
  again (don't fight the player for the camera).
- **Full visibility:** delete/neutralize any player-facing
  information-hiding logic if present beyond viewport culling (audit —
  §2.4 says culling is all there is, verify that's true in practice).
  Keep the statue-attack banner. Keep AI scouting gate (decision 12).
  Update `stick-rts-brief.md`'s Battlefield bullet + acceptance
  criterion with a superseded-note pointing at §4 decision 11 rather
  than silently contradicting it.
- **Shorter map:** `WORLD_WIDTH` from 5× viewport → **3× as the
  starting point** (bottom of the brief's original 3–10× range),
  playtest-tuned in-session. This is the game's primary pacing dial
  (reinforcement travel time = the rubber-band) — expect materially
  shorter matches and earlier contact; that's the point, but watch that
  Defend's screening offsets + formation spans + mine zones still fit
  sensibly at the new length (constants may need proportional nudges).
- **Re-baseline:** map length changes every timing figure — full
  `--batch` across all 6 pairings (pinned seed) at session end, recorded
  in §5, replacing the S8 table. Confirm the difficulty hierarchy
  survives the shorter map; if a pairing flips or stalemates, log it as
  a finding for the gate (don't silently re-tune AI parameters
  in-session).
**Stop condition:** Wheel-zoom anchors at cursor (verify: a world point
under the pointer stays under the pointer through a zoom step). Full
zoom-out shows the entire map including both statues on one screen;
zoom-in clamps at max. Drag-pan works in normal play and Watch AI;
edge-scroll still works; hero-follow yields to manual camera input.
Both bases visible/pannable at all times — no leftover intel gating.
Map plays at 3× (or the in-session tuned value, recorded in §5's note).
Formation/screening/mine layouts verified sane at the new length.
Headless invariant mode passes; full 6-pairing re-baseline recorded in
§5 with hierarchy outcome noted. Zero console errors.

### S11 — HUD & build-UI redesign
**Build:** fix the overflow, redesign unit-count + build/queue UI.
- **Diagnose first:** the current HUD (gold + cap + command + per-kind
  army readout + active build + queued items as text lines) overflows
  its panel. Screenshot the worst case (full army, full queue) before
  redesigning so the fix is against the real failure mode.
- **Redesign direction (owner-approved):** compact icon-based
  presentation. Per-kind unit counts as small stick-figure glyphs (the
  procedural renderer can draw miniatures — no assets) + count, in one
  row. Build menu buttons gain per-kind icons with cost; active build
  shows a progress ring/bar on its button; queued items render as small
  badges/chips (with counts if stacked, e.g. "×3") instead of text
  lines. Keep the S6 disabled-reason label pattern
  (`getBuildButtonDisabledReason`) — it's good UX, just restyle it.
- **Layout:** consolidate into one bottom bar (build buttons + queue)
  and one compact top strip (gold, cap, command, army counts, statue
  warning). All UI drawn in screen space, unaffected by `camera.zoom`
  (verify explicitly at min and max zoom — the S10 dynamic-zoom work
  makes this the first time UI renders against a changing zoom).
- Render-only session: zero sim changes, no baseline impact. If any sim
  read needs a new helper (e.g. per-kind queue counts), add it as a pure
  read-only function.
**Stop condition:** Screenshot at full army (80 units) + full queue +
hero + statue warning simultaneously active: nothing overflows,
truncates, or overlaps at min zoom, max zoom, and default. All build
buttons show icon/cost/disabled-reason/progress/queue-badge states
correctly (walk each state live, per S6's method). Watch AI still hides
the build bar. Headless untouched and passing. Zero console errors.

---

## 8. Next Session Entry Point

Superseded by the **Status** section at the top of this file — check
there, not here.
