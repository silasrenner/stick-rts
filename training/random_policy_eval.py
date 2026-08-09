"""Smoke baseline for the Stick RTS self-play environment.

This is deliberately non-learning. It proves a foreign training process can
follow the environment's legality mask without adding any strategic fallback.
"""
import argparse
import json
import random
import subprocess
import sys
from pathlib import Path


class EnvClient:
    def __init__(self, root: Path):
        self.process = subprocess.Popen(
            ["node", "tools/rl-env-server.mjs"], cwd=root,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, bufsize=1,
        )
        self.request_id = 0

    def request(self, op, **fields):
        self.request_id += 1
        payload = {"id": self.request_id, "op": op, **fields}
        self.process.stdin.write(json.dumps(payload) + "\n")
        self.process.stdin.flush()
        line = self.process.stdout.readline()
        if not line:
            raise RuntimeError(self.process.stderr.read() or "environment server closed without response")
        response = json.loads(line)
        result = response["result"]
        if "error" in result:
            raise RuntimeError(result["error"])
        return result

    def close(self):
        try:
            self.request("close")
        finally:
            self.process.stdin.close()
            self.process.wait(timeout=10)


def choose_legal(mask, rng):
    legal = [index for index, allowed in enumerate(mask) if allowed]
    if not legal:
        raise RuntimeError("environment returned no legal action")
    return rng.choice(legal)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--episodes", type=int, default=3)
    parser.add_argument("--seed", type=int, default=1000)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    rng = random.Random(args.seed)
    env = EnvClient(root)
    episodes = []
    try:
        for episode_index in range(args.episodes):
            state = env.request("reset", seed=args.seed + episode_index)
            total_reward = 0.0
            actions = 0
            while True:
                action = choose_legal(state["actionMask"], rng)
                state = env.request("step", action=action)
                total_reward += state["reward"]
                actions += 1
                if state["terminated"] or state["truncated"]:
                    episodes.append({
                        "seed": args.seed + episode_index,
                        "reward": total_reward,
                        "actions": actions,
                        "terminalReason": state["terminalReason"],
                        "rewardComponents": state["rewardComponents"],
                    })
                    break
    finally:
        env.close()
    print(json.dumps({"policy": "legal-random-v1", "episodes": episodes}))


if __name__ == "__main__":
    main()
