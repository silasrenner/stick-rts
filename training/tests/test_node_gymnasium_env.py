"""Focused external-client contract checks for the authoritative Node RL bridge."""
from pathlib import Path

import numpy as np
from gymnasium.utils.env_checker import check_env

from node_gymnasium_env import NodeStickRtsEnv


ROOT = Path(__file__).resolve().parents[2]


def test_gymnasium_wrapper_exposes_legal_mask_and_explicit_invalid_result():
    """A real Node-backed Gymnasium environment must not replace bad actions."""
    env = NodeStickRtsEnv(ROOT, max_episode_seconds=5)
    try:
        observation, info = env.reset(seed=4401)
        assert observation.shape == (35,)
        assert observation.dtype == np.float32
        assert env.action_space.n == 18
        assert info["action_mask"].shape == (18,)
        assert info["action_mask"].dtype == np.bool_
        legal_action = int(np.flatnonzero(info["action_mask"])[0])

        next_observation, reward, terminated, truncated, step_info = env.step(legal_action)
        assert next_observation.shape == (35,)
        assert isinstance(reward, float)
        assert not terminated
        assert not truncated
        assert step_info["action_result"]["ok"] is True
        assert step_info["action_mask"].shape == (18,)

        _, _, _, _, invalid_info = env.step(42)
        assert invalid_info["action_result"] == {"ok": False, "reason": "invalid-action-index"}
    finally:
        env.close()


def test_gymnasium_wrapper_applies_its_time_limit_in_the_node_simulator():
    """Configured episode limits belong to the authoritative bridge, not Python bookkeeping."""
    env = NodeStickRtsEnv(ROOT, decision_seconds=1, max_episode_seconds=1)
    try:
        _, info = env.reset(seed=4402)
        legal_action = int(np.flatnonzero(info["action_mask"])[0])
        _, _, terminated, truncated, step_info = env.step(legal_action)
        assert not terminated
        assert truncated is True
        assert step_info["terminal_reason"] == "time-limit"
    finally:
        env.close()


def test_gymnasium_wrapper_runs_against_named_hard_rl_baseline():
    """Python must select the restricted scripted opponent in Node, not an idle enemy."""
    env = NodeStickRtsEnv(
        ROOT,
        opponent_policy="hard-rl-v1",
        decision_seconds=5,
        max_episode_seconds=30,
    )
    try:
        _, info = env.reset(seed=25002)
        assert info["opponent_policy"] == "hard-rl-v1"
        legal_action = int(np.flatnonzero(info["action_mask"])[0])
        _, _, _, _, step_info = env.step(legal_action)
        assert step_info["opponent_policy"] == "hard-rl-v1"
        assert step_info["opponent_production_queue_length"] > 0
    finally:
        env.close()


def test_gymnasium_wrapper_passes_standard_environment_checker():
    """The wrapper uses Gymnasium reset/step spaces without simulating mechanics in Python."""
    env = NodeStickRtsEnv(ROOT, max_episode_seconds=5)
    try:
        check_env(env, skip_render_check=True)
    finally:
        env.close()
