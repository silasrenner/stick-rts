"""Held-out greedy evaluation for immutable Stick RTS direct-policy checkpoints."""
import argparse
import json
from pathlib import Path

import numpy as np

from curriculum_policy import choose as curriculum_choose
from train_self_play import SelfPlayClient


def greedy_action(weights, observation, mask):
    vector = np.asarray(observation, dtype=np.float64)
    if isinstance(weights, dict):
        hidden = np.tanh(vector @ weights['w1'] + weights['b1'])
        logits = hidden @ weights['w_policy'] + weights['b_policy']
    else:
        logits = vector @ weights
    legal = np.asarray(mask, dtype=bool)
    if not legal.any():
        raise RuntimeError("environment returned no legal action")
    logits[~legal] = -np.inf
    return int(np.argmax(logits))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--episodes", type=int, default=8)
    parser.add_argument("--seed", type=int, required=True)
    args = parser.parse_args()
    checkpoint = json.loads(Path(args.checkpoint).read_text(encoding="utf-8"))
    if checkpoint.get("format") not in {'stick-rts-direct-policy-v1', 'stick-rts-imitation-policy-v1'}:
        raise ValueError("unsupported checkpoint format")
    raw_weights = checkpoint["weights"]
    weights = ({name: np.asarray(value, dtype=np.float64) for name, value in raw_weights.items()} if isinstance(raw_weights, dict)
               else np.asarray(raw_weights, dtype=np.float64))
    if isinstance(weights, dict):
        if weights['w1'].shape[0] != 12 or weights['w_policy'].shape[1] != 42:
            raise ValueError("unsupported MLP policy shape")
    elif weights.shape != (12, 42):
        raise ValueError(f"unsupported policy weight shape: {weights.shape}")

    root = Path(__file__).resolve().parents[1]
    client = SelfPlayClient(root)
    episodes = []
    try:
        for episode_index in range(args.episodes):
            state = client.request("reset-self-play", seed=args.seed + episode_index)
            decision_step = 0
            player_reward = 0.0
            ai_reward = 0.0
            while True:
                actions = {
                    "player": greedy_action(weights, state["observation"]["player"], state["actionMask"]["player"]),
                    "ai": curriculum_choose(decision_step, state["actionMask"]["ai"]),
                }
                state = client.request("step-self-play", actions=actions)
                player_reward += float(state["reward"]["player"])
                ai_reward += float(state["reward"]["ai"])
                decision_step += 1
                if state["terminated"] or state["truncated"]:
                    episodes.append({
                        "seed": args.seed + episode_index,
                        "actions": decision_step,
                        "playerReward": player_reward,
                        "aiReward": ai_reward,
                        "terminalReason": state["terminalReason"],
                        "playerRewardComponents": state["rewardComponents"]["player"],
                        "aiRewardComponents": state["rewardComponents"]["ai"],
                    })
                    break
    finally:
        client.close()
    print(json.dumps({
        "checkpoint": {"format": checkpoint["format"], "trainingSeed": checkpoint["trainingSeed"], "opponentPolicy": checkpoint.get("opponentPolicy")},
        "evaluationSeed": args.seed,
        "episodes": episodes,
    }))


if __name__ == "__main__":
    main()
