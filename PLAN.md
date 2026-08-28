# PLAN.md — Stick RTS

Cross-session context carrier. Keep current scope, recovery state, and dirty-worktree warnings here. Completed work belongs in `HISTORY.md`; detailed durable findings live in focused `docs/analysis/` documents.

## Integrated release — Player Defend formation, turret/warrior balance, and player-facing presentation

Owner-approved 2026-08-28. Fast-forwarded from `agent/defend-turret-balance-local` to local `main` and pushed to `origin/main` in `e3ec6de` on 2026-08-28. The candidate LAN server may continue serving this now-integrated worktree until it is retired.

**Included:** remove the defending archer’s dynamic wait-for-nearby-warrior behavior so an untargeted archer returns to its assigned defensive formation slot like a warrior. Preserve combat targeting, Attack, and Retreat behavior. Keep the first defense anchor at the first buildable turret closest to the mine (`380px`), not the starting/core turret. Player-issued Defend cycles the selected formation anchor across completed buildable turrets (`380 → 900 → 1420 → 380`) and wraps from the furthest completed turret back to inner; a turret completing does not alter the selected anchor. AI-issued Defend remains non-cycling. Apply only the requested constants: turret cost `600 → 780`, turret damage `47.6 → 42.84`, warrior HP `54.6 → 62.79`.

**Included extension — approved 2026-08-28:** expand the Game Guide with current team-vision semantics, the Player Defend turret-cycle behavior, Pause/Game Speed controls, and a config-derived reference for Miner/Warrior/Archer/Structure/Turret/Raven cost, HP, and DPS where combat applies. Add a menu-only, renderer-owned Raven fly-by at 1× wall-clock pace on a deterministic 10–20-second interval, with no simulation/AI/RNG interaction. Record the existing authoritative total-resource differential (`player gold + spent − ai gold − spent`) once per simulation second and render a Player-vs-AI end-game chart with a zero baseline, solid blue/red line, color-correct shaded area, crossings, current signed lead, and time endpoints. Preserve Watch-AI end overlay behavior.

**Deliberate exclusions:** turret count/placement/build time/range/cooldown/HP; any other unit stat or cost; AI strategy; mine/economy; heroes; formation spacing; Watch-AI end overlay/chart; mobile redesign; remote deployment/push; generated screenshot versioning.

**Validation complete / integrated and pushed:** focused red→green checks prove stranded defender archers return to assigned slots, Player Defend selects `380, 900, 1420, 380` through actual `W` input and wraps after the third completed turret, AI Defend remains inner, and a completed turret does not move the selected anchor. The requested constants are exact: turret cost `780`, damage `42.84`, warrior HP `62.79`. The two-page Guide, camera-scaled landing Raven, and enlarged/repositioned Player-vs-AI gold chart were LAN-reviewed. Retained defense, formation, turret, queue-cap, and 5,000-tick headless checks pass; `git diff --check` passes. Headless Chrome/CDP loaded the verified LAN candidate with no runtime exceptions. Served candidate modules SHA-256-match the reviewed worktree. Source and release ledger are integrated in `e3ec6de`; this documentation reconciliation commit follows it.

## Current approved scope — deposits, player guide, and miner safety/build time

Owner approval: 2026-08-27. Source/test integration is on `main` in `10f5eda`; the reviewed candidate worktree remains available only for local generated evidence.

**Included:** retain the already-validated three mirrored gold deposits centered at the existing mine (±`38px`) and deterministic stable miner allocation while preserving the four-worker team-wide extraction cap, mine-cycle timing, and gold per trip. Add an opaque Game Guide reachable from the landing page and Player-vs-AI pause menu, returning to the originating menu/state and covering current controls, UI, Miner/Warrior/Archer/Structure/Turret/Raven references, matching glyphs, and Q/W/E command keycaps. Increase authoritative miner build time from `5s` to `5.75s` (+15%). First diagnose the owner-reported miner non-retreat through a deterministic red reproduction and real browser path; trace the threat query, movement intent, tick order, and render state before applying only the necessary source fix so threatened miners reliably retreat to their core.

**Deliberate exclusions:** changes to miner cost/speed, gold amount/cycle, AI production policy, tower placement and defense formation, combat balance/targeting, hero re-enablement, and generated screenshot versioning.

