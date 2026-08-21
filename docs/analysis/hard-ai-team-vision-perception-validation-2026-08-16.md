# Hard AI team-vision perception and controlled memory — validation, 2026-08-16

## Status

Local-only, uncommitted validation in:

```text
C:\Users\simcr\projects\stick-rts-team-vision-spectator
branch: agent/team-vision-spectator
base: cf56709
```

No Raven, heuristic/utility tuning, balance change, commit, merge, push, or deployment was performed.

## Information-boundary implementation

Hard AI no longer enables `globalVision`. At every AI decision, `updateAiMemory(world, team, difficulty.memoryStaleness)` consumes the same simulation-owned current query used by Left/Right spectator presentation:

```text
authoritative world
  -> getVisibleEnemyEntities(world, team)
  -> copied current observations + team-local remembered snapshots
  -> buildAiAssessment
  -> unchanged goal / utility / production / command architecture
```

`src/sim/ai/vision.js` does not reproduce sight radii or source rules. It only consumes `src/sim/vision.js` results.

### Memory semantics

- A visible mobile enemy produces a copied observation containing identity/type, position, HP/state at observation, flags, and `lastSeenAt`.
- When it leaves current vision, the copied last-known snapshot persists. It does not follow hidden position, HP, state, direction, or death.
- Mobile snapshots are retained while `matchElapsedTime - lastSeenAt <= difficulty.memoryStaleness`.
  - Hard: 6 simulated seconds.
  - Medium: 15 seconds.
  - Easy: 0 seconds.
- Current visible mobile observations plus valid remembered mobile observations produce composition and the existing estimated enemy-power input.
- Observed structures/turrets persist indefinitely as frozen observations. Re-visibility refreshes them; hidden status/HP cannot leak.
- Enemy base location is known from match-start configured home coordinates without reading hidden live base state.
- Confirmed `enemyNearHome` uses current visible observations only; remembered positions do not become a live tactical contact.

The bounded latest-decision record exposes visible/remembered composition, observations, last seen times/ages, remembered structures, base location, and derived threat/power.

## Deterministic focused checks

Passed:

```text
git diff --check
node tools/ai-perception-memory-check.mjs
node tools/hard-vision-check.mjs
node tools/team-vision-check.mjs
node tools/ai-observability-check.mjs
node tools/ai-goal-selection-check.mjs
node tools/hard-ai-unit-utility-check.mjs
node tools/hard-ai-build-cycle-progression-check.mjs
node tools/hard-ai-infeasible-counter-check.mjs
node tools/hard-army-recovery-check.mjs
node tools/hard-turret-schedule-check.mjs
node tools/production-queue-cap-check.mjs
node tools/headless.js
node tools/archer-range-cadence-check.mjs
node tools/archer-spawn-formation-check.mjs
node tools/core-turret-shield-check.mjs
node tools/defend-anchor-check.mjs
node tools/defense-spacing-check.mjs
node tools/turret-sim-check.mjs
node tools/turret-targeting-check.mjs
node tools/match-telemetry-check.mjs
CDP_PORT=9224 APP_URL=http://127.0.0.1:8814/... node tools/pause-ux-check.mjs
CDP_PORT=9224 APP_URL=http://127.0.0.1:8814/... node tools/mobile-pan-check.mjs
CDP_PORT=9224 APP_URL=http://127.0.0.1:8814/... node tools/mobile-ux-check.mjs
```

`tools/ai-perception-memory-check.mjs` covers current contact, frozen mobile position/HP/state, re-entry refresh, expiration/composition removal, frozen persistent structure state, known base, hidden near-home threat rejection, hidden enemy power rejection, and Left/Right memory independence.

Build-cycle regression remains green: `buildIndex` advances only after a successful committed normal-unit purchase.

### Baseline-equivalent failures

These failures occur unchanged on candidate and `main`, so they are not attributed to team-limited perception:

```text
node tools/balance-check.mjs
  Archer cooldown failed

node tools/starting-turret-check.mjs
  Starting turret must not consume player population
```

## Same-seed repeatability

Candidate command:

```text
node tools/headless.js --batch --player=hard --enemy=hard --trials=3 --seed=811
```

The command was run twice; complete output was byte-identical. Both runs produced 3/3 unresolved games at the 3,000-second cap.

## Browser spectator proof

Fresh exact-worktree local server:

```text
http://127.0.0.1:8814/
```

Browser/CDP evidence command:

```text
node artifacts/ai-perception-browser-check.mjs
```

Passed results:

```json
{
  "controlResult": { "left": "left", "right": "right" },
  "deterministic": {
    "fullEqualsLeft": true,
    "fullEqualsRight": true,
    "snapshotBytes": 6000
  }
}
```

The fixed-seed Hard-vs-Hard snapshot was taken at 300 simulated seconds and includes normalized team state, unit/structure state, bounded last decision, and AI visible/remembered memory. Full/Left/Right outputs were identical after excluding globally incrementing entity IDs. Screenshots:

```text
artifacts/ai-perception-browser/full-seed-701-t300.png
artifacts/ai-perception-browser/left-seed-701-t300.png
artifacts/ai-perception-browser/right-seed-701-t300.png
```

Visual review:

- Full shows both Red/Blue telemetry and both visible forces.
- Left shows only Red telemetry and applies the expected dim/vision treatment; enemy live telemetry is omitted.
- No obvious rendering defect was found in the validation frames.

## Fixed-seed behavior comparison — blocker

Paired cohort, fixed seeds 701–705, Hard vs Hard, max 3,000 simulated seconds:

| Revision | Player wins | AI wins | Unresolved | Mean duration |
|---|---:|---:|---:|---:|
| candidate team-limited perception | 0 | 0 | 5 | 3000.0s |
| unchanged `main` | 2 | 3 | 0 | 835.6s |

This is a material, deterministic behavioral difference and fails the intended liveness expectation.

### Seed 701 causal trace

Artifacts:

```text
artifacts/ai-perception-trace-candidate-seed-701.json
artifacts/ai-perception-trace-baseline-seed-701.json
artifacts/compare-ai-perception-traces.mjs
```

At 60 seconds:

- Candidate: neither team had a current/remembered enemy contact, composition `{}`, estimated enemy power `0`, no counter pick, and no underpowered signal.
- Baseline: despite zero visual contact, each team had global live enemy composition (for example `{ miner: 4, warrior: 1 }`), estimated enemy power `288`, `underpowered: true`, and counter kind `archer`.

The candidate’s later production/composition and command trace diverges naturally from that point. At 900 seconds it remains unresolved with sparse, repeatedly rebuilding armies; baseline seed 701 resolved at 525.9 seconds.

This trace confirms the information boundary operates as intended. It does not justify tuning in this pass: the stop boundary explicitly excludes combat urgency, economics, scouting/information utility, utility weights, thresholds, production, and counter rebalance.

## Decision required before Raven

Do not promote this candidate yet. The core perception/memory contract is validated, but the 5/5 unresolved paired cohort is a release blocker. Before Raven, decide whether to:

1. preserve the implementation as a correct information-boundary milestone and separately authorize a bounded liveness/strategy study; or
2. revert/quarantine the perception implementation pending a design decision about what non-omniscient strategic knowledge must remain available.

Raven should not be implemented until that decision, because temporary reveal would correctly refresh this memory model but cannot by itself establish baseline Hard-vs-Hard liveness.
