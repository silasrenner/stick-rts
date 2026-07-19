# Stick RTS — v2 Feature Updates

Extends the completed v1 (see `stick-rts-brief.md` + PLAN.md Status). This is
input to a planning session — refine into PLAN.md sessions with stop
conditions before writing code.

**Pre-work:** commit the outstanding S6 checkpoint first, so v2 diffs against
a clean v1 tag.

## A. Formation & Combat Feel

1. **Mine screening (Defend):** under Defend, combat units position between
   the mine/base zone and the enemy side — not just "near statue." Per-kind
   depth offset: warriors form the outer line, archers behind them.
2. **Unit separation:** units in groups must be visually and spatially
   distinct — no more stacked blobs. Preferred approach: deterministic
   slot-based formations (rank by kind, file by index); units path to their
   slot rather than a shared point. No RNG — sim determinism must be
   preserved for headless verification.
3. **Multi-column growth:** when a guard line's slots are full, a second
   column forms in front of the existing line. Battles should read as ranks,
   not piles.
4. **Archer cohesion (Defend):** archers do not advance/hold apart from their
   escort. If the nearest friendly warrior is farther than a (configurable)
   cohesion distance, archers wait until warriors close up before moving
   forward. Intent: escorted advances, midfield skirmishes, more micro play.
   Edge case: with zero living warriors, archers hold position (do not
   freeze permanently, do not advance alone).
5. **Archer speed:** slightly faster than current — still slower than
   warriors, but close the gap a bit. Tune constant, then re-baseline.
6. **Targeting priority near enemy base:** attackers in range of the enemy
   base prioritize living defenders over structures — enemy warriors/archers
   (and hero) first, then miners, then supply structures, then the statue.
   Statue-gating is unchanged (statue still immune while structures stand);
   this only reorders what dies before the structures. Include a
   retarget rule: a unit attacking a structure switches to a combat unit
   that enters its acquire range. Note: this changes deterministic combat
   resolution — it may alter or fix the documented H-vs-H asymmetry, so
   re-check that finding after this lands.

## B. Scale — Bigger Battles

7. **Zoom out** the default view so more of the battle is visible at once.
8. **More vertical depth** to the lane (wider y-band) so formations spread
   into ranks and files rather than a single row.
9. **Higher unit cap.** Raise the max army size (new target TBD in planning
   — e.g. 60–80). Requires: re-deriving supply-structure math (base cap +
   bonus per structure + max structures), and re-verifying frame rate at the
   new ceiling. **Stress-test target: 100 units @ 60fps** (replaces the v1
   "~40 units" criterion) — the stress tool should spawn 100 regardless of
   the final cap, so the engine has proven headroom above it.

## C. Economy & Production

10. **Structure cost doubled:** supply structures cost 2× current
    (150 → 300 gold). Cap bonus unchanged unless the planning-session supply
    rework (item 9) changes it. Note the intended side effect: turtling
    behind statue-gating structures gets twice as expensive.
11. **Build times for all purchases** (new mechanic — nothing is instant
    anymore):
    - Miner 5s · Warrior 10s · Archer 12s · Structure 20s · Hero 30s
    - Default production model (adjust in planning if needed): one
      sequential production queue per team; purchases enter the queue and
      complete in order; gold is deducted at queue time; hero re-purchase
      cooldown runs independently of (not stacked on top of) the 30s build
      time.
    - The AI must respect identical queue rules (no instant AI builds), and
      its build-order/difficulty parameters will need re-tuning — build
      times change opening pacing more than any other item in this brief.
    - All durations in `config.js`.
12. **Army readout HUD:** persistent on-screen count of the player's own
    units by type (e.g. "24 miners · 12 warriors · 5 archers"), doubling as
    the production display — active build with progress plus queued items.
    **Own team only** — showing enemy counts would leak exactly the
    off-screen intel the camera-limited-information rule forbids.

## D. Visuals

13. **Parallax background:** simple procedural line-drawn scenery (horizon,
    mountains, trees, bushes) at 2–3 parallax depths to convey motion as the
    camera scrolls. Render layer only; no assets; no sim impact.

## E. Menus & Spectator Mode