**Evidence complete:** focused Node regressions passed red→green; retained mining/defense/saturation/turret/headless checks pass; real Chrome/CDP exercised landing → Guide → Back, paused match → Guide → Back, guide keycaps/glyph visual rendering, and mine allocation. Exact candidate source was LAN/hash-verified before review. The approved source/test release was fast-forwarded to `main` and pushed to `origin/main` as `10f5eda`; generated screenshots remain local-only.

## Current status — 2026-08-27

### Integrated local-main scope — population, saturation, and telemetry

Owner approval: 2026-08-27. Continue in the existing reviewed saturation worktree/branch without discarding its dirty source/test changes.

**Included:** make population’s primary count equal living non-hero units and explicitly show queued unit reservations; structures and all turrets (completed or queued) consume zero population and do not block turret purchase on cap. Keep queue-limit, gold, structure/turret maximum, and unit-reservation enforcement authoritative. Render the active production-queue head as a persistent, progress-marked chip so structure/turret glyphs do not vanish when they become active; retain the existing active build-button progress cue.

**Deliberate exclusions:** cap/queue-limit rebalance, unit/structure/turret prices or stats, build ordering, AI policy, saturation behavior, deployment, push, and generated screenshot versioning.

**Validation complete / awaiting owner LAN review:** `tools/population-and-queue-ui-check.mjs` passed red→green, proving turrets reserve zero population, the player HUD shows literal units with explicit queued reservation, and the active structure glyph persists in the queue row. Retained queue, turret, saturation, syntax, and 5,000-tick headless checks pass; `git diff --check` passes. Real Chrome/CDP canvas input on the candidate clicked Structure, Turret, and Miner, producing active `structure` at ~50% progress plus pending `turret` and `unit`; it observed `living: 0`, `queued: 1`, `reserved: 1`, no console errors, and screenshot `artifacts/screenshots/population-queue-browser.png` (local-only). The served `economy.js` and `ui.js` SHA-256 values match the candidate worktree at `http://192.168.0.83:8812/`. `PLAN.md` evidence is now recorded in `HISTORY.md`; source/test integration is complete on `main` in `3feec8f` and remote synchronization is verified in `1c276c3`. Generated screenshots remain local-only.

### Integrated local-main scope — warrior/archer target saturation

Owner approval: 2026-08-27. Worktree: `C:\\Users\\simcr\\projects\\stick-rts\\worktrees\\player-telemetry-kills` on `agent/warrior-archer-target-saturation-local`, based on local commit `be4e188`.

**Included:** deterministic target-saturation selection for warriors and archers only. Within the existing selected target-priority tier, a new/reacquiring warrior or archer uses the configured saturation multiplier for living friendly warrior/archer units currently committed to each candidate, then the existing distance preference and stable-ID tie-break. Preserve existing target stickiness, priority hierarchy, core-turret shield/statue gating, movement, hero behavior, and turret behavior.

**Deliberate exclusions:** combat stats/balance, production/AI strategy, heroes, turrets, formations, continuous retargeting, changes to targeting priority/gating, deployment, push, and unrelated generated screenshots.

**Validation complete / awaiting owner LAN review:** `tools/target-saturation-check.mjs`, `tools/core-turret-shield-check.mjs`, `tools/turret-targeting-check.mjs`, `tools/turret-sim-check.mjs`, and `tools/headless.js` pass; `git diff --check` passes. A real Chrome CDP fixture against this candidate created two enemy combat targets and two warriors plus two archers, and observed an exact `2/2` target split (`warrior → near/far`, `archer → near/far`) with no console errors. Screenshot: `artifacts/screenshots/target-saturation-browser.png` (local-only). The exact candidate is served at `http://192.168.0.83:8812/`; served `src/sim/systems/supply.js` SHA-256 matches the worktree. `PLAN.md` evidence is now recorded in `HISTORY.md`; source/test integration is complete on `main` in `3feec8f` and remote synchronization is verified in `1c276c3`. Generated screenshots remain local-only.

### Integrated local-main scope — shared match telemetry, kills, and player pause placement

Owner approval: 2026-08-27. Isolated worktree: `C:\\Users\\simcr\\projects\\stick-rts\\worktrees\\player-telemetry-kills` on `agent/player-telemetry-kills-local`, based on `main` `df05832`.

**Included:**

