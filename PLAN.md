# PLAN.md — Stick RTS

Cross-session context carrier. Updated at the end of every session with
state, decisions, and the next session's entry point. Product briefs:
`stick-rts-brief.md` (v1), `stick-rts-v2-updates.md` (v2).

**Contract (violated once at S10, restated here):** `HISTORY.md` holds
**completed** session narratives and specs only — read it only when
debugging needs historical context. **In-progress state, partial work,
and dirty-tree warnings always live in this file's Status section.** A
new session reads this file and nothing else to know where things stand;
if that isn't true, this file is wrong.

## Status

**S1–S10 complete and committed.** Full v1 + v2 roadmap shipped: engine,
units/combat, economy/match loop, heroes, AI (3 difficulties), balance
pass, formation system, production queue, zoom, menus, Watch AI, seeded
PRNG — plus v3's S10 (dynamic camera/zoom, free pan, full visibility,
3× map). Full S10 build/verification narrative is in HISTORY.md §1 (S9
entry is directly above it); this section only carries what's still
open.

**Design change shipped in v3 (supersedes v1 brief §Battlefield and old
§2.4):** camera-limited intelligence is removed. Both sides are fully
visible — the player may pan/zoom anywhere and see everything at any
time. Scouting-as-information-gathering is no longer a player-side
mechanic. See §4 for knock-on decisions.

**Open balance finding (S10, unresolved):** the AI difficulty hierarchy
does not survive the shorter map, even with jitter removed — see §6.
S12 (AI re-tune) is scoped in §7 but gated on `WORLD_WIDTH` being
settled by owner playtest first; not started.

**Next entry point: owner playtest for map-length feel.** Does 4200
(3×) play right, or does it need another pass before S12's AI re-tune
locks parameters against a value that might still move? After that:
S11 (HUD/build-UI redesign — render-only, independent of the playtest
outcome per its Independence note) or S12 (AI re-tune, gated on the
playtest settling `WORLD_WIDTH`), in whichever order the owner prefers.

**Last commit:** `4bb9589` — "docs: close out S10 -- live browser
verification, map-isolated ablation, balance finding" (preceded by
`55b1860`, the S10 code WIP checkpoint).

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
  tasks/
    todo.md                  # per-session checklist — intended as
                             # ephemeral scratch, not a source of truth
                             # (see §6)
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
    re-tune). **Caveat introduced by S10:** the gate's strength is a
    function of map length — the same vision pulse covers proportionally
    more of a 4200px world than a 7000px one, so intel staleness falls
    and Easy/Medium may effectively play stronger than their parameter
    sets were tuned for. This is a re-baseline observation to make, not
    a reason to change the decision.

---

## 5. Current Balance Baselines

**S10 map-isolated ablation (seed=42, `AI_DECISION_JITTER` forced to 0,
1 trial/pairing, 180000-tick budget, `WORLD_WIDTH`=4200).** This table
isolates map length as the only variable versus the S8 table below —
jitter is off, exactly as S8 measured it, so any difference is
attributable to the 7000→4200 map-length change alone. **This is NOT
the shipping-regime baseline** — normal gameplay runs with
`AI_DECISION_JITTER`=0.125 (S9). A jitter-on baseline at 4200 is
deliberately deferred until after S12's AI re-tune, since measuring the
shipping regime against a hierarchy already known to be broken (see §6)
would just be re-confirming the same finding at more expense:

| Pairing | Winner @ 4200 (jitter=0) | Length | S8 @ 7000 (jitter=0) | Δ length |
|---|---|---|---|---|
| E vs E | player | 305.1s | player, 1362.3s | −1057.2s (−77.6%) |
| M vs M | player | 422.6s | player, 484.2s | −61.6s (−12.7%) |
| H vs H | enemy | 1131.9s | player, 1229.7s | −97.8s (−8.0%), **winner side flipped** |
| E vs M | enemy (Medium) | 270.6s | Medium, 511.2s | −240.6s (−47.1%), same winner |
| E vs H | player (**Easy**) | 239.3s | Hard, 1376.9s | −1137.6s (−82.6%), **winner flipped** |
| M vs H | player (**Medium**) | 517.0s | Hard, 895.6s | −378.6s (−42.3%), **winner flipped** |

Hierarchy does not survive: Easy beats Hard and Medium beats Hard
outright, with jitter fully removed so this isn't a jitter/scouting-
staleness artifact — see §6's balance finding for the first-contact
instrumentation and the open hypothesis. H vs H's winner flip is the
pre-existing unidentified mirror-match asymmetry (§6), not a new
finding — it's seed-independent at jitter=0 regardless of map length.

