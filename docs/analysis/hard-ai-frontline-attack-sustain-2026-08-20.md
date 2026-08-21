# Hard frontline-aware Attack sustain — 2026-08-20

## Scope

Owner-approved, local-only behavior pass using the existing bounded frontline/objective assessment. No vision or memory semantics, production feasibility, economy balance, build cycle, combat, movement, targeting, Raven, scouting, momentum/history subsystem, merge, push, or deployment changed.

## Rule

`src/sim/ai/attack-sustain.js` provides the one shared sustain predicate used by both strategic-goal and command selection.

An already committed Hard Attack sustains when either:

1. the existing global sustain condition holds: `combatUnits >= 5`; or
2. all forward-pressure conditions hold:
   - `objective.progress >= 0.65`;
   - `frontline.friendlyCombatCount >= 2`;
   - `frontline.friendlyPower >= frontline.visibleEnemyPower`.

New launch remains at eight combat units. The local enemy comparison is current-team-vision-only. A lone deep friendly survivor is intentionally insufficient to sustain Attack.

`attackCommitment` records the threshold values and `sustainReason`: `global-combat`, `forward-frontline-pressure`, or `null`.

## Focused evidence

`tools/hard-ai-frontline-sustain-check.mjs` was first observed failing against the former global-only sustain behavior, then passes. It proves:

- one advanced friendly combat unit does not sustain a four-unit Attack;
- two forward units with high progress and current local power parity do sustain;
- low progress does not sustain; and
- currently visible enemy frontline power superiority does not sustain.

The final focused/regression suite passed frontline assessment, sustain, team vision, Hard vision, controlled perception/memory, observability, goals, unit utility, recovery, build-cycle, feasibility, production queue, turret, and defense checks. `git diff --check` passed.

## Activation and cohort result

Hard-vs-Hard seeds 701–705 at the 3,000-second cap remained `1/0/4` player/AI/unresolved, mean `2806.4s`, equal to the immediate baseline. Seed-701 and seed-702 strategy traces recorded zero `forward-frontline-pressure` decisions: their under-global-sustain states lacked either the two-unit local mass or required current objective/parity combination.

This pass is therefore **safe but inactive** for the named unresolved seeds, not a demonstrated liveness fix. A previous relaxed one-unit variant worsened the same cohort to `0/0/5`; it was not retained.

## Related evidence

- `artifacts/hard-ai-frontline-attack-sustain-pass-2026-08-20.txt`
- `artifacts/hard-frontline-sustain-candidate-065-mass2-701-705.txt`
- `artifacts/hard-frontline-sustain-final-seed-701.json`
- `artifacts/hard-frontline-sustain-final-seed-702.json`
- `artifacts/hard-strategy-trace.mjs`
