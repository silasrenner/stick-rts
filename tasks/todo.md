# S7 — Formation System + Combat

Full plan/context: see PLAN.md §5's S7 block. Scope: formation/slot system
(source doc items 1–5 + vertical depth item 8), targeting priority near
the enemy base with a retarget rule (item 6), archer speed tune.

## 1. Config constants — DONE
- [x] `config.js`: `DEFEND_SCREEN_OFFSET`, `FORMATION_SLOT_SPACING_X/Y`,
      `FORMATION_SLOTS_PER_RANK`, `FORMATION_Y_BAND`,
      `ARCHER_COHESION_DISTANCE`; `UNIT_STATS.archer.speed` 70→80

## 2. Formation slot assignment — DONE
- [x] New `sim/systems/formation.js`: deterministic per-unit `(slotX,
      slotY)`, ranked by kind (front/back line), filed by `unit.id`
      ascending — no RNG, no spawn/iteration-order dependence
- [x] Multi-column growth: front line overflow extends toward the enemy
      under Defend, toward home (trailing) under Attack
- [x] Found + fixed a real bug: first-draft back-line (archer) overflow
      used the same growth direction/step as the front line, offset by a
      constant — algebraically guaranteed to collide once either line
      exceeds one rank. Fixed by anchoring the back line beyond the front
      line's entire current span (recomputed live every tick) and always
      growing further away — collision-free for any column count.
      Reproduced the bug live before fixing, re-verified zero collisions
      after, in both Defend and Attack modes.
- [x] Wired into `tick.js` before `updateMovement`

## 3. Movement — DONE
- [x] `movement.js`: defend/attack `desiredX`/`desiredY` sourced from
      formation slots instead of the shared `homeX`/`enemyHomeX` scalar;
      retreat unchanged (no formation — just go home); 2D-normalized
      movement toward formation targets (combat approach stays 1D)
- [x] Archer cohesion: holds (re-checked every tick, not latched) when no
      living warrior is within `ARCHER_COHESION_DISTANCE`, including
      zero-warrior; resumes the instant a warrior exists

## 4. Targeting priority + retarget — DONE
- [x] `supply.js`: `findAttackTarget` now prefers living combat units
      over miners over structures over statue (statue-gating unchanged);
      new `targetPriorityTier`, `findPriorityUnitWithin`
- [x] `combat.js`: retarget-on-threat check, every tick, skipped once
      already on a top-priority target (perf)

## 5. Verification — DONE
- [x] `node tools/headless.js` (default invariant mode): byte-identical
      to pre-S7 baseline via `git stash` comparison, still passes
- [x] `node tools/headless.js --batch` across H-vs-H, M-vs-H, E-vs-E,
      E-vs-M, E-vs-H: logged as findings for S8/S9, not tuned this
      session (H-vs-H asymmetry changed but didn't resolve; M-vs-H
      stalemate no longer stalemates; E-vs-E/M-vs-M mirror stalemates
      resolved; E-vs-M winner flipped; E-vs-H nearly unchanged)
- [x] Live via `claude-in-chrome` (fresh server port, per S3/S5's
      disk-cache lesson): 16-unit Defend army screenshotted into 4
      distinct non-overlapping columns; multi-column direction confirmed
      both lines; archer cohesion hold/resume confirmed; retarget rule
      confirmed (structure damage paused mid-switch); priority
      sub-ordering confirmed (farther combat unit over nearer miner);
      statue-gating re-confirmed unaffected; zero console errors on a
      fresh load
- [x] Confirmed zero `Math.random` anywhere in `src/`/`tools/` (repo-wide
      grep) — determinism preserved

## Final
- [x] `node tools/headless.js` (default mode) passes after all changes
- [ ] Commit — pending explicit user request
