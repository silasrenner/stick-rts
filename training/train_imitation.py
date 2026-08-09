"""Behavior-clone a legal macro policy from recorded scripted Watch decisions."""
import argparse
import json
from pathlib import Path

import numpy as np


def load_dataset(path):
    entries = [json.loads(line) for line in Path(path).read_text(encoding='utf-8').splitlines() if line.strip()]
    if not entries:
        raise ValueError('demonstration dataset is empty')
    if not all(entry.get('schema') == 'stick-rts-demo-v1' and len(entry.get('observation', [])) == 12 and 0 <= entry.get('action', -1) < 42 for entry in entries):
        raise ValueError('demonstration dataset does not match the legal RL contract')
    return np.asarray([entry['observation'] for entry in entries], dtype=np.float64), np.asarray([entry['action'] for entry in entries], dtype=np.int64)


def softmax(logits):
    shifted = logits - logits.max(axis=1, keepdims=True)
    values = np.exp(shifted)
    return values / values.sum(axis=1, keepdims=True)


def train(features, actions, epochs, seed, learning_rate=0.03, hidden_size=32):
    rng = np.random.default_rng(seed)
    w1 = rng.normal(0, 0.05, (12, hidden_size)); b1 = np.zeros(hidden_size)
    w2 = rng.normal(0, 0.05, (hidden_size, 42)); b2 = np.zeros(42)
    classes = np.eye(42)[actions]
    batch_size = 256
    for _epoch in range(epochs):
        order = rng.permutation(len(features))
        for start in range(0, len(features), batch_size):
            index = order[start:start + batch_size]
            x, y = features[index], classes[index]
            hidden = np.tanh(x @ w1 + b1)
            probabilities = softmax(hidden @ w2 + b2)
            d_logits = (probabilities - y) / len(index)
            d_w2 = hidden.T @ d_logits; d_b2 = d_logits.sum(axis=0)
            d_hidden = (d_logits @ w2.T) * (1 - hidden * hidden)
            w1 -= learning_rate * (x.T @ d_hidden); b1 -= learning_rate * d_hidden.sum(axis=0)
            w2 -= learning_rate * d_w2; b2 -= learning_rate * d_b2
    probabilities = softmax(np.tanh(features @ w1 + b1) @ w2 + b2)
    accuracy = float((probabilities.argmax(axis=1) == actions).mean())
    return {'w1': w1, 'b1': b1, 'w_policy': w2, 'b_policy': b2, 'w_value': np.zeros(hidden_size), 'b_value': 0.0}, accuracy


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', required=True)
    parser.add_argument('--epochs', type=int, default=40)
    parser.add_argument('--seed', type=int, default=17000)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    features, actions = load_dataset(args.dataset)
    weights, accuracy = train(features, actions, args.epochs, args.seed)
    checkpoint = {
        'format': 'stick-rts-imitation-policy-v1',
        'algorithm': 'masked-mlp-behavior-cloning-v1',
        'sourceDataset': str(args.dataset),
        'demonstrations': len(features),
        'trainingSeed': args.seed,
        'environment': {'observationVersion': 'full-v1', 'actionSpaceVersion': 'macro-42-v1', 'rewardVersion': 'core-terminal-combat-v1', 'observationSize': 12, 'actionCount': 42},
        'weights': {name: value.tolist() if hasattr(value, 'tolist') else value for name, value in weights.items()},
        'metrics': {'epochs': args.epochs, 'finalAccuracy': accuracy},
        'status': 'unpromoted-imitation-candidate',
    }
    output = Path(args.output); output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(checkpoint, indent=2), encoding='utf-8')
    print(json.dumps({'output': str(output), 'demonstrations': len(features), 'finalAccuracy': accuracy}))


if __name__ == '__main__':
    main()
