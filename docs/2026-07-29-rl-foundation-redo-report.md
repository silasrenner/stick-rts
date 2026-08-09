# RL foundation redo — 2026-07-29

## Scope and conclusion

This is a narrow, offline-training foundation only. It adds a standard Gymnasium adapter over the existing authoritative Node simulator bridge. It does **not** train a policy, change browser Watch/Play, build a league, or claim that a model can play the game.

**Genuine learnable policy demonstrated: no.** The only verified policy-library exercise constructs an untrained `MaskablePPO`, obtains one legal masked action, and executes it through the real Node simulator. That proves the integration boundary, not learning or gameplay quality. The existing imitation v001 result (about 68% training-row accuracy with held-out timeouts/no core damage) remains insufficient evidence and is not promoted.

## Existing-work-first evaluation

Primary documentation consulted (HTTP 200 on 2026-07-29):

1. Gymnasium environment API — https://gymnasium.farama.org/api/env/
   - `Env.reset()` returns `(observation, info)` and `Env.step()` returns `(observation, reward, terminated, truncated, info)`.
2. Stable-Baselines3 install/documentation — https://stable-baselines3.readthedocs.io/en/master/guide/install.html
3. sb3-contrib MaskablePPO documentation — https://sb3-contrib.readthedocs.io/en/master/modules/ppo_mask.html
   - supports `MaskablePPO` and action masks exposed by an environment method named `action_masks`.
4. PyTorch installation guide — https://pytorch.org/get-started/locally/

The appropriate next learner is therefore `sb3_contrib.MaskablePPO`, not another handwritten NumPy optimizer. Gymnasium, Stable-Baselines3, PyTorch, and sb3-contrib were installed only in this checkout's `.venv`; global Python configuration was not changed. Reproducible pins are in `requirements-rl-foundation.txt`.

Validated imports/versions:

```text
gymnasium=1.3.0
stable-baselines3=2.9.0
sb3-contrib=2.9.0
torch=2.13.0+cpu
MaskablePPO=sb3_contrib.ppo_mask.ppo_mask.MaskablePPO
```

## Implementation changes

- `node_gymnasium_env.py` (new): `NodeStickRtsEnv`, a Gymnasium-compatible single-side adapter.
  - Starts `node tools/rl-env-server.mjs` and communicates exclusively through its JSON Lines `reset`/`step`/`close` protocol.
  - Does not implement or mutate RTS mechanics in Python.
  - Exposes `Discrete(42)`, a `float32` 12-value observation, Gymnasium reset/step tuple contracts, named action/reward/terminal information, and `action_masks()` for MaskablePPO.
  - The mask is the Node simulator's actual 42-action legal mask. A manually supplied out-of-range index is sent to the bridge and returned as `{ok: false, reason: "invalid-action-index"}`; it is never replaced by a strategic fallback.
  - Configured `decision_seconds` and `max_episode_seconds` are sent to Node on reset. Python does not impose its own time bookkeeping.
- `tools/rl-env-server.mjs` (updated): allows validated `decisionSeconds` and `maxEpisodeSeconds` in a `reset` request and recreates only the existing single-side Node environment with those settings. Existing no-config protocol clients retain the prior default behavior.
- `training/tests/test_node_gymnasium_env.py` (new): external-client behavioral tests for legal mask exposure/explicit invalid result, Node-owned time limit, and Gymnasium's standard environment checker.
- `requirements-rl-foundation.txt` (new): local foundation dependency pins.

### TDD record

1. `test_gymnasium_wrapper_exposes_legal_mask_and_explicit_invalid_result` was written before the wrapper. It initially failed during collection with `ModuleNotFoundError: No module named 'node_gymnasium_env'`.
2. The minimal Node-backed wrapper was written; the focused test passed.
3. `test_gymnasium_wrapper_applies_its_time_limit_in_the_node_simulator` was then written before the bridge configuration addition. It failed as intended: `assert False is True` for `truncated` after a one-second configured episode.
4. The minimal validated reset configuration forwarding was added to wrapper/bridge; the focused test passed.

## Data-capture status

The present `tools/generate-scripted-demos.mjs` records only queue/purchase events (`stick-rts-demo-v1`). It is **not** a valid behavior-cloning corpus for the 42-action, fixed-decision-cadence policy: it discards the overwhelmingly common intervals where the teacher continues its existing command, makes no production request, waits for resources/capacity, or has a production request blocked. It also infers a command from before/after state rather than recording the teacher's actual decision intent at every policy boundary. Training on it produces covariate shift: a learner must choose `continue`, command-only, no-production, retry, and blocked-action behavior it never observed.

