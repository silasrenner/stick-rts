# Release-gate evidence

`node tools/release-gate.mjs` writes one timestamped JSON record here for every attempted release gate. The records are deliberately local-only (`*.json` is gitignored) so routine evidence collection does not create source-control noise.

Each record includes the commit, branch, check-by-check pass/fail state, elapsed time, and raw check output. Keep these local records when comparing release reliability and regression durations over time.

The tracked release contract is the script itself: desktop surface/pan/zoom/mode-reset checks, mobile pan/orientation/pinch checks, syntax checks, whitespace checks, and simulation invariants.
