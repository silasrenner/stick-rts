# Restart Plan: Faithful Existing Scripted Hard Teacher

> **For Hermes:** This is a planning reset. Do not implement any task until Silas approves that specific task. Treat prior `hard-rl-v1`, 18-action, 35-observation, bridge, and trace work as experimental evidence—not as the source of truth or an implementation mandate.

**Goal:** Produce a credible, browser-verifiable path from the *existing* scripted Watch AI behavior to a replayable teacher trace, then decide the learner interface from evidence rather than constraining or rebuilding the teacher first.

**Architecture:** The existing Watch match is authoritative: `startWatchAiMatch('hard', 'hard', seed)` creates a normal world, assigns the existing `hard` difficulty to both teams, and advances the same `runTick()` used by headless simulation. The first artifact is a complete raw trace of that exact behavior. Only after an action/state compatibility audit and an explicit user decision may a policy contract, exact replay adapter, behavior cloning, or PPO be designed.

**Tech Stack:** Existing JavaScript deterministic simulator (`createWorld`, `runTick`, `src/sim/ai/behavior.js`, `src/sim/ai/difficulties.js`), existing browser Watch setup in `src/main.js`, Node test runners. Standard Python/Gymnasium/SB3 are deferred.

---

## Why this reset exists

The previous route made the learner’s provisional contract determine what the teacher was allowed to do. That produced an artificial `hard-rl-v1` variant and a weak mirror trace instead of capturing the known-working scripted behavior Silas watches in the browser.

The corrected rule is:

```text
Existing scripted Hard behavior is the teacher source of truth.
Raw traces record all teacher decisions and all resulting simulator effects.
A future learner contract is derived from that evidence; it does not censor,
weaken, or replace the teacher.
```

## Requested user-visible outcome

Before any learner is trained, Silas can inspect a fixed-seed replay that is honestly labeled:

```text
source: existing Scripted Hard vs Hard
seed: <fixed seed>
trace: complete raw teacher decision log
status: reference behavior, not learned
```

## Scope exclusions until a later explicit approval

```text
No new scripted teacher bot.
No modification of existing `hard` strategic behavior.
No `hard-rl-v1` promotion or further tuning.
No learner action-contract expansion/contraction yet.
No Gymnasium/Python bridge changes.
No behavior cloning, PPO, rewards, self-play, League, browser feature work,
commit, push, deployment, or production-checkout modification.
```

---

## Phase 0 — Freeze and inventory (planning / read-only)

**Purpose:** Prevent the existing experimental branches from silently becoming the new teacher.

**Known facts:**

- Browser Watch default setup is `hard` vs `hard` in `src/main.js`.
- Browser Watch and headless use the same `runTick()` implementation.
- `hard` currently includes hero purchasing and the original capacity fallback behavior.
- `hard-rl-v1` is an experimental restricted derivative, not the Watch teacher.

**Pass condition:** A short inventory document identifies:

```text
teacher source: existing `hard`
reference matchup: `hard` vs `hard`
reference tick path: createWorld → runTick
experimental work to exclude: hard-rl-v1 and RL-wrapper trace runners
```

**Stop condition:** If browser Watch uses a different difficulty/configuration than the source inspection indicates, stop and inspect that exact configuration before recording anything.

---

## Phase 1 — Browser/headless parity harness

**Purpose:** Prove the headless reference starts from the exact browser Watch configuration, without any RL action injection.

**Files likely to change:**

- Create: `tools/scripted-hard-reference-runner.mjs`
- Create: `tools/scripted-hard-reference-runner-check.mjs`
- Read only: `src/main.js:94-107`, `src/sim/world.js`, `src/sim/tick.js`, `src/sim/ai/difficulties.js`

### Task 1: Red test for exact scripted-Hard configuration

**Test first:** create a check that calls the proposed headless reference runner with fixed seed `26004` and asserts:

```js
assert.equal(reference.playerDifficulty, 'hard');
assert.equal(reference.aiDifficulty, 'hard');
assert.equal(reference.externalActionCount, 0);
assert.equal(reference.tickDt, 1 / CONFIG.TICK_HZ);
```

**Run:**

```bash
node tools/scripted-hard-reference-runner-check.mjs
```

**Expected RED:** missing runner/API.

### Task 2: Minimal pure reference runner

Implement only:

```js
const world = createWorld(seed);
world.matchState = 'playing';
world.teams.player.difficulty = 'hard';
world.teams.ai.difficulty = 'hard';
for (...) runTick(world, 1 / CONFIG.TICK_HZ);
```

Do not import `createRlEnvironment`, call `env.step`, inject an action, modify AI settings, change tick size, or render.

**Expected GREEN:** the test proves the headless runner is a direct equivalent of the browser’s `startWatchAiMatch('hard', 'hard', seed)` setup.

**Phase 1 stop:** If this runner does not produce active behavior comparable to the browser under the same seed/duration, inspect configuration/parity only. Do not alter Hard behavior.

---

## Phase 2 — Complete raw teacher trace (no filtering)

**Purpose:** Record what existing Hard actually decides and what the simulator actually executes.

**Files likely to change:**

- Modify: `src/sim/ai/behavior.js` only to expose trace events without changing decisions
- Modify: `tools/scripted-hard-reference-runner.mjs`
- Modify: `tools/scripted-hard-reference-runner-check.mjs`

