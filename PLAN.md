# PLAN.md — Stick RTS

Cross-session context carrier. Keep current scope, recovery state, and dirty-worktree warnings here. Completed work belongs in `HISTORY.md`; detailed durable findings live in focused `docs/analysis/` documents.

## Current status — 2026-08-20

### Active isolated worktree

```text
C:\Users\simcr\projects\stick-rts-team-vision-spectator
branch: agent/team-vision-spectator
base: cf56709 (merge: Hard AI feasible production correction)
```

- This worktree is dirty, local, uncommitted, unmerged, and unpushed.
- Owner approved the completed local team-vision and Watch AI spectator scope.
- Do not merge or push without a separate explicit owner decision.

### Completed local scope — approved

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

### Active approved scope — AI perception and controlled memory

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

### Active approved scope — Hard Build Army combat readiness

The owner has approved one narrow, local-only strategy correction downstream of the validated perception boundary.

**Included:** give Hard's existing `buildArmy` unit utility a positive, friendly-authoritative combat-readiness preference below the existing `minArmyToAttack` threshold. Reuse the V0 combat progress/efficiency, counter-value, and build-cycle terms; preserve counter selection when valid team-visible/remembered composition exists. Add a deterministic red→green focused regression, preserve existing focused regressions, and rerun ordered Hard-vs-Hard seeds `701–705` with representative decision traces.

**Deliberate exclusions:** vision/memory/unknown semantics, thresholds, goal and command selection, counter relationships, build-cycle progression, zero-miner emergency, turrets, heroes, economy, queue/cap rules, combat/balance, Raven, scouting or information utility, merge, push, and deployment.

**Evidence gates:** the focused regression proves that feasible combat candidates receive positive utility and beat a miner under `buildArmy` without enemy composition; valid counters still affect combat choice; infeasible candidates, recovery, other goals, zero-miner, and build-index invariants remain intact. The exact 701–705 candidate cohort must be compared with the documented pre-change team-limited result, with seed 701 checkpoints showing decision records and combat/miner development. Do not add Raven or a further strategy rule in this scope.

**Validation result / stop:** `buildArmy` now positively selects feasible combat from friendly state while preserving counter and information boundaries. The cohort improved from `0/0/5` to `1/0/4` player/AI/unresolved (mean `2479.3s`), but 4/5 unresolved remains a liveness blocker. Stop here: no Raven or Attack standing-force/other utility expansion is authorized. Detailed evidence: `docs/analysis/hard-build-army-combat-readiness-validation-2026-08-18.md`.

### Active approved scope — Hard attack hysteresis, reinforcement, and economic saturation

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

**Current approved scope / stop boundary — Hard AI Information Value + Raven Purchase Utility V0:** owner has authorized and this worktree now contains a local-only, evidence-backed Raven purchasing pass. Hard retains Recover / Build Army / Defend / Attack only; Raven is a generic legal candidate action ranked against the existing best normal-unit purchase from bounded current observations and controlled-memory age. It uses no hidden enemy truth and leaves normal unit utility/cycle mechanics intact.

**Implemented V0:** raw bounded information state (current/remembered combat and structures, contact/meaningful-observation ages); reusable configurable `scoutingNeed`; goal-context weights; affordability that protects the existing economic reserve and current readiness shortfall; strict deterministic Raven-vs-normal comparison; decision-record explainability; focused testing, named 701–705 observational diagnostics, and browser Full/Left/Right proof. The initial stale horizon is 60s so the policy does not become a 45-second-cooldown auto-rebuy loop.

**Deliberate exclusions remain:** no Scout goal, Raven balance/mechanics/vision/memory/UI changes, anti-air, Raven combat, casualty/momentum history, Attack launch/sustain retuning, formations/targeting changes, broader strategy tuning, merge, push, or deployment. The limited-vision Hard-vs-Hard liveness issue remains separate: the V0 post-pass cohort is `0/1/4` player/AI/unresolved (mean `2644.5s`) versus the prior `1/0/4`; this is observational evidence, not a liveness-fix claim or tuning target.

Evidence: [`docs/analysis/hard-ai-information-value-raven-utility-v0-2026-08-20.md`](docs/analysis/hard-ai-information-value-raven-utility-v0-2026-08-20.md), `artifacts/hard-ai-raven-utility-v0-summary-2026-08-20.txt`, `tools/hard-ai-raven-utility-check.mjs`, `artifacts/hard-ai-raven-diagnostic.mjs`, and `artifacts/hard-ai-raven-browser-check.mjs`. **Owner LAN review confirmed:** the exact-worktree server renders successfully at `http://192.168.0.83:8811/` from another device when opened in an incognito/private tab. Normal browser cache may retain stale ES modules from prior local previews; use a cache-busting query or private tab for review after local source updates. No production deployment.

### Current approved scope — Hard Build → Scout → Adapt → Mass → Attack V1

Owner approval: 2026-08-20. Local-only continuation in this same dirty isolated worktree.

**Included:** keep the exact four Hard goals—Recover, Build Army, Defend, Attack—while increasing the configurable attack-launch force to 24 combat units; expose authoritative `armyBuildProgress = clamp(combatUnits / attackLaunchCombatUnits, 0, 1)` in assessment/decision records; add a simple configurable Build-Army Raven timing multiplier that favors the mid-build window without making Raven mandatory; and make existing counter utility increasingly influential through Build Army after legitimate observation. Preserve the existing Raven feasibility/protected-reserve model, counter relationships, economy saturation, build-cycle rule, Attack reinforcement, frontline sustain exception, vision/memory semantics, and all combat/formation/targeting mechanics.

**Boundaries:** Raven remains optional. Reaching 24 combat units can launch Attack even when stale information exists and Raven is unavailable/unaffordable/not selected. No Scout/Prepare/Muster/Recon goal, omniscient composition planner, fixed composition table, new unit type, mechanical Raven change, formation/targeting rewrite, seed-target tuning, commit, merge, push, or remote deployment.

**Evidence gates:** red→green focused boundaries for 23/24 launch, build-progress endpoints, early/mid/fresh Raven context, optional Raven readiness, bounded observe→counter adaptation, build-index isolation, reserve/economy preservation, sustain boundaries/frontline exception, and determinism; then existing regression suites plus ordered 701–705 and a broader observational sample with preparation/engagement traces. Save an artifact-backed summary and provide a verified exact-worktree LAN preview only after the complete batch is viewable.

**Validation result:** focused V1 and retained regression checks pass. Across Hard-vs-Hard seeds `701–710`, every first attack launched at exactly 24 combat, all 20 sides made major contact, and the cohort resolved `5 player / 5 AI / 0 unresolved`; this is observation, not a liveness claim. Mid-build Raven → observed composition → archer adaptation is present in raw traces, while initial opening armies generally reached 24 before the existing protected reserve permitted Raven; record this as an opportunity-cost finding, not an unapproved economy change. Evidence: `docs/analysis/hard-ai-build-scout-adapt-mass-attack-v1-2026-08-20.md` and `artifacts/hard-ai-build-scout-adapt-mass-attack-v1-summary-2026-08-20.txt`.

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
