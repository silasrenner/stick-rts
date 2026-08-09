"""Transparent training-only opponent policy for early self-play curriculum.

It is never invoked by browser Watch mode or normal gameplay. Its purpose is
to create reproducible combat trajectories while a newly initialized learned
policy has no signal of its own.
"""
import argparse
import json

CONTINUE_NONE = 36
# attack-enemy-core is target #4, so + miner is 4 * 6 + 1 = 25.
# Continue/miner is 37; continue/warrior is 38. The final warrior action
# deliberately repeats: a gold block must wait and retry, not skip ahead.
OPENING_PLAN = [25, 37, 38]


def choose(step, action_mask):
    """Return a legal planned macro, otherwise an explicit continue/no-op."""
    intended = OPENING_PLAN[min(step, len(OPENING_PLAN) - 1)]
    if intended < len(action_mask) and action_mask[intended]:
        return intended
    if len(action_mask) > CONTINUE_NONE and action_mask[CONTINUE_NONE]:
        return CONTINUE_NONE
    legal = [index for index, allowed in enumerate(action_mask) if allowed]
    if not legal:
        raise RuntimeError("environment supplied no legal action")
    return legal[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--smoke", action="store_true")
    args = parser.parse_args()
    if args.smoke:
        mask = [1] * 42
        print(json.dumps({"name": "opening-pressure-v1", "firstAction": choose(0, mask), "actions": [choose(step, mask) for step in range(8)]}))


if __name__ == "__main__":
    main()
