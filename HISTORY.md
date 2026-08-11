# HISTORY.md — Stick RTS

Archived session narratives and completed session specifications, moved
out of PLAN.md (2026-07-19 restructure) to keep the active plan lean.
Read this file only when debugging something that needs historical
context — PLAN.md carries everything a new session needs going forward.

**Completed sessions only.** In-progress state, partial work, and
dirty-tree warnings belong in `PLAN.md`'s Status section, never here —
this file is explicitly not read by a new session. (S10's in-progress
narrative was mistakenly filed here mid-session on 2026-07-19 and moved
to PLAN.md Status; now that S10 has closed, its completed narrative
lives here properly, below.)

Contents:
1. Approved UX release (most recent): archer formation, pause/resume, and Update Log.
2. Post-S10 completion record: HUD/build UI, mobile controls, Watch speed/Hard vision, turret and Watch telemetry release.
3. Session status narratives: S10, S9, S8, S7, v2 planning session, S6, S5. (S1–S4 narratives were compacted into later entries during v1 and are not separately preserved.)
4. Resolved/open question log as it stood at end of S9.
5. Completed session specifications with stop conditions: v1 (S1–S6) and v2 (S7–S9).

---

## 1. Approved UX release — 2026-08-10

After local review and owner approval, the focused UX work was integrated into
`main` without bringing in the commander/RL experiment or visual-pipeline work.

```text
5510579 — fix: advance newly spawned archers to formation
4060cc9 — feat: add local pause and update log review
18fb768 — docs: record hard AI headless analysis
```

- **Archer formation:** newly spawned, unescorted defending archers now travel
  from home toward their mine-side formation slot. `node
  tools/archer-spawn-formation-check.mjs` passed for both player and AI teams.
- **Pause / Resume:** Player-vs-AI and Watch AI expose an on-screen pause control,
  a pause overlay, and the `P` shortcut. The focused CDP browser check confirmed
  that pause freezes tick count, gold, and elapsed match time, while Resume
  advances the same world.
- **Update Log:** the landing menu now opens a curated player-facing Update Log
  and returns correctly through its Back action. The same CDP check exercised
  that navigation and the Watch-AI pause-button placement.
- **Hard AI analysis:** the local headless analysis was retained as
  `docs/analysis/hard-vs-hard-100-games-2026-08-09.md`; it is analysis only and
  does not change runtime strategy or balance behavior.

---

## 2. Post-S10 completion record

The prior `PLAN.md` was left stale at S11 even though its HUD/build redesign and several later, owner-approved releases had already landed on `main`. This record closes that gap without treating unreviewed local work as history.

### HUD, camera, and mobile controls

- `8806c50` delivered the compact HUD/build layout and config-driven army glyphs; `a4b5463` stabilized zoom composition and HUD cards.
- Mobile/touch camera and command-control work was delivered in the focused commits immediately following that work. The old temporary feature branches were later pruned after preservation/merge decisions.

### Watch and Hard AI improvements

- Watch speed control and Hard AI global enemy-composition awareness were verified in a browser and merged to main as `ece456d`.
- Watch controls were subsequently moved clear of the team boards in `5cd78ad`, then included in the turret/telemetry merge.

### Turret and Watch telemetry release

The experimental commander/strategy/RL snapshot was intentionally not merged wholesale. Turrets and Watch presentation were extracted into a clean local review branch, browser-tested, LAN-reviewed by the owner, and merged to `main` as:

```text
c76e849 — merge: add turrets and Watch telemetry
```

That release contains one starting turret per team, two purchasable turret slots, turret production/combat/supply/formation/rendering, a Watch clock, resource differential, and Blue/Red team summaries.

### Historical note

The UX work was initially held in `agent/local-ux-regression-batch` pending local review. Its focused archer fix was integrated as `5510579`; the reviewed pause/resume and Update Log work followed through the focused local-view commit `4060cc9`. The branch/worktree history was preserved during promotion; no commander/RL or art-pipeline changes were merged as part of this release.

---

## 3. Session Status Narratives

**S10 complete (Camera, visibility & map).** Built per PLAN.md §7's S10
block: `camera.zoom` promoted to runtime state (`render/camera.js`),
scroll-wheel zoom anchored at the cursor's world position via
`zoomAt()` (clamped to `[CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX]`, the min
computed so the whole map fits the viewport), free click-drag pan
promoted from Watch-AI-only to every match mode, edge-scroll retained,
`camera.followBroken` flag so manual pan/zoom yields hero-follow until
direct control is re-toggled, full player visibility (audit confirmed
viewport culling was already the only camera-relates gating — nothing
else to remove), `WORLD_WIDTH` 7000→4200 (5×→3× viewport). Config,
camera, mouse, main, and renderer changes landed together; renderer's
scale-before-translate ordering fix was required for cursor-anchored
zoom math to hold (translate-then-scale silently computed
`zoom*worldX - camera.x` instead of `zoom*(worldX - camera.x)` — invisible
while zoom was a fixed constant, would have broken zoom-anchoring the
moment zoom became dynamic).

**Live browser verification (fresh port, per the disk-cache lesson) —
all camera items confirmed working.** Cursor-anchored zoom: dispatched
a real `wheel` event and compared the world point under the cursor
before/after — zero drift. Zoom-in/zoom-out both clamp at exactly
`CAMERA_ZOOM_MAX`/`CAMERA_ZOOM_MIN`. Full zoom-out shows both statues on
one screen (screenshot-confirmed). Drag-pan confirmed in both normal
play and Watch AI. Edge-scroll confirmed (reaches the exact computed pan
clamp). Hero-follow: confirmed it breaks on manual pan/zoom
(`followBroken` set, camera holds position independent of hero
movement) and resumes exactly on the H re-toggle (`followBroken`
cleared, camera snaps back to the hero-centered position with zero
diff). Formation/mine layout sanity-checked visually at 4200px — tight,
legible, no overlap. Zero console errors across two fresh page loads.
**Verification-methodology note for future browser sessions:** this
Chrome automation environment throttles/suspends `requestAnimationFrame`
in backgrounded/unfocused tabs — idle `wait` calls alone can silently
stall both the sim tick loop and camera updates with no error, which
looks like a frozen game but isn't one. Prefer the exposed
`window.__forceTicks(n)` debug hook (synchronous, bypasses rAF
entirely) for deterministic verification over real-time waits;
interspersed real interactions (clicks/hovers) can also restore rAF but
less reliably.

**Balance finding — the difficulty hierarchy does not survive the
shorter map.** Full `--batch` re-baseline first ran with
`AI_DECISION_JITTER` at its shipping value (0.125, unintentionally —
worth flagging explicitly, since it means that first pass measured the
shipping regime, not a clean map-length ablation) and showed Medium
beating Hard outright and Easy/Hard splitting — hierarchy already
looked broken. A follow-up clean ablation (`AI_DECISION_JITTER` forced
to 0, matching S8's original deterministic methodology exactly, seed=42
— seed choice is provably inert at jitter=0 per S9's own ablation
below) confirmed the break isn't a jitter/scouting-staleness artifact:
Easy beat Hard outright (239.3s) and Medium beat Hard outright (517.0s)
with jitter fully off. Full comparison table against the S8 baseline is
in PLAN.md §5.

Instrumented cumulative gold-spent, gold-earned, and living combat-unit
count at first contact (~110–112s) for both Hard matchups, via a
scratch script reusing the repo's own sim modules (not committed —
diagnostic only). **First attempt used `STARTING_GOLD − currentGold` as
a proxy for cumulative spend and was wrong** — mining income adds
directly to `team.gold` (confirmed by grep: the only three gold-mutation
sites in `sim/` are mining's deposit and economy's three buy-time
deductions), so that proxy nets spend against income and drastically
understates spend once mining has produced anything, which it has well
before 110s. Corrected by tracking real per-tick gold deltas (positive
deltas summed as earned, negative as spent). Corrected numbers: in M vs
H, Hard spent exactly as much as Medium (1875g each) but had 2 combat
units to Medium's 3, having earned more (1825g vs 1650g) and banked
more (250g vs 75g). In E vs H, Hard spent *more* than Easy (1875g vs
1625g) yet had fewer combat units (2 vs 4), with banked gold tied
(200g). Hard converts equal-or-greater spend into fewer combat units at
contact — not simple hoarding. Hypothesis (unconfirmed, first task of
S12): Hard's build order is weighted toward a higher-cost/slower payoff
that assumed the old 7000px runway. Full finding recorded in PLAN.md §6.

Separately: the pre-jitter H-vs-H mirror-match asymmetry (mechanism
still unidentified, see below) turns out to be map-length-sensitive —
it reverses winner at 4200px (enemy, 1131.9s) versus 7000px (player,
1229.7s) under the identical jitter=0 ablation methodology. Doesn't
resolve the mechanism; rules out one possible read of it (a fixed
positional bias) and adds a second unexplained variable.

