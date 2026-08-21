# Raven scouting V1 — local mechanical validation, 2026-08-20

## Status

Local-only, uncommitted work in:

```text
C:\Users\simcr\projects\stick-rts-team-vision-spectator
branch: agent/team-vision-spectator
base: cf56709
```

No commit, merge, push, or AI Raven purchase policy was added. The documented Hard-AI liveness blocker remains unresolved and explicitly out of scope.

## Implemented lifecycle

A successful Raven purchase creates a temporary non-combat record in `world.ravens`:

```text
preparing (2s)
→ flying from team home toward opposing home
→ revealing at opposing home (10s)
→ exiting beyond enemy territory
→ removed
```

- Left/player Raven direction is `+1`; Right/AI Raven direction is `-1`.
- Flight is fixed-tick deterministic and consumes no RNG.
- Raven never enters `world.units`, cannot be targeted, cannot attack, receives no HP/combat fields, and never reaches formation, movement, targeting, population, frontline, combat-power, or command systems.
- On cleanup, all Raven-owned temporary descriptors are removed; there is no permanent hidden Raven accumulation.

## V1 configuration

`CONFIG.RAVEN` in `src/config.js`:

| Field | Value |
|---|---:|
| cost | 750g |
| preparation time | 2s |
| movement speed | 560 px/s |
| moving vision radius | 300 px |
| enemy-base reveal radius | 800 px |
| reveal duration | 10 simulated seconds |
| cooldown | 45s |
| exit speed / distance | 700 px/s / 350 px |

These are intentionally reasonable initial values, not a balance conclusion. The cost is materially above normal warrior/archer purchases so scouting is an economic choice in a future AI-design pass.

## Economy and production seam

Raven uses the existing `economy.js` feasibility and ordinary `spend` path:

- success requires normal team gold and increases `goldSpent` by exactly 750;
- unaffordable purchase fails with the ordinary `gold` reason;
- active/preparing Raven blocks repurchase with `ravenActive`;
- after exit, the configured cooldown blocks a repeat with `ravenCooldown`.

Raven intentionally does **not** use the normal FIFO production queue. It is a temporary scouting action rather than a materialized army/structure purchase; queueing it would create unnecessary contention with ordinary combat production and risk altering normal production timing. The dedicated small Raven action state also guarantees it consumes no population and cannot advance Hard's successful-normal-unit-only `buildIndex`.

## Generic vision and AI-memory integration

`src/sim/systems/raven.js` projects active Raven state into the pre-existing generic `world.visionSources` array:

```text
flying   → { team, x, y, radius: movingVisionRadius, ravenId, ravenSource: 'moving' }
revealing→ { team, x, y, radius: enemyBaseRevealRadius, ravenId, ravenSource: 'reveal' }
```

No Raven-specific visibility, composition, or memory path exists. The actual flow is:

```text
Raven descriptor
→ src/sim/vision.js team visibility
→ Full / Left / Right spectator visibility and fog
→ src/sim/ai/vision.js current observations
→ existing bounded mobile memory / persistent observed-structure memory
```

Raven updates before AI decisions in the fixed tick, so current visibility is available through the existing observation seam. Raven does not directly mutate AI memory. Mobile knowledge expires under ordinary configured staleness; observed structures retain the existing frozen persistent-memory behavior.

## UI and rendering

- Player build footer has a lightweight Raven button with `750g`, unaffordable, active, and cooldown status text.
- Raven is rendered as a high-altitude team-colored bird/silhouette labeled `RAVEN`, changing to `REVEAL` during the base reveal.
- Watch AI retains Full / Left / Right. Watch controls remain player-input-disabled, while the narrow local debug hook `window.__buyRaven(team)` supports reproducible browser validation for either team.

## Deterministic focused evidence

`node tools/raven-scouting-check.mjs` passed. It covers:

- exact ordinary purchase cost and unaffordable rejection;
- active/cooldown repeat-purchase blocking;
- no queue entry, unit, population, combat, or frontline contribution;
- mirrored Left→Right and Right→Left flight;
- moving source visibility and outside-source hiding;
- configured enemy-base reveal activation and exact 10-second expiry;
- simultaneous source cleanup / Raven despawn;
- ordinary AI current-observation, mobile-memory expiry, and persistent structure-memory behavior;
- player UI availability/affordability/active state;
- identical-seed repeatability.

Focused existing checks passed: team vision, perception memory, Hard vision/goals/utility/build-cycle/infeasible-counter/recovery, frontline assessment/sustain, production queue/cap, turret/defense, archer, core shield, telemetry, and headless invariants.

Known baseline-equivalent failures remain unchanged:

```text
node tools/balance-check.mjs
  Archer cooldown failed
node tools/starting-turret-check.mjs
  Starting turret must not consume player population
```

## Browser and spectator validation

Exact-worktree local server: `http://192.168.0.83:8811/`.

`node artifacts/raven-browser-check.mjs` passed with browser console clean:

- actual canvas clicks selected Left then Right spectator perspective;
- fixed-seed Raven state was byte-identical across Full, Left, and Right (`snapshotBytes: 618`);
- player Raven showed flying at 5s, reveal at 12s with radius 800, and no Raven source after post-reveal expiration;
- Right/AI Raven had direction `-1`, flew left, and entered the same radius-800 reveal;
- screenshots capture player Full/Left/Right in flight, Left reveal, Left post-reveal fog, Right in-flight, and Right reveal.

Visual review confirms the left perspective screenshot shows a labeled red Raven with a moving circular vision region; the reveal screenshot shows `REVEAL`, a large reveal region, and enemy units/structures inside it; the post-expiry screenshot shows the temporary reveal/Raven absent and the area dimmed again.

## Hard-AI liveness blocker — preserved unresolved

The limited-vision branch's strategic liveness mismatch remains recorded, including the named Hard-vs-Hard seeds 701–705 that remain 1 player win / 0 AI wins / 4 unresolved in the latest local cohort. Raven V1 does not resolve it because Hard AI has no Raven purchase rule. The next separately approved pass must decide how/when existing strategic machinery values information; it must not turn this mechanical Raven asset into an implicit fallback policy.
