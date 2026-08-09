"""Gymnasium adapter for the authoritative Stick RTS Node JSON-lines bridge.

The adapter only translates Gymnasium calls into reset/step protocol messages.
All match mechanics, legality decisions, and action execution remain in Node.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

import gymnasium as gym
import numpy as np


class NodeStickRtsEnv(gym.Env[np.ndarray, int]):
    """Single-side Gymnasium environment backed by ``tools/rl-env-server.mjs``."""

    metadata = {"render_modes": []}

    def __init__(
        self,
        root: str | Path,
        *,
        decision_seconds: float = 1,
        max_episode_seconds: float = 300,
        opponent_policy: str | None = None,
    ) -> None:
        if opponent_policy not in {None, "hard-rl-v1"}:
            raise ValueError(f"Unsupported opponent_policy: {opponent_policy}")
        self.root = Path(root)
        self.decision_seconds = decision_seconds
        self.max_episode_seconds = max_episode_seconds
        self.opponent_policy = opponent_policy
        self.action_space = gym.spaces.Discrete(18)
        # The authoritative observation is normalized, non-negative game state.
        # 100 leaves a deliberately broad finite bound for economy normalization.
        self.observation_space = gym.spaces.Box(
            low=0.0, high=100.0, shape=(35,), dtype=np.float32
        )
        self._process: subprocess.Popen[str] | None = None
        self._request_id = 0
        self._action_mask: np.ndarray | None = None

    def _ensure_process(self) -> subprocess.Popen[str]:
        if self._process is None or self._process.poll() is not None:
            self._process = subprocess.Popen(
                ["node", "tools/rl-env-server.mjs"],
                cwd=self.root,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )
        return self._process

    def _request(self, op: str, **fields: Any) -> dict[str, Any]:
        process = self._ensure_process()
        assert process.stdin is not None and process.stdout is not None
        self._request_id += 1
        request_id = self._request_id
        process.stdin.write(json.dumps({"id": request_id, "op": op, **fields}) + "\n")
        process.stdin.flush()
        line = process.stdout.readline()
        if not line:
            stderr = process.stderr.read() if process.stderr is not None else ""
            raise RuntimeError(stderr or "Node RL bridge closed without a response")
        response = json.loads(line)
        if response.get("id") != request_id:
            raise RuntimeError(f"Node RL bridge returned mismatched response: {response}")
        result = response["result"]
        if "error" in result:
            raise RuntimeError(result["error"])
        return result

    @staticmethod
    def _observation(result: dict[str, Any]) -> np.ndarray:
        return np.asarray(result["observation"], dtype=np.float32)

    def _info(self, result: dict[str, Any]) -> dict[str, Any]:
        if "actionMask" in result:
            self._action_mask = np.asarray(result["actionMask"], dtype=np.bool_)
        info = {
            "action_mask": self.action_masks(),
            "seed": result.get("seed"),
        }
        for key in ("actionResult", "rewardComponents", "terminalReason", "opponentPolicy", "opponentProductionQueueLength"):
            if key in result:
                info[{"actionResult": "action_result", "rewardComponents": "reward_components", "terminalReason": "terminal_reason", "opponentPolicy": "opponent_policy", "opponentProductionQueueLength": "opponent_production_queue_length"}[key]] = result[key]
        return info

    def reset(self, *, seed: int | None = None, options: dict[str, Any] | None = None):
        super().reset(seed=seed)
        if options:
            raise ValueError("NodeStickRtsEnv does not support reset options")
        result = self._request(
            "reset",
            seed=0 if seed is None else int(seed),
            decisionSeconds=self.decision_seconds,
            maxEpisodeSeconds=self.max_episode_seconds,
            opponentPolicy=self.opponent_policy,
        )
        return self._observation(result), self._info(result)

    def step(self, action: int):
        result = self._request("step", action=int(action))
        return (
            self._observation(result),
            float(result["reward"]),
            bool(result["terminated"]),
            bool(result["truncated"]),
            self._info(result),
        )

    def action_masks(self) -> np.ndarray:
        """Return the Node-derived legal-action mask required by MaskablePPO."""
        if self._action_mask is None:
            raise RuntimeError("Call reset() before requesting action masks")
        return self._action_mask.copy()

    def close(self) -> None:
        if self._process is None:
            return
        if self._process.poll() is None:
            try:
                self._request("close")
            except (BrokenPipeError, RuntimeError):
                pass
        if self._process.stdin is not None:
            self._process.stdin.close()
        self._process.wait(timeout=10)
        self._process = None