1. Share the match clock and existing total-resource gold differential between Watch AI and Player-vs-AI presentation.
2. Show match-total unit kills around the centered clock in both modes: Player/left **Blue** kills on the left; AI/right **Red** kills on the right. Kills derive from the opponent's authoritative unit-loss counter; structures and cores remain excluded.
3. Move only the Player-vs-AI pause button from top center into the top-right control cluster, immediately left of the existing + / − zoom buttons. Preserve Watch AI's bottom-left speed/pause controls.
4. Add focused telemetry/layout regression coverage, exercise real click paths and rendering in Chrome, then serve and verify the exact candidate on the LAN before a local-only commit.

**Deliberate exclusions:** combat/gold/AI/timing behavior, any new simulation counters, Watch control placement, mobile control redesign, deployment, push, and unrelated dirty artifacts/worktrees.

**Validation complete:** `tools/match-telemetry-check.mjs` and `tools/match-telemetry-layout-check.mjs` pass. Chrome CDP against the candidate confirmed rendered `BLUE 5 | 03:42 | 2 RED` plus gold differential, real top-right pause/resume, and adjacent zoom-in; `tools/pause-ux-check.mjs` and `tools/desktop-ux-check.mjs` also pass against the same LAN server with no console errors. Screenshot: `artifacts/screenshots/player-telemetry-kills-browser.png` (local-only). The candidate is served at `http://192.168.0.83:8812/`; its served `src/render/matchTelemetry.js` SHA-256 matches the worktree. The telemetry source/test integration is complete on `main` in `be4e188`, and remote synchronization is verified in `1c276c3`; its concise release ledger is in `HISTORY.md`.

### Completed mainline scope — heroes off, third tower, queue capacity

Owner approval: 2026-08-27. Source was reviewed in `C:\\Users\\simcr\\projects\\stick-rts\\worktrees\\pvai-pause-speed` on `agent/pvai-pause-speed-local`, then fast-forwarded to `main` and pushed to `origin/main` in `ad03217`. Generated screenshots remain intentionally untracked.

**Included:**

1. Preserve hero implementation but disable it through a configuration gate: remove hero purchase/UI/control/HUD presentation; reject player hero purchases at the authoritative economy seam; ensure AI creates no hero candidates or hero-purchase attempt.
2. Raise the total turret limit from three to four (one starting/core plus three buildable), add the third automatic mirrored slot at `1420px` from home so it is spaced `520px` after the second buildable tower, and schedule Hard AI's third buildable tower at 20 minutes.
3. Raise the shared FIFO production queue limit from five to ten and render an exact `current/10` indicator immediately left of the queue chips.
4. Correct build-menu active-state matching so queue entries with action-owned null kinds (structures and turrets) receive their active progress bar; add a render-path regression that prevents an undefined turret button status after the tower limit is reached.
5. Add focused deterministic/UI checks and run affected existing checks; verify the exact worktree through a cache-busted LAN browser review before a local commit.

**Deliberate exclusions:** deleting hero source/assets, hero redesign/balance, changes to existing tower cost/combat/population behavior, altering the established defensive formation anchor (inner first turret; outward coverage only through second turret), queue ordering/build times, broad AI strategy/balance work, remote push/deployment, or unrelated dirty/generated artifacts.

**Evidence gates:** red→green focused checks prove hero disabling across economy/AI/UI, third-tower legality/placement/AI schedule and retained population accounting, ten-item queue enforcement, and queue indicator geometry/text contract. Existing relevant checks must remain green. Browser/LAN review must show no hero controls, a queue indicator at an occupied queue, and the served candidate asset from this exact worktree. Commit only after owner review.

**Local validation and promotion complete:** `tools/heroes-off-check.mjs`, `tools/turret-sim-check.mjs`, `tools/production-queue-cap-check.mjs`, `tools/queue-indicator-check.mjs`, `tools/build-menu-active-state-check.mjs`, `tools/hard-turret-schedule-check.mjs`, and `tools/hard-third-turret-schedule-check.mjs` pass. Real Chrome CDP sessions against the verified LAN endpoint exercised four unit purchases and observed a `4/10` queue; separately queued a live structure with `remaining: 15/20`, visibly rendered its cyan progress bar, confirmed direct hero purchase rejection (`heroesDisabled`), emitted no console errors, and captured `artifacts/screenshots/heroes-towers-queue-browser.png` plus `artifacts/screenshots/build-menu-active-browser.png`. The LAN `src/config.js` and `src/render/ui.js` SHA-256 values matched the reviewed worktree. The reviewed branch fast-forwarded to local `main` and `ad03217` was verified equal to `origin/main`. The screenshots remain local-only.

