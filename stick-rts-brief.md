# Project Brief: Stick RTS (working title)

A 2D side-scrolling real-time strategy game inspired by classic Stick War, playable locally in a browser against AI. This brief is the input to a planning session — do not write code until a PLAN.md has been produced and reviewed.

## Summary

Two nations face off on a horizontal battlefield with a statue at each end. The player mines gold, builds units, and destroys the enemy statue before the AI destroys theirs. v1 ships with 3 basic unit classes, 3 controllable hero units, and 3 AI difficulty levels. Single player only.

## Goals (v1)

1. A complete, winnable/losable match loop: build → fight → statue destroyed → win/lose screen → rematch.
2. Three basic units with distinct roles and readable rock-paper-scissors dynamics.
3. Hero system: one high-cost hero per player, directly controllable via keyboard.
4. Three AI difficulties that feel meaningfully different, achieved through behavior parameters (no resource cheating).
5. Animated stick figures with distinct walk / attack / mine / death animations.
6. Runs locally on a laptop with no server dependency.

## Tech Stack

Claude Code proposes the stack in the planning session with a short justification. Constraints:

- Must run locally in a browser (or as a trivially-launched local app) on a laptop.
- Bias toward minimal, inspectable tooling. No heavy frameworks. Prefer zero or near-zero build steps.
- Vanilla JS + Canvas 2D is the default assumption; propose an alternative only if there's a concrete reason.
- Fixed-timestep simulation (60Hz) decoupled from rendering.

## Game Design Spec

### Battlefield

- Single horizontal lane with a scrolling camera (edge-scroll and/or drag; camera snaps to hero while in direct control).
- **Limited intelligence**: the player only sees what's on screen. No minimap enemy markers, no alerts about enemy army composition or movement. Scouting means physically pushing units (or your hero) toward the enemy side. Off-screen friendly units still fight; a minimal "your statue is under attack" warning is the only allowed off-screen signal.
- Player statue on left, AI statue on right. Statues have large HP pools and are the win condition.
- One gold mine near each base with a fixed number of mining slots (e.g., 4).

### Economy

- Miners walk to the mine, extract gold over time, and deposit at the statue/base.
- Gold is the only resource. Starting gold and unit costs are tunable constants in one config file.

### Basic Units (all costs/stats are starting points, tune during balance session)

| Unit | Role | Cost | Notes |
|---|---|---|---|
| Miner | Economy | 100 | No attack; flees when threatened |
| Warrior | Melee | 125 | Fast, cheap, swarms; weak individually |
| Archer | Ranged | 250 | Projectile arc, damage falloff optional; fragile in melee |

- Intended dynamic: warriors beat archers in close, archers shred warriors at range if protected, miners win the long game.

### Supply Structures (StarCraft-style population cap)

- Each player starts with a base unit cap (starting point: 10, counting all units incl. miners; hero exempt).
- A **supply structure** (e.g., a camp/banner — visual TBD) is purchasable from the build menu (starting point: 150 gold, +6 cap each, max 5 built → 40 cap ceiling, matching the performance target).
- No placement UI in v1: structures auto-place at fixed slots arrayed in front of the owner's statue.
- **Structures gate the statue**: the statue cannot take damage while any of its owner's supply structures still stand. Attackers must destroy all supply structures first, giving them a dual role — economy expansion and defensive shield. A player who builds zero structures has a low cap and an exposed statue.
- When a structure is destroyed, the cap drops but existing units over cap survive — the player just can't build new units until back under cap (StarCraft rule).
- The AI buys and defends supply structures per its difficulty parameters.

### Army Commands

- Global orders apply to all combat units: **Attack** (push right), **Defend** (hold near statue), **Retreat/Garrison** (fall back to base). Stick War-style — no per-unit selection in v1.

### Hero Units

- One hero alive per player at a time. High cost (starting point: 600 gold). Player picks which hero to deploy at purchase time — all three are always available in the build menu.
- When the player's hero is alive, the player may toggle into **direct control**: arrow keys/WASD to move, key to attack, key to use special. When not controlled, the hero follows the current army command with basic AI.
- On death: hero can be re-purchased after a cooldown (starting point: 30s) at escalating cost (+50% per death). Tunable.
- Hero choice is **switchable on each re-purchase** — losing your Vanguard doesn't lock you out of pivoting to Hawkeye.
- The three heroes:

| Hero | Archetype | Kit (starting point) |
|---|---|---|
| Forgemaster | Economy + support | Mines at 3x miner rate; passive aura buffs nearby allies (+15% attack speed); weak self-defense knockback |
| Hawkeye | Amped archer | Long range, high damage, piercing shot special on cooldown |
| Vanguard | Amped warrior | High HP, cleave attack hitting multiple enemies, short charge/gap-close special |

