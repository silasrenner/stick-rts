# PLAN.md — Stick RTS

Cross-session context carrier. Updated at the end of every session with
state, decisions, and the next session's entry point. See
`stick-rts-brief.md` for the full product brief this plan implements.

## Status

**S5 complete (AI).** One shared parameterized behavior tree
(`sim/ai/behavior.js`) drives Easy/Medium/Hard purely through data
(`sim/ai/difficulties.js`) — no per-difficulty code branches. The AI
calls the exact same `buyUnit`/`buyStructure`/`buyHero`/`setTeamCommand`
functions the player's build menu and hotkeys use (no parallel AI-only
economy path), and it's scouting-gated exactly like the player
(`sim/ai/vision.js`): it only "knows" enemy composition currently visible
to one of its own units, and difficulty is partly expressed through how
stale that intel is allowed to be before acting on it. The `4–0`/`i/o/p`
debug hotkeys that stood in for the AI since S2 are retired — the AI now
drives itself entirely; the underlying `window.__buyUnit` etc. debug
hooks stay exposed for testing. The win/lose overlay gained Easy/Medium/
Hard buttons next to Rematch, finally fulfilling the "offers rematch and
difficulty change" acceptance criterion deferred since S3.
`tools/headless.js` gained an additive `--batch` mode for AI-vs-AI trial
evaluation (the S3-era `PLAN.md` §2.5 promise), alongside the unchanged
default invariant-check mode.

**One real, load-bearing bug found and fixed during verification, not
just a tuning nit:** the first-draft difficulty parameters had Medium/
Hard's build cycle spend early gold on a 250g archer before establishing
enough mining income, which — combined with `minArmyToAttack` thresholds
of 3–4 — left armies growing far too slowly to ever clear the attack
threshold. Matches never engaged; all 5 initial AI-vs-AI batch trials hit
the tick budget "undecided." Traced via direct position/gold tracing
(not just outcome-watching) to confirm units genuinely weren't moving,
not just resolving slowly. Fixed by front-loading two miners in every
build cycle before any archer purchase, and lowering `minArmyToAttack` to
2 for Medium/Hard. Re-verified: Hard now reliably beats Easy in exactly
553.7s (fully deterministic — no RNG anywhere in the sim, confirmed by
grep), Medium beats Easy in 851.9s, and the result is symmetric
regardless of which team is "player" vs "enemy" in the pairing.

**Known limitation, flagged not fixed:** Hard vs. Medium AI-vs-AI can
reach a genuine mutual stalemate (didn't conclude even at a 2000s tick
budget) — two comparably-cautious, comparably-growing AIs can deny each
other the power advantage either one's `retreatThreshold` needs to commit
to a breakthrough. Not fixed now because it isn't the brief's actual stop
condition (player-vs-AI behavior, not symmetric AI-vs-AI), and a human
"who ignores composition" plays more like Easy's over-commit pattern than
like a mirror-matched cautious AI — but it's a real S6 balance-pass note
if AI-vs-AI evaluation becomes a bigger part of the workflow.

Verified precisely via direct sim-state inspection (single atomic
`javascript_exec` scripts per assertion — S4's lesson about cross-call
real-time drift applied from the start this session) plus one real click
through the win/lose UI: vision/memory populates only when an enemy is
actually within `AI_SIGHT_RANGE` of an AI unit and stays `null` otherwise
(confirmed both states explicitly); composition counter-picks react
correctly to scouted intel (warrior-heavy → archer counter-purchase) while
Easy ignores the identical intel; retreat discipline flips Hard to
`defend` against a scouted 5-warrior army while Easy keeps attacking
regardless (`retreatThreshold: 0`); hero purchase timing gated exactly at
each difficulty's threshold (Easy: no hero at 149s, buys at 151s; Hard:
no hero at 15s, has one by 25s); hero counter-pick chose Vanguard vs.
scouted archers and Hawkeye vs. scouted warriors; "defends mine
harassment" flips Hard from `attack` to `defend` the instant a threat
enters `defendMineThreshold` of home, confirmed against a clean before/
after with an otherwise-attack-eligible army; a real click on the win/
lose screen's "Hard" button changed `world.teams.ai.difficulty` and reset
the match end-to-end. Zero console errors throughout. Both
`tools/headless.js` modes re-confirmed passing after all fixes.