With jitter enabled (S9, normal gameplay, 7000px): outcomes are
seed-dependent — H vs H measured a 5/10 split across 20 trials / 2
seeds. For reproducible comparisons always pin `--seed=N`. **Deferred:
the jitter-on baseline at 4200px** — do not run/cite one until S12's AI
re-tune has addressed the hierarchy break above; a shipping-regime
number measured against known-broken AI would misrepresent where things
stand.

---

## 6. Open Items

- **Balance finding (S10): the difficulty hierarchy does not survive
  the shorter map, even with jitter removed.** In the §5 ablation
  (seed=42, jitter=0, 4200px), Easy beats Hard outright (239.3s) and
  Medium beats Hard outright (517.0s). Instrumented cumulative
  gold-spent/gold-earned and living combat-unit count at first contact
  (first tick either side takes damage, ~110–112s into both matches;
  tracked via per-tick balance deltas, not `STARTING_GOLD − currentGold`
  — that proxy silently nets spend against mining income and is wrong
  once mining has produced anything, which it has well before ~110s):
  - **M vs H** (contact at 112.1s): Medium — 3 combat units, 1875g
    spent, 1650g earned, 75g banked. Hard — 2 combat units, **1875g
    spent (identical to Medium)**, 1825g earned, 250g banked.
  - **E vs H** (contact at 110.9s): Easy — 4 combat units, 1625g spent,
    1525g earned, 200g banked. Hard — 2 combat units, **1875g spent
    (more than Easy)**, 1775g earned, 200g banked (tied).

  Hard is not simply behind — in both matchups it spent the same or
  more total gold than its opponent but converted that spend into fewer
  living combat units by first contact. **Hypothesis for S12 (not yet
  confirmed):** Hard's purchase priorities are weighted toward a
  higher-cost/slower payoff (a structure, an archer-heavy composition,
  or a hero purchase sitting in the production queue) rather than cheap
  fast warriors — a build order that assumed the old 7000px map's longer
  travel-time runway to pay off before contact, and no longer gets there
  in time at 3×. S12's first task is reading `ai/difficulties.js`
  directly to check this against Hard's actual parameter table rather
  than continuing to infer it from headless output alone.

- **H-vs-H pre-jitter determinism mechanism unidentified.** Practical
  fix (jitter) shipped and verified; two hypotheses ruled out by direct
  ablation (team iteration order; unit-array iteration order in target
  search). Only matters if AI-vs-AI internals become a focus again —
  details in HISTORY.md §1 (S9 entry). **S10 update:** the pre-jitter
  asymmetry is map-length-sensitive, not a fixed property of the sim —
  at 4200px it reverses direction (enemy wins, 1131.9s) versus 7000px
  (player wins, 1229.7s). Same ablation methodology (jitter forced to
  0), different winner. This doesn't resolve the mechanism — it rules
  out "it's just always `player`/left-side" as an explanation and adds a
  second unexplained variable (map length) to whatever's already
  unidentified.
- **Deeper balance pass** deliberately open: `decisionInterval`,
  `heroPurchaseDelay`, `retreatThreshold` untouched since S5; no
  evidence yet they need changing.
- **Game speed / Watch AI fast-forward** — designated future settings
  item (decision 10).
- **Session-discipline fix (recurring, now 5 sessions running).** Commit
  at every stop condition **without asking** — S6/S7/S8/S9 each sat
  uncommitted pending user request, and S10's partial work makes five.
  The rule has existed since S6 and has never once been followed, which
  means stating it here does not work. It is now written into each
  session's stop condition as a checkable line (`git status` clean,
  hash recorded) rather than living only as an open item. If it fails
  again, the next step is a pre-session script that refuses to start on
  a dirty tree.
