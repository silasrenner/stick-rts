# RL Action and Observation Semantics Gate — Discussion Plan

> **For Hermes:** Planning and discussion only. Do not edit simulator, environment, Python wrapper, browser UI, training code, or artifacts until Silas approves one contract option.

**Goal:** Establish a policy action and observation contract whose choices have real, distinguishable simulator effects before trace replay, behavior cloning, or PPO work resumes.

**Architecture:** Use the existing authoritative Node simulator. First decide whether the benchmark policy should control the game’s three actually implemented commands (`defend`, `attack`, `retreat`) or whether the simulator should be extended so the six advertised location-target intents truly affect movement/formation. Then define the smallest symmetric, fixed-size observation sufficient to interpret that chosen action contract. This gate precedes the Python bridge and all learner work.

**Tech Stack:** Existing Node simulator, `src/rl/environment.js`, scripted Hard behavior, later Gymnasium + `sb3-contrib` MaskablePPO. No training library is used during this gate.

---

## Verified discovery

The current 42-action contract advertises these target intents:

```text
hold-own-mine
contest-mid
pressure-enemy-mine
siege-enemy-outer
attack-enemy-core
retreat-home
continue
```

But the implemented execution path currently reduces them to only three movement commands:

```text
hold-own-mine          → defend
contest-mid            → attack
pressure-enemy-mine    → attack
siege-enemy-outer      → attack
attack-enemy-core      → attack
retreat-home           → retreat
```

Evidence:

- `src/commander/actionContract.js:3-10` maps four distinct attack intents to the same `attack` command.
- `src/rl/environment.js:62-73` records a target anchor, but calls `setTeamCommand()` with only that command.
- `src/sim/systems/commands.js:1-10` stores only `team.command` and propagates only `unit.command`.
- `src/sim/systems/movement.js:58-73` sends every attacking combat unit toward `enemyHomeX`; it does not read the stored target anchor.

Therefore, `contest-mid`, `pressure-enemy-mine`, `siege-enemy-outer`, and `attack-enemy-core` currently have the same strategic/movement effect. The target label is metadata, not a policy-controllable mechanic.

The current 12-value observation also omits persistent state needed to interpret an action such as `continue`, including the active command/target, unit composition, front/contact state, and defensive assets.

---

## Action-contract decision — approved

**Silas selected Option A.** The final bounded proof uses an 18-action contract:

```text
3 real commands: defend | attack | retreat
×
6 production requests: none | miner | warrior | archer | structure | turret
```

`continue` is removed. To maintain a command, the policy explicitly selects its currently visible command with `none` production.

This is a restricted command-level benchmark. It must never be presented as location-aware targeting, formation control, or full-game strategy competence.

## Rejected alternatives

### Option B — Preserve 42 actions by implementing real target-anchor movement

Make each target intent affect formation/movement/defense placement in the authoritative simulator.

**Benefits:**

```text
The 42 labels become real policy authority.
A later policy can choose mid, mine, turret, or core targets distinctly.
```

**Costs / risks:**

```text
This is a gameplay/system-design change, not merely an RL integration.
It needs separate game-behavior tests and browser validation before training.
It expands the final proof substantially and revives the scope-drift risk.
```

### Option C — Stop the RL path

If neither a restricted command benchmark nor a properly implemented target-action system is useful, preserve the scripted AI and stop the learner attempt.

---

## Observation-contract decision — approved

**Silas approved the proposed 35-value, player-relative observation contract.**

## Proposed minimal observation contract

The observation must be symmetric (own first, opponent second), normalized, fixed-size, and contain no hidden future/game-rule information. It must make each policy action interpretable.

### Per-team features

```text
core health fraction
available gold
miners alive
warriors alive
archers alive
non-starting turrets alive
non-turret structures alive
queued miner / warrior / archer / turret / structure counts
current command: one-hot defend / attack / retreat
combat front progress from own home toward enemy home
combat-contact flag
```

### Derived match features

```text
match elapsed-time fraction
```

All position features are mirrored into player-relative coordinates so one policy can control either side without seeing a privileged absolute direction.

### Explicit exclusions

```text
heroes: excluded because hard-rl-v1 disables them
raw entity IDs
arbitrary coordinates
scripted-AI memory / future build-cycle index
hidden target IDs
reward or terminal-state leakage
```

### Why each addition is necessary

| Missing current state | Failure it prevents |
|---|---|
| Command | `continue`/command maintenance ambiguity; attack vs retreat aliasing |
| Warrior vs archer counts | Cannot learn counter-production from total combat count |
| Turret/structure counts | Cannot reason about capacity/defensive posture |
| Queue composition | Queue length alone cannot explain production timing or cap pressure |
| Front progress | Cannot tell staging, advancing, retreating, or near-core pressure apart |
| Contact flag | Cannot distinguish an army existing from an actual engagement |

---

## Gate implementation plan after approval

### Task 1 — Action-effect regression (**completed**)

**Verified implementation:** `src/rl/environment.js` now exposes the approved 18 actions as `{ command, production }`; removed target labels and `continue` are absent. `tools/rl-action-semantics-check.mjs` passed after first failing at `42 !== 18`. The Gymnasium wrapper now declares `Discrete(18)`.

**Files:**
- Modify: `src/rl/environment.js`
- Create: `tools/rl-action-semantics-check.mjs`

**Test:** For a fixed world state, demonstrate that every advertised command action changes the simulator’s persisted command/movement outcome as specified, and that no two separately advertised actions remain semantically identical unless intentionally aliases.

**Pass:** All policy action labels are either behaviorally distinguishable or intentionally removed from the contract.

**Fail:** Stop and report the mismatch; do not bridge Python or train.

### Task 2 — Write observation-state regression first

**Files:**
- Modify: `src/rl/environment.js`
- Create: `tools/rl-observation-contract-check.mjs`
- Modify: `node_gymnasium_env.py`
- Modify: `training/tests/test_node_gymnasium_env.py`

**Test:** Construct paired worlds that are equal under the old 12 features but differ in one decision-relevant state (command, composition, front, contact, queue, or defenses). Require their v2 observations to differ at the documented feature position.

**Pass:** The observation exposes all documented decision-relevant state, stays finite/normalized, is symmetric when teams are mirrored, and remains a fixed Gymnasium `Box` shape.

**Fail:** Do not trace or train; revise only the state contract.

### Task 3 — Revalidate trace/replay proposal

Only after Tasks 1–2 pass, update the scripted `hard-rl-v1` baseline so it never relies on a hero or hidden cap fallback that the chosen policy contract cannot express. Then return to the separate trace/replay gate.

---

## Stop boundary

Do not proceed to bridge integration, trace generation, behavior cloning, PPO, browser work, self-play, or League work until Silas explicitly selects an action-contract option and approves the resulting observation contract.
