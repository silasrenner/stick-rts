# Hard Build → Scout → Adapt → Mass → Attack V1 — validation, 2026-08-20

## Scope and configuration

Local-only Hard AI continuation in `agent/team-vision-spectator`. The four existing goals remain frozen: Recover, Build Army, Defend, Attack. No Scout/Prepare/Muster/Recon goal, omniscient planner, fixed composition script, formation/targeting/combat change, commit, merge, push, or remote deployment was added.

- `attackLaunchCombatUnits`: **24**.
- `attackSustainCombatUnits`: **12**. This minimal V1 change prevents a five-unit remnant from being ordinary global sustain after a 24-unit launch. The pre-existing forward-frontline exception is unchanged.
- `armyBuildProgress = clamp(friendlyCombatUnits / attackLaunchCombatUnits, 0, 1)` from authoritative friendly living combat state. Thus: `0→0`, `12→.5`, `24→1`.
- Build Army Raven timing: configurable triangular multiplier, peak `.55`, half-width `.35`, floor `.20`; applied only during Build Army. Existing information need, goal weights, Raven mechanics, feasibility, and protected-combat reserve remain intact.
- Existing Build Army counter contribution now scales continuously from `25%` at progress `0` to `100%` at progress `1`; it still only applies where the existing team-visible/current-memory counter path produced a preference.

## Explainability

Bounded assessment/last-decision records expose launch count, build progress, information state, known composition, counter preference, normal candidate counter contribution, Raven timing multiplier, affordability, Raven utility, and selection. Raven remains outside the normal build cycle.

## Deterministic coverage

`node tools/hard-ai-build-scout-adapt-check.mjs` passed after a red run that failed on the legacy 8-unit launch behavior. It covers 23/24 readiness; 0/.5/1 progress; early/mid/fresh Raven context; Raven optionality; observation-only counter adaptation; hidden-composition isolation; and build-index isolation.

The focused Raven, mechanics, vision/memory, goals, normal unit utility, build cycle, infeasible counter, recovery, frontline assessment/sustain, queue/cap, turret, defense, and formation checks passed. Known baseline-equivalent failures remain `tools/balance-check.mjs` Archer cooldown and `tools/starting-turret-check.mjs` starting-turret population. `tools/headless-invariants-check.mjs` is absent in this worktree, so no result is claimed for that named command.

## Build → Scout → Adapt evidence

Seed 701, AI rebuild cycle:

1. **488.333s:** Build Army, 11 combat (`.458`), 10 miners, composition `9 warrior / 1 archer / 1 hero`, 1881g; stale unknown enemy data; Raven selected (`utility 1.976`, timing `.790`, affordability `1`).
2. **498.917s reveal:** 12 combat (`.5`); observed `{ miner: 7, warrior: 8, archer: 3 }`; `scoutingNeed` became `0`; existing counter preference became `archer`.
3. **508.450s:** next normal Build Army purchase was **archer** at `.542` progress.

This is an actual observation → existing counter preference → later normal purchase chain; it uses no scripted unit table. Raw records are in `artifacts/hard-build-scout-adapt-diagnostic/seed-701.json`.

## Hard-vs-Hard diagnostics

`node artifacts/hard-build-scout-adapt-diagnostic.mjs 701 702 703 704 705` and separately `706 707 708 709 710` completed at a 3,000-second cap.

- 10 matches: `5 player / 5 AI / 0 unresolved`.
- 20 first attacks: every one launched at exactly **24 combat**.
- All 20 sides reached major contact, mean **18.66s** after first launch.
- 10 sides registered enemy structure damage, mean **947.35s** after first launch.
- Match duration: mean **1337.79s**, min **677.733s**, max **2502.05s**.
- 144 autonomous Raven purchases and 65 Attack command entries; unit purchases continue during Attack.

The 24-unit force clearly creates larger initial contacts than the prior 8-unit rule. It does not cure fragmentation/defender-conversion behavior: several sides still did not reach structures and first structure damage was often much later than contact. This is observational evidence only, not a liveness claim or tuning target.

## Important finding

The requested *initial* Build → Scout → Adapt → Mass ordering was not autonomously demonstrated in this 701–710 sample. Initial economies normally reached 24 combat before a Raven could win under the unchanged protected reserve, which scales with the larger launch shortfall. Mid-build/rebuild Raven adaptation did occur. This is an architecture-consistent opportunity-cost finding; this pass deliberately did not weaken reserve semantics or add a scripted Raven trigger.

## Recommended next decision

LAN-review the exact worktree. If first-cycle scouting is a requirement rather than an optional wealthy-state behavior, authorize a separately bounded protected-reserve/opportunity-cost study. Do not add a Scout goal or fixed scout purchase.
