"""Small NumPy masked MLP primitives for deterministic offline PPO rollouts."""
import argparse
import json

import numpy as np


def masked_softmax(logits, action_mask):
    mask = np.asarray(action_mask, dtype=bool)
    if not mask.any():
        raise ValueError('no legal action')
    masked = np.asarray(logits, dtype=np.float64).copy()
    masked[~mask] = -np.inf
    shifted = masked - np.max(masked[mask])
    probabilities = np.zeros_like(masked)
    probabilities[mask] = np.exp(shifted[mask])
    return probabilities / probabilities.sum()


def clipped_objective(ratio, advantage, clip_ratio=0.2):
    unclipped = ratio * advantage
    clipped = np.clip(ratio, 1 - clip_ratio, 1 + clip_ratio) * advantage
    return float(min(unclipped, clipped))


class MaskedMlpPolicy:
    def __init__(self, observation_size=12, action_count=42, hidden_size=32, seed=0):
        rng = np.random.default_rng(seed)
        self.w1 = rng.normal(0, 0.05, (observation_size, hidden_size))
        self.b1 = np.zeros(hidden_size)
        self.w_policy = rng.normal(0, 0.05, (hidden_size, action_count))
        self.b_policy = np.zeros(action_count)
        self.w_value = rng.normal(0, 0.05, hidden_size)
        self.b_value = 0.0

    def forward(self, observation, action_mask):
        hidden = np.tanh(np.asarray(observation, dtype=np.float64) @ self.w1 + self.b1)
        probabilities = masked_softmax(hidden @ self.w_policy + self.b_policy, action_mask)
        value = float(hidden @ self.w_value + self.b_value)
        return probabilities, value

    def select(self, observation, action_mask, rng, deterministic=False):
        probabilities, value = self.forward(observation, action_mask)
        action = int(np.argmax(probabilities)) if deterministic else int(rng.choice(len(probabilities), p=probabilities))
        return action, float(probabilities[action]), value


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--smoke', action='store_true')
    args = parser.parse_args()
    if args.smoke:
        policy = MaskedMlpPolicy(seed=7)
        # Make the expected legal action unambiguous without bypassing mask behavior.
        policy.w_policy[:] = 0
        policy.b_policy[:] = [0, 2, -20] + [-20] * 39
        action, probability, value = policy.select(np.zeros(12), [1, 1] + [0] * 40, np.random.default_rng(1), deterministic=True)
        print(json.dumps({
            'algorithm': 'masked-mlp-ppo-v1',
            'action': action,
            'probability': probability,
            'value': value,
            'clippedObjective': clipped_objective(1.5, 1.0),
        }))
