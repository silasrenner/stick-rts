# PLAN.md — Stick RTS

Cross-session context carrier. Keep only current scope, recovery state, and dirty-worktree warnings here. Completed work belongs in `HISTORY.md`; detailed durable findings live in focused `docs/analysis/` documents.

## Current status — 2026-08-16

### Active isolated worktree

```text
C:\Users\simcr\projects\stick-rts-hard-ai-liveness-regression
branch: agent/hard-ai-liveness-regression
base: ff97303 (balance: extend archer range and cadence)
```

- This worktree is intentionally dirty, local, uncommitted, unmerged, and unpushed.
- The original checkout `C:\Users\simcr\projects\stick-rts` remains the untouched `main` baseline for this work.
- Do not mix this branch with other retained worktrees or push/merge without explicit owner approval and a LAN/local-review gate.

### Current completed local scope

Phases 0–3 and a narrow follow-up correction are complete for **Hard normal unit purchases only**:

1. Phase 0 added the deterministic infeasible-counter liveness regression.
2. Phase 1 added read-only assessment, candidates, shared feasibility, and bounded latest-decision explanation.
3. Phase 2 made strategic goals explicit while preserving command behavior.
4. Phase 3 changed Hard miner/warrior/archer purchase selection to feasibility-first V0 utility.
5. The follow-up corrected build-cycle state progression: `buildIndex` now advances only after a successful Hard normal utility-path unit purchase.

The durable architecture, diagnostic evidence, validation commands, and explicit next boundary are in:

```text
docs/analysis/hard-ai-feasible-production-build-cycle-2026-08-16.md
```

The owner-facing plain-text validation summary is:

```text
docs/analysis/hard-ai-build-cycle-correction-validation-summary-2026-08-16.txt
```

### Guardrails preserved

Do not broaden the utility pool without separate approval. The following remain on their existing paths:

- zero-miner emergency;
- scheduled turret purchases;
- heroes;
- commands, recovery, retreat, formations, and targeting;
- structures and population/capacity fallback;
- economy/production authority.

Easy and Medium retain legacy normal-purchase behavior. Hard continues to execute through normal economy APIs only.

### Verified state

- Phase 0 liveness is GREEN: an infeasible preferred archer counter no longer wastes an affordable warrior purchase.
- The build-cycle correction has focused coverage for no feasible unit, successful normal purchase, infeasible-counter fallback, and failed authoritative execution.
- Focused AI/economy/simulation checks passed; repeated headless and Hard-vs-Hard seed 505 outputs are byte-identical.
- The known `tools/balance-check.mjs` `Archer cooldown failed` diagnostic remains baseline-equivalent in candidate and `main`; do not attribute it to this work.

### Current stop boundary / next decision

Do **not** begin Phase 4 automatically.

The diagnostic removed the decision-timing-driven cycle artifact. The remaining visible issue is separate and strategic: `Build Army` has no explicit immediate combat-urgency / combat-deficit purchase value. Any work on that requires a new owner-approved scope, design, regression, and validation plan.

## Architecture invariants

- Vanilla JS ES modules + Canvas 2D; no build step. Local preview: `python -m http.server`.
- `src/sim/` has no browser/DOM references. `src/render/` reads simulation state and does not mutate it.
- Tunables belong in `src/config.js`; no new magic numbers in systems/rendering.
- UI is screen-space and must be camera-zoom independent.
- Simulation randomness remains confined to `src/sim/rng.js`; `Math.random` is banned in `src/`.

## Retained isolated worktrees

```text
agent/local-ux-regression-batch        — prior UX review branch; dirty (`src/main.js` modified, `src/update-log-data.js` and `src/updateLog.js` untracked); do not mix into main
agent/rl-commander-strategy-experiment — preserved, unmerged experiment
agent/turret-watch-telemetry-local     — merged source branch retained locally
agent/visual-proof                     — separate art-pipeline work
agent/hard-ai-liveness-regression      — active local AI refactor / build-cycle correction worktree
```

## Parked

- Owner local/LAN review of the active Hard AI worktree before any commit, merge, or push.
- Separately authorized combat-deficit / combat-urgency production reasoning, only after review of the completed correction.
- Model commander, strategy league/history, RL/training systems, and model proxy remain excluded from `main` pending separately approved scope.
- Sunmeadow art remains in `agent/visual-proof`; no runtime integration without explicit owner approval.
- Repository cleanup follows `docs/retention-cleanup-manifest.md`; no automatic tracked-file deletion.
