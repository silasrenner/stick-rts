# Pure Scripted Mirror Trace and Exact Replay Recovery Plan

> **For Hermes:** Execute only one approved task at a time. Use test-driven development for every code change; do not begin imitation or PPO work from any trace until the replay gate passes.

**Goal:** Replace the contaminated RL-wrapper mirror trace path with a pure, browser-equivalent `hard-rl-v1` vs `hard-rl-v1` headless reference runner, then prove that its saved player decisions can be replayed exactly through the 18-action executor.

**Architecture:** The reference match must call `createWorld()` and normal fixed-step `runTick(world, 1 / CONFIG.TICK_HZ)` directly, with both teams configured as `hard-rl-v1`. It must never call `createRlEnvironment().step()`, because that injects an external AI-side action every decision interval. Trace records must use deterministic integer tick numbers, pre-decision observations/masks, policy-representable actions, explicit results, and compact state snapshots. Replay will use the same fixed-tick world and action executor, with the recorded player controller disabled and the AI opponent still scripted.

**Tech Stack:** Existing Node ESM deterministic simulator, `createWorld`, `runTick`, `hard-rl-v1`, the 35-value observation contract, and the 18-action bounded executor. No Python bridge, Gymnasium, behavior cloning, PPO, browser UI, self-play League, or reward changes are in scope.

---

## Verified starting evidence

- The earlier 90-second seed `26004` result was inconclusive: both pure and RL-wrapped mirrors had zero attacks.
- At 600 simulated seconds with seed `26004`, pure scripted mirror produced `17` player `attack` commands; the RL-wrapped version produced `0`.
- The RL wrapper executes `defend + none` for team `ai` before every one-second tick batch. This is a real contamination source for a scripted-vs-scripted reference match.
- The same diagnostic simulated two 600-second matches using normal fixed ticks in 1.389 wall-clock seconds. Acceleration must mean looping normal ticks faster, never increasing `dt` or skipping ticks.

## Global pass / fail rules

**Reference-trace pass:** fixed seed `26004`, 600 normal simulated seconds, pure mirror contains at least one player `attack` decision **and** at least one interaction signal: combat contact, unit loss, core damage, or terminal result.

**Reference-trace fail:** no attack, or no interaction signal by 600 seconds. Stop; save the diagnostic summary and return evidence/options. Do not manufacture a teacher by altering behavior, training, or extending duration without approval.

**Replay pass:** fixed-seed replay produces identical player action outcomes and identical compact snapshots at every recorded decision tick, plus identical terminal reason/final compact snapshot.

**Replay fail:** first divergent tick/action/snapshot is saved and reported. Stop; do not start behavior cloning, PPO, reward changes, or action-contract redesign.

---

### Task 1: Preserve the contamination diagnosis as a regression

**Objective:** Make the distinction between a pure mirror and RL-wrapper-driven mirror explicit and reproducible, without treating the wrapper as a valid reference source.

**Files:**
- Modify: `tools/rl-mirror-diagnostic.mjs`
- Create: `tools/rl-mirror-isolation-check.mjs`

**Step 1: Write failing check**

Assert two separately-run 600-second simulations for seed `26004`:

```js
assert.ok(pure.playerCommands.attack > 0);
assert.equal(wrapped.playerCommands.attack, 0);
assert.equal(wrapped.aiExternalActions, 600);
```

The diagnostic must report whether each team is scripted and count external executor calls. This check describes the known issue; it does not bless the wrapped result as a baseline.

**Step 2: Run RED**

```bash
node tools/rl-mirror-isolation-check.mjs
```

Expected initially: failure because the diagnostic does not yet expose structured command/external-action counts.

**Step 3: Minimal implementation**

Refactor only the diagnostic helpers to return structured summaries:

```js
{
  playerCommands: { defend, attack, retreat },
  playerEvents,
  aiExternalActions,
  playerDifficulty,
  aiDifficulty,
}
```

Do not change AI logic, decision intervals, action masks, or `runTick`.

**Step 4: Run GREEN**

```bash
node tools/rl-mirror-isolation-check.mjs
```

Expected: PASS with the recorded 600-second seed evidence.

---

### Task 2: Build a pure scripted-mirror trace runner

**Objective:** Capture player teacher decisions from a direct `createWorld` + `runTick` mirror match with no external policy action injection.