- **Three context carriers can disagree, and one already did.** PLAN.md,
  HISTORY.md, and `tasks/todo.md` are all persistent state. S10's
  in-progress status was written into HISTORY.md — the file PLAN.md
  tells sessions not to read — while PLAN.md's Status still said "next
  entry point: S10," so a fresh session would have re-implemented work
  already sitting in the tree. Contract, restated: **HISTORY.md holds
  completed sessions only; in-progress state always lives in PLAN.md's
  Status.** Candidate follow-up: make `tasks/todo.md` strictly ephemeral
  (generated from §7 at session start, deleted at close) so there is no
  persistent third source of truth.

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
  `--batch` across all 6 pairings (pinned seed), recorded in §5,
  replacing the S8 table. Confirm the difficulty hierarchy survives the
  shorter map; if a pairing flips or stalemates, log it as a finding for
  the gate (don't silently re-tune AI parameters in-session).

**Close-out sequence (order matters).** Items 1–6 are already in the
tree; what remains is verification, and it is cheapest in this order:

1. `git status` / `git diff` — inventory the tree against Status's list.
   Commit it as a WIP checkpoint before anything else, so the rest of
   the session has a rollback point.
2. Reconcile `tasks/todo.md` items 1–6 against the actual code. The
   question is whether anything was silently skipped, not whether the
   boxes are ticked.
3. **Headless `--batch` re-baseline (all 6 pairings, pinned seed) —
   before the live browser pass.**
4. If 3× breaks the hierarchy, that's a gate finding; `WORLD_WIDTH` may
   change.
5. Only then the live browser verification pass.
6. §5 table replacement, Status update, final commit.

The reason 3 precedes 5: `CAMERA_ZOOM_MIN` is computed from
`WORLD_WIDTH`, so any map-length change invalidates the full-zoom-out
verification. Batch is cheap and unattended; the browser pass isn't.
Don't pay for it twice.

**Pre-registered predictions for the re-baseline.** Write the observed
result against each of these; the point is to make this a test rather
than a post-hoc story:

- **P1 — Easy over-performs.** A shorter map shortens reinforcement
  travel time, which is the rubber-band that punishes early aggression.
  Easy's `minArmyToAttack: 1` rush is exactly what beat Hard outright in
  S8 before the build-cycle fix. Watch E-vs-M and E-vs-H.
- **P2 — the hierarchy compresses rather than flips.** Per §4 decision
  12's caveat, the AI scouting gate weakens as the map shortens, which
  lifts Easy/Medium for reasons unrelated to their parameter sets. If
  margins narrow across the board without any pairing inverting, this is
  the likely cause.

Either outcome is a finding for the gate. No AI re-tune in-session.

**Stop condition:** Wheel-zoom anchors at cursor (verify: a world point
under the pointer stays under the pointer through a zoom step). Full
zoom-out shows the entire map including both statues on one screen;
zoom-in clamps at max. Drag-pan works in normal play and Watch AI;
edge-scroll still works; hero-follow yields to manual camera input.
Both bases visible/pannable at all times — no leftover intel gating.
Map plays at 3× (or the in-session tuned value, recorded in §5's note).
Formation/screening/mine layouts verified sane at the new length.
Headless invariant mode passes; full 6-pairing re-baseline recorded in
§5 with hierarchy outcome noted, and P1/P2 each explicitly marked
held/failed against the measured numbers. `tasks/todo.md` items 1–8
reconciled against actual code. Zero console errors. **`git status`
clean and the commit hash recorded in Status — this line is part of the
stop condition, not a follow-up.**

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
**`git status` clean and the commit hash recorded in Status.**

**Independence note:** S11 is render-only and does not depend on the
S10 re-baseline outcome. If S10 closes with a balance finding, S11 can
proceed while that decision waits at a gate rather than blocking on it.

### S12 — AI re-tune (scoped, not started)
**Gate: do not start until `WORLD_WIDTH` is settled by owner playtest.**
S10 shipped 4200 as a starting point, not a final value — if playtest
feedback moves it again, `difficulties.js` parameters tuned against 4200
would need re-tuning a second time. Starting S12 before that playtest
risks wasted work.

**Build:** address §6's balance finding — the difficulty hierarchy
(Hard > Medium > Easy) does not hold at the shorter map, even with
jitter removed, and Hard's first-contact profile (equal-or-higher spend,
fewer combat units) suggests its build-order priorities assumed the old
map's longer runway.
- **First task:** read `src/sim/ai/difficulties.js` in full and report
  whether Hard is structurally just Medium with a more front-loaded
  economy and a later threshold purchase (matching §6's hypothesis), or
  something else entirely (a different composition-counter weighting, a
  longer `decisionInterval`, a delayed `heroPurchaseDelay`, etc.). This
  is a read-and-report step before any parameter changes — confirm the
  mechanism against the actual config, not just the headless output in
  §6.
- From there: re-tune whatever `difficulties.js` parameters the read
  identifies as the cause, re-run the §5 ablation methodology (jitter
  forced to 0 first, to confirm the fix in isolation from jitter noise),
  then the full jitter-on `--batch` re-baseline (deferred from §5) to
  produce the actual shipping-regime baseline table.
- No `WORLD_WIDTH` changes in S12 itself — that's the owner-playtest
  gate's decision, made before S12 starts, not during it.

**Stop condition:** `difficulties.js` read-and-report delivered.
Hierarchy holds (Hard > Medium > Easy, or an owner-accepted alternative)
across all 6 pairings at jitter=0. Jitter-on `--batch` re-baseline
recorded in §5, replacing the "deferred" note. Headless invariant mode
passes. `git status` clean and the commit hash recorded in Status.
