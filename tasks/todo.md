# S9 — Visuals + menus + Watch AI

Full plan/context: see PLAN.md §5's S9 block and
`/Users/simmer/.claude/plans/reflective-zooming-wren.md`. Scope: parallax
backdrop, landing/settings menu (`matchState: 'menu'`), Watch AI spectator
mode, seeded PRNG (AI decision-interval jitter only), and a root-cause pass
on the Hard-vs-Hard positional asymmetry. Build order below is
dependency-driven: parallax (no deps) → seeded PRNG (Watch AI setup needs
to show a seed) → menu/landing page (Watch AI needs an entry point) →
Watch AI → asymmetry investigation (uses `--seed` to control for jitter).

## 1. Parallax (`render/parallax.js`, new file) — DONE
- [x] New `config.js` constants: `PARALLAX_LAYER_SPEEDS`,
      `PARALLAX_MOUNTAIN_TILE_WIDTH/HEIGHT/BASE_Y`,
      `PARALLAX_TREE_TILE_WIDTH/HEIGHT/BASE_Y`,
      `PARALLAX_BUSH_TILE_WIDTH/HEIGHT/BASE_Y`
- [x] `drawParallax(ctx, camera)` — 3 tiled layers (mountains/trees/bushes)
      scrolling at fractions of `camera.x`; reads only `camera.x` + canvas
      size, zero `world` access
- [x] Wire into `renderer.js`'s `render()` as the first draw call, before
      the existing world `ctx.save()/translate/scale` block
- [x] Verified live: mountains/trees/bushes visible on landing page and
      confirmed to shift position between screenshots as the camera panned
      during Watch AI (camera.x 0 → 857.14); distinct layer speeds visible
      by comparing tree/mountain offsets across screenshots

## 2. Seeded PRNG — DONE
- [x] New `sim/rng.js`: `createRng(seed)` (mulberry32, no crypto), `.next()`,
      `.nextRange(min, max)`
- [x] `sim/world.js`: `createWorld(seed = Date.now())` derives two
      independent sub-streams (`teams.player.rng`, `teams.ai.rng`) from one
      master RNG — independent streams so same-seed reproducibility holds
      regardless of tick-order interleaving between teams
- [x] Same edit: flip `matchState` initializer `'playing'` → `'menu'`;
      also added `isWatchAiMatch(world)` helper here (needed by Phase 3/4)
- [x] New `config.js` constant: `AI_DECISION_JITTER: 0.125`
- [x] `sim/ai/behavior.js`'s `updateAiDecisions`: decisionTimer reset now
      applies `± AI_DECISION_JITTER` via `teamState.rng.nextRange(...)`
- [x] `tools/headless.js`: added `--seed=N` (`getArg` pattern); trial `i`
      uses `seed + i` (given) or `Date.now() + i` (default, collision-safe)
- [x] Required fix in both `runBatch` and `runInvariantCheck`: set
      `world.matchState = 'playing'` right after `createWorld(...)`
- [x] Verified: `--seed=1000 --trials=3` run twice → byte-identical diff;
      `--seed=1` (1167.5s) vs `--seed=2` (431.2s) → diverge as expected

## 3. `matchState: 'menu'` + landing page + Settings — DONE
- [x] Confirmed `sim/tick.js`'s guard needs no change (`'menu'` no-ops it)
- [x] Fixed `drawWinLoseOverlay`'s guard (`ui.js`) from `=== 'playing'` to
      `!== 'won' && !== 'lost'` — real latent bug, would have rendered
      Defeat over the landing page
- [x] `sim/world.js`: `isWatchAiMatch(world)` helper (both teams'
      `difficulty` non-null)
- [x] `renderer.js`: `render()` accepts `uiState`, branches to
      `drawMenuScreen` and returns early when `matchState === 'menu'`
      (skips `drawHUD`, which has no matchState guard of its own)
- [x] `ui.js`: `drawMenuScreen` dispatcher + `drawMainMenu`/
      `drawPlayDifficultyScreen`/`drawWatchAiSetupScreen`/
      `drawSettingsScreen`, matching `getXRects(canvas)` hit-testers
