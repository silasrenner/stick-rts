# Scripted-Hard Teacher Restart v2 — Review and Recovery Plan

> **Status:** TABLED by Silas on 2026-07-31. Planning only; do not resume RL/imitation/replay implementation until Silas explicitly reopens this effort after independent learning. This plan is historical context, not standing authorization.

**Goal:** Get back to a visible, evidence-led learner path by treating the existing browser Watch `hard` vs `hard` behavior as the complete teacher source of truth, capturing it faithfully, and making no learner-interface decision until its real actions are audited.

**User-visible target:** A fixed-seed, browser-identifiable existing Scripted Hard-vs-Hard reference match with a complete raw trace. It must be honestly labeled *scripted reference behavior, not learned*.

---

## Review: what went wrong

### 1. I made a provisional learner contract control the teacher

I created and extended `hard-rl-v1` to fit an early 18-action proposal. That weakened the known-working teacher and turned a data-capture problem into scripted-AI redesign.

**Correction:** Existing `hard` behavior is the source. Trace it completely first. Never fork, constrain, tune, or censor the teacher to fit an unapproved learner interface.

### 2. I conflated trace exposure with policy output compatibility

A trace can and should include all teacher actions/outcomes—heroes, structures, cap behavior, and automatic systems—even when the current learner cannot yet output them.

**Correction:** Raw trace is complete. Later, the user chooses a finite output contract based on the audit. Any explicit teacher action outside that contract becomes a visible decision point, not omitted data or a silently translated action.

### 3. I treated technical gates as progress too readily

A 35-value observation, 18-action contract, bridge test, or contact flag is not a useful teacher or learner outcome by itself.

**Correction:** Every gate must either prove browser/reference parity, preserve a complete raw teacher artifact, prove exact replay, or show visible agent behavior. Otherwise it is a prerequisite with no product-progress claim.

### 4. I made a speculative diagnosis before directly comparing paths

I initially suspected RL-wrapper contamination before proving it. The later pure-vs-wrapper comparison showed both facts: 90 seconds was too short, and wrapper injection did suppress later attacks.

**Correction:** When headless evidence conflicts with watched browser behavior, first run a direct same-seed/same-duration harness comparison. No architecture conclusion before that evidence exists.

### 5. I kept expanding after a failed premise

Rather than freezing the inadequate restricted trace route promptly, I added trace and baseline layers around it.

**Correction:** Failed source-validity gate means stop. Only diagnosis or return to the known working source is allowed—not tuning, training, or adjacent infrastructure.

---

## Updated operating rules

```text
Teacher source first.
Complete raw trace second.
Compatibility audit third.
User decision on learner contract fourth.
Exact replay fifth.
Learning only after replay.
```

At any stage:

```text
Existing visible behavior beats a replacement.
Raw evidence beats inference.
One bounded gate beats a batch of plumbing.
A failed gate stops expansion.
```

---

# Execution plan

## Gate 1 — Exact existing-Watch parity

**Question:** Can headless reference execution be shown to start from the exact same configuration as the browser Watch match Silas observes?

**Do only this:**

1. Add a failing Node check for a new direct reference runner.
2. Implement the smallest runner that mirrors `src/main.js:startWatchAiMatch` exactly:

```js
const world = createWorld(seed);
world.matchState = 'playing';
world.teams.player.difficulty = 'hard';
world.teams.ai.difficulty = 'hard';
```

3. Advance only through normal fixed ticks:

```js
runTick(world, 1 / CONFIG.TICK_HZ);
```

4. Assert and report:

```text
player difficulty: hard
AI difficulty: hard
external action injections: 0
fixed normal tick interval
recorded seed and simulated duration
```

**Files:**

```text
tools/scripted-hard-reference-runner.mjs       (new)
tools/scripted-hard-reference-runner-check.mjs (new)
src/main.js                                    (read-only reference)
src/sim/world.js                               (read-only)
src/sim/tick.js                                (read-only)
```

**Pass:** The runner’s initialization is an exact code-level equivalent of browser Watch Hard-vs-Hard and it uses no RL environment/wrapper.

