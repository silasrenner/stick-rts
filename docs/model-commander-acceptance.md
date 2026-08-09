# Model Commander Acceptance Baseline

## Purpose

This document defines the measurable path to **visible, repeatable model-vs-model RTS play**. It is deliberately a baseline, not a claim that the current Local Gemma controller meets these milestones.

## Fixed evaluation conditions

- **Vision:** `full` for both teams in the first prototype.
- **Authority:** the model chooses strategic intent; the deterministic simulation owns mechanics, timing, movement, combat, and legality.
- **Provider boundary:** browser → same-origin companion → loopback LM Studio only.
- **Reproducibility:** each scenario has a fixed seed and a maximum simulated duration.
- **No hidden strategic fallback:** rejected/blocked model intent is recorded and surfaced; it is not silently replaced by a scripted purchase or attack choice.

## Scenarios and measurements

Every scenario records both teams independently. A zero is an honest baseline result, not a failed schema run.

| Scenario | Seed | Duration | Primary observation |
| --- | ---: | ---: | --- |
| Opening economy | 4101 | 180 s | Does each commander establish mining and spend resources? |
| First contact | 4102 | 360 s | Do opposing armies reach a contested zone and exchange combat events? |
| Pressure opportunity | 4103 | 540 s | Does a commander commit an army beyond its safe territory? |
| Recovery after losses | 4104 | 720 s | Does a commander revise production/position after material loss? |
| Full-match completion | 4105 | 1,800 s | Is core damage produced and does the match resolve or time out? |

## Required measurements

The baseline evaluator will record:

1. `maximumLivingMiners`
2. `totalSpend`
3. `maximumLivingCombatUnits`
4. `enteredContestedZone`
5. `combatEvents`
6. `enemyCoreDamage`
7. `terminalStateOrTimeout`
8. provider latency, decision count, accepted/rejected intent, blocked production, and plan revisions

## Player-visible acceptance target

A later implementation is only considered successful when fixed-seed browser Watch matches visibly show both model teams establishing an economy, forming armies, entering combat, revising plans after material events, damaging a core, and producing repeatable recorded outcomes. Valid JSON or a non-crashing simulation alone does not meet this target.