S12 (AI re-tune) scoped in PLAN.md §7, gated on `WORLD_WIDTH` being
settled by an owner playtest first — not started this session. Diagnostic
config edits (`AI_DECISION_JITTER` forced to 0 for the ablation) were
reverted before finishing; `git diff` confirmed clean back to the
session's WIP checkpoint before any of this narrative's PLAN.md/
HISTORY.md updates were written.

---

**S9 complete (Visuals + menus + Watch AI).** Built per §5's S9 block, in
dependency order: parallax backdrop (new `render/parallax.js`, 3 tiled
layers scrolling at 0.2/0.5/0.8× `camera.x`, render-only — reads only
`camera.x` and canvas size, zero `world` access); seeded PRNG (new
`sim/rng.js`, mulberry32 — `createWorld(seed)` derives two independent
per-team RNG streams so same-seed reproducibility holds regardless of
tick-order interleaving; `tools/headless.js` gained `--seed=N`); a real
landing menu (`matchState` gains `'menu'` as `createWorld()`'s actual
initial state — the app no longer boots straight into a live match — with
Play/Watch AI/Settings screens in `ui.js`, all sharing a factored-out
`drawDifficultyButtons` helper now reused in 4 places instead of 1); Watch
AI mode (both teams get a `difficulty`, reusing the exact mechanism
`--batch` already exercised — zero new AI logic needed; free click-drag
camera pan via a new `bindDrag` in `input/mouse.js` and a Watch-AI branch
in `camera.js`'s `updateCamera`; player input and the build menu
suppressed via a new `isWatchAiMatch(world)` helper).

**Real bug caught before it could ship, not found live:** `drawWinLoseOverlay`'s
old guard was `if (world.matchState === 'playing') return;` — that doesn't
exclude `'menu'`, so once a third `matchState` value existed it would have
rendered "Defeat" over the landing page on every fresh load. Caught by
reading the actual guard condition against the new state space before
wiring the menu in, not by seeing it break live. Fixed to
`!== 'won' && !== 'lost'`.

**Real regression caught during implementation, not shipped:** the plan's
draft had `resetMatch`'s default difficulty argument fall back to the new
Settings-driven default (`uiState.settings.defaultDifficulty`) unconditionally.
That would have silently broken "Rematch keeps the just-ended match's own
difficulty" (a working v1 behavior) — clicking Rematch on a Hard match would
have reset to whatever the Settings default happened to be instead of Hard.
Fixed to `world.teams.ai.difficulty ?? uiState.settings.defaultDifficulty`,
preserving the original fallback chain and only using the new default when
`ai.difficulty` is genuinely unset.