### Raw trace schema

Every decision event for **both** teams records:

```text
schema and simulator version
matchup, seed, integer tick, simulated time
team and configured difficulty
pre-decision complete world/policy snapshot
command selected
requested purchase/action
actual economy operation(s) and results
hero purchase/management events
any cap-triggered structure operation, labeled as the actual operation
post-decision compact state snapshot
```

Important distinction:

```text
requested: warrior
actual: structure
```

must remain two explicit fields if the existing Hard fallback does that. No relabeling, dropping, or conversion to `none`.

Automatic deterministic systems are also traceable as outcomes where relevant:

```text
production completion
hero creation/death
movement/contact
combat/losses
core damage
terminal state
```

They are not automatically policy actions merely because they occur in the trace.

### Task 3: Red completeness check

For a fixed short reference match, assert the trace contains actual Hard behavior, including every scripted decision boundary and raw action/result fields. The test must fail if an action is omitted because it is a hero or a fallback result.

**Run:**

```bash
node tools/scripted-hard-reference-runner-check.mjs
```

**Expected RED:** raw event metadata unavailable/incomplete.

### Task 4: Minimal observation-only instrumentation

Add trace callbacks/events at the existing behavior/economy seam. Instrument data flow; do not change `pickPurchase`, `pickCommand`, `attemptPurchase`, hero logic, fallback logic, difficulty values, or simulation order.

**Expected GREEN:** a trace proves every actual action/outcome is represented, including unsupported-from-the-old-contract events.

**Phase 2 stop:** If an existing Hard operation cannot be observed accurately, stop with its exact source path and event gap. Do not invent a substitute teacher.

---

## Phase 3 — One representative, browser-verifiable teacher match

**Purpose:** Confirm that the trace describes a real existing Watch match rather than only a headless assertion.

**Files likely to change:**

- Create immutable artifact only after Phase 2 passes:
  `training/artifacts/scripted-hard-vs-hard-seed-<seed>-raw-trace.json`
- Browser inspection only; no Watch UI feature work.

### Task 5: Choose and record a fixed seed

Use an explicit seed in the existing Watch setup:

```text
player difficulty: hard
AI difficulty: hard
seed: <recorded value>
```

Run the pure headless reference for the same seed and a stated simulated duration. Report, not infer:

```text
commands, purchases, heroes, fallback/structure events,
contact duration, losses, core damage, terminal result
```

### Task 6: Raw artifact writer

Only after the raw completeness test passes, write an exclusive JSON file:

```text
create once
fail on an existing path
never silently overwrite
```

“Immutable” here means provenance-preserving evidence, not a trained checkpoint or a claim of competence.

**Phase 3 pass:** The browser’s configured seed/difficulty and headless trace are demonstrably the same source setup, and the raw trace contains all events needed to audit teacher behavior.

**Phase 3 stop:** If the browser-visible result materially differs from headless for the same seed/configuration, stop at parity investigation.

---

## Phase 4 — Compatibility audit and explicit decision

**Purpose:** Let evidence, not a preselected benchmark, determine the learner contract.

**No code implementation in this phase.** Produce a short audit table:

| Existing Hard teacher behavior | Frequency / examples | Explicit decision or automatic mechanic? | Current learner can reproduce? | Decision needed |
|---|---:|---|---|---|
| defend/attack/retreat | | explicit | | |
| miner/warrior/archer/turret/structure | | explicit | | |
| hero purchase | | explicit | | |
| cap-triggered structure behavior | | actual effect | | |
| automatic movement/formation/combat | | automatic | engine-owned | none unless observation lacks key state |

**Required user decision after the audit:**

```text
Which finite policy action contract should faithfully express the explicit
existing Hard teacher decisions?
```

This could retain, expand, or otherwise replace the old 18-action benchmark. It must be based on the raw trace, and every output must map to a real simulator mechanic with no silent translation.

**Stop:** Do not implement action-contract changes until Silas explicitly approves the audited option.

---

## Phase 5 — Exact replay only after contract approval

**Purpose:** Reproduce a saved existing-Hard teacher trace solely through the approved policy action executor.

**Planned only; blocked until Phase 4 approval.**

Replay requirements:

```text
same seed
same fixed tick timing
teacher controller disabled only for the replayed side
recorded policy actions injected at their exact trace boundaries
opposing existing Hard controller retained
compare action results, compact state snapshots, contact/loss/core outcomes,
and terminal result
```

**Pass:** fixed-seed equivalence within explicitly declared deterministic fields.

**Fail:** save and report the first divergence; stop before cloning/PPO.

---

## Only after successful replay

```text
full raw trace
→ approved finite policy contract
→ exact action-interface replay
→ behavior cloning baseline
→ held-out visible replay
→ MaskablePPO refinement if the clone visibly plays
```

No learning, checkpoint promotion, or product claim belongs before this point.

## Communication format for each future gate

```text
Verified: exact seed, runner/trace command, output, and browser evidence where applicable.
Implemented but unproven: code exists but no parity/replay proof.
Rejected / blocked: exact failure and why it blocks the next stage.
Next decision: one user-controlled choice only when needed.
```