- [x] Factored `drawWinLoseOverlay`'s difficulty-button block into shared
      `drawDifficultyButtons`/`difficultyButtonRectsAt` (now reused in 4
      places: win/lose, Play, Settings default, Watch AI's 2 pickers)
- [x] `main.js`: persistent `uiState` (`menuScreen`, `settings:
      {fpsVisible, defaultDifficulty}`, `watchSetup`); `fpsVisible` moved
      out of module-private state into it
- [x] `main.js` boot: `createWorld()` starts in `'menu'`; dropped the
      boot-time `ai.difficulty = DEFAULT_DIFFICULTY` assignment
- [x] `main.js`'s `bindClick`: new top branch for `matchState === 'menu'`
      → `handleMenuClick`, Play routes to `resetMatch(difficulty)`
      (existing function, reused); `resetMatch`'s default arg updated to
      preserve "Rematch keeps the ended match's own difficulty" (not
      reset to the Settings default — a regression the plan's shorthand
      would have introduced, caught during implementation)
- [x] Verified live via claude-in-chrome: fresh load shows landing page
      (not a live match, zero console errors); Play → Hard → live match
      confirmed via `window.__world.matchState`; Settings FPS toggle
      ("Off"→"On", visible overlay appeared) and default-difficulty
      (Medium→Hard highlight) both confirmed live; regression-checked
      Rematch/difficulty-change still work on a normal (non-Watch-AI)
      win/lose overlay (forced Victory, clicked "Easy", confirmed
      `ai.difficulty` changed and `matchState` reset to `'playing'`)

## 4. Watch AI — DONE
- [x] `main.js`: `startWatchAiMatch(playerDifficulty, aiDifficulty, seed)`
      — sets both teams' `difficulty`, resets camera; resolved seed
      captured into `uiState.watchSetup.seed` (works for both picked and
      "Random"/Reroll)
- [x] Guarded the 6 gameplay debug-key handlers (`q`/`w`/`e`/`h`/`j`/`k`)
      with `isWatchAiMatch(world)` early-return; `f`/`s` left unguarded
- [x] `bindClick`: `isWatchAiMatch` branch → `handleWatchAiClick` (only
      hit-tests "Back to Menu"), structurally prevents build-menu clicks
- [x] `render/camera.js`: `updateCamera` gained optional `dragDeltaX`
      param + early-return branch for free 1:1 click-drag pan when
      `isWatchAiMatch(world)`; existing hero-follow/edge-scroll logic for
      normal matches untouched
- [x] `input/mouse.js`: new `bindDrag(canvas, handler)` (mousedown on
      canvas, mousemove/mouseup on window so drag-past-canvas-edge still
      resolves)
- [x] `renderer.js`'s `drawLegend`: "Watching: Hard vs Hard | Drag to pan
      camera" during Watch AI
- [x] `ui.js`'s `drawBuildMenu` guard extended to also skip during Watch AI
- [x] `ui.js`'s `drawWinLoseOverlay`: "Back to Menu" button instead of
      Rematch/difficulty during Watch AI
- [x] Verified live via claude-in-chrome: Watch AI setup screen (both
      sides Hard, Reroll Seed confirmed changing `uiState.watchSetup.seed`)
      → Start → both teams autonomously building/spending (player side
      hit unit cap 15/15 unassisted) confirmed via `isWatchAiMatch` true;
      player-input suppression confirmed (`q` press left
      `teams.player.command` at `'defend'`, unchanged) — code-verified via
      `setPlayerCommand`'s early-return, not just visual; build menu
      confirmed absent from screenshot; free click-drag camera pan
      confirmed via dispatched mousedown/mousemove/mouseup (camera.x moved
      0 → 857.14, matching dragDelta/CAMERA_ZOOM math, and clamps
      correctly at the 0 floor when dragging past the left edge); forced
      match end → "Back to Menu" button rendered (not Rematch) → clicked
      → confirmed `matchState` reset to `'menu'`. Zero console errors
      across the entire Phase 3+4 verification pass.

## 5. Hard-vs-Hard asymmetry investigation — DONE
- [x] Step 0: `node tools/headless.js` (invariant mode) passes after
      phases 1-4 land
- [x] Step 1: re-baseline with `--batch --player=hard --enemy=hard
      --trials=10 --seed=1000` → clean 5/10 split (not the old skew).
      Second independent seed batch (`--seed=5000`, 10 more trials) → also
      exactly 5/10. 20 real trials, no dominant side — the skew is gone.
- [x] **Real finding, not assumed:** tested *why* via direct ablation
      (temporarily forced `AI_DECISION_JITTER: 0` in config.js) — with
      jitter off, `player` wins 10/10 at *exactly* 1229.7s every trial,
      completely seed-independent, reproducing S8's exact pre-fix figure.
      This means **S9's own seed-derived decision-timer jitter (Phase 2),
      not S7's targeting-priority change, is what actually broke the
      determinism** — worth stating precisely since "S7 already fixed it"
      would have been a plausible-sounding but false conclusion.
- [x] Step 2/3: with jitter still forced to 0, tested both named
      hypotheses directly — flipped `behavior.js`'s `['player','ai']`
      iteration order (no change, player still won 3/3 at 1229.7s), then
      reverted and reversed `world.units` iteration in
      `findNearestEnemyWithin`/`findPriorityUnitWithin` (also no change,
      3/3 at 1229.7s). **Both named hypotheses ruled out** — neither is
      the mechanism producing the deterministic tie.
- [x] Step 5: all diagnostic edits reverted (`git diff` confirmed clean —
      only real Phase 1-4 changes remain); `node tools/headless.js`
      re-confirmed passing after revert. Outcome recorded in PLAN.md
      Status: root mechanism not fully isolated (two hypotheses ruled out
      by direct test, not just assumed), but the practical fix is
      identified and already shipped (decision-timer jitter) and verified
      to hold across 20 real trials — an honest, evidence-based version of
      the "couldn't fully isolate root cause" outcome PLAN.md sanctions,
      strengthened by knowing what does fix it and ruling out red herrings.

## Final
- [x] `node tools/headless.js` (both default and `--batch` modes) passes
- [x] Zero console errors verified live via `claude-in-chrome`
- [x] Regression check: rematch + difficulty-change still work on a
      normal (non-Watch-AI) win/lose overlay
- [x] PLAN.md Status section updated with this session's summary
- [ ] Commit — pending explicit user request