**Hard-vs-Hard asymmetry investigation — mechanism found via direct ablation,
not assumed.** The session's own re-baseline (`--batch --player=hard
--enemy=hard --trials=10`, two independent seeds) came back a clean 5/10
split both times — 20 real trials, no dominant side, versus S8's documented
skew. Rather than credit this to S7's targeting-priority change (the
plausible-sounding assumption), tested it directly: forcing
`AI_DECISION_JITTER` to 0 reproduces the *exact* old behavior — `player`
wins 10/10 at precisely 1229.7s every trial, completely seed-independent.
**This session's own decision-timer jitter (Phase 2 of this session, not S7)
is what actually broke the determinism.** Went further and ruled out both
named hypotheses for the underlying mechanism by direct test, not
assumption: with jitter still forced to 0, flipping `behavior.js`'s
`['player','ai']` iteration order didn't change the winner (still 3/3
`player`, exactly 1229.7s); reversing `world.units` iteration order in
`findNearestEnemyWithin`/`findPriorityUnitWithin` also didn't change it
(still 3/3, exactly 1229.7s). Both diagnostic edits reverted before
continuing (`git diff` confirmed clean). Net honest outcome: the precise
underlying mechanism that made the pre-jitter match deterministic is still
unidentified — two plausible hypotheses were tested and ruled out rather
than left unexamined — but the practical fix is known, shipped, and
verified across 20 real trials, which is a stronger result than "found the
root cause" would have been if that root cause turned out to be S7 (it
isn't).

**Verified live via `claude-in-chrome`** (fresh port 8020, per the
established disk-cache lesson): fresh load shows the landing page with
parallax visible behind the menu buttons, zero console errors; Play → Hard
→ live match confirmed via `window.__world.matchState`/`ai.difficulty`;
Settings' FPS toggle and default-difficulty both confirmed taking effect
live (screenshotted "On" state and live fps counter, "Hard" highlight);
regression-checked that Rematch and difficulty-change still work on a
*normal* (non-Watch-AI) win/lose overlay after the menu now sits in front
of every match (forced a Victory, clicked "Easy," confirmed
`ai.difficulty` changed and `matchState` reset to `'playing'` via a real
dispatched click, not scripted state mutation); Watch AI setup screen
(Reroll Seed confirmed changing `uiState.watchSetup.seed`) → Start → both
sides confirmed autonomously building/spending with zero player input
(player side reached the unit cap unassisted); player-input suppression
confirmed both by code path (`setPlayerCommand`'s early-return) and live
(pressed `q`, `teams.player.command` stayed `'defend'`); build menu
confirmed absent from the screenshot during Watch AI; free camera drag-pan
confirmed via dispatched mousedown/mousemove/mouseup (`camera.x` moved
0 → 857.14, matching the `dragDelta / CAMERA_ZOOM` math, and correctly
clamped at the 0 floor when dragging past the left edge); forced a Watch AI
match to end and confirmed "Back to Menu" renders instead of Rematch, and
that clicking it resets `matchState` to `'menu'`. Zero console errors
across the entire verification pass. `node tools/headless.js` (both
default invariant mode and `--seed`-based `--batch` runs) passing
throughout, including after the Phase 5 diagnostic edits were reverted.

Files added: `src/render/parallax.js`, `src/sim/rng.js`. Modified:
`src/config.js` (+parallax/jitter constants), `src/sim/world.js`
(`createWorld(seed)`, per-team `rng`, `matchState` now starts `'menu'`,
`isWatchAiMatch`), `src/sim/ai/behavior.js` (jittered decision timer),
`src/render/ui.js` (menu screens, `drawDifficultyButtons` extraction,
win/lose-overlay Watch AI branch, build-menu Watch AI guard),
`src/render/renderer.js` (`drawParallax` call, `render()`'s menu branch,
`drawLegend`'s Watch AI text), `src/render/camera.js` (`updateCamera`'s
Watch AI free-pan branch), `src/input/mouse.js` (`bindDrag`), `src/main.js`
(persistent `uiState`, menu/Watch-AI click routing, `startWatchAiMatch`,
`backToMenu`, input-suppression guards), `tools/headless.js` (`--seed=N`,
required `matchState = 'playing'` fix in both entry points now that
`createWorld()` defaults to `'menu'`).

Repo checkpoint not yet committed — pending explicit user request.

**Next entry point:** S1–S9 (the full v1 + v2 roadmap) are now complete.
No further planned session exists. The Hard-vs-Hard asymmetry's precise
root mechanism remains open (two hypotheses ruled out, practical fix
shipped and verified — see above) if AI-vs-AI internals become a focus
again; otherwise what's left is user playtesting of the full v2 feature
set (parallax, menus, Watch AI, seeded jitter) the same way v1's S6 closed
out — no code changes queued until that surfaces specific feedback.

---

**S8 complete (Scale + economy).** Built per §5's S8 block: camera zoom
(`CONFIG.CAMERA_ZOOM` 0.7, render-time scale only — `renderer.js`,
`camera.js`'s clamp/hero-follow/cull-width all switched from raw
`VIEWPORT_WIDTH` to `VIEWPORT_WIDTH/ZOOM` so the wider zoomed-out view
doesn't clip or wrongly cull); cap/supply rework (`BASE_UNIT_CAP` 15,
`STRUCTURE_CAP_BONUS` 13, cap now maxes at 80); structure cost 150→300;
a real sequential production queue (new `sim/systems/production.js` +
`world.teams[team].productionQueue`, `economy.js`'s `buyUnit`/`buyHero`/
`buyStructure` split into validate+deduct+enqueue vs. materialize-later,
unchanged return shape so the AI needed zero call-site changes); army
readout HUD + build-progress/queue display (`ui.js`); stress-spawn raised
to 100 units (50/side).

**Real, load-bearing bug found and fixed, not just slower pacing:** the
stress-spawn tool's `homeX`/`enemyHomeX` pinning trick (used to hold
debug units stationary) silently stopped working once S7's formation
system shipped — formation.js overrides positioning for any living combat
unit based on the team's *current* command, ignoring those fields
entirely. Caught before it reached "100 units magically march across the
map" in testing; fixed with a new `unit.formationExempt` flag that
formation.js's eligible-unit filter now skips, so movement.js's existing
`slotX ?? homeX` fallback resolves to the pin regardless of any later
`setTeamCommand` call (which stomps `unit.command` on every unit of a
team but never touches the pin fields).

**Second, more consequential bug found and fixed during AI re-tuning
verification:** with the original (S5-era) build cycles unchanged, a
scripted Easy-vs-Hard headless match showed Easy **beating** Hard
outright (205.3s) — a real difficulty-hierarchy violation, not just a
pacing nit. Traced via direct state tracing (not just outcome-watching):
Easy's `minArmyToAttack: 1` lets it rush with a single early warrior;
under the new production queue, Hard's own first combat unit was still
serialized behind two front-loaded miners (unchanged from S5, when
purchases were instant and this cost nothing) and arrived too late to
defend its mine. Easy's rusher then killed Hard's miners faster than
Hard could afford replacements, and because gold has zero passive income
independent of living miners, Hard's economy hit **$0 with no living
miners and no way back** — a permanent, unrecoverable death spiral, not
a temporary setback. Fixed in three parts, each verified to actually move
the needle before being kept: (1) trimmed every difficulty's build cycle
from two front-loaded miners to one (`ai/difficulties.js`) so the first
combat unit arrives ~5s sooner; (2) added an economic-survival floor to
`ai/behavior.js`'s `pickPurchase` — with zero living miners, the AI's
next purchase is unconditionally a miner, overriding build-cycle position
and composition counter-picks; (3) gave Hard specifically a
warrior-first build cycle, since `defendMineThreshold: 400` already
marks proactive mine defense as core to its identity. Re-verified after
each change individually (not just the final state) — the fix
progression was traceable: Easy-beats-Hard (205.3s) → Easy still wins but
much slower (350.8s, safeguard alone insufficient) → Hard no longer loses
but doesn't clearly win within the default tick budget → (see next
finding) Hard wins decisively once given enough time.

**Also raised `tools/headless.js --batch`'s default `--ticks` from 60000
to 180000:** the "Hard doesn't clearly win" result above turned out to be
the *old* default tick budget (1000s) cutting off matches that go on to
resolve cleanly — re-run at 3000s, every pairing that looked like a
stalemate (including the two mirror matchups) resolved decisively with a
real winner. The production queue roughly triples average match length
across the board; the old default was misreporting slow-but-decided
matches as "undecided."

**Full `--batch` re-baseline across all 6 difficulty pairings** (2 trials
each — still zero RNG, confirmed unchanged by repo-wide grep, so
additional trials add no information), replacing every S5/S6/S7 figure
now invalidated by the cap/cost/queue changes:
- E vs E: 1362.3s (previously a stalemate at every prior baseline —
  now resolves)
- M vs M: 484.2s
- H vs H: 1229.7s (previously the S6/S7-documented positional asymmetry;
  now resolves the same way both trials, not investigated further this
  session — S9's asymmetry root-cause work should start from this
  figure, not the S6/S7 ones)
- E vs M: Medium wins, 511.2s (hierarchy holds: Medium > Easy)
- E vs H: Hard wins, 1376.9s (hierarchy holds: Hard > Easy — this is the
  pairing that exposed the death-spiral bug above; now resolved)
- M vs H: Hard wins, 895.6s (hierarchy holds: Hard > Medium — notably,
  this pairing **no longer stalemates**, reversing the S5-documented
  "known limitation" flagged every session since)

All three difficulties now form a clean hierarchy (Hard > Medium > Easy)
with zero stalemates or reversals across all 6 pairings, at the new
180000-tick budget. Not claimed as "fully balanced" — only as evidence-
based and honest about what was and wasn't tuned: `decisionInterval`,
`heroPurchaseDelay`, and `retreatThreshold` were left untouched this
session (no observed evidence they needed changing once the build-cycle
and miner-floor fixes landed); a deeper balance pass remains open for
future playtesting.

**Verified live via `claude-in-chrome`** (fresh server port, per the
established disk-cache lesson): purchase → queue → materialize confirmed
both via `window.__buyUnit` and a real dispatched click on the build-menu
button (gold deducts immediately, unit appears only after its build time
elapses); sequential queue ordering confirmed (second item's timer frozen
while the first is active); production-queue HUD text confirmed via a
`ctx.fillText` interception (background real-time ticking between
separate tool calls kept racing ahead of screenshot timing otherwise —
worth remembering for future queue-timing tests: verify queue *state*
directly via JS, or intercept the draw call, rather than trusting a
screenshot's timing to land mid-queue); hero cooldown (30s) and hero
build time (30s) confirmed fully independent, not stacked (a second hero
purchased immediately once cooldown clears materializes ~30.02s later,
not ~60s); cap/maxStructures enqueue-time accounting stress-tested with
30 rapid-fire purchase attempts against a cap of 15 — exactly 15
succeeded, cap never exceeded even transiently through full
materialization; camera zoom confirmed both numerically (clamp max
exactly matches `WORLD_WIDTH - VIEWPORT_WIDTH/ZOOM`) and visually (a unit
at world x=1800 — beyond the old viewport width — rendered correctly
rather than being culled); 100-unit stress spawn held at 76-87fps,
zero unit loss, zero console errors; army readout HUD confirmed
own-team-only by inspection of `getArmyComposition`'s team filter (no
code path reads the enemy team). Zero console errors on every fresh page
load throughout.

Files added: `src/sim/systems/production.js`. Modified: `config.js`
(zoom/cap/cost/build-time constants), `sim/world.js`
(`productionQueue` per team), `sim/systems/economy.js` (validate+enqueue
split, `countQueued`/`hasLivingOrQueuedHero`), `sim/systems/formation.js`
(`formationExempt` bypass), `sim/tick.js` (+`updateProductionQueue`),
`render/camera.js` + `render/renderer.js` (zoom transform and all the
places that needed to stop assuming raw `VIEWPORT_WIDTH`), `render/ui.js`
(army readout + queue display, queue-aware disabled-reason checks),
`main.js` (`spawnStressTest` → 100 units + `formationExempt`),
`sim/ai/difficulties.js` (build-cycle re-tune), `sim/ai/behavior.js`
(miner-priority safeguard), `tools/headless.js` (default `--ticks`
60000→180000).

Repo checkpoint not yet committed — pending explicit user request.

**Next entry point: S9 — Visuals + menus + Watch AI.** Full scope in §5.
Start the H-vs-H asymmetry root-cause work from this session's 1229.7s
figure, not S6/S7's.

---

**S7 complete (Formation system + combat).** Built per §5's S7 block:
new `sim/systems/formation.js` assigns every living, non-miner,
non-controlled unit a deterministic `(slotX, slotY)` each tick (front
line = warriors/forgemaster/vanguard, back line = archers/hawkeye, filed
by `unit.id` ascending — never spawn/iteration order, never RNG);
`movement.js`'s defend/attack branches now source `desiredX`/`desiredY`
from those slots instead of the old single `homeX`/`enemyHomeX` scalar
per team (the direct cause of the pre-S7 stacking); Defend's screening
line sits at `homeX + sign*DEFEND_SCREEN_OFFSET` (300px, past the mine
and structure zones); archer cohesion holds an archer in place (re-checked
every tick, not latched) when no living warrior is within
`ARCHER_COHESION_DISTANCE` (150px), including the zero-warrior case, and
resumes the instant a warrior exists; archer speed 70→80. Targeting
priority (`supply.js`'s `findAttackTarget`) now prefers living combat
units over miners over structures over the statue (statue-gating itself
unchanged), and `combat.js` gained a retarget-on-threat check so a unit
parked on a lower-priority target switches the instant something
higher-priority enters range — checked every tick, but skipped once
already on a top-priority target to keep it cheap.

**Real bug found and fixed during live verification, not just at build
time:** the first-draft formation math gave the archer (back) line's
overflow columns the *same* growth direction and step size as the
warrior (front) line's overflow columns, offset by a single constant —
which is mathematically guaranteed to collide once either line grows
past one rank (proved algebraically after reproducing it live: an
8-warrior/8-archer Defend test put the 7th archer at the exact same
slotX as the front line's first column). Fixed by anchoring the back
line one spacing step beyond the front line's *entire currently-occupied
span* (recomputed fresh every tick from the front line's actual min-
exposure position, not a fixed offset) and always growing it further
away from the fight — collision-free by construction for any column
count, verified in both Defend and Attack modes with zero collisions
after the fix (re-verified live via `claude-in-chrome`, see below).

**Verified live via `claude-in-chrome`** (server restarted on a fresh
port per S3/S5's documented disk-cache lesson): a 16-unit mixed Defend
army screenshotted into 4 visually distinct columns — warriors' overflow
column sits further toward the enemy than its base column (confirmed
multi-column direction), archers sit behind the warriors and their own
overflow sits further back still, zero overlap. Archer cohesion:
isolated a lone archer with zero warriors — held at its spawn point
despite having a computed slot 250px away; added a warrior and confirmed
it resumed advancing toward the slot within the next few ticks.
Retarget rule: isolated a warrior mid-attack on an enemy structure
(150→120hp over 3 real hits), spawned a defender into range, confirmed
the target switched within 0.1s and structure damage paused entirely
while the defender fight was ongoing. Priority sub-ordering: an attacker
with both a nearer miner (34px) and a farther combat unit (100px) in
range chose the combat unit, confirmed via a single-tick isolated check.
Statue-gating: re-confirmed unaffected (statue untouched while a
structure still stood, even at 10/150 hp). Zero console errors across a
fresh page load and all of the above. One methodology note for future
sessions: `window.__world` is a live reference to the actual running
match, and the real `requestAnimationFrame` loop keeps advancing it in
the background between tool calls regardless of `__forceTicks` — a
multi-step test sequence with real round-trip latency between calls
picks up "extra" real-time ticks it didn't explicitly request (confirmed
via `__tickCount`: 1772 ticks had elapsed against 5 explicitly forced).
Not a bug; just don't infer exact speed/timing from position deltas
across separate tool calls — use single atomic scripts (as done above)
when a test needs to reason about precise tick counts.

**Headless re-baseline** (interim, per S7's stop condition — not the full
6-pairing S8 re-baseline, which happens after cap/cost/queue land too).
Default invariant check: byte-identical to the pre-S7 baseline (verified
via `git stash`), still passes. Hard-vs-Hard: **the documented S6
asymmetry changed, not resolved** — still 5/5 identical/deterministic,
but now `player`(left-side) wins at 426.0s (was `ai`/right-side at
545.1s). Other pairings shifted too, expected since targeting priority
is explicitly combat-resolution-altering: Medium-vs-Hard's long-standing
mutual stalemate (flagged since S5) **no longer stalemates** — Hard now
wins decisively in 325.8s; Easy-vs-Easy and Medium-vs-Medium mirror
matches, which previously stalemated to the tick budget, now resolve
decisively (446.4s and 614.9s); Easy-vs-Medium flipped winner (Easy now
beats Medium in 460.7s, was Medium beating Easy in 851.9s); Easy-vs-Hard
is nearly unchanged (551.0s vs. 553.7s, same winner). **None of this was
tuned or fixed this session** — per S7's stop condition these are logged
findings for S8's AI re-tuning pass and S9's asymmetry root-cause work
(which should start from these numbers, not the stale S6 ones).

Files added: `src/sim/systems/formation.js`. Modified: `config.js`
(+formation/screening/cohesion constants, archer speed), `sim/tick.js`
(+`updateFormationSlots` call), `sim/systems/movement.js` (slot-based
positioning, archer cohesion, 2D-capable movement toward formation
targets — combat approach itself stays 1D), `sim/systems/supply.js`
(+`targetPriorityTier`, `findPriorityUnitWithin`, priority-ordered
`findAttackTarget`), `sim/systems/combat.js` (retarget-on-threat check).

Repo checkpoint not yet committed — pending explicit user request.

**Next entry point: S8 — Scale + economy.** Full scope in §5. Start the
AI re-tuning pass from this session's re-baseline numbers above, not the
stale S6/pre-S7 ones.

---

**Planning session (2026-07-19): v2 scoped into S7–S9.** No code changed
this session — refined `stick-rts-v2-updates.md`'s feature list into the
session breakdown in §5 below, grounded in a fresh read of the actual S6
code (not the brief's assumptions about it). Three places where the source
doc undersells the real scope, flagged explicitly in each session rather
than silently assumed:
- The sim is **fully 1D today** — every combat/acquisition-range check
  (`combat.js`, `supply.js`, `world.js`) is `Math.abs(x1 - x2)`; `y` is
  only a cosmetic spawn-time offset (`economy.js`) that `movement.js`
  never touches again. "Vertical depth"/"ranks and files" (S7) means
  making `y` real, persistent sim state for the first time.
- **No production queue, no zoom, and no pre-match menu exist at all** —
  `buyUnit`/`buyStructure`/`buyHero` (`economy.js`) are fully synchronous
  today (gold deducted and entity created in the same call); `camera.js`
  has no scale/zoom field, only a scroll offset; `main.js` calls
  `createWorld()` and boots straight into a live match, and `matchState`
  only ever takes `'playing'/'won'/'lost'` — there's no menu state to
  extend. S8 and S9 build these from scratch, not by extending existing
  partial versions.
- Zero `Math.random` anywhere in `src/` (confirmed by repo-wide grep) —
  S9's seeded PRNG is new plumbing, not wiring up existing randomness.

**Correction:** the S6 checkpoint noted above as uncommitted was actually
committed as `6f3cec4` ("feat: balance + polish...") prior to this
session — confirmed via `git log`. The v2 diff base is already clean; no
pre-work commit was needed after all.

**v2 gate answered (2026-07-19):** the source doc's Answers section
resolved all six of §4's open v2 questions (#2–#7) and added two items
that weren't in scope when this plan was first drafted — **#6 targeting
priority near the enemy base** (retarget living defenders before
structures/statue) folded into S7, and **#12 army readout HUD** folded
into S8. §4 and the S7/S8/S9 blocks below are updated accordingly. §4's
#7 default (PRNG plumbing only, no gameplay randomization) was overridden
by the owner: S9 now wires exactly one variation point — seed-derived
jitter on AI decision intervals — since zero variation points would make
Watch AI mode show an identical match every time regardless of seed.

**Next entry point: S7 — Formation system + combat.** Full session
breakdown with stop conditions in §5.

---

**S6 complete (Balance + polish).** All 10 of the brief's Acceptance
Criteria checked off in `stick-rts-brief.md`, each with live evidence
gathered this session (not just re-asserted from S1–S5 history) — see
below. Per the user's explicit scoping at session start: `WORLD_WIDTH`/
`VIEWPORT_WIDTH` (still 5×, unchanged) and general balance-constant tuning
were held back until the user has playtested; the documented Hard-vs-
Medium AI-vs-AI stalemate was left as a flagged note, not a fix target.
Everything else in scope was built and verified.

**Real gap fixed, not just polish:** the brief's one allowed off-screen
signal — "your statue is under attack" — didn't exist anywhere in the
code despite PLAN.md §2.4 committing to it since S0 (confirmed via grep
across `src/` before starting). Added a per-team `statueWarningTimer`
(`config.js` `STATUE_WARNING_DURATION`, 3s), set/retriggered in
`combat.js`'s `applyDamage` whenever a statue takes damage, decremented
alongside it in `updateCombat`. Rendered as a pulsing red banner in
`ui.js`, gated to the player's own team. Verified the trigger sets the
timer to exactly the configured duration and decays in exactly 3.00
simulated seconds (isolated script test), and confirmed by code-path
analysis (grep of every `applyDamage` call site) that statue damage is
only ever reachable through `findAttackTarget`'s existing structure-
gating logic — so the warning structurally cannot fire while gating
structures still stand, without needing a separate emergent-behavior
test. **Found and fixed a real bug in this same feature during
verification**, not just at build time: the banner stayed stuck on
screen through the win/lose overlay, because `runTick` stops advancing
world state once `matchState !== 'playing'`, freezing the timer at
whatever value it held at match end. Fixed by gating the banner's render
on `matchState === 'playing'`, then re-verified live (forced a statue hit
immediately followed by a win, confirmed banner suppressed on the
Victory screen where it previously stuck).

**Unmeasurable acceptance criterion made measurable:** "~40 units on
screen, stable 60fps" had no FPS counter or stress-spawn tooling to check
it at all. Added a smoothed FPS overlay (`F` to toggle) and a stress-spawn
debug hotkey (`S`) to `main.js`, exposed as `window.__spawnStressTest`/
`__toggleFpsOverlay`/`__fps` for scripted verification. First attempt at
the stress scenario revealed two real interaction bugs, not just cosmetic
ones: (1) placing both teams' 20-unit clusters within melee/acquire range
caused mutual annihilation in under 2 simulated seconds (40 → 6 units),
defeating the point of a sustained reading; (2) even after separating the
clusters beyond the 300px max acquire range, the still-active AI behavior
tree (default difficulty `medium`) saw the inflated "army," issued its
own `attack` command, and marched the AI's stress units through the
player's cluster via their un-overridden `enemyHomeX`. Fixed by pinning
both `homeX` and `enemyHomeX` to each stress unit's spawn position, which
neutralizes any command the AI or player later issues. Re-verified: 40
units held stationary for 4+ real seconds at a sustained ~60–65fps, zero
console errors, default headless invariant check still passing throughout.

**Baseline `--batch` runs across all 6 unordered difficulty pairings**
(5 trials each — the sim has zero RNG, confirmed by grep in S5, so
additional trials per pairing add no information). E vs M (851.9s) and E
vs H (553.7s) reproduced S5's exact figures; M vs H reproduced the
documented stalemate. **New finding, flagged not fixed:** H vs H does
*not* stalemate like the cautious mirror-matches (E/E, M/M) — the side
occupying the `ai`/right-side slot wins 5/5 identical trials in exactly
545.1s, every time. Since the sim is deterministic and both sides run
identical Hard parameters, this points at a positional or iteration-order
asymmetry somewhere in combat/targeting resolution rather than a
parameter imbalance — worth a root-cause pass in a future session
(would need combat-resolution debugging, out of scope for this session's
data-gather task), but not fixed now.

**UI legibility fixes**, informed by exploration of `config.js`/`ui.js`/
`renderer.js` at session start: build-menu buttons only dimmed via alpha
with no reason shown until a failed click; HUD text (gold/units/command)
sat directly on the battlefield with no contrast backing. Fixed both —
added a semi-transparent HUD backdrop panel, and a persistent per-button
disabled-reason label that mirrors `economy.js`'s exact reason precedence
(gold → cap/maxStructures, or heroAlive → heroCooldown → gold for
heroes) so the label never disagrees with what a real failed click would
report. `PURCHASE_REASON_TEXT` moved from `main.js` to `ui.js` as the
single source of truth for that wording (was previously duplicated across
the click-feedback path and would have needed a second copy for the new
persistent labels). Verified live: all 5 disabled states (gold, cap,
maxStructures, heroAlive, heroCooldown) screenshotted with correct,
dynamically-updating text that fits within the button bounds.

**Docs correction, no code change:** PLAN.md §2.5 previously claimed
`tools/headless.js --batch` reports gold-spent curves and unit-
composition-over-time; it never did — only win/loss/undecided counts and
average match length. Reworded §2.5 to match reality; those stats already
covered S5/S6's actual use case (catching win-rate skew across
pairings), so nothing was built to fill the gap.

**Full acceptance-criteria walkthrough — all 10 verified live this
session**, not re-asserted from S1–S5 history alone:
- Win/lose at each difficulty + rematch/difficulty-change: forced a win
  and a loss via direct statue damage, and clicked the win screen's
  "Hard" button via a real dispatched DOM click (not scripted state
  mutation) — confirmed `world.teams.ai.difficulty` changed and the match
  reset end-to-end.
- All 3 units + all 3 heroes purchasable/distinct: purchased one of each
  live, screenshotted.
- Hero control: toggled direct control, moved via dispatched arrow-key
  events (confirmed exact expected displacement — speed × dt), attacked
  and used special with no target (safe no-ops, no throw), killed the
  hero, confirmed cooldown timer and exactly the 1.5× escalated cost
  (600 → 900g), confirmed re-purchase blocked mid-cooldown
  (`heroCooldown` reason), then re-purchased a *different* hero
  (Hawkeye → Vanguard) once the cooldown cleared — switchable choice
  confirmed.
- Camera edge-scroll: proved deterministic via dispatched `mousemove` +
  `forceTicks` (avoiding reliance on the real rAF loop, which appears to
  throttle in a backgrounded automation tab) — right-scroll moved exactly
  `EDGE_SCROLL_SPEED × dt`, clamped correctly at `WORLD_WIDTH -
  VIEWPORT_WIDTH` (5600), left-scroll clamped at 0, and camera held
  perfectly still once the mouse left the canvas.
- Soft-lock / no-console-errors: zeroed the player's gold and units
  entirely, then fast-forwarded ~700 simulated seconds under an active
  Hard AI — resolved cleanly to `lost`, gold never went negative, zero
  console errors throughout.
- Supply/cap/config-centralization: confirmed by code reading this
  session (`supply.js`, `economy.js`) plus the live disabled-reason UI
  check above.

Zero console errors across every live check this session. Default
headless invariant check re-run and passing after every code change.

Files added this session: none. Modified: `config.js`
(+`STATUE_WARNING_DURATION`), `sim/world.js` (`statueWarningTimer` on
both teams), `sim/systems/combat.js` (trigger + decay), `render/ui.js`
(statue-warning banner, `PURCHASE_REASON_TEXT` moved here from `main.js`,
`getBuildButtonDisabledReason`, HUD contrast panel), `main.js` (FPS
overlay, stress-spawn debug tool, imports `PURCHASE_REASON_TEXT` from
`ui.js` instead of duplicating it), `render/renderer.js` (legend
documents the new `F`/`S` debug keys), `PLAN.md` §2.5 (docs correction),
`stick-rts-brief.md` (all 10 acceptance criteria checked off).

Repo checkpoint not yet committed — pending user request per this
session's git-safety rules.

**Next entry point:** v1's planned session breakdown (S1–S6) is complete
and all brief acceptance criteria pass. What's left is **user playtesting
across all 3 difficulties**, which was deliberately deferred rather than
guessed at: `WORLD_WIDTH`/pacing (currently 5×, match lengths run
~9–14 simulated minutes per S5/S6 data), and general unit/hero/AI
constant tuning in `config.js`. The Hard-vs-Hard positional-asymmetry
finding above is worth a root-cause debugging pass whenever AI-vs-AI
evaluation matters again. No further planned session exists until the
user's playtest surfaces specific feedback to act on.

---

**S5 complete (AI).** One shared parameterized behavior tree
(`sim/ai/behavior.js`) drives Easy/Medium/Hard purely through data
(`sim/ai/difficulties.js`) — no per-difficulty code branches. The AI
calls the exact same `buyUnit`/`buyStructure`/`buyHero`/`setTeamCommand`
functions the player's build menu and hotkeys use (no parallel AI-only
economy path), and it's scouting-gated exactly like the player
(`sim/ai/vision.js`): it only "knows" enemy composition currently visible
to one of its own units, and difficulty is partly expressed through how
stale that intel is allowed to be before acting on it. The `4–0`/`i/o/p`
debug hotkeys that stood in for the AI since S2 are retired — the AI now
drives itself entirely; the underlying `window.__buyUnit` etc. debug
hooks stay exposed for testing. The win/lose overlay gained Easy/Medium/
Hard buttons next to Rematch, finally fulfilling the "offers rematch and
difficulty change" acceptance criterion deferred since S3.
`tools/headless.js` gained an additive `--batch` mode for AI-vs-AI trial
evaluation (the S3-era `PLAN.md` §2.5 promise), alongside the unchanged
default invariant-check mode.

**One real, load-bearing bug found and fixed during verification, not
just a tuning nit:** the first-draft difficulty parameters had Medium/
Hard's build cycle spend early gold on a 250g archer before establishing
enough mining income, which — combined with `minArmyToAttack` thresholds
of 3–4 — left armies growing far too slowly to ever clear the attack
threshold. Matches never engaged; all 5 initial AI-vs-AI batch trials hit
the tick budget "undecided." Traced via direct position/gold tracing
(not just outcome-watching) to confirm units genuinely weren't moving,
not just resolving slowly. Fixed by front-loading two miners in every
build cycle before any archer purchase, and lowering `minArmyToAttack` to
2 for Medium/Hard. Re-verified: Hard now reliably beats Easy in exactly
553.7s (fully deterministic — no RNG anywhere in the sim, confirmed by
grep), Medium beats Easy in 851.9s, and the result is symmetric
regardless of which team is "player" vs "enemy" in the pairing.

**Known limitation, flagged not fixed:** Hard vs. Medium AI-vs-AI can
reach a genuine mutual stalemate (didn't conclude even at a 2000s tick
budget) — two comparably-cautious, comparably-growing AIs can deny each
other the power advantage either one's `retreatThreshold` needs to commit
to a breakthrough. Not fixed now because it isn't the brief's actual stop
condition (player-vs-AI behavior, not symmetric AI-vs-AI), and a human
"who ignores composition" plays more like Easy's over-commit pattern than
like a mirror-matched cautious AI — but it's a real S6 balance-pass note
if AI-vs-AI evaluation becomes a bigger part of the workflow.

Verified precisely via direct sim-state inspection (single atomic
`javascript_exec` scripts per assertion — S4's lesson about cross-call
real-time drift applied from the start this session) plus one real click
through the win/lose UI: vision/memory populates only when an enemy is
actually within `AI_SIGHT_RANGE` of an AI unit and stays `null` otherwise
(confirmed both states explicitly); composition counter-picks react
correctly to scouted intel (warrior-heavy → archer counter-purchase) while
Easy ignores the identical intel; retreat discipline flips Hard to
`defend` against a scouted 5-warrior army while Easy keeps attacking
regardless (`retreatThreshold: 0`); hero purchase timing gated exactly at
each difficulty's threshold (Easy: no hero at 149s, buys at 151s; Hard:
no hero at 15s, has one by 25s); hero counter-pick chose Vanguard vs.
scouted archers and Hawkeye vs. scouted warriors; "defends mine
harassment" flips Hard from `attack` to `defend` the instant a threat
enters `defendMineThreshold` of home, confirmed against a clean before/
after with an otherwise-attack-eligible army; a real click on the win/
lose screen's "Hard" button changed `world.teams.ai.difficulty` and reset
the match end-to-end. Zero console errors throughout. Both
`tools/headless.js` modes re-confirmed passing after all fixes.

**Verification note:** hit the same ES-module browser-caching issue as
S3 (server correctly served fresh `renderer.js` per `curl`, but the
browser kept rendering stale content even across a brand-new tab — Chrome's
HTTP disk cache is shared browser-wide by URL, not per-tab, so a new tab
doesn't help). Fixed by restarting the static server on a new port
(8000→8010), which forces a fresh cache namespace. Worth remembering
directly for S6 rather than re-discovering: if edited source doesn't
appear to take effect despite a page reload, suspect disk cache before
suspecting the edit.

Files added: `sim/ai/vision.js`, `sim/ai/difficulties.js`,
`sim/ai/behavior.js`. Modified: `config.js` (+`AI_SIGHT_RANGE`),
`sim/world.js` (`createWorld` +`matchElapsedTime`/+`aiMemory`; each team
+`difficulty`/`decisionTimer`/`buildIndex`), `sim/tick.js`
(+`matchElapsedTime` accrual, +`updateAiDecisions` call), `render/ui.js`
(+difficulty buttons on win/lose overlay), `render/renderer.js` (legend
drops dead debug-key text, shows active AI difficulty), `main.js` (drops
ai-team keyboard hotkeys, `resetMatch(difficulty)`, defaults to
`'medium'`, wires difficulty-button clicks), `tools/headless.js`
(+`--batch` mode, default tick budget raised from 20000→60000 since
matches can run several minutes).

Repo checkpoint committed.

**Next entry point: S6 — Balance + polish.** Playtest-driven tuning pass
on `config.js` (informed by `tools/headless.js --batch` runs across
difficulty pairings — including a look at the Hard-vs-Medium stalemate
noted above), battlefield-length constant tuned within the 3–10
screen-width range (currently `WORLD_WIDTH`/`VIEWPORT_WIDTH` = 5×, inside
range but worth revisiting alongside match-pacing — full matches
currently run ~9–14 simulated minutes, which may be too slow for a
"playable" v1 feel), UI legibility pass, and a full bug scrub against the
brief's acceptance criteria checklist. Stop condition and full scope are
in §5.

---

## 4. Question Log (as of end of S9)

**Resolved in Session 0:**

1. **AI vision parity (2.3):** confirmed — AI is scouting-gated like the
   player. `ai/vision.js` is in scope.
2. **Headless evaluation (2.5):** confirmed — `tools/headless.js` is in
   scope, first landing in S3 (invariant checks) and extended in S5
   (AI-vs-AI balance evaluation runs), reusable any time gameplay needs
   evaluating.

**Still open, default stands unless flagged before S1:**

1. **Local dev server:** defaulting to `python3 -m http.server` as the
   "trivially-launched" method, since it needs no install on most laptops.
   Flag if you'd prefer an `npx serve`/Node-based default instead.

**Resolved for v2 (owner answers, 2026-07-19 — see
`stick-rts-v2-updates.md`'s Answers section):**

2. **1D vs 2D combat (S7):** confirmed — combat range/acquisition checks
   stay 1D (`x`-only); `y` is formation state only. The resulting
   cosmetic side effect (a unit's attack/projectile can visually travel
   diagonally toward a target at a different `y` while range is judged on
   `x` alone) is accepted, not treated as a bug.
3. **Multi-column growth direction (S7):** confirmed — new columns form
   *toward the enemy*; the line thickens outward as the army grows.
4. **Cap/supply split (S8):** confirmed — `BASE_UNIT_CAP` 15,
   `STRUCTURE_CAP_BONUS` 13, `MAX_STRUCTURES` 5 → cap 80, under the
   100-unit stress target.
5. **Zoom representation (S8):** confirmed — single `CONFIG.CAMERA_ZOOM`
   render-time scale multiplier; sim stays in unscaled world px.
6. **Settings scope (S9):** confirmed — FPS-overlay toggle +
   default-difficulty only. Game speed stays deferred; flagged as the
   designated v3 settings candidate — most wanted as a fast-forward in
   Watch AI mode, where matches run many minutes.
7. **Seeded-PRNG application scope (S9):** default overridden — plumbing
   alone would make every seed produce an identical Watch AI match (zero
   variation points = inert feature). S9 wires **exactly one** minimal
   variation point: seed-derived jitter (±10–15%) on AI decision
   intervals, small enough to need no dedicated balance pass. No other
   gameplay randomization in v2. Same-seed reproducibility must still
   hold byte-for-byte; different seeds must actually diverge.

**New items pulled into scope by the same answers round (not originally
in this plan's first draft):**

8. **Targeting priority near enemy base (S7, source doc item 6):**
   attackers in acquire range of the enemy base prioritize living
   defenders (enemy warriors/archers/hero) over miners over supply
   structures over the statue — statue-gating itself is unchanged, this
   only reorders what dies first among reachable targets. Includes a
   retarget rule: a unit currently attacking a structure switches to a
   combat unit that enters its acquire range. Explicitly flagged by the
   source doc as combat-resolution-changing — re-check the Hard-vs-Hard
   positional asymmetry (S6 finding, see below) after this lands, since
   it may alter or incidentally fix it.
9. **Army readout HUD (S8, source doc item 12):** persistent own-team-only
   unit count by kind (e.g. "24 miners · 12 warriors · 5 archers"),
   doubling as the production-queue display (active build + progress +
   queued items) that S8's production queue needs anyway. Own team only —
   showing enemy composition would leak exactly the off-screen intel the
   camera-culling rule (§2.4) is designed to withhold.

---

## 5. Completed Session Specifications

### v1 (S1–S6)

### S1 — Engine skeleton
**Build:** `index.html` + `main.js` bootstrap; fixed-timestep accumulator
loop (60Hz sim, decoupled from `requestAnimationFrame`); canvas setup;
`stickFigure.js` procedural rendering with idle/walk states; one hardcoded
unit walking a fixed path, no AI, no combat.
**Stop condition:** Serve locally, load `index.html`, see one animated
stick figure walk smoothly across the canvas. Confirm sim tick count
accrues at a steady 60/sec independent of display refresh (log/verify).
Zero console errors. **Gate: review loop + animation architecture before
building systems on top of it.**

### S2 — Units + combat
**Build:** Miner/Warrior/Archer entities from `config.js` stats; targeting
and acquisition; melee resolution; projectile arc for Archer; death +
cleanup; global Attack/Defend/Retreat commands wired to a temporary debug
control (build menu doesn't exist yet).
**Stop condition:** Spawn small squads of each type on a test map, issue
each army command, observe warriors winning close-in fights against
archers and archers winning at range when protected (rock-paper-scissors
reads correctly). Units die and are removed cleanly; no console errors.

### S3 — Economy + match loop
**Build:** mining loop (walk/extract/deposit), gold counter, build menu UI,
supply structures with cap math + statue-gating enforcement, statues with
HP, win/lose detection, win/lose screen with rematch; `tools/headless.js`
v1 — scripted-input runner that drives a match to completion with no
canvas/DOM and asserts cap enforcement, gold-never-negative, and statue
immunity while structures stand.
**Stop condition:** Play one full match start-to-finish with no AI (manual
control or a dummy on both sides): mine gold, hit the unit cap, build a
supply structure to raise it, destroy enemy structures then the statue,
reach the win screen, rematch, confirm state resets cleanly. Confirm no
soft-lock at 0 gold / 0 miners. `node tools/headless.js` runs a scripted
match to completion and reports all invariants held, no browser involved.

### S4 — Heroes
**Build:** Forgemaster/Hawkeye/Vanguard stats + specials; purchase from
build menu; direct-control toggle (movement/attack/special keys, camera
snap on toggle); non-controlled hero follows current army command via
basic AI; death, cooldown, escalating re-purchase cost, switchable hero
choice on re-purchase.
**Stop condition:** For each hero — purchase, toggle direct control,
move/attack/special via keyboard, let it die, confirm cooldown + escalated
cost, re-purchase a different hero. Camera snaps correctly on toggle
in/out.

### S5 — AI
**Build:** shared parameterized behavior tree (2.3) — build order,
decision-tick frequency, retreat discipline, hero purchase timing,
composition-counter weighting, scouting/vision (`ai/vision.js`);
Easy/Medium/Hard parameter sets; extend `tools/headless.js` to run AI-vs-AI
matches (any difficulty pairing) for N trials and report winner, match
length, and gold-spent curve per trial.
**Stop condition:** Play one full match at each difficulty. Easy is
beatable with a simple attack-move approach. Hard beats a player who
ignores composition (spams one unit type) but remains beatable with
counters. Medium sits visibly between the two. Confirm via a gold log that
the AI never spends beyond what it has earned (no cheating). Confirm
`tools/headless.js` can run a batch of Hard-vs-Hard (or any pairing)
matches unattended and report results.

### S6 — Balance + polish
**Build:** constants tuning pass from playtesting (`config.js` only),
informed by `tools/headless.js` batch runs across difficulty pairings to
catch win-rate skew or degenerate strategies faster than manual replay;
battlefield-length constant tuned within the 3–10 screen-width range; UI
legibility pass (HP bars, command indicator, gold counter); full bug scrub
against the brief's acceptance criteria.
**Stop condition:** Walk every line of the brief's Acceptance Criteria
checklist and mark pass/fail — all must pass. Stress scenario with ~40
units on screen holds ~60fps on a typical laptop. Zero console errors
across one full match at each difficulty.

**Escalation gate carried from the brief:** if S5/S6 playtesting shows
parameter tuning alone can't make Hard feel threatening, stop and raise it
as a design decision (possible income multiplier) rather than silently
adding one.

## v2 Sessions (S7–S9)

Extends the completed v1 (`stick-rts-brief.md` + S1–S6 above), scoped from
`stick-rts-v2-updates.md`. Same session discipline as v1: each session
ends with a commit at a stable checkpoint and a Status update naming the
next entry point; no session proceeds past its stop condition without a
human gate. Item numbers below follow the source doc's final numbering
(post-answers-round, item 6 = targeting priority, item 12 = army readout
HUD — both added after this plan's first draft).

**Carried-over engineering constraints (non-negotiable for all of S7–S9):**
- Determinism preserved — any randomness flows only through S9's seeded
  PRNG (`sim/rng.js`); nothing before S9 introduces `Math.random` or
  equivalent anywhere in `src/`.
- Every new tunable (formation spacing/depths, cohesion distance, zoom,
  vertical band, cap/supply math, build times, parallax depths) lives in
  `config.js` — no magic numbers in system code.
- Sim/render separation intact: formations and cohesion are sim
  (`sim/systems/formation.js`); parallax and zoom are render/camera
  (`render/parallax.js`, `camera.js`); menus are UI state (`matchState`
  + `ui.js`).
- Every S1–S6 balance baseline in this file is invalidated by S7/S8
  tuning changes — the full `--batch` re-baseline across all 6 difficulty
  pairings happens once, at the end of S8, after cap/cost/queue have all
  landed (not incrementally per-session).

### S7 — Formation system + combat
**Build:** items 1–6 of the source doc (formation/cohesion items 1–5 plus
the new targeting-priority item 6, which lands here because it touches the
same combat/targeting code the formation work touches), plus vertical
depth (item 8), since ranks/files need the wider y-band to have room to
form in.
- New `sim/systems/formation.js`: assigns each living combat unit a
  deterministic `(slotX, slotY)` — ranked by kind (warriors outer/front,
  archers inner/back), filed by a stable sort key (`unit.id` order, never
  spawn/iteration order, never RNG) so replays and headless runs stay
  reproducible. Config: `FORMATION_SLOT_SPACING_X`,
  `FORMATION_SLOT_SPACING_Y`, `FORMATION_SLOTS_PER_RANK`,
  `FORMATION_Y_BAND` (must fit within `GROUND_Y` and `CANVAS_HEIGHT`
  minus HUD/build-menu space — currently `GROUND_Y=440`,
  `CANVAS_HEIGHT=540`, so the band has roughly 200–440px of headroom to
  work with; confirm against the actual HUD footprint before picking a
  final number).
- `movement.js`'s `desiredX` under `defend`/`retreat` (today a single
  `unit.homeX` scalar shared by every unit on the team — the direct cause
  of the current stacking) becomes per-unit, sourced from
  `formation.js`'s slot assignment; same for `attack`'s `enemyHomeX`
  target once units are close enough to engage rather than just marching
  to a shared point.
- **Mine screening (Defend):** the screening line sits past the mine zone
  (`MINE_OFFSET=240`, `MINE_SLOTS=4`) toward the enemy side — not at
  `homeX` — so miners stay behind the line. New config:
  `DEFEND_SCREEN_OFFSET`, plus a per-kind depth constant (warriors at the
  screen line itself, archers a configurable distance behind it).
- **Multi-column growth:** when a rank's slots (`FORMATION_SLOTS_PER_RANK`)
  are full, the next unit's column forms one `FORMATION_SLOT_SPACING_X`
  step toward the enemy from the existing line (see open question #3
  above — flag if "in front of" was meant the other direction).
- **Archer cohesion:** archers hold if the nearest living friendly warrior
  is farther than `ARCHER_COHESION_DISTANCE`; re-checked every tick (not
  a latched/one-time flag) so cohesion resumes correctly if warriors are
  purchased after a zero-warrior hold. Zero-warrior edge case: hold in
  place, don't advance alone, don't freeze permanently once a warrior
  exists again.
- **Archer speed:** `UNIT_STATS.archer.speed` 70 → tune upward (proposed
  starting point 80, still below warrior's 90) — reconfirm during this
  session's stop-condition playtest, not a blind config edit.
- **Targeting priority near enemy base:** `findAttackTarget` (`supply.js`)
  currently returns the nearest enemy unit in range, else nearest
  structure, else the statue — no preference among living defenders vs.
  miners. Reorder within the "unit" tier: living combat units (enemy
  warriors/archers/hero) first, then miners, *then* fall through to the
  existing structure/statue tiers unchanged (statue-gating itself is not
  touched). Add a retarget rule in `combat.js`/`movement.js`: a unit
  currently attacking a structure or statue re-targets immediately if a
  living enemy combat unit enters its `acquireRange` — check this every
  tick a target is held, not just at initial acquisition. **This changes
  deterministic combat resolution** — per the source doc, re-run the
  Hard-vs-Hard `--batch` pairing at this session's end and record whether
  the S6-documented positional asymmetry (right/`ai`-slot wins 5/5 at
  545.1s) changed, resolved, or persists. Don't assume either outcome
  going in.
- **Explicit decision this session rests on (see open question #2):**
  combat range/acquisition checks (`combat.js`, `supply.js`, `world.js` —
  all currently `Math.abs(x1-x2)`) stay 1D. `y` becomes real,
  actively-maintained sim state for positioning/formations only — not a
  switch to 2D Euclidean targeting. Flag before starting if that's wrong.
**Stop condition:** Spawn medium/large mixed armies under each command;
screenshot confirms units occupy visually distinct slots (no stacked
blobs) with warriors forming the outer/front line and archers behind
under Defend. Force a rank past capacity and confirm a second column
forms in front, not overlapping the first. Zero living warriors → archers
hold, don't advance, don't freeze permanently (purchase a warrior mid-hold
and confirm archers resume escorted advance). Archer speed increase
confirmed against the tuned constant. Confirm targeting priority live: an
attacker parked on an enemy structure switches to a living defender that
walks into range; confirm statue-gating still holds (structures still
must die first when no defenders/miners are reachable). `node
tools/headless.js` (both default invariant mode and one `--batch`
pairing) still passes — confirms the formation and targeting changes
introduced no RNG and no invariant regressions. Interim baseline: re-run
`--batch` across all 6 pairings, record whether the Hard-vs-Hard
positional asymmetry changed/resolved/persists, and note (not necessarily
fix) any other win-rate/timing shift from formation-driven pathing
changing time-to-engage.

### S8 — Scale + economy
**Build:** zoom (item 7), cap/supply rework + 100-unit stress test
(item 9), structure cost doubling (item 10), build times + production
queue (item 11), army readout HUD (item 12, since it displays the queue
this session builds) — the heavy balance session, since build times
"change opening pacing more than any other item" per the source doc.
- **Zoom:** new `camera.zoom` state (default per open question #5:
  `CONFIG.CAMERA_ZOOM` render-time scale multiplier, sim stays in
  unscaled world px). Touches every draw call in `renderer.js`,
  `stickFigure.js`, and `ui.js` that currently computes screen position
  as raw `x - camera.x` with no scale factor — audit all of them, not
  just the obvious ones.
- **Cap/supply rework:** implement the split from open question #4 (or
  the user's adjustment) in `config.js`; `getCap` (`supply.js`) math
  itself doesn't need to change, only the constants. Stress-spawn tool
  (`main.js`'s `spawnStressTest`, currently hardcoded to 20-per-side/40
  total) updated to spawn 50-per-side/100 total regardless of the final
  cap, keeping its existing `homeX`/`enemyHomeX` pinning workaround.
  **Dependency on S7:** re-verify S7's formation/multi-column system at
  100-unit scale, not just re-confirm the old 40-unit stress case —
  slot-capacity constants chosen in S7 need headroom for this.
- **Structure cost:** `STRUCTURE_COST` 150 → 300 in `config.js`. Note for
  the AI re-tuning pass below: `behavior.js`'s reactive
  cap-block-triggers-`buyStructure` path gets meaningfully slower to
  afford after this change — watch for it, don't assume it's fine.
- **Production queue:** new `sim/systems/production.js` +
  `world.teams[team].productionQueue` (per §2.7). `buyUnit`/`buyHero`/
  `buyStructure` (`economy.js`) split into "validate + deduct gold +
  enqueue" (unchanged signatures/return shape, so the AI's
  `attemptPurchase`/`maybeManageHero` in `behavior.js` keep working with
  zero AI-side code changes — no AI-only economy path) vs. "materialize
  entity," the latter now gated on the queue timer elapsing. Validation
  (gold/cap) happens once at enqueue time only — no re-check at
  completion (the brief doesn't specify a re-check fallback, so don't
  invent one). New config: `MINER_BUILD_TIME: 5`, `WARRIOR_BUILD_TIME:
  10`, `ARCHER_BUILD_TIME: 12`, `STRUCTURE_BUILD_TIME: 20`,
  `HERO_BUILD_TIME: 30`. Hero respawn cooldown
  (`heroCooldownTimer`, decremented independently in
  `heroes.js`'s `updateHeroCooldowns`) runs in parallel with, not stacked
  on top of, the queue's 30s hero build time — verify this explicitly,
  it's the easiest part of this session to get quietly wrong.
  `ui.js`'s build menu gains an active-build-progress + queued-items
  display, extending the existing disabled-reason label pattern from S6
  (`getBuildButtonDisabledReason`/`PURCHASE_REASON_TEXT`) with a new
  "queued" state distinct from "can't afford."
- **Army readout HUD:** persistent, own-team-only unit count by kind
  (e.g. "24 miners · 12 warriors · 5 archers") in `ui.js`'s HUD, reusing
  the same per-team unit array the build menu already reads. Doubles as
  the production-queue display above — same panel, not a separate
  widget. Own team only, never the enemy's — showing enemy composition
  would leak exactly the off-screen intel the camera-culling rule (§2.4)
  is designed to withhold; this needs an explicit check that no enemy-team
  data path feeds this panel.
- **AI re-tuning:** `ai/difficulties.js`'s `decisionInterval`,
  `heroPurchaseDelay`, `minArmyToAttack`, and build-cycle ordering all
  need re-tuning now that purchases no longer materialize instantly — the
  AI's `armyPower`/`countCombatUnits` reasoning in `behavior.js` will see
  a smaller army than its recent spending implies for a 5–30s window per
  purchase. This is this session's real balance work, not a footnote.
**Stop condition:** Purchase a unit — gold deducts immediately, unit
doesn't appear until its build time elapses; queue a second item and
confirm it starts only once the first completes. Kill a hero, confirm the
30s respawn cooldown; separately confirm a fresh hero purchase after
cooldown clears takes exactly 30s to materialize (not 60s stacked).
Stress-spawn 100 units, hold ~60fps on a typical laptop (replaces the v1
"~40 units" criterion — this is the brief's explicit new stress target).
Default zoom visibly shows more battlefield than S6's view. New cap
verified live via `getCap`. Structure costs confirmed at 300g. Army
readout HUD shows the correct live per-kind own-team count plus active
build progress and queue contents; confirm no enemy-team data is ever
read by the panel (code-path check, not just visual). Both
`tools/headless.js` modes pass with queue-aware invariants (gold deducted
once, at enqueue — never double-charged, never charged with no
corresponding queue entry). **Full `--batch` re-baseline across all 6
difficulty pairings, recorded in this file's Status section**, replacing
every S5/S6 figure now invalidated by cap/cost/queue changes — including
whether the documented Hard-vs-Medium stalemate and the Hard-vs-Hard
positional asymmetry both survive.

### S9 — Visuals + menus + Watch AI
**Build:** parallax (item 13), landing page + settings (item 14), Watch AI
including the Hard-vs-Hard asymmetry root-cause and seeded PRNG
(item 15) — last, because Watch AI has the session's only genuine
unknowns and benefits from S8's balance work being finished first.
- **Parallax:** new `render/parallax.js`, 2–3 depth layers scrolling at
  fractions of `camera.x` (e.g. 0.2×/0.5×/0.8×), procedural line-drawn
  horizon/mountains/trees/bushes. Render-only, zero sim impact — lowest-
  risk item in all of S7–S9.
- **Landing page:** `matchState` gains a `'menu'` value as the actual
  initial state (`world.js`'s `createWorld`, currently `'playing'`);
  `main.js`'s boot sequence (currently `createWorld()` + immediate live
  match at module load) changes to start in `'menu'` instead.
  `tick.js`'s existing `if (world.matchState !== 'playing') return;`
  guard already no-ops ticking for `'menu'` for free — confirm this holds
  rather than assuming it. New `ui.js` screens: Play (→ difficulty select
  → `resetMatch(difficulty)`, reusing the existing function), Watch AI,
  Settings. Settings scope per open question #6: FPS-overlay toggle +
  default-difficulty only; game speed deferred.
- **Watch AI:** both AI teams get a `difficulty` set (reusing
  `world.teams[team].difficulty`, same mechanism `--batch` already uses),
  player input and the build-menu click handler suppressed, camera
  becomes freely pannable (no hero-follow, no edge-scroll-only
  restriction).
- **Hard-vs-Hard asymmetry root-cause:** start from S8's re-baseline
  result, not the original S6 figures — S7's targeting-priority change
  (item 6) explicitly may have altered or incidentally fixed this, so
  confirm current status first rather than assuming the 545.1s/5-of-5
  pattern still holds. If it persists, genuine debugging work — don't
  assume the cause going in. Worth checking first, not yet confirmed:
  tie-breaking behavior in `findNearestEnemyWithin`/`findAttackTarget`
  (`world.js`/`supply.js`), and the fixed `['player', 'ai']` iteration
  order in `updateAiDecisions` (`behavior.js`) giving `player` a
  one-decision-tick head start every cycle, compounding over a
  multi-minute match. Budget real investigation time; it's acceptable to
  end this session with a documented "couldn't fully isolate it" if
  that's the honest outcome.
- **Seeded PRNG:** new `sim/rng.js` (seedable/reproducible, e.g.
  mulberry32 — no crypto dependency needed), `seed` threaded through
  `createWorld(seed)`, seed shown/selectable in the Watch AI screen,
  `tools/headless.js` gains `--seed=N`. Scope of actual randomization per
  the overridden answer to open question #7: wire **exactly one**
  variation point — a seed-derived jitter of ±10–15% applied to each
  team's `decisionTimer` reset in `updateAiDecisions` (`behavior.js`,
  currently a flat `difficulty.decisionInterval` with zero variance) —
  small enough to need no dedicated balance pass. No other gameplay
  randomization in v2. Verify both directions explicitly: same seed
  across two headless runs produces a byte-for-byte identical match
  trace; two different seeds produce genuinely different match lengths.
**Stop condition:** Parallax renders at 2–3 visible depths, scrolling
correctly with camera pan. Fresh page load shows the landing page, not a
live match. Play → difficulty select → match works end-to-end. Watch AI
runs two Hard AIs with player input/build UI confirmed suppressed and
free camera confirmed pannable across the full world width. Settings
toggles (FPS overlay, default difficulty) take effect live. H-vs-H
asymmetry has either a documented root cause, a documented "S7 already
fixed it," or a documented, honest account of why it couldn't be fully
isolated. Seeded PRNG: same seed via `--seed=N` produces a byte-for-byte
identical match trace across repeated headless runs; two different seeds
produce measurably different match lengths via the decision-interval
jitter. Zero console errors. Re-confirm (not
re-derive from scratch) that win/lose, rematch, and difficulty-change
still work correctly now that a menu sits in front of the match — this
was an S6 acceptance criterion and the menu must not have silently broken
it.
