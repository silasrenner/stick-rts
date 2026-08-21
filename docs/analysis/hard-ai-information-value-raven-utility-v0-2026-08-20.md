# Hard AI information value + Raven purchase utility V0 — validation, 2026-08-20

## Status and boundary

Local-only, uncommitted work in:

```text
C:\Users\simcr\projects\stick-rts-team-vision-spectator
branch: agent/team-vision-spectator
base: cf56709
```

This is a narrow information-action pass. Hard retains exactly four strategic goals—Recover, Build Army, Defend, Attack. Raven is a separate candidate purchase action; no Scout/Recon/Intel goal exists. Raven mechanics, vision sources, controlled memory semantics, combat, population, normal FIFO, build cycle, attack sustain/launch, formations, targeting, and Raven balance are unchanged.

## Information-state assessment

`src/sim/ai/vision.js` retains two bounded timestamps from the same copied current team-visible snapshots it already consumes:

- `lastCurrentEnemyContactAt`: any current enemy entity;
- `lastMeaningfulEnemyObservationAt`: current enemy combat unit or non-base enemy structure.

Neither timestamp compares AI memory with hidden authoritative state. `src/sim/ai/scouting.js` derives assessment data strictly from copied current/remembered observations:

```text
currentlyVisibleEnemyCombatCount
currentlyVisibleEnemyStructureCount
rememberedEnemyCombatCount
rememberedEnemyStructureCount
timeSinceCurrentEnemyContact
timeSinceMeaningfulEnemyObservation
enemyCompositionKnowledgeAge
```

`currentEnemyCoverage` is deliberately V0-binary: `1` when any current enemy combat or non-base structure is visible, otherwise `0`.

## Exact formulas and Hard configuration

All V0 settings are `DIFFICULTIES.hard.scouting`:

```text
staleTime = 60 simulated seconds
stalenessWeight = 0.60
coverageWeight = 0.40
utilityScale = 2.00
goalWeights = {
  recover: 0.20,
  buildArmy: 1.00,
  defend: 0.50,
  attack: 1.00,
}
```

```text
informationStaleness =
  lastMeaningfulEnemyObservationAt is absent
    ? 1
    : clamp(timeSinceMeaningfulEnemyObservation / 60, 0, 1)

scoutingNeed = clamp(
  0.60 * informationStaleness
  + 0.40 * (1 - currentEnemyCoverage),
  0, 1
)

protectedCombatReserve = cheapestCombatCost * max(
  existing economicNeed.reserveCombatUnits,
  max(0, attackLaunchCombatUnits - friendlyCombatUnits)
)

scoutingAffordability = clamp(
  (gold - protectedCombatReserve) / CONFIG.RAVEN.cost,
  0, 1
)

ravenUtility = 2.00
  * scoutingNeed
  * goalWeights[currentGoal]
  * scoutingAffordability
```

The 60-second stale horizon was selected after an initial 15-second diagnostic repeatedly reached high value at the 45-second mechanical cooldown. The longer horizon is a configuration-only conservatism correction: it prevents immediate cooldown-driven rebuys while retaining a fully stale, wealthy Build Army/Attack case. It was not selected against seed outcomes.

## Candidate / feasibility / selection integration

`createPurchaseCandidates()` now includes `{ action: 'raven', kind: null }`. Its feasibility remains exactly `getPurchaseFeasibility` / `buyRaven`:

```text
raven candidate
→ normal gold / active-Raven / cooldown feasibility
→ information utility only when feasible
→ deterministic comparison with the unchanged best normal-unit utility
→ buyRaven or normal unit
```

- Raven ties deliberately preserve the normal unit.
- The zero-miner emergency and pre-existing scheduled-turret path execute before Raven comparison.
- Raven is not in miner/warrior/archer scoring or the build cycle; `buildIndex` advances only after a successful normal-unit commit.
- The capacity-expansion fallback remains restricted to all-cap-blocked **unit** candidates, so an infeasible Raven does not interfere with it.

`lastAiDecision` now exposes raw `information` and bounded Raven candidate values: need, staleness, coverage, goal weight, affordability, protected reserve, feasibility reason, utility, and `selected`. A non-selection is inspectable as infeasible, low-value, or beaten by the selected normal utility.

## Focused deterministic evidence

`node tools/hard-ai-raven-utility-check.mjs` passes. It proves:

- fresh meaningful current visibility gives `scoutingNeed = 0` and no Raven selection;
- old/absent current information produces high need and a wealthy Build Army Raven selection;
- changing hidden unseen enemy population does not affect information state;
- equivalent state values Build Army/Attack above Recover;
- Recover at 800g selects warrior over Raven;
- cooldown and active Raven are feasibility gates;
- Raven selection leaves normal queue, population, and buildIndex unchanged;
- Raven generic reveal refreshes ordinary AI observation and lowers need; normal expiry/aging raises it again;
- same seed/state yields the same utility and selection record.

Existing focused goal and normal-unit tests now explicitly set their fixture Raven cooldown to `Infinity`, isolating their established contracts; dedicated Raven V0 tests cover the new action. This is test-fixture isolation, not game behavior.

## Seed diagnostics — observational liveness evidence

`node artifacts/hard-ai-raven-diagnostic.mjs` ran Hard-vs-Hard seeds 701–705 at the unchanged 3,000-second cap. Raw per-seed Raven purchases, reveals, and later decisions are under `artifacts/hard-ai-raven-diagnostic/`.

| Metric | Result |
|---|---:|
| Player Raven purchases | 55 |
| AI Raven purchases | 56 |
| Total | 111 |
| Player wins | 0 |
| AI wins | 1 |
| Unresolved | 4 |
| Mean duration | 2644.5s |

Seed results: 701 unresolved; 702 unresolved; 703 AI win at 1222.367s; 704 unresolved; 705 unresolved.

This differs from the prior `1 player / 0 AI / 4 unresolved`, mean `2806.4s` cohort, but no Raven value was tuned to force resolution. It remains an observational result, not a liveness fix claim.

Representative diagnostic pattern: a stale, wealthy Build Army/Attack team selected Raven; reveal refreshed current composition/power from zero or stale memory to observed miners/combat/structures, set information staleness and need to zero, and subsequent ordinary unit decisions could use refreshed counter input (for example an archer counter in the recorded 702–704 sequences). The raw records retain purchase goal/gold/combat/need/affordability/utility plus reveal and later normal decision context.

With `staleTime = 60`, this cohort had 111 purchases across up to 3,000 seconds rather than repeated automatic purchases every 45-second cooldown. The observed minimum interval is bounded by the 45-second Raven cooldown; the policy itself requires information to age again before it can win utility.

## Browser validation

Exact-worktree local server: `http://192.168.0.83:8811/`.

`node artifacts/hard-ai-raven-browser-check.mjs` passed using seed 703:

- real canvas clicks selected Left then Right spectator modes;
- Full/Left/Right fixed-seed autonomous-purchase snapshots were identical;
- Player Hard autonomously selected Raven at 464.817s under Build Army with 1778g, 7 combat units, `scoutingNeed 0.88`, affordability `1.0`, Raven utility `1.76`, and best normal warrior utility `1.75`;
- the Raven reached a generic radius-800 reveal; observed current combat/structure coverage changed to 1, staleness became 0, and scouting need became 0;
- after exit, that Raven had no remaining source/entity and its cooldown remained active;
- browser console was clean.

Screenshots:

```text
artifacts/hard-ai-raven-browser/autonomous-launch-full.png
artifacts/hard-ai-raven-browser/autonomous-inflight-left.png
artifacts/hard-ai-raven-browser/autonomous-inflight-right.png
artifacts/hard-ai-raven-browser/autonomous-reveal-full.png
artifacts/hard-ai-raven-browser/autonomous-post-reveal-full.png
```

The Full reveal frame visibly shows the `REVEAL` marker near the enemy side and exposed units/structures; the post-reveal frame has no Raven/REVEAL marker. Left view visibly uses the team-only Red telemetry/fog presentation.

## Regression evidence

Passed: Raven V1 mechanics; team vision; controlled perception/memory; Hard vision; goals; normal unit utility; build-cycle progression; infeasible counter; observability; frontline assessment/sustain; recovery; turret schedule; production queue/cap; defense/anchor/spacing; turret simulation/targeting; and headless gold/cap/statue invariants. `git diff --check` passed at validation checkpoints.

Known unchanged baseline-equivalent failures remain separate:

```text
node tools/balance-check.mjs
  Archer cooldown failed
node tools/starting-turret-check.mjs
  Starting turret must not consume player population
```

## Recommended next strategic step

Do not add a Scout goal yet. First review the diagnostic evidence and decide whether the V0 binary coverage plus 60-second information horizon gives the desired frequency and economic trade-off across a wider non-tuned cohort. The pre-existing limited-information liveness problem remains a separate design question.