### Integrated mainline

```text
C:\Users\simcr\projects\stick-rts
branch: main
integration: 2d05003 (feat: add team vision Raven scouting and Hard army massing)
origin/main: synchronized after owner-approved push
```

- The Team Vision → Raven → Frontline → Build/Scout/Adapt/Mass/Attack V1 source, focused checks, durable analysis, and lightweight artifacts are committed and pushed to `main`.
- The former `agent/team-vision-spectator` worktree remains locally available only for its untracked, generated browser/raw diagnostic evidence; it has no unintegrated source changes.
- No active implementation scope is currently authorized. Do not merge/push retained experimental worktrees without a separate owner decision.

### Completed mainline scope — Team vision spectator foundation

The game now has deterministic, simulation-owned team-vision queries plus Watch AI `Full` / `Left` / `Right` presentation modes.

- Vision derives from living friendly units, heroes, core, turrets, structures, and optional generic temporary descriptors.
- Left/Right render only friendly entities plus currently visible enemy information; terrain stays visible with a dim non-visible overlay.
- Enemy core location remains known as a non-live silhouette outside vision.
- `uiState.spectatorView` is presentation-only; same-seed browser evidence confirms it cannot alter normalized simulation output.
- The completed foundation phase left Hard AI knowledge unchanged; the current approved perception phase below intentionally replaces its global enemy input without changing mechanics or spectator UI.

Durable architecture and evidence:

```text
docs/analysis/team-vision-spectator-foundation-2026-08-16.md
artifacts/team-vision-spectator-summary.txt
```

### Completed mainline scope — AI perception and controlled memory

The owner has now approved a second local-only phase in this same isolated worktree: remove Hard AI omniscience by feeding its unchanged strategic architecture from the simulation-owned team-vision query surface plus bounded last-known memory.

**Included:**

1. Replace `difficulty.globalVision`/AI-local sight approximations with `src/sim/vision.js` current team visibility for every live enemy-information path.
2. Keep per-team snapshots for currently visible enemy units/structures and last-known observations.
3. Expire mobile-unit observations after one configurable duration; retained snapshots must never update from hidden authoritative position, HP, state, facing, direction, or death.
4. Persist genuinely observed structure locations/types; refresh their changing snapshot only while visible. Enemy core location remains known from match start but has no hidden live-state leak.
5. Derive composition/counter input, power estimate, and confirmed near-home threat from current visible enemies plus valid memory as appropriate—never directly from hidden enemy world state.
6. Extend the existing bounded latest-decision record with explainable current/remembered knowledge and freshness fields.
7. Add deterministic focused tests, same-seed repeatability/spectator non-interference checks, and a fixed-seed before/after behavioral comparison.

**Deliberate exclusions:** Raven, purchasing/scouting/information utility, heuristic/weight/threshold changes, combat/economy/production/command/hero/turret changes, balance tuning, merge, push, and deployment. The build-index invariant remains: it advances only after a successful committed normal-unit purchase.

**Evidence gates:** real AI decision-path tests demonstrate loss/refresh/expiry of mobile knowledge, persistent structure/base knowledge without hidden live state, independent Left/Right perception, visible-only live threat/power, composition/counter sourcing, spectator-view non-interference, and repeated same-seed determinism. Focused regressions pass except documented baseline-equivalent failures.

**Validation result:** the perception contract is validated, but paired Hard-vs-Hard seeds `701–705` are a deterministic liveness blocker: candidate `0/0/5` player/AI/unresolved at 3,000s versus unchanged `main` `2/3/0`, mean 835.6s. Detailed diagnosis: `docs/analysis/hard-ai-team-limited-liveness-diagnostic-2026-08-18.txt`.

### Completed mainline scope — Hard Build Army combat readiness

The owner has approved one narrow, local-only strategy correction downstream of the validated perception boundary.

**Included:** give Hard's existing `buildArmy` unit utility a positive, friendly-authoritative combat-readiness preference below the existing `minArmyToAttack` threshold. Reuse the V0 combat progress/efficiency, counter-value, and build-cycle terms; preserve counter selection when valid team-visible/remembered composition exists. Add a deterministic red→green focused regression, preserve existing focused regressions, and rerun ordered Hard-vs-Hard seeds `701–705` with representative decision traces.

