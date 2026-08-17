# Hard AI feasible production and build-cycle correction — 2026-08-16

## Status

This work is **local and uncommitted** in the isolated worktree:

```text
C:\Users\simcr\projects\stick-rts-hard-ai-liveness-regression
branch: agent/hard-ai-liveness-regression
base: ff97303 (balance: extend archer range and cadence)
```

It must not be merged or pushed without owner review and a separate explicit decision. The original `main` checkout remains untouched.

## Scope delivered

The work incrementally changed **Hard normal unit purchases only** from a single scripted counter/build-cycle choice into a feasibility-first, deterministic V0 utility selection path for:

```text
miner
warrior
archer
```

Deliberately preserved outside the general utility pool:

- zero-miner emergency;
- scheduled turret purchases;
- hero purchases;
- commands, recovery, retreat, and formations;
- structures and population/capacity fallback;
- existing economy authority and production queues.

Easy and Medium retain their legacy normal-unit path.

## Architecture

Hard’s normal-unit decision flow is now:

```text
refresh memory
→ build read-only assessment
→ select explicit strategic goal
→ scheduled turret side path
→ assess normal unit feasibility
→ zero-miner emergency, if applicable
→ score feasible miner/warrior/archer candidates
→ deterministic winner
→ authoritative buyUnit()
→ bounded lastAiDecision explanation
```

The economy APIs remain execution authority. AI does not bypass costs, queue limits, supply, production, or purchase legality.

### V0 utility inputs

The deliberately small, configured V0 inputs are:

1. recovery progress;
2. affordable combat efficiency;
3. existing composition-counter preference;
4. existing build-cycle preference.

No combat-deficit, relative-power, economic-health, mining-value, threat-distance, unit-stat, randomized, or balance heuristic was introduced.

## Phase 0–3 evidence

### Liveness contract

The original deterministic Hard failure was preserved RED through observation/goals work, then turned GREEN only in Phase 3:

```text
preferred archer counter: infeasible / gold
feasible warrior: selected and queued through buyUnit()
```

Focused check:

```text
node tools/hard-ai-infeasible-counter-check.mjs
```

### Determinism and bounded observability

The architecture exposes a bounded latest-decision record, not an in-world history. It records assessment, goal, candidates, feasibility, utility components, tie-break, selection, execution result, command, and relevant side paths.

Focused checks:

```text
node tools/ai-observability-check.mjs
node tools/ai-goal-selection-check.mjs
node tools/hard-ai-unit-utility-check.mjs
```

## Hard-vs-Hard diagnostic finding

A diagnostic-only 12-run observation pass used Hard-vs-Hard traces for seeds:

```text
101, 202, 303, 404, 505, 606
```

Each seed was run normally and with the pre-existing per-team RNG streams swapped, for 120 simulated seconds. It found the old repeated miner-versus-warrior collapse was not a fixed map-side advantage.

The causal chain was:

```text
per-team decision jitter
→ different count of no-purchase decisions
→ buildIndex advanced despite no feasible normal unit
→ different cycle positions at first affordable purchase
→ one side could choose miner while the other chose warrior
→ an infeasible archer counter held a miner-position cycle
→ repeated miner production and military collapse
```

Representative pre-correction seed 505 at 120 seconds:

```text
player: 15 miners, 0 warriors
AI:     10 miners, 4 warriors
```

The miner-heavy side lost at 297.6 seconds.

## Build-cycle state-progression correction

The correction is intentionally narrow and applies to Hard’s utility path.

### Rule

```text
buildIndex advances exactly once only after a successful normal unit buyUnit() commit.
```

It does not advance because a decision timer fired, all normal candidates were infeasible, the queue/gold blocked a unit, no normal candidate was selected, execution failed, or a non-unit fallback executed.

An infeasible composition counter no longer pins a cycle position after a successfully committed feasible normal fallback. The fallback advances the cycle once.

`lastAiDecision.selection` now exposes:

```text
buildIndexBefore
buildCycleKind
didBuildIndexAdvance
buildIndexAfter
buildIndexReason
```

The bounded reasons are:

```text
successful-normal-unit-commit
no-normal-unit-commit
```

Focused regression:

```text
node tools/hard-ai-build-cycle-progression-check.mjs
```

It covers no feasible unit, successful cycle unit, infeasible counter with feasible fallback, and execution failure after prior feasibility inspection.

## Post-correction evidence

The same 12-run diagnostic showed:

```text
uncommitted normal decisions: 2,448
uncommitted decisions advancing buildIndex: 0

successful normal-unit commitments: 288
successful commitments held without advancing: 0
```

Previously divergent seed 505 at 120 seconds became:

```text
player: 9 miners, 4 warriors
AI:     10 miners, 3 warriors
both buildIndex values: 12
```

Seed 606 became:

```text
player: 10 miners, 3 warriors
AI:     10 miners, 3 warriors
both buildIndex values: 12
```

RNG-stream swapping can still reverse minor legitimate one-unit differences associated with queue/gold timing, but it no longer reverses the old `15 miners / 0 warriors` versus `10 miners / 4 warriors` runaway or changes cycle progression merely through no-op decision timing.

Repeated ordinary headless output and repeated Hard-vs-Hard seed 505 output were byte-identical.

## Validation performed

Passed focused checks include:

```text
node tools/hard-ai-build-cycle-progression-check.mjs
node tools/hard-ai-unit-utility-check.mjs
node tools/hard-ai-infeasible-counter-check.mjs
node tools/ai-goal-selection-check.mjs
node tools/ai-observability-check.mjs
node tools/hard-army-recovery-check.mjs
node tools/hard-turret-schedule-check.mjs
node tools/hard-vision-check.mjs
node tools/production-queue-cap-check.mjs
node tools/turret-sim-check.mjs
node tools/defend-anchor-check.mjs
node tools/defense-spacing-check.mjs
node tools/archer-range-cadence-check.mjs
```

`git diff --check` passed.

`tools/balance-check.mjs` remains a known stale baseline-equivalent failure (`Archer cooldown failed`) in both this worktree and unchanged `main`; it is unrelated to this AI work.

## Current boundary and next decision

Do not begin a broader Phase 4 automatically.

The cycle-progression artifact is removed. The remaining observed limitation is strategic, not state-progression corruption:

```text
Build Army has no explicit immediate combat-urgency / combat-deficit purchase value.
```

When an archer counter is unaffordable and feasible miner/warrior scores tie or one combat unit is temporarily unaffordable, the existing candidate-order and V0 inputs can still create minor miner/warrior differences. No combat-urgency or economic-value heuristic has been implemented.

The next work, if separately approved, should be a new narrow design and evidence pass for a reusable combat-deficit signal based on combat units only. It must not be inferred as authorized by this document.
