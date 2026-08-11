# PLAN.md — Stick RTS

Cross-session context carrier. Keep current scope, recovery state, and dirty-worktree warnings here. `HISTORY.md` is completed work only.

## Status — 2026-08-10

### Completed approved UX release

The owner reviewed the local view and approved promotion of the focused UX batch.
`main` now contains these completed commits in addition to the post-S10 gameplay/UI
release:

```text
5510579  fix: advance newly spawned archers to formation
4060cc9  feat: add local pause and update log review
18fb768  docs: record hard AI headless analysis
```

- **Archer spawn formation:** a newly spawned unescorted defender archer moves
  from home toward its assigned mine-side formation slot; the normal
  already-positioned cohesion behavior remains intact. Regression check:
  `node tools/archer-spawn-formation-check.mjs`.
- **Pause / Resume:** Player-vs-AI and Watch AI have screen-space pause controls,
  a pause overlay, and `P` shortcut. Pausing freezes tick count, gold, elapsed
  match time, AI, production, combat, movement, and projectiles; resuming
  continues the same world.
- **Update Log:** the landing menu exposes a curated, back-navigable player-facing
  Update Log in `src/updateLog.js`.
- **Focused browser check:** `node tools/pause-ux-check.mjs` verifies pause and
  resume behavior, Watch AI control placement, and Update Log navigation against
  a fresh local server/Chrome CDP session.

No model commander, strategy league/history, RL/training systems, model proxy, or
art runtime integration was included in this release.

Other retained isolated worktrees remain intentionally separate:

```text
agent/rl-commander-strategy-experiment  — preserved, unmerged experiment
agent/turret-watch-telemetry-local      — merged source branch retained locally
agent/visual-proof                      — separate art-pipeline work
```

## Architecture invariants

- Vanilla JS ES modules + Canvas 2D; no build step. Local preview: `python -m http.server`.
- `src/sim/` has no browser/DOM references. `src/render/` reads simulation state and does not mutate it.
- Tunables belong in `src/config.js`; no new magic numbers in systems/rendering.
- UI is screen-space and must be camera-zoom independent.
- Simulation randomness remains confined to `src/sim/rng.js`; `Math.random` is banned in `src/`.

## Parked

- AI balance/re-tune after the shortened-map finding; do not mix it into the UX batch.
- Owner map-length playtest.
- Sunmeadow art remains in `agent/visual-proof`; no runtime integration without explicit owner approval.
- Repository cleanup follows `docs/retention-cleanup-manifest.md`; no automatic tracked-file deletion.
