# Team vision and Watch AI spectator foundation — 2026-08-16

## Status

Owner-approved local work in the isolated worktree:

```text
C:\Users\simcr\projects\stick-rts-team-vision-spectator
branch: agent/team-vision-spectator
base: cf56709 (merge: Hard AI feasible production correction)
```

The work is local and uncommitted. Owner approval covers this completed scope and the associated plan/history update; merge, push, Raven, and AI-limited perception remain separate decisions.

## Delivered boundary

`src/sim/vision.js` establishes a deterministic, current-state-only query surface:

```text
getTeamVisionSources(world, team)
isPositionVisibleToTeam(world, team, x, y)
isEntityVisibleToTeam(world, team, entity)
getVisibleEnemyEntities(world, team)
```

Living friendly units, heroes, core/statue, turrets, and structures become sources. `world.visionSources` is an optional descriptor list for future temporary/non-entity sources:

```text
{ team, x, y, radius, active }
```

This supports a future Raven/reveal source without assuming the source is targetable, permanent, ground-based, or population-bearing.

### Initial configuration

```text
miner     260
warrior   340
archer    380
hero      420
core      420
turret    360
structure 260
fog alpha 0.42
```

No range tuning claim is made; these are intentionally configurable initial values.

## Watch AI presentation

Watch AI starts in `Full` view. `uiState.spectatorView` selects `full`, `left`, or `right`; it is not held in `world` and is read only by rendering/UI code.

- **Full:** authoritative unit/structure state and both telemetry panels.
- **Left/Right:** all friendly entities remain visible; enemy units and static structures appear only when current team vision reaches them; enemy telemetry is omitted; terrain remains visible under a lightweight dim overlay outside source coverage.
- The enemy core location remains known outside vision as a neutral silhouette that intentionally excludes hit points and destroyed/live state.

## Explicit non-changes

The new query is not consumed by AI, targeting, command logic, movement, combat, projectiles, production, economy, RNG, or match resolution. In particular, `src/sim/ai/vision.js` retains Hard AI's pre-existing global live-composition behavior.

No fog-memory, stale ghosts, unexplored terrain darkness, scouting unit, Raven, or combat-rule change exists in this scope.

## Evidence

### Deterministic query coverage

```text
node tools/team-vision-check.mjs
```

Passed coverage includes outside/enter/leave transitions, combined sources, generic descriptors, static/core sources, dead-source removal, independent Left/Right visibility, and Full/Left/Right entity rules.

### Browser/UI and non-interference evidence

```text
node artifacts/vision-browser-check.mjs
```

Passed results:

```text
actual canvas clicks: Full → Left → Right
same seed, 300 ticks: Full == Left == Right normalized simulation snapshots
```

Captured images are in `artifacts/vision-browser/`.

### Regression evidence

Passed focused checks included Hard global vision, AI observability/goals/utility/build-cycle, recovery, turret schedule/simulation, queue/cap, defense/formation, archer cadence, and the headless economy/supply/statue invariant.

`tools/balance-check.mjs` remains a baseline-equivalent failure (`Archer cooldown failed`) on this worktree and unchanged `main`.

## Next decision before AI consumes vision

A separate design should decide whether AI receives current-only queries or a controlled memory layer, which strategic structures remain known, and how temporary reveal expiration/memory works. Do not infer approval for that, Raven, scouting, or combat changes from this foundation.