**Deliberate exclusions:** vision/memory/unknown semantics, thresholds, goal and command selection, counter relationships, build-cycle progression, zero-miner emergency, turrets, heroes, economy, queue/cap rules, combat/balance, Raven, scouting or information utility, merge, push, and deployment.

**Evidence gates:** the focused regression proves that feasible combat candidates receive positive utility and beat a miner under `buildArmy` without enemy composition; valid counters still affect combat choice; infeasible candidates, recovery, other goals, zero-miner, and build-index invariants remain intact. The exact 701–705 candidate cohort must be compared with the documented pre-change team-limited result, with seed 701 checkpoints showing decision records and combat/miner development. Do not add Raven or a further strategy rule in this scope.

**Validation result / stop:** `buildArmy` now positively selects feasible combat from friendly state while preserving counter and information boundaries. The cohort improved from `0/0/5` to `1/0/4` player/AI/unresolved (mean `2479.3s`), but 4/5 unresolved remains a liveness blocker. Stop here: no Raven or Attack standing-force/other utility expansion is authorized. Detailed evidence: `docs/analysis/hard-build-army-combat-readiness-validation-2026-08-18.md`.

### Completed mainline scope — Hard attack hysteresis, reinforcement, and economic saturation

Owner approval: 2026-08-19. Local-only continuation in this same dirty isolated worktree.

**Included:** (1) separate configurable Hard attack-launch and attack-sustain combat thresholds, initially 8 and 5, with committed-Attack hysteresis while retaining true-force-depletion Recover; (2) bounded utility-driven combat reinforcement under Attack using existing combat progress/efficiency, counter, and cycle signals; (3) one reusable friendly-state, configuration-driven economic-need signal that materially reduces miner utility when gold reserves greatly exceed immediate spending needs. Extend bounded decision records, deterministic focused checks, immediate-current-worktree baseline/candidate cohorts for seeds 701–705 at 3,000s, and seed-701 milestone evidence.

**Deliberate exclusions:** Raven; scouting or information value; vision/memory semantics or any hidden-state source; unit/economy/queue/population/production-time balance; build-cycle sequence or its successful-normal-unit-only progression; feasibility filtering; zero-miner emergency; counter relationships; scheduled turrets; heroes; combat/movement/targeting/commands API; merge, push, and deployment.

**Evidence gates:** exact boundary tests for 7/8 launch and 4/5/6 sustain; Attack combat candidates beat a miner cycle slot near sustain without valid enemy composition; high-reserve miner utility is materially reduced while constrained economy retains value and zero-miner emergency remains; valid counters still choose between combat units; deterministic decision records/selections; focused green suite (baseline-equivalent failures identified); paired cohort and seed-701 milestones report army/mine/gold/purchases/transitions and decision evidence. Browser/LAN behavior is claimed only if a real browser gate is available.

### Completed local scope — frontline/objective observability

The bounded Hard assessment now records the team’s actual forward combat mass and physical objective approach without changing behavior. Friendly state is authoritative; mobile enemy frontline state is current-team-vision-only, never stale memory.

- Frontline: living non-miner combat units within the configurable 420px homeward band behind the team’s forward-most combat unit; symmetric for Left/Right.
- Objective: forward-most combat position, remaining distance to enemy home, and normalized progress from own home (`0`) to enemy home (`1`).
- Bounded records expose friendly/visible-enemy frontline count and power, forward-most position, objective distance, and progress.
- Focused symmetry, membership, visibility-vs-memory, empty, determinism, and read-only regressions passed.

Evidence: [`docs/analysis/hard-ai-frontline-objective-observability-2026-08-20.md`](docs/analysis/hard-ai-frontline-objective-observability-2026-08-20.md) and `artifacts/hard-ai-frontline-objective-observability-summary-2026-08-20.txt`.

### Completed local scope — frontline-aware Attack sustain

Owner-approved behavior pass, local-only. A team already committed to Attack sustains below the existing global five-combat boundary only when all current evidence holds: objective progress at least `0.65`, at least `2` friendly frontline combat units, and friendly frontline power at least current visible enemy frontline power. A lone deep survivor does not sustain; new launches remain at eight combat units.

