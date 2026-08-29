# 20× late-battle frame attribution — 2026-08-28

## Scope

Diagnostic-only, separate-profile **headed Chrome** session against the LAN preview. The harness is `artifacts/late-battle-frame-trace.mjs`; raw result is `artifacts/late-battle-frame-trace-result.json` (both local-only).

LAN hashes matched the root worktree for:

- `src/main.js`
- `src/render/renderer.js`
- `src/sim/tick.js`

The deterministic fixture used the actual production browser frame loop and 20× speed. It held 50 Player and 50 AI units in an active central battle with very high fixture-only HP, so the population could not collapse during capture. It retained roughly 31–39 live projectiles, 51 Player vision sources (including the core), and 51 retained samples after stationary history compacted.

## Repeated visible-browser trace

Two independent 600-frame captures produced:

| Metric | Run 1 | Run 2 |
|---|---:|---:|
| Frame median | 18.5 ms | 18.4 ms |
| Frame P95 | 18.7 ms | 18.7 ms |
| Frame max | 18.9 ms | 18.9 ms |
| Ticks/frame median | 22 | 22 |
| Ticks/frame P95 | 23 | 23 |
| Total ticks | 13,015 | 13,021 |

The stable 18.4–18.9 ms cadence has no hitch spike in this headed local session. At 20× and an ~18.5 ms display frame, 22 simulation ticks per visual frame is expected: `18.5ms × 20 × 60Hz ≈ 22.2 ticks`. There is no measured runaway catch-up/backlog in this fixture.

## CPU-profile attribution

The browser CPU profiles consistently identify the relative ordering of named paths:

1. `getTeamVisionSources`: 52.678–63.491 sampled ms per full 600-frame capture.
2. `drawVisionFog`: 35.927–39.086 ms.
3. `updateMovement`: 16.612–24.463 ms.
4. `updateCombat`: 10.036–10.887 ms.
5. `updateVisionMemory`: 10.971–15.519 ms.
6. `updateProjectiles`: 0–3.035 ms.

These are sampled cumulative function times over approximately 10.3 seconds; functions can nest, so they must not be summed as a frame total. At this load they are all far below a measured per-frame budget violation.

## Conclusion

The trace does **not** reproduce a 20× late-battle hitch. It also does not support the prior hypothesis that late-battle combat or fixed-timestep catch-up is currently the dominant bottleneck. The largest named presentation cost remains repeated `getTeamVisionSources` construction, followed by fog rasterization, but neither generated a frame-time spike in the measured headed session.

The owner-visible effect may instead be **expected 20× temporal stepping**: every painted frame intentionally advances about 22 simulation states. That can look less smooth during dense combat even when frame cadence is stable. This is a presentation/semantics observation, not proof that an optimization is needed.

## Stop gate

Do not modify fog, combat, simulation tick semantics, or add tick dropping from this evidence. If the owner wants a smoother 20× experience, the next decision is product-level: whether to preserve exact 20× simulation but intentionally reduce/highlight visual interpolation, or to revise speed semantics. Either changes perceived presentation and requires explicit approval. A next performance trace should be captured on the owner's actual interactive browser while the reported lag occurs before treating it as a regression.
