"""Minimal direct-policy self-play trainer for Stick RTS.

This is deliberately small REINFORCE, not a claim of a production-quality PPO
stack. It establishes the trainable artifact/checkpoint contract on the real
simulator before optimizer complexity is introduced.
"""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np

from curriculum_policy import choose as curriculum_choose

OBSERVATION_VERSION = "full-v1"
ACTION_SPACE_VERSION = "macro-42-v1"
REWARD_VERSION = "core-terminal-v1"


class SelfPlayClient:
    def __init__(self, root):
        self.process = subprocess.Popen(
            ["node", "tools/rl-env-server.mjs"], cwd=root,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, bufsize=1,
        )
        self.request_id = 0

    def request(self, op, **fields):
        self.request_id += 1
        self.process.stdin.write(json.dumps({"id": self.request_id, "op": op, **fields}) + "\n")
        self.process.stdin.flush()
        line = self.process.stdout.readline()
        if not line:
            raise RuntimeError(self.process.stderr.read() or "self-play server closed")
        result = json.loads(line)["result"]
        if "error" in result:
            raise RuntimeError(result["error"])
        return result

    def close(self):
        try:
            self.request("close")
        finally:
            self.process.stdin.close()
            self.process.wait(timeout=10)


def action_and_gradient(weights, observation, mask, rng):
    x = np.asarray(observation, dtype=np.float64)
    legal = np.asarray(mask, dtype=bool)
    logits = x @ weights
    logits[~legal] = -np.inf
    shifted = logits - np.max(logits[legal])
    probabilities = np.zeros_like(logits)
    probabilities[legal] = np.exp(shifted[legal])
    probabilities /= probabilities.sum()
    action = int(rng.choice(len(probabilities), p=probabilities))
    # d log pi(a) / d W for a linear softmax policy.
    gradient = np.outer(x, -probabilities)
    gradient[:, action] += x
    return action, gradient


def train(episodes, seed, learning_rate):
    root = Path(__file__).resolve().parents[1]
    rng = np.random.default_rng(seed)
    client = SelfPlayClient(root)
    weights = np.zeros((12, 42), dtype=np.float64)
    metrics = []
    try:
        for episode in range(episodes):
            state = client.request("reset-self-play", seed=seed + episode)
            gradients = []
            rewards = {"player": [], "ai": []}
            decision_step = 0
            while True:
                player_action, gradient = action_and_gradient(weights, state["observation"]["player"], state["actionMask"]["player"], rng)
                actions = {
                    "player": player_action,
                    "ai": curriculum_choose(decision_step, state["actionMask"]["ai"]),
                }
                gradients.append(gradient)
                state = client.request("step-self-play", actions=actions)
                for team in ("player", "ai"):
                    rewards[team].append(float(state["reward"][team]))
                decision_step += 1
                if state["terminated"] or state["truncated"]:
                    break
            returns = {team: float(sum(rewards[team])) for team in ("player", "ai")}
            # Only the learned player updates. The named curriculum opponent is
            # training scaffolding, never a hidden runtime fallback.
            for gradient in gradients:
                weights += learning_rate * returns["player"] * gradient / max(1, len(gradients))
            metrics.append({
                "seed": seed + episode,
                "actions": len(rewards["player"]),
                "playerReward": returns["player"],
                "aiReward": returns["ai"],
                "terminalReason": state["terminalReason"],
                "playerRewardComponents": state["rewardComponents"]["player"],
                "aiRewardComponents": state["rewardComponents"]["ai"],
            })
    finally:
        client.close()
    return weights, metrics


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--episodes", type=int, default=8)
    parser.add_argument("--seed", type=int, default=9000)
    parser.add_argument("--learning-rate", type=float, default=0.02)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    weights, metrics = train(args.episodes, args.seed, args.learning_rate)
    checkpoint = {
        "format": "stick-rts-direct-policy-v1",
        "algorithm": "reinforce-smoke-v1",
        "episodes": args.episodes,
        "trainingSeed": args.seed,
        "learningRate": args.learning_rate,
        "opponentPolicy": "opening-pressure-v1",
        "environment": {
            "observationVersion": OBSERVATION_VERSION,
            "actionSpaceVersion": ACTION_SPACE_VERSION,
            "rewardVersion": REWARD_VERSION,
            "observationSize": 12,
            "actionCount": 42,
        },
        "weights": weights.tolist(),
        "metrics": metrics,
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(checkpoint, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(output), "episodes": args.episodes, "metrics": metrics}))


if __name__ == "__main__":
    main()
