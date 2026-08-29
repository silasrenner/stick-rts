# Player fog residual-lag diagnostic — 2026-08-28

## Scope and source

Diagnostic-only browser/CDP measurement against the root `main` checkout at `702256f`. The LAN endpoint `http://192.168.0.83:8811/` served `src/render/renderer.js` SHA-256 `3806526f54aadce6e9c73e40e9420f887643e9b3a547ec409e00478a26853e5d`, matching the worktree before execution.

Harness: `artifacts/fog-residual-lag-profile.mjs` (local-only). Raw result: `artifacts/fog-residual-lag-profile-result.json` (local-only).

The fixture uses the real Player renderer with 80 moving Player vision units and 80 enemy units, producing 81 Player vision sources including the core. Retained history reached its expected cap: `80 × 12 + 1 stationary core = 961` samples.

## Controls

Each speed used the same fixture and real renderer path:

1. Transparent veil with the draw path retained (not a true CPU no-fog control; no production fog-off gate exists).
2. Current sources with flat clearance.
3. Current plus sustained sources with flat clearance.
4. Current Player fog: sustained sources, radial vision feather, and vertical boundary feather.

Each arm sampled 240 requestAnimationFrame intervals. Chrome's CPU profile reports cumulative sampled function time across that arm, not a per-frame wall-time budget.

## Result

All 12 arms remained at a 16.8–17.2 ms requestAnimationFrame P95 in this headless Chrome fixture, including the 20× current Player-fog arm. Therefore the reported subjective lag was **not reproduced** under this maximum retained-sample synthetic render fixture.

The fog-raster comparison still identifies a real incremental cost:

| Speed | Flat sustained `drawVisionFog` sampled CPU | Current feathered `drawVisionFog` sampled CPU |
|---|---:|---:|
| 5× | 4.228 ms | 41.963 ms |
| 10× | 4.800 ms | 37.244 ms |
| 20× | 9.462 ms | 20.355 ms |

Across the 240-frame arms, the radial/vertical current presentation added roughly 11–38 ms of sampled `drawVisionFog` time relative to flat sustained circles. That is a real hotspot, but it did not produce a dropped-frame signal in this environment.

The prior fix remains validated: bounded history prevents the former 4,800-sample regression. The retained sample count stayed at 961, never growing with continued source movement.

## Limitations and honest boundary

- The transparent control still executes the production fog draw path, so it is not a true fog-off CPU baseline.
- Chrome headless requestAnimationFrame is refresh-paced and cannot establish the user's visible desktop/device responsiveness.
- The harness obtains named sampled time for source construction, memory update, sustained derivation, and fog drawing. It does **not** yet isolate a named timing for the renderer's `visibleThroughFogClearance` arrow function; its cost is folded into anonymous renderer work. Consequently this pass does not prove or clear the earlier `enemy units × current/sustained circles` concern.
- The test is a peak-cardinality synthetic fixture, not a real match/replay and not gameplay-health proof.

## Conclusion and next bounded decision

Do **not** remove or retune fog based on this result. The current production-faithful synthetic path does not reproduce a frame-time regression, though feathered fog rasterization is measurably more expensive than flat clearance.

If the owner wants to pursue the reported desktop lag, the next smallest diagnostic is a real visible-browser Performance trace of a seeded late-game Player-vs-AI replay, with an external trace parser that attributes frame work to `drawVisionFog`, `updateVisionMemory`, `getTeamVisionSources`, and the unresolved enemy-clearance path. Only if that trace shows frame-budget pressure should a correction scope be approved.
