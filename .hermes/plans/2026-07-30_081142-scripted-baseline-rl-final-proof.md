# Scripted-Baseline RL Final Proof Implementation Plan

> **For Hermes:** Execute only after Silas reviews and approves this plan. Use `evidence-first-game-rl`, `collaborative-evidence-led-delivery`, and test-driven development. One gate at a time; stop at a failed gate.

**Goal:** Determine—through a browser-visible, reproducible, fixed-seed proof—whether a standard MaskablePPO policy can be meaningfully trained against an explicit scripted Stick RTS opponent through the existing bounded 42-action interface.

**Architecture:** Keep Node as the sole owner of Stick RTS mechanics. Extend the existing JSON-lines bridge and `NodeStickRtsEnv` so a single Python learner acts through the 42-action mask while the opposing team runs a named deterministic scripted baseline in the same Node world. Before any PPO training, record and replay full-cadence teacher decisions through that same RL action executor; this verifies that the action abstraction can express the teacher’s basic economy/combat behavior.

**Tech Stack:** Existing Node simulator and JSON-lines bridge; project-local Python `.venv`; Gymnasium 1.3.0; `sb3-contrib` MaskablePPO 2.9.0; Stable-Baselines3 2.9.0; PyTorch 2.13.0+cpu. No custom optimizer or self-play framework.

---

## Current verified context

- `src/rl/environment.js` has a 42-action bounded macro contract and explicit invalid/blocked action results.
- `createScriptedOpponentEnvironment({ opponentDifficulty: 'hard' })` exists and passed `tools/rl-scripted-opponent-environment-check.mjs`: learner-controlled player and scripted Hard opponent share the authoritative world.
- The current bridge (`tools/rl-env-server.mjs`) and Gymnasium adapter (`node_gymnasium_env.py`) **do not yet expose scripted-opponent mode**; they currently reset the one-sided idle-opponent environment.
- The standard library foundation is installed project-locally and the existing generic Gym wrapper tests pass, but no standard PPO policy has trained against a meaningful opponent.
- Existing demonstration generation records successful purchases only. It is inadequate for imitation or trace replay because it omits command-only, wait, and blocked/retry decisions.
- No learned policy, browser replay, or playable agent currently exists.

## Sources informing this plan

- Gymnasium, custom environment contract: https://gymnasium.farama.org/introduction/create_custom_env/
- SB3 Contrib, MaskablePPO/action-mask interface: https://sb3-contrib.readthedocs.io/en/master/modules/ppo_mask.html
- Stable-Baselines3, custom environments: https://stable-baselines3.readthedocs.io/en/master/guide/custom_env.html
- Vinyals et al., *Grandmaster level in StarCraft II using multi-agent reinforcement learning*: https://www.nature.com/articles/s41586-019-1724-z
- Ross, Gordon, Bagnell, DAgger/covariate-shift lesson for imitation learning: https://jmlr.org/papers/v15/ross14a.html

## Fixed scope exclusions

Until the final pass gate below succeeds, do **not** build or modify:

```text
self-play / PettingZoo / League
Local Gemma / Model Commander / Strategy League
custom NumPy or custom PPO optimizer code
reward reshaping or curriculum ladders
large training batches
production deployment, commits, pushes, or merges
unrelated UI polish or persistence hardening
```

---

## Gate 0 — Decide the representable scripted teacher

**Question:** Can the baseline issue only actions the existing 42-action contract can represent?

The current Hard script can request a hero, but heroes are not in the contract. Do not silently drop or substitute those actions.

**Recommendation:** Define a clearly named, training-only `hard-rl-v1` scripted baseline whose behavior matches Hard’s normal build/command/counter logic but disables hero purchase. Its allowed results are exactly:

```text
hold-own-mine | contest-mid | pressure-enemy-mine |
siege-enemy-outer | attack-enemy-core | retreat-home | continue
×
none | miner | warrior | archer | structure | turret
```

Cap-triggered scripted structure behavior must be recorded as the **actual accepted** `continue + structure` action, never replayed as a hidden fallback.

**Pass:** Every teacher decision can be emitted as a valid 0–41 action plus an explicit accepted/blocked result.

**Fail / stop:** A normal required Hard behavior cannot be represented without silently changing it. Stop the RL proof and discuss either a deliberately versioned action-contract expansion or abandoning the policy route.

---

## Task 1 — Bridge the named scripted opponent to Gymnasium

**Objective:** Make the standard Python environment genuinely learner-vs-scripted-baseline rather than learner-vs-idle opponent.

**Files:**
- Modify: `tools/rl-env-server.mjs`
- Modify: `node_gymnasium_env.py`
- Modify: `training/tests/test_node_gymnasium_env.py`
- Modify/Create: `tools/rl-scripted-opponent-protocol-check.mjs`