Do not silently map missing teacher behavior to a legal macro. Before any imitation or PPO expansion, replace this with a full-cadence `stick-rts-teacher-trace-v2` JSON Lines schema. One row **per team per fixed decision interval**, including terminal/idle intervals, must contain:

```json
{
  "schema": "stick-rts-teacher-trace-v2",
  "seed": 20000,
  "team": "player",
  "decisionIndex": 17,
  "simulatedSeconds": 17,
  "observationVersion": "full-v1",
  "actionSpaceVersion": "macro-42-v1",
  "observation": ["12 numeric values"],
  "legalActionMask": ["42 zero/one values"],
  "targetIntent": "continue",
  "productionIntent": "none",
  "actionIndex": 36,
  "actionResult": {"ok": true, "reason": "no-production"},
  "teacherCommand": "attack",
  "seededTerminalState": null
}
```

For a blocked/unsupported teacher intention, retain its raw intent and an explicit rejected result; do not fabricate an available action. The first gate is trace-replay equivalence: disable the teacher, replay the translated trace through the bounded executor, and require fixed-seed production history, combat/contact, core damage, and terminal class to match before training.

## Verified commands and output

All commands were run from `C:\Users\simcr\projects\stick-rts-watch-speed`.

```text
.venv/Scripts/python.exe -m pytest training/tests/test_node_gymnasium_env.py -v
3 passed in 0.37s
```

The three passing tests cover the external Node bridge, explicit invalid action result/no fallback, Node-owned one-second truncation, and `gymnasium.utils.env_checker.check_env`.

```text
for f in tools/rl-environment-check.mjs tools/rl-env-protocol-check.mjs tools/rl-rewards-check.mjs tools/rl-self-play-environment-check.mjs tools/rl-self-play-protocol-check.mjs; do node "$f" || exit $?; done
```

Output:

```text
PASS — RL environment executes bounded legal macros, rejects invalid actions without fallback, and is deterministic.
PASS — RL JSON-lines server accepts reset/step/close with clean machine-readable output.
PASS — RL reward is explicit, terminal-dominant, and team-symmetric.
PASS — self-play environment executes simultaneous team actions and isolates invalid actions without fallback.
PASS — RL JSON-lines server bridges simultaneous self-play actions.
```

A no-training MaskablePPO bridge proof was also run:

```text
.venv/Scripts/python.exe -c "... MaskablePPO('MlpPolicy', env, n_steps=2, batch_size=2) ..."
{'action': 12, 'legal': True, 'reward': 0.0, 'terminated': False, 'truncated': False, 'actionResult': {'ok': True, 'targetIntent': 'pressure-enemy-mine', 'anchorId': 'enemy-mine', 'production': 'none'}}
```

This is expressly an integration smoke result, not a training result.

The existing sparse-generator regression was intentionally also run to document the current boundary, not to qualify it as training data:

```text
node tools/rl-demonstrations-check.mjs
PASS — scripted Watch decisions are recorded as legal 42-action imitation demonstrations.
```

`.venv/Scripts/python.exe -m pip check` returned `No broken requirements found.` `git diff --check` completed successfully with no whitespace errors.

## Remaining blockers and narrow Watch/Play path

1. **Blocker: teacher data abstraction is not replay-equivalent.** The sparse v1 generator cannot establish it. Implement v2 full-cadence capture and a fixed-seed replay-equivalence check first. **Stop** if production history, combat/contact, core damage, or terminal class differs.
2. **Blocker: no held-out, side-swapped policy evidence.** Only after the trace gate passes, train offline with immutable opponent checkpoints using MaskablePPO. Evaluate deterministic inference on a predeclared held-out seed manifest with both sides swapped. **Stop/no promotion** on timeouts without objective progress, non-zero-sum/symmetry failures, or no improvement over the named fixed baseline; never use loss/reward curves alone.
3. **Only after those gates pass:** export an immutable checkpoint plus manifest (source revision, schemas, reward config, seed manifest, opponent IDs, counters), retain action/reward traces, and add the smallest browser Watch experiment. It must visibly show checkpoint ID, seed, decision cadence, current action, legality result, and terminal outcome. Add Play Against only after a Watch replay can be reproduced from the same trace.

**Recommendation: NO-GO for a browser Watch/Play agent now; GO only for the next narrow prerequisite (v2 full-cadence trace capture plus replay-equivalence gate).**