- The AI also uses heroes (which one it picks and how well it uses it varies by difficulty).

### AI Opponent — 3 Difficulties

Difficulty comes from behavior parameters, not resource cheating. Suggested parameter axes: decision-tick frequency, build order quality, composition-counter awareness, retreat discipline, hero purchase timing and usage.

- **Easy**: slow decisions, fixed naive build order, over-commits attacks, buys hero late and doesn't micro it.
- **Medium**: balanced economy/army ratio, reacts to player composition with counters, retreats losing fights sometimes.
- **Hard**: tight opening build order, actively scouts/counters composition, times pushes with hero availability, defends mine harassment.

If parameter tuning alone can't make Hard feel threatening, flag it at a human gate before adding any income multiplier — that's a design decision, not an implementation detail.

### Visuals

- Procedurally animated stick figures (line-segment skeleton: torso, head circle, 2 arms, 2 legs). No sprite sheets.
- Required animation states: idle, walk, attack (per weapon type), mine, death. Simple keyframe or sinusoidal joint animation is fine — readable > realistic.
- Team color accent (e.g., headband/weapon tint). Simple parallax background is a stretch goal.
- Health bars above units, gold counter, build menu with costs and cooldowns, current army command indicator.

## Acceptance Criteria (v1 done means)

- [x] Can win and lose a full match at each difficulty; win/lose screen offers rematch and difficulty change
- [x] All 3 basic units purchasable, animated, and functionally distinct
- [x] All 3 heroes purchasable, directly controllable, with working specials; re-purchase rules enforced
- [x] Toggling hero control in/out works cleanly; hero behaves sensibly when not controlled
- [x] Easy is beatable by a first-time player; Hard beats a player who ignores composition
- [x] Scrolling camera works smoothly; no enemy information leaks from off-screen (composition, positions, build activity)
- [x] Supply structures purchasable, raise the cap correctly, and gate the statue (statue immune while any structure stands); over-cap StarCraft behavior on destruction; build menu blocks unit purchases at cap with clear feedback
- [x] Stable 60fps on a typical laptop with ~40 units on screen
- [x] All balance constants (costs, HP, damage, speeds, AI parameters) live in one config module
- [x] No console errors during a full match; game state cannot soft-lock (e.g., zero gold + zero miners still allows loss to play out)

All 10 verified in S6 — see PLAN.md Status for the evidence behind each.

## Workflow Requirements

Follow the standard bounded-session process:

1. **Session 0 (planning, no code)**: Produce PLAN.md — stack decision + justification, architecture (sim/render separation, entity model, AI structure), file layout, and the session breakdown below refined with explicit stop conditions per session. Human gate before any code.
2. PLAN.md is the cross-session context carrier — keep it updated at the end of every session with state, decisions, and next-session entry point.
3. Bounded sessions with explicit stop conditions. Stop at the gate even if momentum is good.
4. Git via `gh` CLI, commit at each stable checkpoint.

Suggested session breakdown (refine in Session 0):

- **S1**: Engine skeleton — game loop (fixed timestep), canvas rendering, stick-figure animation system, one walking unit.
- **S2**: Units + combat — all 3 basic units, targeting, projectiles, damage, death, army commands.
- **S3**: Economy + match loop — mining, gold, build menu, supply structures + cap enforcement, statues, win/lose, rematch.
- **S4**: Heroes — all 3 kits, direct-control toggle, respawn rules.
- **S5**: AI — behavior framework + 3 difficulty parameter sets.
- **S6**: Balance + polish — playtest-driven tuning, UI cleanup, bug scrub against acceptance criteria.

## Resolved Design Decisions

1. **Camera**: scrolling camera with camera-limited intelligence — no enemy info until you physically scout. (Owner decision)
2. **Hero choice**: switchable on each re-purchase. (Owner decision)
3. **Population cap**: purchasable supply structures, StarCraft-style — see Supply Structures section. (Owner decision)
4. **AI structure**: one parameterized behavior tree for all three difficulties in v1; per-difficulty personalities parked for v2. (Owner decision)
5. **Targeting priority**: supply structures gate the statue — attackers must clear all structures before the statue is damageable, so units in range of an enemy base target structures first, then the statue. (Owner decision)
6. **Battlefield length**: viewport shows roughly 10–30% of the total battlefield (i.e., ~3–10 screen-widths). Exact value is a config constant, tuned in the S6 playtest. (Owner decision)
