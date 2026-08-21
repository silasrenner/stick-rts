# Hard Build Army combat-readiness validation — 2026-08-18

## Status

Local-only, uncommitted validation in:

```text
C:\Users\simcr\projects\stick-rts-team-vision-spectator
branch: agent/team-vision-spectator
base: cf56709
```

This report covers the owner-approved narrow Build Army utility correction only. No Raven, scouting/information utility, vision/memory change, threshold/goal/command change, economy/balance change, commit, merge, push, or deployment was performed.

## Change

Only Hard's existing `buildArmy` weights changed in `src/sim/ai/difficulties.js`:

```js
// Before
buildArmy: { recoveryProgress: 0, combatEfficiency: 0, counterValue: 1.00, buildCycleBias: 0.25 },

// After
buildArmy: { recoveryProgress: 1.00, combatEfficiency: 0.75, counterValue: 1.00, buildCycleBias: 0.10 },
```

No signal was renamed or generalized. `recoveryProgress` remains the existing binary combat-candidate signal: warrior/archer = `1`, miner = `0`. Under `buildArmy`, this now functions as the approved friendly-state combat-readiness preference while the existing strategic goal is below `minArmyToAttack`.

The values intentionally mirror the existing Recover combat progress/efficiency terms, retain the pre-existing `1.00` counter importance for warrior-versus-archer selection, and reduce build-cycle bias to a secondary role. The utility still performs its existing feasibility filtering before selection.

## Focused deterministic coverage

`tools/hard-ai-unit-utility-check.mjs` now proves through the production decision path that, with:

```text
Hard goal: Build Army
living force: one miner, zero combat
build cycle: miner
visible/remembered composition: {}
```

- warrior and archer have `recoveryProgress: 1`;
- miner has `recoveryProgress: 0`;
- feasible warrior selection beats the miner cycle slot;
- valid composition counters still choose archer against warriors;
- an unaffordable archer counter falls back to feasible warrior;
- Recover remains combat-oriented;
- zero-miner emergency remains outside utility scoring;
- cap fallback and deterministic selection remain valid.

`tools/ai-observability-check.mjs` now verifies the bounded decision record reports the selected Build Army readiness utility:

```json
{
  "recoveryProgress": 1,
  "combatEfficiency": 1,
  "counterValue": 0,
  "buildCycleBias": 1,
  "weightedTotal": 1.85
}
```

`tools/hard-ai-build-cycle-progression-check.mjs` confirms the revised feasible combat fallback still advances `buildIndex` exactly once after its successful committed normal-unit purchase.

## Seed 701 representative behavior

The pre-change team-limited trace first crossed the five-combat threshold at 232.2s (player) and 128.4s (AI), with living miner/combat counts around 15/5 and 16/7. The corrected run crossed it at:

```text
player: 109.4s
AI:     109.7s
```

Selected milestones after the correction:

| Time | Player goal / command | Player miners / combat | AI goal / command | AI miners / combat | Current knowledge |
|---:|---|---:|---|---:|---|
| 60s | Build Army / Defend | 4 / 2 | Build Army / Defend | 3 / 2 | none for both |
| 120s | Attack / Attack | 7 / 5 | Attack / Attack | 7 / 5 | none for both |
| 240s | Build Army / Defend | 11 / 3 | Build Army / Defend | 8 / 3 | none for both |
| 300s | Build Army / Defend | 13 / 3 | Attack / Attack | 8 / 7 | none for both |
| 600s | Attack / Attack | 15 / 5 | Attack / Attack | 15 / 5 | brief remembered composition only |

The real decision record in the no-composition/miner-cycle focused fixture selects warrior because its readiness score is `1.75`, versus the miner's cycle-only score `0.10`. This proves the new behavior is driven by friendly combat readiness, not hidden enemy knowledge.

By 900s in seed 701, cumulative normal purchases were:

```text
player: 21 miners, 58 warriors, 11 archers
AI:     19 miners, 34 warriors, 32 archers
```

The pre-change equivalent was:

```text
player: 30 miners, 40 warriors, 19 archers
AI:     29 miners, 36 warriors, 26 archers
```

The readiness correction therefore materially reduces early miner accumulation and pulls both teams' first baseline attack forward without changing the vision/memory boundary.

## Paired liveness cohort

Hard versus Hard, deterministic seeds `701–705`, maximum 3,000 simulated seconds:

| Candidate | Player wins | AI wins | Unresolved | Mean duration |
|---|---:|---:|---:|---:|
| Pre-change team-limited | 0 | 0 | 5 | 3000.0s |
| Build Army readiness candidate | 1 | 0 | 4 | 2479.3s |

The resolved candidate match was seed 705: player win at 396.7s.

## Result and remaining issue

The narrow change satisfies its local behavioral contract:

- Build Army is no longer purely counter/build-cycle driven when enemy composition is unknown.
- Affordable combat candidates beat a miner while Hard is below its unchanged readiness threshold.
- Hard reaches five combat and attacks substantially earlier in the representative no-contact seed.
- Valid visible/remembered counter information remains a combat-unit choice input.
- Team-limited perception, memory, feasibility, zero-miner, queue/cap fallback, scheduled turret, hero, command, goal, and build-index paths remain unchanged.

It improves liveness but does **not** yet restore healthy cohort liveness: unresolved matches fall from 5/5 to 4/5, not to an acceptable level. No further tuning was performed because the approved scope explicitly excludes Attack standing-force maintenance and broader utility work.

The next likely pre-Raven investigation is the already-deferred question of whether an `attack`-goal force needs a narrow friendly-state standing-force maintenance signal. That is not implemented or authorized by this change.

## Validation commands

Passed:

```text
node tools/hard-ai-build-cycle-progression-check.mjs
node tools/hard-ai-unit-utility-check.mjs
node tools/ai-observability-check.mjs
node tools/ai-goal-selection-check.mjs
node tools/hard-ai-infeasible-counter-check.mjs
node tools/hard-army-recovery-check.mjs
node tools/hard-turret-schedule-check.mjs
node tools/production-queue-cap-check.mjs
node tools/ai-perception-memory-check.mjs
node tools/hard-vision-check.mjs
node tools/team-vision-check.mjs
node tools/turret-sim-check.mjs
node tools/defend-anchor-check.mjs
node tools/defense-spacing-check.mjs
node tools/archer-range-cadence-check.mjs
node tools/archer-spawn-formation-check.mjs
node tools/core-turret-shield-check.mjs
node tools/match-telemetry-check.mjs
node tools/headless.js
git diff --check
node tools/headless.js --batch --player=hard --enemy=hard --trials=5 --seed=701
```

Known baseline-equivalent failure, reproduced unchanged on candidate and `main`:

```text
node tools/balance-check.mjs
  Archer cooldown failed
```

## Browser/LAN validation limitation

A fresh local server was started from this exact worktree at `http://0.0.0.0:8811/`, then stopped after the validation attempt. The existing browser regression harness could not create a target because Chrome DevTools was unavailable:

```text
fetch http://127.0.0.1:9224/json/new?... -> ECONNREFUSED
computer-use list_apps -> no interactive apps available
```

Therefore this change has deterministic simulation evidence only; no browser/LAN gameplay claim is made. Before any promotion or further strategy work, rerun an exact-worktree browser match through a reachable CDP/browser session and compare it to the same seed's headless result.
