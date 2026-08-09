# Stick RTS Model Commander — Later Starting Point

**Logged:** 2026-07-29
**Status:** Planning paused at the user's direction; do not resume implementation until explicitly requested.

## Product goal

Build visible, repeatable emergent model-vs-model RTS gameplay: each team establishes economy, builds armies, selects/revises strategy, engages the opponent, damages cores, and resolves matches.

## Research-grounded direction

The current raw periodic purchase-list controller is not the target architecture. The planned architecture is:

```text
bounded game manual + hierarchical action catalogue
+ spatial current-frame observation
+ rolling event-derived team memory
+ explicit plan/action-result lifecycle
+ named army objectives/anchors
+ deterministic legality and simulation execution
+ visible commander telemetry and replay trace
+ fixed-seed evaluation before offline profile learning
```

Primary references saved in the implementation plan:

- TextStarCraft II — observation-to-text, action catalogue, single/multi-frame summaries
- LLM-PySC2 — LLM-oriented RTS environment, async calls, explicit actions/logging
- Voyager — inspectable skill accumulation and environment feedback
- SMAC — fixed-scenario quantitative evaluation
- Generative Agents — memory → reflection → plan pattern

## Decisions already made

- First model-vs-model prototype uses **full map vision for both teams**, explicitly labeled `visionMode: "full"`.
- Models retain strategic authority. Deterministic code enforces rules, legality, timing, movement, combat, and resources only.
- No hidden deterministic strategic fallback in Model Commander mode.
- LM Studio stays private behind the same-origin companion.
- Any recursive/league learning is later, offline, bounded, replayable, and accepted only against held-out fixed-seed evaluation; never self-modifying during a live match.

## Detailed plan

See:

```text
.hermes/plans/2026-07-29_065403-model-commander-agent-environment.md
```

No implementation, commit, merge, push, or deployment was authorized from this starting point.