14. **Landing page:** on load → menu with **Play** (→ difficulty select →
    match), **Watch AI** (two Hard AIs play each other, player input/build
    UI suppressed, free camera), and **Settings** (scope explicitly in
    planning; candidates: FPS overlay toggle, default difficulty, game
    speed). Extends the existing `matchState` machine.
15. **Watch AI prerequisites (pull into scope):**
    - The sim is zero-RNG deterministic, so Hard-vs-Hard currently plays an
      *identical* match every time — and PLAN.md documents the right-side
      slot winning 5/5 at exactly 545.1s via an unexplained
      positional/iteration-order asymmetry. Spectator mode makes both
      user-visible. Root-cause the asymmetry.
    - Add a **seeded PRNG** (seed shown/selectable) as the variation source:
      different seeds → different matches; same seed → exact reproduction.
      Headless invariant/batch tooling must accept a fixed seed to stay
      reproducible.

## Engineering Constraints (carry-over, non-negotiable)

- Determinism preserved: any randomness flows only through the seeded PRNG.
- All new tunables (formation spacing/depths, cohesion distance, zoom,
  vertical band, cap/supply math, parallax depths) live in `config.js`.
- Sim/render separation intact: formations/cohesion are sim; parallax and
  zoom are render/camera; menus are UI state.
- Balance baselines in PLAN.md are invalidated by A/B changes — re-run
  `--batch` across all difficulty pairings after the tuning settles and
  record new numbers (including whether the M-vs-H stalemate survives).

## Answers to PLAN.md §4 Open Questions (v2 gate, 2026-07-19)

Owner responses to the planning session's open questions #2–#7. These are
decisions — update §4 to "resolved" and proceed accordingly.

- **#2 (1D vs 2D combat):** Confirmed — keep combat range/acquisition
  checks 1D (x-only); `y` is formation state only. The diagonal-arrow
  cosmetic side effect is accepted.
- **#3 (Multi-column direction):** Confirmed — new columns form *toward
  the enemy*; the line thickens outward.
- **#4 (Cap/supply split):** Confirmed — `BASE_UNIT_CAP` 15,
  `STRUCTURE_CAP_BONUS` 13, `MAX_STRUCTURES` 5 → cap 80, under the
  100-unit stress target.
- **#5 (Zoom):** Confirmed — single `CONFIG.CAMERA_ZOOM` render-time
  scale multiplier; sim stays in unscaled world px.
- **#6 (Settings scope):** Confirmed — FPS-overlay toggle +
  default-difficulty only. Game speed stays deferred; note it in PLAN.md
  as the designated v3 settings candidate (a fast-forward is most wanted
  in Watch AI mode, where matches run many minutes).
- **#7 (PRNG application scope):** Default adjusted — landing plumbing
  alone is not enough, because with zero variation points every seed
  produces the identical Watch AI match and the feature is inert. Wire
  **exactly one** minimal variation point in S9: a small seed-derived
  jitter (±10–15%) on AI decision intervals. Keep it small enough to need
  no dedicated balance pass; verify same-seed reproducibility still holds
  byte-for-byte and different seeds actually diverge. No other gameplay
  randomization in v2.

## Suggested Session Grouping (refine in planning)

- **S7 — Formation system + combat:** items 1–6 + vertical depth (8), since
  ranks need the y-band; targeting priority (6) goes here because it lives
  in the same combat/targeting code the formation work touches. Interim
  baseline re-run at session end; note whether the H-vs-H asymmetry
  changed.
- **S8 — Scale + economy:** zoom (7), cap/supply rework + 100-unit stress
  test (9), structure cost (10), build times + production queue (11), army
  readout HUD (12) since it displays the queue. The heavy balance session —
  AI difficulty parameters re-tuned for queue-based pacing, then the full
  `--batch` re-baseline happens here, after all economy changes have
  landed.
- **S9 — Visuals + menus + Watch AI:** parallax (13), landing page/settings
  (14), Watch AI incl. the H-vs-H asymmetry root-cause and seeded PRNG
  (15). Last, because Watch AI has the real unknowns and benefits from the
  balance work being finished.
