# Model Commander Authority Contract (v1)

## Rule of authority

The model is the only source of new strategic intent in Model Commander mode. Deterministic code may validate, schedule, and execute a valid intent, but it must never replace a rejected model intent with a strategic command or purchase plan.

## Decision lifecycle

| State | Strategic world mutation | UI / event result | Next request |
| --- | --- | --- | --- |
| `accepted` | Apply exactly the validated command and production intent as a new revision. | `plan accepted` | On declared review trigger. |
| `rejected-schema` | None. Preserve the last accepted plan; if none exists, remain `awaiting-initial-plan`. | `model response rejected` | Retry through bounded request cadence. |
| `rejected-provider` | None. Preserve the last accepted plan; if none exists, remain `awaiting-initial-plan`. | `model unavailable` | Retry through bounded request cadence. |
| `stale` | None. Never mutate a replaced, finished, or superseded match. | `stale response ignored` in trace only. | Current match controls future requests. |
| `blocked-legality` | No replacement purchase/anchor. Mark the selected plan blocked. | `selected action blocked: <reason>` | The plan's block trigger requests a revision. |
| `awaiting-initial-plan` | No commander-issued command or purchases. Normal deterministic simulation continues. | `waiting for initial model plan` | Initial bounded request. |
| `finished` | None. | Match result. | Never. |

## Invariants

1. Invalid JSON, missing required fields, invalid enum values, a provider error, timeout, or stale reply must not call `setTeamCommand`, create a plan, change a production intent, or advance a plan revision.
2. A rejected revision leaves the last **accepted** plan in force. It does not synthesize `defend`, `recover`, or any substitute purchase.
3. A rejection event is telemetry, not strategy. It may record reason and match time but cannot alter command, plan, purchase intent, or unit orders.
4. The companion returns a discriminated result:

```json
{ "ok": true, "decision": { "command": "attack", "objective": "pressure", "horizonSeconds": 30, "purchasePriority": ["warrior"] } }
```

or:

```json
{ "ok": false, "reason": "rejected-schema", "detail": "missing command" }
```
