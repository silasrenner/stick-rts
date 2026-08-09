# Stick RTS Model Commander Agent Environment Implementation Plan

> **For Hermes:** Implement this plan in small TDD slices; do not merge, push, or modify production `main` without explicit approval.

**Goal:** Replace the current periodic raw purchase-list controller with an observable, persistent model-team commander environment that can produce and evaluate genuine model-directed RTS behavior: economy, army composition, positioning, combat, recovery, and eventual core destruction.

**Architecture:** The deterministic simulation remains authoritative for rules, legality, timing, movement, combat, and resources. Each model owns strategy through a bounded action contract, per-team memory, and explicit plan revisions. The browser sends a compact, spatially meaningful observation to the same-origin companion; the companion adds only that team’s trusted profile/manual and forwards it to loopback LM Studio. An offline evaluator—not a live self-rewriter—records fixed-seed results and proposes bounded profile changes only after baseline behavior is measurable.

**Tech Stack:** Existing browser ES modules, deterministic simulation, Node same-origin companion (`tools/lan-preview-server.mjs`), LM Studio OpenAI-compatible API on PC loopback, Node `.mjs` checks, Chrome/CDP live-browser check.

---

## Product contract and non-negotiables

1. **User-visible success:** two model-run teams visibly establish economies, form armies, take/revise strategic positions, enter combat, damage a core, and eventually resolve matches across reproducible seeds.
2. **Model authority:** models select doctrine, production intent, army objective, formation/anchor intent, and revisions. Deterministic code validates and executes legal intent; it must not silently buy miners, structures, units, heroes, turrets, or counter-picks the model did not select.
3. **Private architecture:** browser → same-origin Stick RTS companion → `127.0.0.1` LM Studio. No browser/LAN client ever reaches LM Studio directly.
4. **No online recursive self-modification.** Any later learning is offline, replayable, bounded, independently evaluated, and accepted only by held-out measurements.
5. **No claim of success from provider/unit checks alone.** Each phase has an on-screen browser acceptance check plus a deterministic regression.

## Reference-derived design constraints

