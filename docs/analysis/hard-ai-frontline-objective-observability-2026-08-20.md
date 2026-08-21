# Hard frontline and objective observability — 2026-08-20

## Scope

Read-only Hard AI assessment pass. No goals, utility, command posture, production, movement, combat, vision, memory duration, or RNG behavior changed.

## Assessment primitives

### Frontline

For a team, the forward-most living non-miner combat unit defines the frontline anchor: greatest `x` for Player/Left and smallest `x` for AI/Right. Friendly frontline mass is the living friendly combat units in the inclusive configurable 420px band behind that anchor toward their own home. The assessment records friendly count/power, current visible enemy count/power around the anchor, and the anchor position.

Enemy combat uses current shared team vision only. A hidden remembered mobile unit never contributes current frontline mass.

### Objective progress

The assessment records the forward-most friendly combat position, directed remaining distance to enemy home, and normalized progress from own home (`0`) to enemy home (`1`). No combat yields count/power zero, position/distance `null`, and progress zero.

## Evidence

`tools/hard-ai-frontline-assessment-check.mjs` passes mirrored Left/Right states, in/out-of-band membership, current visibility versus stale mobile memory, forward/homeward progress, empty assessment, same-state determinism, and read-only decision behavior.

Representative unchanged-behavior traces:

- `artifacts/hard-frontline-objective-seed-701-ai.json`
- `artifacts/hard-frontline-objective-seed-702-ai.json`

The signals distinguish global army count from actual forward pressure. They motivated the separately approved sustain pass; this document does not claim to fix unresolved-match liveness.

## Related evidence

- `artifacts/hard-ai-frontline-objective-observability-summary-2026-08-20.txt`
- `artifacts/hard-frontline-objective-trace.mjs`