- The shared condition is used by both strategic-goal and command selection, with `attackCommitment.sustainReason` exposing `global-combat` or `forward-frontline-pressure`.
- Focused red→green coverage proves the two-unit forward-pressure path, lone-survivor rejection, low-progress rejection, and visible local-superiority rejection.
- Hard-vs-Hard seeds `701–705` remain baseline-equivalent at `1/0/4` player/AI/unresolved, mean `2806.4s`; no candidate regression.
- Activation traces for seeds `701` and `702` record zero `forward-frontline-pressure` decisions. This is **safe but inactive** for the named stalled matches, not a liveness fix. Do not weaken the minimum forward mass without a separately approved, evidence-backed pass: the one-unit variant worsened the cohort to `0/0/5`.

**Completed mainline scope — Hard AI Information Value + Raven Purchase Utility V0:** this V0 Raven purchasing pass was included in the `2d05003` mainline integration. Hard retains Recover / Build Army / Defend / Attack only; Raven is a generic legal candidate action ranked against the existing best normal-unit purchase from bounded current observations and controlled-memory age. It uses no hidden enemy truth and leaves normal unit utility/cycle mechanics intact.

**Implemented V0:** raw bounded information state (current/remembered combat and structures, contact/meaningful-observation ages); reusable configurable `scoutingNeed`; goal-context weights; affordability that protects the existing economic reserve and current readiness shortfall; strict deterministic Raven-vs-normal comparison; decision-record explainability; focused testing, named 701–705 observational diagnostics, and browser Full/Left/Right proof. The initial stale horizon is 60s so the policy does not become a 45-second-cooldown auto-rebuy loop.

**Deliberate exclusions remain:** no Scout goal, Raven balance/mechanics/vision/memory/UI changes, anti-air, Raven combat, casualty/momentum history, Attack launch/sustain retuning, formations/targeting changes, broader strategy tuning, merge, push, or deployment. The limited-vision Hard-vs-Hard liveness issue remains separate: the V0 post-pass cohort is `0/1/4` player/AI/unresolved (mean `2644.5s`) versus the prior `1/0/4`; this is observational evidence, not a liveness-fix claim or tuning target.

Evidence: [`docs/analysis/hard-ai-information-value-raven-utility-v0-2026-08-20.md`](docs/analysis/hard-ai-information-value-raven-utility-v0-2026-08-20.md), `artifacts/hard-ai-raven-utility-v0-summary-2026-08-20.txt`, `tools/hard-ai-raven-utility-check.mjs`, `artifacts/hard-ai-raven-diagnostic.mjs`, and `artifacts/hard-ai-raven-browser-check.mjs`. **Owner LAN review confirmed:** the exact-worktree server renders successfully at `http://192.168.0.83:8811/` from another device when opened in an incognito/private tab. Normal browser cache may retain stale ES modules from prior local previews; use a cache-busting query or private tab for review after local source updates. No production deployment.

### Completed mainline scope — Hard Build → Scout → Adapt → Mass → Attack V1

**Completed V1:** owner-approved on 2026-08-20, then included in the `2d05003` mainline integration. The behavior and its supporting source/tests are now versioned on `main`.

**Included:** keep the exact four Hard goals—Recover, Build Army, Defend, Attack—while increasing the configurable attack-launch force to 24 combat units; expose authoritative `armyBuildProgress = clamp(combatUnits / attackLaunchCombatUnits, 0, 1)` in assessment/decision records; add a simple configurable Build-Army Raven timing multiplier that favors the mid-build window without making Raven mandatory; and make existing counter utility increasingly influential through Build Army after legitimate observation. Preserve the existing Raven feasibility/protected-reserve model, counter relationships, economy saturation, build-cycle rule, Attack reinforcement, frontline sustain exception, vision/memory semantics, and all combat/formation/targeting mechanics.

**Boundaries retained in the implemented behavior:** Raven remains optional. Reaching 24 combat units can launch Attack even when stale information exists and Raven is unavailable/unaffordable/not selected. No Scout/Prepare/Muster/Recon goal, omniscient composition planner, fixed composition table, new unit type, mechanical Raven change, formation/targeting rewrite, or seed-target tuning was introduced.