**Files:**
- Create: `tools/scripted-mirror-trace-runner.mjs`
- Create: `tools/scripted-mirror-trace-runner-check.mjs`
- Reuse: `src/rl/environment.js` exports `getRlObservation`, `getRlActionMask`, `getRlActionIndex`
- Reuse: `src/sim/world.js`, `src/sim/tick.js`, `src/config.js`

**Step 1: Write failing check**

For seed `26004`, 600 seconds, assert the returned in-memory trace has:

```js
assert.equal(trace.schema, 'stick-rts-scripted-mirror-trace-v1');
assert.equal(trace.matchup, 'hard-rl-v1-vs-hard-rl-v1');
assert.equal(trace.decisions.every((d) => d.team === 'player'), true);
assert.equal(trace.decisions.every((d) => d.observation.length === 35), true);
assert.equal(trace.decisions.every((d) => d.actionMask.length === 18), true);
assert.ok(trace.decisions.some((d) => d.action.command === 'attack'));
assert.ok(trace.summary.combatContact || trace.summary.totalUnitLosses > 0 || trace.summary.totalCoreDamage > 0 || trace.summary.terminalReason !== 'time-limit');
assert.equal(trace.summary.externalActionCount, 0);
```

**Step 2: Run RED**

```bash
node tools/scripted-mirror-trace-runner-check.mjs
```

Expected: module/API missing.

**Step 3: Minimal runner implementation**

1. Create a world with seed `26004`; set `matchState = 'playing'`.
2. Set both `world.teams.player.difficulty` and `world.teams.ai.difficulty` to `hard-rl-v1`.
3. Set a decision observer. At the player `before` event, snapshot:
   - `tick` (an integer incremented once per `runTick` call),
   - `simulatedSeconds`,
   - `getRlObservation(world, 'player')`,
   - `getRlActionMask(world, 'player')`.
4. At the matching player `decision` event, append exactly one record with:
   - pre-decision snapshot;
   - `actionIndex = getRlActionIndex(command, production)`;
   - `{ command, production }`;
   - `teacherRequestedProduction` and `teacherPurchaseResult`;
   - a post-decision compact snapshot.
5. Loop only:

```js
runTick(world, 1 / CONFIG.TICK_HZ);
tick += 1;
```

until 600 seconds or terminal state. Never call `createRlEnvironment`, `env.step`, or `executeAction` in this reference runner.
6. Return compact summary: commands, unit losses, core damage, combat-contact-seen, terminal reason, and `externalActionCount: 0`.

**Step 4: Run GREEN**

```bash
node tools/scripted-mirror-trace-runner-check.mjs
```

Expected: PASS for seed `26004` with at least one attack and interaction evidence.

---

### Task 3: Make traces immutable and inspectable

**Objective:** Save a qualifying pure trace without overwriting prior evidence.

**Files:**
- Modify: `tools/scripted-mirror-trace-runner.mjs`
- Modify: `tools/scripted-mirror-trace-runner-check.mjs`
- Create artifact only after Task 2 passes: `training/artifacts/hard-rl-v1-mirror-seed-26004-trace.json`

**Step 1: Write failing check**

Use a temporary output directory and assert:

```js
writePureMirrorTrace(outputPath, options);
assert.equal(JSON.parse(readFileSync(outputPath)).schema, 'stick-rts-scripted-mirror-trace-v1');
assert.throws(() => writePureMirrorTrace(outputPath, options), /already exists/);
```

**Step 2: Run RED**

```bash
node tools/scripted-mirror-trace-runner-check.mjs
```

**Step 3: Minimal implementation**

Write the one-line JSON artifact using exclusive creation (`flag: 'wx'`). Do not append, replace, or auto-version silently.

**Step 4: Generate and inspect the artifact**

```bash
node tools/scripted-mirror-trace-runner.mjs --seed 26004 --seconds 600 --output training/artifacts/hard-rl-v1-mirror-seed-26004-trace.json
```

Read back the artifact and report its exact path, bytes, decision count, command distribution, interaction summary, and terminal reason.

**Stop gate:** If Task 2’s semantic pass condition fails, do not write/promote a teacher artifact.

---

### Task 4: Define an exact direct-world replay seam

**Objective:** Make a recorded player action executable against a real world without the RL environment’s one-second batch behavior or any scripted player controller.

**Files:**
- Modify: `src/rl/environment.js`
- Create: `tools/rl-direct-action-executor-check.mjs`

**Step 1: Write failing check**

Require an exported direct-world executor:

```js
const before = snapshot(world);
const result = executeRlAction(world, 'player', recorded.actionIndex);
assert.deepEqual(result, recorded.expectedActionResult);
assert.equal(world.teams.player.difficulty, null);
```

It must reject invalid/blocked actions explicitly and never install a fallback policy or alter `ai` difficulty.

**Step 2: Run RED**

```bash
node tools/rl-direct-action-executor-check.mjs
```

Expected: missing export/API.

**Step 3: Minimal implementation**

Export a narrow `executeRlAction(world, team, actionIndex)` that validates the index and delegates to the existing bounded `executeAction`. Do not advance ticks, create worlds, set difficulties, calculate rewards, or use the Python bridge.

**Step 4: Run GREEN**

```bash
node tools/rl-direct-action-executor-check.mjs
```

---

### Task 5: Replay the saved trace at the exact recorded ticks

**Objective:** Prove trace equivalence before any learning work.

**Files:**
- Create: `tools/replay-scripted-mirror-trace.mjs`
- Create: `tools/replay-scripted-mirror-trace-check.mjs`
- Reuse: `src/rl/environment.js` direct executor; `src/sim/world.js`; `src/sim/tick.js`

**Step 1: Write failing equivalence check**

For the qualified saved seed `26004` trace:

```js
const replay = replayTrace(trace);
assert.deepEqual(replay.actionResults, trace.expectedActionResults);
assert.deepEqual(replay.snapshotsAtDecisionTicks, trace.expectedSnapshots);
assert.deepEqual(replay.finalSnapshot, trace.summary.finalSnapshot);
assert.equal(replay.terminalReason, trace.summary.terminalReason);
```

**Step 2: Run RED**

```bash
node tools/replay-scripted-mirror-trace-check.mjs
```

Expected: replay implementation missing or an exact first divergence report.

**Step 3: Minimal replay implementation**

1. Create the same seed world.
2. Set player difficulty to `null`; set only AI difficulty to `hard-rl-v1`.
3. At each recorded integer `tick`, call `executeRlAction(world, 'player', recorded.actionIndex)` once.
4. Otherwise call the normal fixed `runTick(world, 1 / CONFIG.TICK_HZ)` once per tick.
5. Compare the compact snapshot at every recorded decision tick. On first mismatch, return a structured diagnostic containing tick, expected/actual action result, and expected/actual snapshot.

**Step 4: Run GREEN**

```bash
node tools/replay-scripted-mirror-trace-check.mjs
```

**Stop gate:** Any divergence ends this plan. Report the first deterministic mismatch; do not redesign actions, observations, rewards, cloning, or PPO automatically.

---

### Task 6: Final focused verification and decision report

**Objective:** Provide only evidence needed for the next approval.

**Files:** no feature additions.

**Run:**

```bash
node tools/rl-mirror-isolation-check.mjs
node tools/scripted-mirror-trace-runner-check.mjs
node tools/rl-direct-action-executor-check.mjs
node tools/replay-scripted-mirror-trace-check.mjs
node tools/rl-action-semantics-check.mjs
node tools/rl-observation-contract-check.mjs
node tools/rl-hard-rl-baseline-check.mjs
.venv/Scripts/python.exe -m pytest -q training/tests/test_node_gymnasium_env.py
git diff --check
```

**Report format:**

```text
Verified: exact seed, artifact path, command distribution, interaction and replay-equivalence result.
Implemented but unproven: anything not demonstrated by the fixed-seed replay.
Rejected / blocked: first failed stop gate, with its exact evidence.
Next decision: only behavior cloning if and only if pure trace replay passes.
```

## Explicit exclusions

- No use of the old RL-wrapper mirror path for teacher/reference traces.
- No mutation of `hard-rl-v1` strategic behavior during this recovery plan.
- No heroes, cap fallback, or learner-side hidden fallback.
- No Python bridge, Gymnasium, MaskablePPO, behavior cloning, reward changes, self-play League, browser UI, deployment, commit, push, or production checkout modification.

## Risks / open questions

1. A 600-second pure trace may satisfy attack but still lack combat contact. That is a fail under this plan, not a reason to auto-extend or tune.
2. Exact replay may reveal a timing mismatch because scripted decisions currently happen during a tick. Integer tick capture and direct pre-tick replay make the mismatch visible; they do not assume it away.
3. Existing scripted browser Watch behavior may use a different matchup/configuration than `hard-rl-v1` mirror. This plan validates only the declared restricted baseline, not any uninspected browser mode.