**Step 1: Write failing tests**

Tests must prove a reset request selecting `opponentDifficulty: 'hard-rl-v1'`:

```text
- preserves player action mask size 42;
- identifies the active opponent policy/version in reset and transition metadata;
- advances the named scripted enemy through the shared Node simulation;
- keeps player invalid actions explicit and non-mutating;
- rejects unknown opponent identifiers.
```

**Step 2: Run the tests to confirm the absence of bridge support.**

Expected: fail because `reset` does not accept/expose the named scripted opponent.

**Step 3: Implement the minimal protocol and wrapper options.**

- Add an allowlisted `opponentPolicy` request field, not arbitrary difficulty input.
- Map `hard-rl-v1` to the versioned scripted baseline defined by Gate 0.
- Add a Python `opponent_policy='hard-rl-v1'` constructor argument that only serializes that allowlisted protocol value.
- Preserve Node as rules/legality owner and preserve `action_masks()` for MaskablePPO.

**Step 4: Verify.**

```bash
node tools/rl-scripted-opponent-protocol-check.mjs
.venv/Scripts/python.exe -m pytest -q training/tests/test_node_gymnasium_env.py
node tools/rl-scripted-opponent-environment-check.mjs
node tools/rl-environment-check.mjs
git diff --check
```

**Gate 1 pass:** A fixed seed produces real scripted-opponent production/command activity through the standard Python wrapper, with no fallback for learner actions.

**Gate 1 fail / stop:** The named baseline cannot be driven through the same authoritative transition boundary. Do not train PPO; report the integration blocker.

---

## Task 2 — Full-cadence teacher trace and action-interface replay

**Objective:** Prove the bounded action interface can faithfully reproduce basic scripted behavior before teaching or optimizing a policy.

**Files:**
- Modify/Create: `src/sim/ai/behavior.js` only to expose an internal test/tracing hook at each actual scripted decision boundary; no mechanics changes.
- Create: `tools/generate-scripted-trace.mjs`
- Create: `tools/replay-scripted-trace.mjs`
- Create: `tools/rl-scripted-trace-check.mjs`
- Create: `training/artifacts/traces/.gitkeep` if needed.

**Trace schema (one row per teacher decision, including no production):**

```json
{
  "schema": "stick-rts-scripted-trace-v1",
  "baseline": "hard-rl-v1",
  "seed": 22001,
  "team": "player",
  "simulatedSeconds": 12.0,
  "observation": [12 numbers],
  "actionMask": [42 booleans],
  "action": 38,
  "targetIntent": "continue",
  "production": "warrior",
  "result": {"ok": false, "reason": "blocked-legality"}
}
```

**Step 1: Write a failing trace/replay test.**

It must require three fixed seeds and verify:

```text
- trace records every scripted decision, including no-production/continue;
- every recorded action is within 0..41 and legal according to the saved mask when originally accepted;
- replay disables the traced team’s scripted controller;
- replay runs exclusively via the RL action executor;
- reference and replay both demonstrate economy → at least one combat unit → enemy contact;
- replay reports the same terminal class, or the same time-limit class with predefined comparable core/combat metrics.
```

**Step 2: Run the test red.**

Expected: current purchase-only generator lacks full decision cadence and no replay executor exists.

**Step 3: Implement only trace/replay support.**

- Preserve explicit blocked results and no-production decisions.
- Do not synthesize a target or purchase when a trace entry is absent.
- Record exact seed and decision cadence so trace replay is reproducible.
- Emit a compact machine-readable summary for each seed: terminal reason, core HP, miner/combat counts, and accepted/blocked action counts.

**Step 4: Verify.**

```bash
node tools/rl-scripted-trace-check.mjs
node tools/rl-scripted-opponent-protocol-check.mjs
node tools/rl-environment-check.mjs
node tools/headless.js
git diff --check
```

**Gate 2 pass:** All three fixed-seed trace replays visibly reach economy → combat → contact and meet the predeclared comparable-outcome rule. Store the traces as immutable artifacts.

**Gate 2 fail / final stop:** Do not train PPO. The 42-action contract/translation does not faithfully express baseline play; report this as the final evidence-backed reason to stop or redesign the project.

---

## Task 3 — Minimal browser-visible trace replay

**Objective:** Give Silas the promised direct evidence before any policy-training claim.

**Files likely:**
- Modify: `src/main.js`
- Modify: `src/render/ui.js`
- Modify/Create: `src/render/rlTraceTelemetry.js`
- Create: `tools/rl-trace-browser-check.mjs`

**Visible mode requirements:**

