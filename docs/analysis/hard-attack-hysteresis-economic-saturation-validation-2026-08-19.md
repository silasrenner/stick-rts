# Hard attack hysteresis, reinforcement, and economic saturation — 2026-08-19

## Scope and status

Local-only, uncommitted, unpushed continuation in `agent/team-vision-spectator`. Raven, vision/memory semantics, economy balance, build cycle, queue/cap, combat, heroes, turrets, and commands API remain unchanged.

## Implemented configuration

```js
attackLaunchCombatUnits: 8
attackSustainCombatUnits: 5
economicNeed: {
  reserveCombatUnits: 3,
  softMinerCount: 8,
  minimumMinerFactor: 0.25,
}
```

Hard utility weights now add `economicNeed: 1.00` to each goal. Attack now uses `{ recoveryProgress: 1.00, combatEfficiency: 0.75, counterValue: 1.00, buildCycleBias: 0.10, economicNeed: 1.00 }`, retaining counter choice and secondary cycle bias.

The miner-only utility signal is:

```text
reserveTarget = representative cheapest combat cost * reserveCombatUnits
reserveNeed = clamp((reserveTarget - gold) / reserveTarget, 0, 1)
workforceNeed = max(minimumMinerFactor, 1 - miners / softMinerCount)
economicNeed = reserveNeed * workforceNeed
```

No enemy state is read. Combat candidates get `economicNeed: 0`; zero-miner remains outside utility selection.

## Explainability

Bounded decision records now expose `attackCommitment` (`launched`, `sustained`, `abandoned`, combat count, both thresholds) and per-candidate `economicNeed` alongside the existing components.

Seed 701 example: at 169.5s Player was sustained at 8 combat with gold 238/miners 6 and chose warrior at utility 1.75; miner economic need was zero because gold exceeded the 330 reserve target. At 267.7s valid composition selected archer: counter value 1 and total 2.2946.

## Focused checks

Passed: `ai-goal-selection`, `hard-ai-unit-utility`, `ai-observability`, `hard-army-recovery`, `hard-ai-build-cycle-progression`, `hard-ai-infeasible-counter`, perception/memory/vision, queue, turret, defense, headless invariants, formation, shield, and telemetry checks. `balance-check` retains the documented baseline-equivalent `Archer cooldown failed` result.

## Paired cohort

Seeds 701–705, Hard vs Hard, 3000s cap:

| Revision | Player wins | AI wins | Unresolved | Mean duration |
|---|---:|---:|---:|---:|
| immediate pre-change | 1 | 0 | 4 | 2479.3s |
| candidate | 1 | 0 | 4 | 2806.4s |

Seed 701 candidate: first attacks Player 144.7s / AI 148.9s, both at 8 combat. At 60s both were 4 miners/2 combat; at 120s 6/5; at 240s Player 7/8 and AI 7/6; at 300s Player 8/6 and AI 7/9; at 600s Player 8/7 and AI 7/6. Through 900s, cumulative purchases were Player 8 miners/51 warriors/22 archers and AI 7 miners/66 warriors/10 archers. Final reserves at 900s were 3140/3597 gold.

The requested army mass and miner reduction are clear relative to the prior seed-701 report (at 900s 21/19 miners); decision logs prove Attack reinforcement and saturation. Liveness is not improved: attacks still fall below five (not at five/six), rebuild to eight, and repeat. This is a remaining strategic weakness, not addressed further under the stop boundary.

Artifacts: `artifacts/hard-strategy-baseline-701-705.txt`, `artifacts/hard-strategy-candidate-701-705.txt`, `artifacts/hard-strategy-candidate-seed-701.json`, `artifacts/hard-strategy-trace.mjs`.
