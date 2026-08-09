# Self-Play Reward Contract (v1)

Training reward is **feedback only**; it never changes game rules or supplies a scripted action.

```text
per-step reward = (enemy core damage − own core damage) / 2000
                + 0.05 × (enemy combat-unit losses − own combat-unit losses)
terminal win = +2
terminal loss = −2
```

Every transition records raw core damage, combat-unit losses, and named reward components. The combat exchange term is deliberately small and only occurs through real fighting—it does not reward passive army stockpiling. The terminal component is deliberately larger than an entire core bar of dense reward, so winning is always preferred to harmless damage farming. Economy and territory receive **no reward** in v1; they must earn value by enabling combat, core damage, or victory.

Candidates are selected on held-out match outcomes and core-damage coverage, never reward alone.
