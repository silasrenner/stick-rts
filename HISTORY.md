# HISTORY.md — Stick RTS release ledger

This is a compact index, not default session context. Start with `PLAN.md`; read this file only to identify the relevant release or investigation. Detailed completed-session narratives and original v1/v2 specifications are preserved verbatim in [`docs/archive/session-history-legacy.md`](docs/archive/session-history-legacy.md). Search that archive by commit, session label, subsystem, or tool name instead of loading it wholesale.

## Current boundary

- `main` is clean with a local documentation checkpoint one commit ahead of `origin/main`; it has not been pushed.
- The latest synchronized product release is `bae1545` (2026-08-10).
- No uncommitted local Hard queue/income/turret batch remains. The prior wording that characterized it as unreviewed or uncommitted is superseded by the merged commit below.
- Active scope and any future dirty-worktree warning belong in `PLAN.md`, never here.

## Release ledger

| Commit | Date | Scope | Durable evidence / notes |
|---|---|---|---|
| `bae1545` | 2026-08-10 | Queue cap, income adjustment, Hard turret schedule, Turret glyph | Focused checks: `turret-glyph-check`, `production-queue-cap-check`, `turret-sim-check`, `hard-vision-check`, `defend-anchor-check`, `balance-check`. |
| `5510579` | 2026-08-10 | Newly spawned defender archers advance to assigned formation | `node tools/archer-spawn-formation-check.mjs`. |
| `4060cc9` | 2026-08-10 | Pause/Resume and player-facing Update Log | `node tools/pause-ux-check.mjs`; includes Player-vs-AI and Watch AI control placement. |
| `18fb768` | 2026-08-10 | Record Hard AI headless analysis | [`docs/analysis/hard-vs-hard-100-games-2026-08-09.md`](docs/analysis/hard-vs-hard-100-games-2026-08-09.md). |
| `c76e849` | prior | Turrets and Watch telemetry release | Starting turret, purchasable turret slots, production/combat/supply/formation/rendering, Watch clock/resource differential/team summaries. |
| `ece456d` | prior | Watch speed and Hard global enemy-composition awareness | Browser-verified before merge; see legacy archive for methodology. |

## Historical lookup map

| Need | Read / search |
|---|---|
| Current scope, recovery state, worktree warnings | `PLAN.md` |
| Hard-vs-Hard outcomes and headless methodology | `docs/analysis/hard-vs-hard-100-games-2026-08-09.md`, then legacy archive if needed |
| Detailed S5–S10 investigations, browser-cache lessons, balance findings | `docs/archive/session-history-legacy.md` |
| Original v1/v2 session specifications and stop conditions | `docs/archive/session-history-legacy.md` |
| File-retention decisions | `docs/retention-cleanup-manifest.md` |

## Archive policy

- Preserve detailed narratives for reproducibility; do not delete or routinely inject them as context.
- When a new release is completed, add one concise ledger row here and update `PLAN.md` only with the current state.
- Move only durable, cross-session findings into focused `docs/analysis/` documents. Keep per-session narration in the archive.