**Evidence gates:** red→green focused boundaries for 23/24 launch, build-progress endpoints, early/mid/fresh Raven context, optional Raven readiness, bounded observe→counter adaptation, build-index isolation, reserve/economy preservation, sustain boundaries/frontline exception, and determinism; then existing regression suites plus ordered 701–705 and a broader observational sample with preparation/engagement traces. Save an artifact-backed summary and provide a verified exact-worktree LAN preview only after the complete batch is viewable.

**Validation result:** focused V1 and retained regression checks pass. Across Hard-vs-Hard seeds `701–710`, every first attack launched at exactly 24 combat, all 20 sides made major contact, and the cohort resolved `5 player / 5 AI / 0 unresolved`; this is observation, not a liveness claim. Mid-build Raven → observed composition → archer adaptation is present in raw traces, while initial opening armies generally reached 24 before the existing protected reserve permitted Raven; record this as an opportunity-cost finding, not an unapproved economy change. Evidence: `docs/analysis/hard-ai-build-scout-adapt-mass-attack-v1-2026-08-20.md` and `artifacts/hard-ai-build-scout-adapt-mass-attack-v1-summary-2026-08-20.txt`.

## Current approved scope — Hard income retune and Player fog rendering

Owner approval: 2026-08-28. Isolated worktree: `C:\Users\simcr\projects\stick-rts\worktrees\hard-income-fog` on `agent/hard-income-fog-local`, based on `main` `f2a9bcf`.

**Included:** owner supersedes the bounded `15` retune after gameplay review: restore the original `23` gold completed-trip yield and confirm, through the same deterministic seeds, that Hard composition and first-attack timing return to the original-income behavior. Do not alter AI decision logic, costs, unit stats, composition/counter policy, or build-cycle mechanics. Correct Player-vs-AI fog composition so current/recent vision no longer erases already-rendered parallax/background imagery, and make unseen terrain visibly lighter while retaining the existing hidden-mobile-unit visibility rules.

**Deliberate exclusions:** warrior/miner cost changes; AI scripted miner caps, treasury-reservation logic, goal/utility/feasibility/build-cycle changes; mine-slot/cycle/deposit changes; combat, formation, Raven, Watch-AI perspective, or simulation-vision behavior changes; push/deployment; generated screenshot versioning.

**Evidence gates:** a red deterministic reproduction records the baseline 78-miner/2-warrior seed-701 composition at `11.5`; the restored original `23` gold/trip cohort across seeds `701–705` produces `18–21` miners, `36–39` warrior purchases, and first attacks at `461–492s`. `tools/hard-income-retune-check.mjs`, mining, Hard utility, fog composition/visibility, vision-sustain, and headless checks pass. Player fog renders from an isolated destination-out layer at `0.30` alpha and retains terrain/parallax behind vision. Owner completed LAN review; served `config.js` and `renderer.js` hashes match this worktree. Promotion to local `main` and `origin/main` is approved. Generated screenshots remain local-only; the existing browser harness's final clean-console assertion still reports only a missing `/favicon.ico` 404, not a game-render failure.

## Architecture invariants

- Vanilla JS ES modules + Canvas 2D; no build step. Local preview: `python -m http.server`.
- `src/sim/` has no browser/DOM references. `src/render/` reads simulation state and does not mutate it.
- Tunables belong in `src/config.js`; no new magic numbers in systems/rendering.
- UI is screen-space and must be camera-zoom independent.
- Simulation randomness remains confined to `src/sim/rng.js`; `Math.random` is banned in `src/`.
- Spectator selection is UI state only and may not be consumed by simulation or AI.

## Retained isolated worktrees

```text
agent/local-ux-regression-batch        — prior UX review branch; do not mix automatically
agent/rl-commander-strategy-experiment — preserved, unmerged experiment
agent/turret-watch-telemetry-local     — merged source branch retained locally
agent/visual-proof                     — separate art-pipeline work
agent/hard-ai-liveness-regression      — retained prior local worktree; its correction is merged in base cf56709
agent/team-vision-spectator            — approved local vision foundation; active worktree
```

## Parked

- Separate AI-limited-vision/memory design after review of the new query surface.
- Model commander, strategy league/history, RL/training systems, and model proxy remain excluded pending separately approved scope.
- Sunmeadow art remains in `agent/visual-proof`; no runtime integration without explicit owner approval.
- Repository cleanup follows `docs/retention-cleanup-manifest.md`; no automatic tracked-file deletion.
