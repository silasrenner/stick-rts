# Stick RTS Self-Play Reinforcement Learning Implementation Plan

> **For Hermes:** Execute this plan incrementally with TDD; do not merge/push the Stick RTS worktree without explicit user approval.

**Goal:** Train a direct, non-LLM policy through offline self-play in the existing deterministic Stick RTS simulation, then replay trained checkpoints visibly in Watch mode.

**Architecture:** Treat `src/sim/tick.js` as the sole game engine. Add a headless RL adapter that exposes deterministic `reset(seed)`, compact numeric observation, legal discrete macro-action mask, `step(action)`, shaped transition reward, and terminal outcome. Training occurs offline against frozen/checkpoint opponents; only a versioned policy checkpoint may control a team during a replay. The browser never sees the training process or a model provider.

**Tech stack:** Existing ES modules/Node deterministic simulator; Python training sidecar; initially CPU-compatible vectorized rollout workers and a simple discrete PPO implementation or proven small RL library only after a reproducibility spike; JSON checkpoint metadata plus weight artifact; existing `tools/headless.js` for independent baseline comparisons.

## Non-negotiable rules

- This replaces live Gemma command authority for trained matches; it is not an LLM fallback.
- No hand-authored strategic rescue inside the policy executor: no auto-miner floor, auto-turret logic, counter-picks, or command replacement.
- Reward shaping is declared in versioned metadata and reported separately from match win/loss. It is not hidden game behavior.
- Train only offline. A deployed/replayed policy is immutable and identifies its checkpoint/version/seed/opponent.
- Evaluate candidates on held-out seeds and side swaps. Do not promote based only on training rewards.

## Task 1: Freeze the RL environment boundary

**Files:**
- Create: `src/rl/actionSpace.js`
- Create: `src/rl/observation.js`
- Create: `src/rl/environment.js`
- Create: `tools/rl-environment-check.mjs`
- Modify: `src/sim/tick.js` only if an explicit pre-tick action hook is required.

1. Write a failing check for same seed + same legal action sequence producing byte-equivalent episode summaries.
2. Define a **small discrete macro action space**, initially combinations of:
   - target intent: hold own mine, contest midpoint, pressure enemy mine, siege outer turret, attack core, retreat home;
   - one production request: miner, warrior, archer, structure, turret, or no-op.
3. Do **not** expose coordinates, direct per-unit targeting, heroes, or arbitrary purchases in v1.
4. Execute an action at a fixed decision cadence (start at 1 simulated second), then advance the real engine for that cadence through `runTick`.
5. Return `observation`, legal action mask, per-step reward components, `terminated`, `truncated`, and explicit terminal reason.
6. Validate illegal actions are rejected/masked rather than replaced.

## Task 2: Define compact observations and an action mask

**Files:**
- Create: `src/rl/observation.js`
- Create: `tools/rl-observation-check.mjs`

1. Write a failing shape/range test.
2. Build a symmetric, normalized vector containing only simulation facts available to both teams in the full-vision prototype:
   - own/enemy gold, income/miners, unit composition and queue;
   - own/enemy structures/turrets and core health;
   - own/enemy combat force and mean forward position;
   - current target intent, command, elapsed-time fraction;
   - last accepted action result and bounded recent combat/core-damage indicators.
3. Return a legal mask derived from deterministic economy/cap/max-turret rules.
4. Version the observation and action-space schemas in every run/checkpoint manifest.

## Task 3: Define a transparent reward ledger

**Files:**
- Create: `src/rl/rewards.js`
- Create: `tools/rl-rewards-check.mjs`
- Create: `docs/self-play-reward-contract.md`

1. Write failing checks for symmetry: swapping teams in a mirrored state negates reward components.
2. Record separately: terminal win/loss, enemy-core damage, own-core damage, unit-value losses/kills, and time penalty.
3. Start with a sparse-first contract: terminal outcome is dominant; core damage is the primary dense signal. Economy/army shaping must be small, explicit, ablated, and never rewarded merely for passive stockpiling.
4. Emit episode reward-component totals so reward hacking is visible.

## Task 4: Create a JSON-lines training bridge and replay format

**Files:**
- Create: `tools/rl-env-server.mjs`
- Create: `tools/rl-env-protocol-check.mjs`
- Create: `docs/rl-environment-protocol.md`