- **TextStarCraft II** ([paper](https://arxiv.org/abs/2312.11865), [code](https://github.com/histmeisah/Large-Language-Models-play-StarCraftII)) uses observation-to-text, an action dictionary, action extraction, single-frame summaries, and multi-frame summaries. Apply this by separating instantaneous tactical state from rolling match narrative.
- **LLM-PySC2** ([paper](https://arxiv.org/abs/2411.05348), [code](https://github.com/NKAI-Decision-Team/LLM-PySC2)) exposes textual/multimodal observations, game knowledge, explicit actions, asynchronous model calls, and logging. Its authors note models are not consistently correct in broad action spaces; therefore Stick RTS must expose a curated hierarchical action contract rather than raw micro-control or only `buy`/`attack`.
- **Voyager** ([paper](https://arxiv.org/abs/2305.16291), [code](https://github.com/MineDojo/Voyager)) uses feedback, self-verification, and an inspectable reusable skill library. Apply the persistence/feedback principle, but do not copy its open-ended live learning loop.
- **SMAC** ([paper](https://arxiv.org/abs/1902.04043), [code](https://github.com/oxwhirl/smac)) emphasizes fixed scenarios and measurable evaluation. Apply this through deterministic scenario suites and held-out seeds.
- **Generative Agents** ([paper](https://arxiv.org/abs/2304.03442)) motivates memory stream → retrieval → reflection → plan. Apply this as concise, event-derived team memory—not freeform hidden chain-of-thought.

---

## Phase 0 — Freeze the success criteria and baseline

### Task 0.1: Define observable commander milestones

**Files:**
- Create: `docs/model-commander-acceptance.md`
- Create: `tools/model-commander-scenarios.mjs`
- Test: `tools/model-commander-scenarios-check.mjs`

**Steps:**
1. Define five deterministic scenarios: opening economy, first contact, pressure opportunity, recovery after losses, and full-match completion.
2. For each scenario, specify measurable milestones: miners, accumulated spend, combat units, entry into contested territory, combat event, core damage, and completion/timeout.
3. Use fixed seeds and a machine-readable scenario schema. Do not include a “model succeeds” assertion yet; baseline must honestly record current failure rates.
4. Run the scenario schema check. Expected initial state: schema passes; model performance is reported, not fabricated as success.

### Task 0.2: Record a pre-redesign baseline

**Files:**
- Create: `tools/model-commander-baseline.mjs`
- Create at runtime only: `.local/model-commander-baselines/<timestamp>.json`

**Steps:**
1. Run the current Local Gemma controller over the fixed scenarios.
2. Record seed, model/provider latency, decision count, intent history, purchases, blocked plans, units, core damage, and terminal state.
3. Preserve the raw baseline artifact outside git. This prevents us from calling later changes “better” without comparison.

---

## Phase 1 — Create a real game manual and hierarchical action catalogue

### Task 1.1: Write the deterministic game manual from `CONFIG`

**Files:**
- Create: `src/commander/gameManual.js`
- Modify: `src/config.js`
- Test: `tools/commander-game-manual-check.mjs`

**Steps:**
1. Write a failing check that asserts the manual exposes current unit/hero/structure costs, build times, supply rules, mine rules, starting turret/core rules, combat ranges, and win condition.
2. Implement `buildCommanderGameManual()` from `CONFIG`; do not duplicate numeric values in prompt text.
3. Include a compact version identifier/hash derived from the documented values. Attach the manual to a commander context once per match or when its version changes.
4. Verify a config mutation in the check changes manual output; this prevents stale prose from becoming game truth.

### Task 1.2: Define a bounded macro action contract

**Files:**
- Create: `src/commander/actionContract.js`
- Modify: `src/commander/providers.js`
- Modify: `src/commander/context.js`
- Test: `tools/commander-action-contract-check.mjs`

**Contract, first version:**
```json
{
  "strategy": "expand|hold|pressure-mine|siege-outer|core-push|recover",
  "production": [{"kind":"miner|warrior|archer|structure|turret|forgemaster|hawkeye|vanguard","count":1}],
  "armyOrder": "hold-inner|hold-outer|rally-mine|contest-mid|attack-outer|attack-core|retreat-home",
  "horizonSeconds": 30,
  "replanOn": ["plan-complete","production-blocked","enemy-contact","core-damage","horizon-expired"],
  "rationale": "bounded short text for UI/logging"
}
```

**Steps:**
1. Write failing validation cases for each legal enum, bounded production count, duplicate handling, invalid action rejection, and rationale length.
2. Use JSON Schema plus a browser-side normalization boundary; require all strategy fields, not an implicit default strategy.
3. Keep `purchasePriority` only as an internal deterministic execution queue derived from the model-selected `production` order. Do not expose it as the model’s primary API.
4. Keep the first action set intentionally small. Do not add per-unit waypoints or arbitrary coordinates yet.

### Task 1.3: Implement named tactical anchors

**Files:**
- Modify: `src/config.js`
- Modify: `src/sim/systems/commands.js`
- Modify: `src/sim/systems/formation.js`
- Modify: `src/sim/systems/movement.js`
- Test: `tools/commander-army-order-check.mjs`

**Steps:**
1. Define named deterministic anchors from existing real locations: inner turret, outer turret, mine, midpoint, enemy outer turret, enemy core, home.
2. Write a failing deterministic test for each legal army order proving the chosen team’s front and back line move to the correct named anchor.
3. Add team-level `armyOrder`/`armyTargetAnchor` state. Map it to existing formation/movement mechanics; do not create a parallel combat system.
4. Treat the model’s chosen anchor as intent. Invalid/unavailable anchors return a structured action result; do not substitute a different strategic target.

---

## Phase 2 — Build tactical observation, event ledger, and durable team memory

### Task 2.1: Build a stable spatial observation adapter

**Files:**
- Create: `src/commander/observation.js`
- Modify: `src/commander/runtime.js`
- Modify: `src/commander/context.js`
- Test: `tools/commander-observation-check.mjs`

**Observation should include:**
- own/enemy gold, spend, income/miner status, supply including queue reservations;
- production queue with remaining times and legality blockers;
- unit/structure counts, health buckets, and named-zone occupancy;
- own/enemy mine, turrets, outer defense, and core state;
- active engagements (named zones, relative strength, damage/losses since last decision);
- current plan, action results, remaining production intent, and replan trigger;
- visibility metadata so observations do not accidentally give a model omniscient enemy data unless Watch mode intentionally permits it.

**Steps:**
1. Write a fixed-world test with units/structures distributed across zones.
2. Assert only a bounded, JSON-safe observation reaches the companion.
3. Include no raw user text, browser-supplied strategy profile, or opponent profile.
4. Use deterministic zone labels rather than raw x/y for the initial model interface; preserve raw positions only in telemetry for later debugging.

### Task 2.2: Create an event ledger at simulation boundaries

**Files:**
- Create: `src/commander/events.js`
- Modify: `src/sim/systems/economy.js`
- Modify: `src/sim/systems/production.js`
- Modify: `src/sim/systems/combat.js`
- Modify: `src/sim/systems/supply.js`
- Modify: `src/sim/tick.js`
- Test: `tools/commander-events-check.mjs`

**Events:**
`plan-started`, `purchase-queued`, `purchase-blocked`, `unit-spawned`, `mine-income`, `enemy-contact`, `engagement-ended`, `unit-lost`, `structure-lost`, `core-damaged`, `plan-completed`.

**Steps:**
1. Write a failing event-order test over a seeded miniature match.
2. Append small structured events to a bounded per-team ring buffer owned by deterministic world state.
3. Use one event source at each existing simulation boundary; do not infer a second contradictory event stream from rendering.
4. Attach causal fields: match time, team, plan revision, action id when applicable, entity/anchor, and reason.

### Task 2.3: Build derived memory, not unconstrained model self-notes

**Files:**
- Create: `src/commander/memory.js`
- Modify: `src/commander/runtime.js`
- Test: `tools/commander-memory-check.mjs`

**Steps:**
1. Derive a compact team memory from recent ledger events: current doctrine, last plan/result, observed enemy tendency, unresolved blocker, and next review trigger.
2. Write a test proving memory is team-isolated, bounded, deterministic for a seed/trace, and resets correctly on rematch.
3. Do not send hidden model reasoning or unrestricted generated prose back into future prompts. Initially, memory is deterministic event compression; external reviewer profiles remain separately trusted/validated.

---

## Phase 3 — Replace blind polling with action-result orchestration

### Task 3.1: Apply a plan transactionally

**Files:**
- Modify: `src/commander/runtime.js`
- Modify: `src/commander/providers.js`
- Modify: `src/sim/ai/behavior.js`
- Test: `tools/commander-plan-lifecycle-check.mjs`

**Steps:**
1. Write failing tests showing one accepted plan creates a revision, strategy, production queue, army order, start time, end/horizon, and explicit status.
2. Reject an entire malformed action object; do not partially apply fields from it.
3. Record each accepted/rejected action in the ledger and return a structured action result to the next observation.
4. Preserve model-selected blocked production intent. A block should request replan according to `replanOn`; deterministic code must not buy a substitute.

### Task 3.2: Make replanning event-driven and latency-aware

**Files:**
- Modify: `src/main.js`
- Modify: `src/commander/runtime.js`
- Modify: `tools/lan-preview-server.mjs`
- Test: `tools/commander-orchestration-check.mjs`

**Steps:**
1. Write failing tests for: initial request, plan completion, plan block, first enemy contact, core damage, horizon expiry, stale response, finished match, and overlapping request prevention.
2. Send Red/Blue requests concurrently from the same coherent frame snapshot; maintain individual request IDs and observed match times.
3. Prevent a high Watch speed from silently applying a strategically obsolete response. Display `waiting for commander`/age rather than pretending the model is making real-time decisions.
4. Keep normal speed as the authoritative model-quality mode. Make acceleration an explicit “simulation fast-forward” mode with a documented latency caveat.

---

## Phase 4 — Make model behavior legible on screen

### Task 4.1: Add an inspectable Commander panel

**Files:**
- Modify: `src/render/ui.js`
- Modify: `src/render/renderer.js`
- Create: `src/render/commanderPanel.js`
- Test: `tools/commander-panel-check.mjs`
- Test: `tools/desktop-ux-check.mjs`
- Test: `tools/mobile-*.mjs` as required by existing release gate

**Panel per team:**
```text
Strategy: Pressure mine
Army order: Contest midpoint
Plan: Miner ×1 → Warrior ×2 → Archer ×1
Status: 1/4 queued | waiting for gold (100/110)
Last result: Enemy contact at midpoint; no losses
Next review: plan complete or enemy contact
Model latency / observation age
```

**Steps:**
1. Write a render-data test from a fixed world/ledger.
2. Add a compact toggleable Watch overlay; do not obstruct the battlefield or overload timeline rows.
3. Verify desktop and mobile layout with named bounds and no overlap against existing HUD controls.
4. Include a user-visible distinction between a model action, deterministic legality rejection, and a simulation outcome.

### Task 4.2: Create replayable decision traces

**Files:**
- Create: `src/commander/trace.js`
- Modify: `src/strategy/watchLeague.js`
- Modify: `tools/lan-preview-server.mjs`
- Test: `tools/commander-trace-check.mjs`

**Steps:**
1. Persist a compact per-match trace: observation digest, action, result, event deltas, latency, and seed.
2. Use size/record limits and redact any provider configuration/credentials.
3. Add a read-only companion route and History detail view only after trace storage tests pass.
4. A trace must be sufficient to answer “why did this team idle/attack/retreat?” without reconstructing it from logs.

---

## Phase 5 — Evaluate basic model capability before any learning

### Task 5.1: Build a fixed-seed evaluation runner

**Files:**
- Create: `tools/model-commander-evaluate.mjs`
- Create: `tools/fixtures/model-commander-scenarios.json`
- Test: `tools/model-commander-evaluate-check.mjs`

**Metrics:**
- legal action rate and invalid-action rate;
- blocked-plan rate and time blocked;
- idle-gold time;
- miner establishment and income continuity;
- army composition diversity;
- time to first contested zone, combat, structure damage, and core damage;
- match completion rate/time;
- request latency and response staleness;
- per-team symmetry/fairness under swapped colors and seed pairs.

**Steps:**
1. Write a fixture-driven failing test for deterministic metrics aggregation.
2. Run baseline scripted teams and the model teams separately; never compare raw wall-clock speed without latency metadata.
3. Save local reports outside git; render a concise human-readable summary for review.
4. Do not tune prompts/models until this report identifies a repeated failure class.

### Task 5.2: Establish the first acceptance gate

**Files:**
- Modify: `tools/release-gate.mjs` only after the evaluator is stable
- Create: `docs/model-commander-baseline.md`

**Gate:** pass only when a declared evaluation set meets agreed, modest thresholds for legal plans, economy, army movement, first contact, and core damage. Do not require every match to finish initially.

---

## Phase 6 — Offline, bounded Strategy League improvement (only after Phase 5)

### Task 6.1: Define profile revision proposals

**Files:**
- Modify: `src/strategy/leagueStore.js`
- Create: `src/strategy/profileRevision.js`
- Test: `tools/strategy-profile-revision-check.mjs`

**Steps:**
1. Limit a revision to structured doctrine fields and a bounded human-readable summary; prohibit arbitrary prompt/code injection.
2. A reviewer receives anonymized/fixed trace packets and proposes one Red or Blue change at a time.
3. Store provenance: source matches, baseline metrics, proposal, reviewer/provider id, and revision number.

### Task 6.2: Hold-out evaluation and promotion

**Files:**
- Create: `tools/strategy-profile-evaluate.mjs`
- Test: `tools/strategy-profile-evaluate-check.mjs`

**Steps:**
1. Split seeds into development and held-out suites.
2. Evaluate baseline and candidate profiles with the same model/config and paired colors.
3. Promote only if candidate improves predeclared metrics without violating legality/latency/trace-quality gates.
4. Never auto-promote during a live Watch match. Require explicit review/approval for the first real profile promotions.

---

## Implementation order and checkpoints

1. **Do not begin Phase 6.** First complete Phases 0–5 and prove basic model-directed gameplay.
2. Implement each task through RED → GREEN → refactor. Every new simulation rule needs a deterministic test; every user-visible behavior needs a browser check.
3. After each phase: run relevant focused checks, `node tools/headless.js`, `node tools/release-gate.mjs`, `git diff --check`, then a live LAN Watch review.
4. Commit only coherent verified phases; serve the committed worktree locally for review. No merge/push without user authorization.

## Risks and decisions requiring user input before implementation

1. **Information fairness — resolved:** Start the first model-versus-model prototype with full map vision for both teams. The observation schema must label `visionMode: "full"`; add team-limited vision only later as a separate, explicitly labeled mode so results are never conflated.
2. **Model scope:** Should a commander choose only macro doctrine/named army orders at first, or also choose a named target priority (enemy mine, outer turret, core)? Recommendation: include named targets, but no per-unit micro/coordinates in v1.
3. **Team identity:** Should Red and Blue begin with neutral identical profiles, or should we author deliberately different starting doctrines so emergent contrast is easier to observe? Recommendation: neutral mechanics with small explicit profile differences only after baseline evaluation.
4. **Human review point:** Before any offline profile revision is promoted, require Silas’s approval. Recommendation: yes for the first several iterations.

## Final verification checklist

- Real Local Gemma Watch match shows model action → visible movement/production/combat → model revision based on result.
- Companion receives only bounded state and trusted own-team profile/manual; no direct LM Studio LAN/browser access.
- No deterministic strategic substitutions in model mode.
- Fixed-seed evaluator produces reproducible baseline reports.
- Browser UI makes current plan, reason, result, and model latency legible.
- Tests include invalid inputs, blocked plans, stale requests, rematches, visibility boundaries, and trace limits.
- `node tools/headless.js`, focused commander checks, browser check, release gate, and `git diff --check` pass.

---

## Research review addendum — 2026-07-29

### What this review changes

The first draft has the right separation of authority and correctly preserves the explicit prototype decision `visionMode: "full"` for both teams. It under-specifies four prerequisites that are material to whether results can be called model-directed or repeatable:

1. **Current malformed-response handling is a strategic fallback, not merely validation.** `src/commander/providers.js` normalizes malformed or incomplete model output to `defend`/`recover`; `src/commander/runtime.js` then applies it. In model mode that is deterministic strategic behavior after model failure. Replace this with an explicit `rejected` action result that leaves the last accepted plan unchanged (or leaves the team in an explicit `awaiting-initial-plan` no-new-intent state). It must be shown in UI/trace and count against provider/action reliability. Do not covertly issue a defensive or purchase plan.
2. **The proposed counted production contract conflicts with the current deduplicated FIFO implementation.** Existing `purchasePriority` drops repeats, whereas the proposed `{ kind, count }` contract requires exact multiplicity. Define one canonical expanded immutable `productionIntent` at acceptance time, retain every repeated item, and consume only that list. The executor must never discard a permanently illegal item and continue to the next one without returning a structured `blocked` result and waiting for the model's chosen revision.
3. **A seed alone cannot replay an LLM match.** Deterministic simulation replay is necessary but insufficient because inference output, model build, prompt/manual/profile, scheduling, and response arrival order vary. Evaluation needs action-record/replay and full provenance before tuning or learning claims are permitted.
4. **The present action fields do not yet state which intent changes deterministic behavior.** `strategy` must be explanatory/contextual only unless it has a documented deterministic interpretation; `armyOrder` and a named `targetIntent` are the model-authoritative strategic controls. Do not let labels imply agency while automatic target selection secretly chooses the strategic object.

These revisions follow the caution in **LLM-PySC2** that broad action spaces, hallucinations, and multi-agent settings do not yield consistently correct decisions; they also follow **TextStarCraft II**'s explicit observation/action queue and multi-frame summarization, while rejecting an unbounded live-learning interpretation of **Voyager**. **SMAC** supports the fixed-scenario/benchmark discipline, not a claim that a small full-vision macro commander is comparable to its partially observable micro benchmark. **Generative Agents** supports observation/reflection/planning as an architectural pattern, but does not establish correctness, reproducibility, or RTS competence.

### Phase -1 — Lock the authority and replay contracts before baseline collection

### Task -1.1: Specify no-fallback failure semantics

**Objective:** Make model unavailability, malformed output, and stale output observable non-actions rather than deterministic substitute strategy.

**Files:**
- Create: `docs/model-commander-authority-contract.md`
- Modify: `src/commander/providers.js`
- Modify: `src/commander/runtime.js`
- Modify: `src/main.js`
- Test: `tools/commander-no-fallback-check.mjs`

**Steps:**
1. Write the authority table before code. Define `accepted`, `rejected-schema`, `rejected-provider`, `stale`, `blocked-legality`, `awaiting-initial-plan`, and `finished`; state the allowed transition, world mutation, UI wording, ledger record, and next-request condition for each.
2. Write failing cases proving invalid JSON, an output that omits a required field, a timeout, and a stale reply cannot call `setTeamCommand`, set a command default, create production intent, or advance an existing plan.
3. Replace default-producing parsing/normalization with a discriminated result, for example:
   ```js
   { ok: false, reason: 'rejected-schema', detail: 'missing armyOrder' }
   // or
   { ok: true, action: { strategy, production, armyOrder, targetIntent, horizonSeconds, replanOn, rationale } }
   ```
4. Preserve the last *accepted* intent while a revision request fails. For a match with no accepted initial plan, deterministic simulation continues rules already in motion but receives no new commander command or purchases; render `awaiting initial model plan`, not `defending`.
5. Run `node tools/commander-no-fallback-check.mjs`; expected: all malformed/provider cases report rejection with zero strategic world mutation.

### Task -1.2: Freeze the v1 command-to-rule mapping

**Objective:** Ensure every model-visible strategic field has a single explicit, inspectable effect without granting arbitrary coordinates or micro-control.

**Files:**
- Create: `docs/model-commander-action-semantics.md`
- Modify: `src/commander/actionContract.js`
- Modify: `src/commander/gameManual.js`
- Modify: `src/commander/runtime.js`
- Test: `tools/commander-action-semantics-check.mjs`

**Steps:**
1. Define named deterministic zones/anchors and their availability from actual map locations: `home`, `inner-turret`, `outer-turret`, `own-mine`, `midpoint`, `enemy-mine`, `enemy-outer-turret`, and `enemy-core`.
2. Add a required `targetIntent` enum (`hold-own-mine|contest-mid|pressure-enemy-mine|siege-enemy-outer|attack-enemy-core|retreat-home`) and document its mapping to exactly one legal anchor/formation policy. Keep combat target selection tactical and deterministic only after the model chose the strategic destination.
3. Define `strategy` as a bounded label plus review context, not an independent hidden rule selector. If it later needs mechanics, add a separate versioned proposal and test rather than infer behavior from prose.
4. Define `production` as an ordered array of `{ kind, count }`, with a small fixed maximum total count. Expand it once into an immutable repeated intent list at plan acceptance; never deduplicate it. Include exact queue capacity and legal-block semantics in the manual.
5. Prove every action enum maps to a real anchor, unavailable/maxed requests return `blocked-legality`, repeated production remains repeated, and no fallback anchor/production is selected.

### Task -1.3: Add action-record/replay provenance before live-model comparisons

**Objective:** Distinguish deterministic simulation replay from replay of a particular model decision trace.

**Files:**
- Create: `src/commander/replay.js`
- Create: `tools/commander-replay-check.mjs`
- Modify: `src/commander/trace.js`
- Modify: `tools/model-commander-baseline.mjs`
- Modify: `tools/model-commander-evaluate.mjs`

**Steps:**
1. Define a versioned trace envelope containing seed, tick rate, scenario id/version, `visionMode: "full"`, config/manual/action-schema/prompt/profile hashes, provider id, exact local model identifier, request id, observed simulation time, response arrival time, raw bounded response digest, validated action/result, and terminal reason.
2. Add a replay provider that returns recorded validated results at their recorded simulation-time boundary without calling LM Studio. It must reject an observation/manual/schema hash mismatch rather than silently replay against a changed game.
3. Write a fixed-seed test that records a scripted fixture trace, replays it twice, and asserts identical per-tick action application, event sequence, world terminal state, and metrics. Separately assert a changed config/schema prevents replay.
4. Separate reports into **live inference** (latency and nondeterminism included) and **action replay** (simulation determinism only). Never describe a seed as a complete replay of a live LLM match.

### Revised Phase 0 baseline requirements

Before measuring a model, add a **controller-disabled / no-intent** baseline and a **scripted legal-intent** baseline alongside the current Local Gemma run. This separates map balance and deterministic executor reachability from model capability. Each scenario must specify a terminal timeout and terminal classification (`core-destroyed`, `timeout-stalemate`, `timeout-active`, `provider-failure`, `invalid-action-exhausted`) so a non-finishing match is evidence, not an omitted result.

Use paired color/side swaps and paired seeds. Report distributions (median and spread), not a single favorable run. Hold the model name/build, manual hash, action schema, prompt, temperature, timeout, and scenario set fixed throughout one evaluation; any change begins a new experiment. The full-vision mode is a prototype condition, not an evaluation fairness claim.

### Revised Phase 3 orchestration requirements

Capture one immutable `(world identity, simulation time, per-team observation)` snapshot, then dispatch Red and Blue requests concurrently. Apply each result only if it carries its own snapshot identity and is still permitted by the action lifecycle. Do not wait for Red before constructing Blue's observation; serial requests create avoidable asymmetry. Record both wall-clock latency and simulation-time staleness. At accelerated Watch speed, freeze only new model intent while waiting; do not pause deterministic rules or fabricate an intervening strategic choice.

### Revised Phase 5 acceptance design

Add these measures to the stated metrics:

- `accepted-action rate`, `rejected-action rate`, provider-failure rate, and time spent awaiting a first/revision plan;
- exact-production-intent completion/blocked/revision rate (so FIFO starvation is visible);
- plan-to-observable-effect attribution: accepted action id → queue/movement/engagement/core-damage events;
- timeout classification, mutual-idle duration, and repeated-plan oscillation count;
- paired-side result and confidence interval or bootstrap interval where enough runs exist; and
- a small counterfactual suite: replay the same trace with one action field changed/removed to verify that a reported effect is not caused solely by deterministic combat or map balance.

The initial gate should require an auditable trace from accepted plan to visible action and at least one non-degenerate combat/core-damage outcome across the declared suite; it must not claim robust model-vs-model gameplay until completion, stalemate behavior, and failure rates are measured across held-out paired seeds. A browser smoke test that merely checks two queued units and `command === 'attack'` is insufficient and must be replaced by an event/trace-based assertion.

### Deferred-learning guardrail refinement

Phase 6 may consume only closed trace envelopes and never write profiles accessible to an active match. Candidate generation, development evaluation, held-out evaluation, and human promotion must use separate immutable directories/identifiers. A held-out seed, trace, or model/version used to select a candidate is permanently removed from its held-out set. The action replay evaluator is the required first test for a candidate; live-inference retesting is reported separately because it adds model-serving variability.
