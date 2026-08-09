# Model Commander Action Semantics (v1)

## Scope

The commander makes **macro** choices only. It cannot issue arbitrary coordinates, select individual units, or directly target combat entities.

`strategy` is an explanatory doctrine label. It has no hidden deterministic effect. The strategic field that changes movement is `targetIntent`.

## Target intent mapping

| Target intent | Required command | Deterministic anchor | Availability |
| --- | --- | --- | --- |
| `hold-own-mine` | `defend` | own mine | Always |
| `contest-mid` | `attack` | map midpoint | Always |
| `pressure-enemy-mine` | `attack` | enemy mine | Always |
| `siege-enemy-outer` | `attack` | enemy outer-turret location | Always; emits a later legality block if the relevant attack state is unavailable |
| `attack-enemy-core` | `attack` | enemy core | Always |
| `retreat-home` | `retreat` | own home | Always |

The anchor is derived only from the game `CONFIG` and current world geometry. Formation and movement may execute a valid anchor; they may not choose another strategic destination.

## Production intent

The next slice will replace the legacy `purchasePriority` list with ordered `{ kind, count }` production intent. It will be expanded once at acceptance time into an immutable queue where repeated purchases remain repeated. A permanently illegal request returns `blocked-legality`; it must not be dropped in favor of a later request or replaced with a deterministic purchase.