1. Implement a local stdin/stdout JSON-lines protocol:
   - request: `reset`, `step`, `close`;
   - response: observation, mask, reward ledger, terminal status, deterministic episode summary.
2. Keep Node authoritative for game simulation. Python sends only legal action indices and never mutates world internals.
3. Make one protocol round-trip check run a fixed seeded episode and verify no stdout contamination.
4. Persist action traces with seed, schemas, policy/opponent IDs, reward totals, and terminal result so a Watch replay can reproduce an evaluated game.

## Task 5: Build a non-learning random/legal-policy baseline

**Files:**
- Create: `training/requirements.txt`
- Create: `training/random_policy_eval.py`
- Create: `tools/rl-baseline-report.mjs`
- Create: `docs/self-play-baseline.md`

1. Run legal random policies through the exact protocol with fixed seeds.
2. Establish runtime throughput, termination rate, contact/core-damage rate, and reward-component distributions.
3. This is a health check only—not a competent opponent and not a hidden fallback.
4. Fail fast if episodes do not produce terminal or explainable truncated outcomes within the configured cap.

## Task 6: Implement minimal self-play PPO

**Files:**
- Create: `training/train_self_play.py`
- Create: `training/policy.py`
- Create: `training/checkpoints.py`
- Create: `training/evaluate_checkpoint.py`
- Create: `tools/rl-checkpoint-manifest-check.mjs`

1. Begin with a small shared-policy MLP and discrete masked action distribution.
2. Train both sides from the same policy parameters in symmetric full-vision self-play; alternate side/seed assignment.
3. Sample opponents from a frozen checkpoint pool, including the initial random policy, to prevent pure same-policy collapse.
4. Save immutable checkpoints with: source revision, observation/action/reward versions, training seed, environment config, optimizer counters, opponent-pool IDs, and metrics.
5. Add deterministic evaluation mode with exploration disabled.

## Task 7: Promotion gate and held-out evaluation

**Files:**
- Create: `tools/rl-evaluate.mjs`
- Create: `docs/rl-promotion-gate.md`
- Modify: `tools/model-commander-scenarios.mjs` to reuse the five fixed scenario IDs where compatible.

1. Evaluate candidate vs frozen baselines and prior promoted checkpoint on a seed manifest never used for training.
2. Swap player/AI sides for every seed.
3. Report win/loss/draw, time-to-terminal, core damage, combat/contact, reward totals, and action distributions.
4. Promote only when held-out match outcomes improve without collapse in contact/core-damage coverage. Keep all unsuccessful checkpoints as non-promoted artifacts.

## Task 8: Visible Watch replay integration

**Files:**
- Create: `src/rl/replayPolicy.js`
- Modify: `src/main.js`
- Modify: Watch UI/telemetry source identified during implementation
- Create: `tools/rl-watch-browser-check.mjs`

1. Add an explicit `Trained Policy Watch` mode, distinct from Scripted AI and Local Gemma Watch.
2. Load only a selected immutable action trace/checkpoint policy artifact; display checkpoint ID, seed, action cadence, current action, reward summary, and terminal outcome.
3. Verify in Chrome that the selected replay produces the same visible progression and action trace as the headless evaluation.

## Task 9: Scale only after evidence

1. Benchmark parallel headless environments on the Ryzen CPU before adding GPU dependencies.
2. The RX 6800 XT may help with a supported backend later, but Windows AMD/PyTorch support must be verified before making it a requirement.
3. Add parallel rollout workers only after a single-environment deterministic protocol is validated.
4. Do not begin fine-tuning an LLM. The first trained artifact is a direct action policy.

## Verification sequence

```bash
node tools/rl-environment-check.mjs
node tools/rl-observation-check.mjs
node tools/rl-rewards-check.mjs
node tools/rl-env-protocol-check.mjs
python training/random_policy_eval.py --seeds <manifest>
python training/train_self_play.py --smoke-run --seed <seed>
python training/evaluate_checkpoint.py --held-out-seeds <manifest>
node tools/rl-watch-browser-check.mjs
git diff --check
```

## Risks / stop conditions

- If the deterministic environment cannot reach contact/core-damage under legal random/scripted probe actions, fix environment/action semantics before training.
- If reward rises while held-out core damage or completion collapses, reject the reward/checkpoint; do not tune live behavior.
- If CPU rollout throughput is too low, optimize headless stepping/parallelization before investigating GPU acceleration.
- Do not expose an unpromoted model in normal Watch mode as though it is competent.