**Fail / stop:** Any mismatch in difficulty assignment, tick path, or injected action. Investigate parity only; do not alter Hard behavior.

**Explicit exclusions:** No trace schema, artifact, action-contract work, browser UI, learning, or Python bridge changes.

---

## Gate 2 — Complete raw existing-Hard trace

**Starts only after Gate 1 passes.**

**Question:** What does the existing Watch Hard teacher actually do in a fixed-seed full game?

**Do only this:** Instrument observation of existing behavior without changing it. Capture both teams’ raw events:

```text
seed, integer tick, simulated time, team, difficulty
pre-decision world/state snapshot
selected command
requested action/purchase
actual simulator operation(s) and their results
hero purchases/lifecycle
capacity-related operation(s)
post-decision compact snapshot
contact, losses, core damage, terminal result
```

**Critical trace rule:**

```text
If teacher requests warrior and the simulator actually creates a structure,
both facts are recorded distinctly.
```

No `none` conversion. No filtering. No hidden compatibility adapter.

**Pass:** Every explicit scripted decision and resulting operation is present in the trace.

**Fail / stop:** Any unobservable or ambiguous teacher operation. Report the exact source seam; do not create a replacement teacher.

**Explicit exclusions:** No policy interface design, no replay, no cloning/PPO.

---

## Gate 3 — One browser-identifiable reference artifact

**Starts only after Gate 2 passes.**

**Question:** Does the fixed-seed raw trace describe a meaningful existing browser Watch match?

**Do only this:** Choose a browser Watch seed/configuration, record it, then run the matching pure headless reference. Save a write-once raw artifact only if the trace is complete:

```text
training/artifacts/scripted-hard-vs-hard-seed-<seed>-raw-trace.json
```

“Write-once” means an existing file path produces an error rather than a silent replacement. It preserves evidence/provenance; it is not a learner checkpoint or competency claim.

**Report:**

```text
seed and browser setup
commands
all explicit production/hero/structure behavior
actual fallback outcomes
contact duration, losses, core damage, terminal result
artifact path and byte size
```

**Pass:** Same declared setup, complete trace, and browser-visible/reference behavior that is recognizable as the existing Watch match.

**Fail / stop:** Browser/headless mismatch or unrepresentative/non-interacting reference. Return evidence/options; do not retune Hard.

---

## Gate 4 — Compatibility audit and user decision

**Starts only after Gate 3 passes. No implementation occurs in this gate.**

Present a concise table:

| Teacher behavior | Frequency / example | Explicit decision or automatic mechanic? | Learner can currently reproduce? |
|---|---:|---|---|
| commands | | explicit | |
| units / structures / turrets | | explicit | |
| heroes | | explicit | |
| capacity outcomes | | actual effect | |
| movement / formation / combat | | automatic engine mechanics | engine-owned |

Then ask exactly one question:

```text
Which finite policy action contract should faithfully express the
explicit existing Hard teacher decisions?
```

This is where hero/action scope is decided—with actual trace evidence—rather than guessed in advance.

---

## Gate 5 — Exact replay

**Starts only after Silas approves the audited learner contract.**

Build only a direct, fixed-tick replay adapter that injects recorded explicit player decisions at their exact recorded boundaries, leaves the opposing existing Hard scripted, and compares deterministic compact snapshots/action outcomes.

**Pass:** Reference and replay match on declared deterministic fields.

**Fail / stop:** First divergence is saved and reported. No cloning/PPO/reward redesign automatically follows.

---

## Deferred until replay passes

```text
Behavior cloning
MaskablePPO
Gymnasium bridge changes
checkpoint training/evaluation
Watch Training Agent UI
Play Against Training Agent
self-play / League work
```

## What I will report after every approved gate

```text
Verified: exact command, seed, artifact, and user-relevant outcome.
Implemented but unproven: only if applicable.
Rejected / blocked: exact failed assumption and evidence.
Next gate: one bounded approved task, with a pass/fail condition.
```