```text
Watch → Scripted Trace Replay (hard-rl-v1)
status: teacher trace, not learned
seed / trace id / simulated time
current macro action
accepted or blocked result
player and opponent core HP
```

This view must replay a saved immutable trace. It must not execute live training, call a model, or replace trace actions with scripted behavior.

**Verification:** Browser/CDP test using the project’s same-origin preview server; capture the action/status evidence from the actual page.

**Gate 3 pass:** A fixed trace plays in the browser and the shown action/status sequence matches its artifact.

**Gate 3 fail:** Stop browser expansion; repair trace correctness only. Do not build Play Against Agent yet.

---

## Task 4 — Standard MaskablePPO smoke against the scripted baseline

**Objective:** Prove the standard learner can complete a bounded rollout against a non-idle real opponent. This is not a competence claim.

**Files:**
- Create: `training/train_maskable_ppo.py`
- Create: `training/tests/test_maskable_ppo_smoke.py`
- Create: `training/artifacts/checkpoints/.gitkeep` if needed.

**Step 1: Write the failing smoke test.**

The test must instantiate `NodeStickRtsEnv(..., opponent_policy='hard-rl-v1')`, use `sb3_contrib.MaskablePPO`, collect a deliberately small fixed-seed rollout, and save a checkpoint manifest containing:

```text
algorithm/library versions
checkpoint id
baseline id
seed manifest
action/observation/reward schema versions
rollout length
trace output path
```

**Step 2: Run red.**

Expected: no standard trainer/checkpoint integration exists.

**Step 3: Implement minimal standard-library usage.**

- Use `MaskablePPO`, not a custom optimizer.
- Use the environment’s `action_masks()` method.
- Keep rollout size small and bounded.
- Record actions and terminal/reward components. Do not tune rewards or claim learning.

**Step 4: Verify.**

```bash
.venv/Scripts/python.exe -m pytest -q training/tests/test_maskable_ppo_smoke.py
.venv/Scripts/python.exe -m pytest -q training/tests/test_node_gymnasium_env.py
node tools/rl-scripted-trace-check.mjs
git diff --check
```

**Gate 4 pass:** Standard MaskablePPO executes legal masked actions against `hard-rl-v1`, produces an immutable checkpoint and replayable action trace, and does not crash or mask an illegal learner action.

**Interpretation:** This is a tooling proof only, not a learned-policy result.

---

## Task 5 — One bounded, held-out gameplay experiment

**Objective:** Decide whether the standard approach produces enough behavior to justify a Play Against Agent mode.

**Preconditions:** Gates 1–4 all passed, including browser-visible teacher trace replay.

**Experiment:**

```text
Train exactly one declared configuration:
- opponent: hard-rl-v1
- decision cadence: 1 second unless trace evidence demands another fixed value
- fixed training seed manifest
- fixed held-out seed manifest, never used in training
- no self-play, no League, no tuning between evaluation runs
```

**Required evidence:**

```text
- held-out replayable action traces;
- per-game miners, combat-unit creation, first contact, core damage, terminal reason;
- comparison to an untrained/random masked-policy baseline on the same seeds;
- browser replay of at least one held-out candidate match.
```

**Promotion threshold:** Set exact numerical thresholds with Silas *before* running this experiment. Minimum qualitative requirement: the candidate must show economy → combat → contact on held-out seeds and outperform the random baseline on a declared objective metric. Do not substitute training reward for this requirement.

**Gate 5 pass:** Candidate meets the agreed threshold and its held-out browser replay is inspectable. Only then plan `Play Against Experimental Agent`.

**Gate 5 fail / final stop:** Stop RL work. Preserve the artifacts, write a short postmortem, and keep/return to the scripted opponent as the game feature.

---

## Decisions and remaining discussion before execution

1. **Baseline fidelity — decided:** Use `hard-rl-v1`: the existing Hard baseline with hero purchases disabled for this final proof. Do not expand the action contract for heroes.
2. **Gate 2 failure — decided:** Do not automatically redesign or continue implementation. Stop work, bring Silas the trace-replay evidence and a concise set of options for a separate decision.
3. **Promotion threshold:** Before Task 5, agree on numerical held-out success metrics rather than deciding after results arrive.
4. **Browser priority:** Confirm that a teacher trace replay is the first acceptable watchable artifact, even though it is not learned behavior.

## Plan review checklist

- [x] Real simulator remains authoritative.
- [x] Existing standard libraries are used rather than custom optimization.
- [x] Learner-vs-idle-opponent is excluded.
- [x] Trace correctness is a hard prerequisite to training.
- [x] Each gate has a user-visible outcome or an explicit stop condition.
- [x] Self-play/League/Local Gemma and unrelated work are excluded.
- [x] No code implementation is authorized by this plan alone.
