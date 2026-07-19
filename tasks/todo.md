# S8 — Scale + Economy

Full plan/context: see PLAN.md §5's S8 block. Scope: camera zoom, cap/
supply rework + 100-unit stress test, structure cost doubling, production
queue (build times for all purchases), army readout HUD, AI re-tuning for
queue-based pacing, full 6-pairing re-baseline.

## 1. Config constants — DONE
- [x] `CAMERA_ZOOM: 0.7`, `BASE_UNIT_CAP: 15`, `STRUCTURE_CAP_BONUS: 13`
      (cap maxes at 80), `STRUCTURE_COST: 300`, build-time constants
      (`MINER_BUILD_TIME: 5`, `WARRIOR_BUILD_TIME: 10`,
      `ARCHER_BUILD_TIME: 12`, `STRUCTURE_BUILD_TIME: 20`,
      `HERO_BUILD_TIME: 30`)

## 2. Production queue — DONE
- [x] `world.teams[team].productionQueue` (FIFO array)
- [x] New `sim/systems/production.js`: only the head item's timer ticks;
      materializes the entity when it elapses
- [x] `economy.js`'s `buyUnit`/`buyHero`/`buyStructure` split into
      validate+deduct+enqueue vs. materialize-later; unchanged return
      shape/signatures so the AI needed zero call-site changes
- [x] Found + fixed a correctness gap, not just a design nuance: enqueue-
      time cap/maxStructures/hero-uniqueness checks needed to count
      already-queued-but-not-materialized items too, or rapid-fire
      purchases could queue far past the real cap before any of them
      completed. New `countQueued`/`hasLivingOrQueuedHero`. Stress-tested
      with 30 rapid-fire attempts against cap 15 — exactly 15 succeeded,
      verified never exceeded through full materialization.
- [x] Hero respawn cooldown (30s) confirmed independent of hero build
      time (30s) — a second hero purchased right when cooldown clears
      materializes ~30.02s later, not ~60s stacked
- [x] Wired into `tick.js`

## 3. Camera zoom — DONE
- [x] `CONFIG.CAMERA_ZOOM` render-time scale in `renderer.js`; sim stays
      in unscaled world px
- [x] `camera.js`'s clamp bound and hero-follow centering switched from
      raw `VIEWPORT_WIDTH` to `VIEWPORT_WIDTH/ZOOM`; `renderer.js`'s
      cull-visibility check likewise — both verified numerically and
      visually (a unit beyond the old viewport width rendered correctly
      instead of being wrongly culled)

## 4. Army readout HUD + queue UI — DONE
- [x] `ui.js`: own-team-only per-kind living-unit counts; active-build
      progress + queued-items display in the same HUD panel
- [x] `getBuildButtonDisabledReason` updated to the same queue-aware
      cap/maxStructures/heroAlive precedence as `economy.js`, so the
      persistent label never disagrees with a real click

## 5. Stress-spawn to 100 units — DONE
- [x] `main.js`'s `spawnStressTest`: 50-per-side/100 total
- [x] Found + fixed a real interaction bug with S7: the old `homeX`/
      `enemyHomeX` pinning trick silently stopped holding units still,
      because S7's formation system overrides positioning regardless of
      those fields. New `unit.formationExempt` flag (checked in
      `formation.js`'s eligible filter) restores the pin, robust against
      a later `setTeamCommand` call

## 6. AI re-tuning for queue pacing — DONE
- [x] Trimmed every difficulty's build cycle from two front-loaded
      miners to one — first combat unit arrives ~5s sooner
- [x] Found + fixed a real difficulty-hierarchy violation, not just slow
      pacing: unchanged S5-era parameters let Easy's single-warrior rush
      (`minArmyToAttack: 1`) permanently zero out Hard's economy (killed
      miners faster than gold could replace them, and gold has no
      passive income independent of living miners) — Easy was beating
      Hard outright in headless testing. Fixed with an economic-survival
      floor (`pickPurchase`: zero living miners → next purchase is
      always a miner) plus a Hard-specific warrior-first build cycle
      (Hard's `defendMineThreshold: 400` already marks proactive mine
      defense as its identity). Verified the fix progression step by
      step, not just the final state.
- [x] Raised `tools/headless.js --batch`'s default `--ticks` 60000→180000
      — the production queue roughly triples match length; the old
      default was cutting off matches that resolve cleanly and
      misreporting them "undecided"

## 7. Full re-baseline — DONE
- [x] All 6 pairings, 2 trials each (deterministic — extra trials add no
      information), at the new 180000-tick default: clean Hard > Medium
      > Easy hierarchy, zero stalemates or reversals, including the
      S5-documented Medium-vs-Hard stalemate no longer occurring.
      Recorded in PLAN.md Status — not claimed as fully balanced, only
      as evidence-based; `decisionInterval`/`heroPurchaseDelay`/
      `retreatThreshold` untouched this session

## 8. Live verification — DONE
- [x] Purchase → queue → materialize via both `window.__buyUnit` and a
      real dispatched click on the build-menu button
- [x] Sequential queue ordering (second item frozen while first active)
- [x] Production-queue HUD text confirmed via `ctx.fillText`
      interception — screenshot timing kept losing the race against
      real background ticking between tool calls; worth remembering for
      future queue-timing tests
- [x] 100-unit stress spawn: 76-87fps, zero unit loss, zero console
      errors
- [x] Army readout HUD confirmed own-team-only by code inspection (no
      path reads the enemy team)
- [x] Zero console errors on every fresh page load

## Final
- [x] `node tools/headless.js` (default invariant mode) passes
- [ ] Commit — pending explicit user request