**Verification note:** hit the same ES-module browser-caching issue as
S3 (server correctly served fresh `renderer.js` per `curl`, but the
browser kept rendering stale content even across a brand-new tab — Chrome's
HTTP disk cache is shared browser-wide by URL, not per-tab, so a new tab
doesn't help). Fixed by restarting the static server on a new port
(8000→8010), which forces a fresh cache namespace. Worth remembering
directly for S6 rather than re-discovering: if edited source doesn't
appear to take effect despite a page reload, suspect disk cache before
suspecting the edit.

Files added: `sim/ai/vision.js`, `sim/ai/difficulties.js`,
`sim/ai/behavior.js`. Modified: `config.js` (+`AI_SIGHT_RANGE`),
`sim/world.js` (`createWorld` +`matchElapsedTime`/+`aiMemory`; each team
+`difficulty`/`decisionTimer`/`buildIndex`), `sim/tick.js`
(+`matchElapsedTime` accrual, +`updateAiDecisions` call), `render/ui.js`
(+difficulty buttons on win/lose overlay), `render/renderer.js` (legend
drops dead debug-key text, shows active AI difficulty), `main.js` (drops
ai-team keyboard hotkeys, `resetMatch(difficulty)`, defaults to
`'medium'`, wires difficulty-button clicks), `tools/headless.js`
(+`--batch` mode, default tick budget raised from 20000→60000 since
matches can run several minutes).

Repo checkpoint committed.

**Next entry point: S6 — Balance + polish.** Playtest-driven tuning pass
on `config.js` (informed by `tools/headless.js --batch` runs across
difficulty pairings — including a look at the Hard-vs-Medium stalemate
noted above), battlefield-length constant tuned within the 3–10
screen-width range (currently `WORLD_WIDTH`/`VIEWPORT_WIDTH` = 5×, inside
range but worth revisiting alongside match-pacing — full matches
currently run ~9–14 simulated minutes, which may be too slow for a
"playable" v1 feel), UI legibility pass, and a full bug scrub against the
brief's acceptance criteria checklist. Stop condition and full scope are
in §5.

---

## 1. Stack Decision

**Vanilla JavaScript (ES modules) + Canvas 2D. No framework, no bundler, no
runtime dependencies.**

Justification:

- The rendering need is narrow and specific: procedurally-animated
  line-segment stick figures, not sprite sheets or tilemaps. A general game
  engine (Phaser, PixiJS, Kaboom) brings a scene graph, asset pipeline, and
  physics opinions we'd either fight or leave unused — that cuts against the
  "minimal, inspectable tooling" constraint for a problem this contained.
- The brief requires a fixed-timestep sim decoupled from rendering as an
  explicit architectural constraint. That's a ~30-line accumulator loop to
  write directly; a library doesn't save meaningful effort here and adds a
  layer to reason through when debugging determinism or tick rate.
- Target load is ~40 animated units plus a handful of projectiles on one
  canvas — well within what unoptimized `CanvasRenderingContext2D` draw
  calls handle at 60fps. No need for WebGL batching or a retained scene
  graph.
- Zero build step: source is plain ES modules loaded via
  `<script type="module">`. Browsers block ES module imports from `file://`
  due to CORS, so local dev needs a trivial static file server — not a
  build step, just a dumb file server. Default: `python3 -m http.server`
  (present on effectively every laptop). Document an `npx serve` fallback
  in the README if Python isn't available.
- No TypeScript/bundler by default, to keep the "near-zero build step" bias
  intact. Optional, non-default fallback if the user wants lightweight type
  safety later: `// @ts-check` + JSDoc types, checked via `tsc --noEmit` —
  adds a lint step, not a build step. Not adopted unless requested.

---

## 2. Architecture

### 2.1 Sim / render separation

- `main.js` runs a `requestAnimationFrame` loop that drives rendering every
  frame and feeds a fixed-timestep accumulator that calls `sim.tick(dt)` at
  a constant 60Hz (`dt = 1000/60`ms), independent of display refresh rate.
  Zero, one, or multiple sim ticks can run per rendered frame.
- The sim layer (`/src/sim`) owns all authoritative game state — entity
  positions, HP, gold, targeting, AI decisions — and has zero references to
  canvas, DOM, or any browser-only global. This is a hard constraint, not
  just a nice-to-have: it's what makes the headless runner (2.6) possible,
  since the same sim modules must run unmodified under plain Node with no
  browser present.
- The render layer (`/src/render`) only *reads* sim state each animation
  frame and draws it; it never mutates sim state.
- Input (keyboard/mouse) is captured into a plain input-state object each
  frame; the sim consumes that state on its own tick rather than reacting
  to raw DOM events, so hero direct-control logic lives entirely in the sim
  layer like everything else.
- Not planned for v1, noted as a future option: interpolating render
  between the last two sim states using the accumulator's leftover
  fraction, to smooth visuals if 60Hz sim ever visibly stutters against
  variable display refresh rates. Skip unless S6 playtesting shows a need.

### 2.2 Entity model

Given the ~40-unit scale and the "minimal, inspectable" bias, a formal ECS
is unneeded complexity. Instead:

- Entities are plain JS objects created by factory functions
  (`createUnit(type, team, x, y)`, `createStructure(...)`, `createStatue(...)`,
  `createProjectile(...)`), stored in flat arrays inside one `world` state
  object (`world.units`, `world.structures`, `world.projectiles`, etc.).
- No class-per-unit-type inheritance. All unit types (Miner, Warrior,
  Archer, and the three heroes) share one object shape with a `kind`
  discriminator; behavior differences come from a per-kind stats table in
  `config.js` (cost, hp, damage, speed, range, attack cooldown, special
  cooldown, etc.), not from method overriding. Heroes are units with
  `isHero: true` plus a `special` handler keyed by hero id.
- Behavior lives in small, pure-ish system functions that iterate the
  relevant array each tick (`movement.js`, `combat.js`, `mining.js`,
  `supply.js`, `heroes.js`, `commands.js`, `projectiles.js`) rather than as
  methods on the entities themselves. Keeps state and logic separated and
  each system independently testable/inspectable.
- This is deliberately data-oriented-lite: flat arrays, data-driven stats,
  no deep hierarchies — enough structure for the scale in play without ECS
  machinery.

### 2.3 AI structure

- One shared, parameterized behavior tree (`ai/behavior.js`) per Resolved
  Design Decision #4 — all three difficulties run the same decision logic,
  differing only by a parameter set (`ai/difficulties.js`): decision-tick
  frequency, build-order table, retreat HP/army-ratio threshold, hero
  purchase timing, composition-counter weighting, and scouting frequency.
- The AI does not evaluate every sim tick — it runs a "decision tick" every
  N sim ticks, where N is itself a difficulty parameter (Easy decides
  slowly, Hard decides often). No resource cheating: the AI's gold and
  build queue obey the exact same economy rules as the player.
- **Vision parity (confirmed):** the AI is scouting-gated the same way the
  player is — it only "knows" enemy composition/position in areas it has
  recently sent units/scouts through (`ai/vision.js` — a lightweight
  per-difficulty vision pulse, not a full fog-of-war grid). Easy/Medium
  scout rarely or not at all and react to stale or no information; Hard
  scouts actively and reacts sharply, which is what makes "Hard actively
  scouts/counters composition" a real mechanical advantage rather than
  flavor text. The AI always has perfect knowledge of its *own* economy
  and army, same as a human player would of theirs.

### 2.4 Fog of war / on-screen-only information

- No separate fog-of-war data structure needed for the player side. The
  render layer only draws entities within the current camera viewport,
  full stop, for both teams. Off-screen sim state (fights, mining, enemy
  builds) keeps running normally — it's simply not drawn until scrolled
  into view. This alone satisfies "no enemy info leaks off-screen" without
  team-specific visibility logic.
- The one explicit exception in the brief — "your statue is under attack"
  — is a small standalone UI signal (`ui.js`) driven off statue damage
  events, independent of the camera-culling above.

### 2.5 Headless evaluation

- Because the sim layer has no browser dependency (2.1), a Node-runnable
  headless runner (`tools/headless.js`) can import the same sim modules
  directly and drive `sim.tick()` in a loop with no canvas/DOM at all.
  Two tiers of use:
  - **Invariant checks** (from S3 onward): scripted inputs run a match to
    completion and assert things like cap enforcement, gold never
    negative, and statue immunity while structures stand — fast regression
    checks without opening a browser.
  - **Gameplay/balance evaluation** (from S5 onward, once AI exists): run
    AI-vs-AI matches — same difficulty or mixed — for many trials and
    report outcome stats (winner, match length in ticks, gold-spent curve,
    unit-composition-over-time). This is the tool used during S5/S6 to
    answer "does Hard actually beat a no-composition player" and "is Easy
    actually beatable" without manual replay each time, and can be
    re-run any time gameplay needs evaluating.
- Output is plain console/JSON, no reporting framework — this is a CLI
  script, not a test suite with assertions-as-CI-gate (though nothing
  stops it being wired into one later if wanted).

### 2.6 Config-driven balance

- All tunable constants — unit costs/stats, structure cost/cap-bonus/max
  count, hero costs/kits/respawn cooldown and escalation, supply cap
  starting value, AI difficulty parameter sets, battlefield length — live
  in one file, `config.js`. No magic numbers scattered in system code.

---

## 3. File Layout

```
stick-rts/
  index.html
  PLAN.md
  stick-rts-brief.md
  src/
    main.js                 # bootstrap: canvas, input wiring, fixed-timestep loop
    config.js                # ALL balance constants (single source of truth)
    utils.js                 # small shared math/helpers
    sim/
      world.js               # world state container + entity factories
      loop.js                # fixed-timestep accumulator
      systems/
        movement.js
        combat.js             # melee resolution, targeting priority (structures before statue)
        projectiles.js        # arrow arc, damage falloff (optional)
        mining.js
        economy.js            # gold, build purchases
        supply.js             # cap math + structure-gates-statue enforcement
        heroes.js             # direct-control input -> hero state, specials
        commands.js           # global Attack/Defend/Retreat orders
      ai/
        behavior.js           # single shared parameterized behavior tree
        difficulties.js       # Easy/Medium/Hard parameter sets
        vision.js             # AI scouting/vision simulation (see 2.3)
    render/
      renderer.js             # draws current world state -> canvas each frame
      camera.js                # scroll/drag/edge-scroll, hero-follow snap, viewport culling
      stickFigure.js           # procedural skeleton + animation state machine
      ui.js                     # build menu, HP bars, gold counter, command indicator,
                                 # "statue under attack" signal, win/lose screen
    input/
      keyboard.js
      mouse.js
  tools/
    headless.js               # Node CLI: runs sim with no canvas/DOM (see 2.5) —
                               # invariant checks (S3+) and AI-vs-AI balance
                               # evaluation runs (S5+)
```

No `/assets` directory — no sprite sheets by design (procedural stick
figures only). `tools/headless.js` imports the same `src/sim/*` modules
the browser build uses — no duplicate sim logic to maintain.

---

## 4. Resolved / Open Questions

**Resolved in Session 0:**

1. **AI vision parity (2.3):** confirmed — AI is scouting-gated like the
   player. `ai/vision.js` is in scope.
2. **Headless evaluation (2.5):** confirmed — `tools/headless.js` is in
   scope, first landing in S3 (invariant checks) and extended in S5
   (AI-vs-AI balance evaluation runs), reusable any time gameplay needs
   evaluating.

**Still open, default stands unless flagged before S1:**

1. **Local dev server:** defaulting to `python3 -m http.server` as the
   "trivially-launched" method, since it needs no install on most laptops.
   Flag if you'd prefer an `npx serve`/Node-based default instead.

---

## 5. Session Breakdown (refined, with stop conditions)

Each session ends with a git commit at a stable checkpoint (`gh`/`git`, per
brief workflow rules) and a PLAN.md status update naming the next session's
entry point. No session proceeds past its stop condition without a human
gate.

### S1 — Engine skeleton
**Build:** `index.html` + `main.js` bootstrap; fixed-timestep accumulator
loop (60Hz sim, decoupled from `requestAnimationFrame`); canvas setup;
`stickFigure.js` procedural rendering with idle/walk states; one hardcoded
unit walking a fixed path, no AI, no combat.
**Stop condition:** Serve locally, load `index.html`, see one animated
stick figure walk smoothly across the canvas. Confirm sim tick count
accrues at a steady 60/sec independent of display refresh (log/verify).
Zero console errors. **Gate: review loop + animation architecture before
building systems on top of it.**

### S2 — Units + combat
**Build:** Miner/Warrior/Archer entities from `config.js` stats; targeting
and acquisition; melee resolution; projectile arc for Archer; death +
cleanup; global Attack/Defend/Retreat commands wired to a temporary debug
control (build menu doesn't exist yet).
**Stop condition:** Spawn small squads of each type on a test map, issue
each army command, observe warriors winning close-in fights against
archers and archers winning at range when protected (rock-paper-scissors
reads correctly). Units die and are removed cleanly; no console errors.

### S3 — Economy + match loop
**Build:** mining loop (walk/extract/deposit), gold counter, build menu UI,
supply structures with cap math + statue-gating enforcement, statues with
HP, win/lose detection, win/lose screen with rematch; `tools/headless.js`
v1 — scripted-input runner that drives a match to completion with no
canvas/DOM and asserts cap enforcement, gold-never-negative, and statue
immunity while structures stand.
**Stop condition:** Play one full match start-to-finish with no AI (manual
control or a dummy on both sides): mine gold, hit the unit cap, build a
supply structure to raise it, destroy enemy structures then the statue,
reach the win screen, rematch, confirm state resets cleanly. Confirm no
soft-lock at 0 gold / 0 miners. `node tools/headless.js` runs a scripted
match to completion and reports all invariants held, no browser involved.

### S4 — Heroes
**Build:** Forgemaster/Hawkeye/Vanguard stats + specials; purchase from
build menu; direct-control toggle (movement/attack/special keys, camera
snap on toggle); non-controlled hero follows current army command via
basic AI; death, cooldown, escalating re-purchase cost, switchable hero
choice on re-purchase.
**Stop condition:** For each hero — purchase, toggle direct control,
move/attack/special via keyboard, let it die, confirm cooldown + escalated
cost, re-purchase a different hero. Camera snaps correctly on toggle
in/out.

### S5 — AI
**Build:** shared parameterized behavior tree (2.3) — build order,
decision-tick frequency, retreat discipline, hero purchase timing,
composition-counter weighting, scouting/vision (`ai/vision.js`);
Easy/Medium/Hard parameter sets; extend `tools/headless.js` to run AI-vs-AI
matches (any difficulty pairing) for N trials and report winner, match
length, and gold-spent curve per trial.
**Stop condition:** Play one full match at each difficulty. Easy is
beatable with a simple attack-move approach. Hard beats a player who
ignores composition (spams one unit type) but remains beatable with
counters. Medium sits visibly between the two. Confirm via a gold log that
the AI never spends beyond what it has earned (no cheating). Confirm
`tools/headless.js` can run a batch of Hard-vs-Hard (or any pairing)
matches unattended and report results.

### S6 — Balance + polish
**Build:** constants tuning pass from playtesting (`config.js` only),
informed by `tools/headless.js` batch runs across difficulty pairings to
catch win-rate skew or degenerate strategies faster than manual replay;
battlefield-length constant tuned within the 3–10 screen-width range; UI
legibility pass (HP bars, command indicator, gold counter); full bug scrub
against the brief's acceptance criteria.
**Stop condition:** Walk every line of the brief's Acceptance Criteria
checklist and mark pass/fail — all must pass. Stress scenario with ~40
units on screen holds ~60fps on a typical laptop. Zero console errors
across one full match at each difficulty.

**Escalation gate carried from the brief:** if S5/S6 playtesting shows
parameter tuning alone can't make Hard feel threatening, stop and raise it
as a design decision (possible income multiplier) rather than silently
adding one.

---

## 6. Next Session Entry Point

Superseded by the **Status** section at the top of this file, which is
kept current at the end of every session — check there, not here.
