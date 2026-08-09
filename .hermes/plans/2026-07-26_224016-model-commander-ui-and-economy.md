# Model Commander UI and Economy Implementation Plan

> **For Hermes:** Execute directly in the existing feature worktree; do not push production without user approval.

**Goal:** Fix model-led teams stalling after turret/hero purchases and add a reviewable Watch-AI model preview entry plus compact match telemetry.

**Architecture:** Keep models as high-level strategists. In Model Commander mode, the deterministic layer enforces only game legality (gold, queue, cap, maximums, cooldowns) and executes the model’s ordered intent; it must not inject scripted economic floors, auto-buy heroes, turret policies, counter-picks, or fallback build cycles. HUD telemetry derives from the existing world state and never changes simulation state.

**Files:**
- Modify: `src/sim/ai/behavior.js`, `src/commander/runtime.js`, `src/main.js`, `src/render/ui.js`
- Create/extend checks: `tools/model-commander-ai-check.mjs`, `tools/model-commander-ui-check.mjs`

---

### Task 1: Prevent stale model priorities from stalling production

1. Extend `tools/model-commander-ai-check.mjs` with a two-live-turret model team whose priority begins `turret, warrior`; assert it queues the Warrior rather than repeatedly failing Turret.
2. Run the check and observe failure against current first-priority-only behavior.
3. In `behavior.js`, isolate Model Commander execution from Hard scripted behavior: execute only the model’s ordered purchase requests, retain an unaffordable request to save gold, discard permanently invalid requests, and never fall back to Hard turret, miner, hero, counter-pick, or build-cycle rules.
4. Ensure `maybeManageHero()` is not invoked for model-commanded teams; heroes must be requested by the model through the same validated priority protocol.
5. Verify the focused test and a 200-second model-style simulation produce non-hero combat units after two turrets.

### Task 2: Record and expose model command events

1. Add a failing pure runtime test for applying a Red decision to record the command, exact match time, and a monotonically increasing command revision.
2. Update `applyCommanderDecision()` to set this event data only after provider validation.
3. Add a compact center-screen Commander event strip during model matches, e.g. `RED COMMANDER → ATTACK`, coloring Red/Blue by team and fading after the next command interval.
4. Verify the strip is absent from normal matches and visibly changes after a new decision.

### Task 3: Add objective center HUD telemetry

1. Add a pure UI-state/helper test for a `MM:SS` clock and gold differential sign/color decisions.
2. Render a top-center match clock, driven by `world.matchElapsedTime`.
3. Render a second line beneath it with the *total-resource differential*: the cost of all completed and queued units/structures/turrets/heroes **plus each team's currently saved gold**. Render only the absolute difference and the word `gold` (for example `1883 gold`), coloring the text Red or Blue according to the leading team; render a neutral `0 gold` when tied.
4. Add structures and turrets to each team’s units-built/force summary row, using existing supply helpers to avoid counting destroyed structures.
5. Keep the center stack clear of the top-right Watch speed control and responsive at the mobile canvas width.

### Task 4: Make Model Commanders a Watch-AI setup option

1. Add a failing menu-rectangle/input test for an opt-in Model Commander selector in the Watch AI setup, not a separate opaque main-menu launch.
2. Add a `Commander: Scripted / Local Gemma` row in `watchSetup`; retain difficulty and seed controls.
3. Start the normal Watch flow with `startModelCommanderWatch(seed)` only when Local Gemma is selected; otherwise preserve current scripted Watch behavior exactly.
4. Remove the temporary main-menu Model Commanders button once the setup selector works.
5. Verify selection through the browser/CDP harness and that a disabled/unavailable endpoint surfaces a clear UI message.

### Task 5: Validation and user LAN review

1. Run syntax checks plus all focused commander/turret/formation tests and `node tools/headless.js`.
2. Run the updated Node LAN server with `MODEL_COMMANDER=1` on `0.0.0.0:8811` and test `/api/commander` against actual Gemma.
3. Run desktop/mobile browser checks and the full release gate after UI changes.
4. Ask the user to inspect from `http://192.168.86.53:8811/` before committing or pushing.

**Risks:** Local Gemma’s inference/reasoning output can be slow, so decisions remain cadence-based and stale requests must not block production. The `gold` differential is an accumulated-resource estimate (configured asset costs, queued costs, and banked gold), not a combat-strength or current-liquid-gold measure; the intentionally minimal number-only display relies on Red/Blue color to communicate the leader.
