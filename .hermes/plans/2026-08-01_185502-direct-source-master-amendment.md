# Amendment — Direct Source-Master Visual Production

> This amendment supersedes the **generation-first ordering** of `2026-08-01_103015-benchmark-locked-image-generation-pipeline.md`. The owner directed that supplied benchmark images be used as the base images for production assets wherever technically suitable. Generation is now gap-filling only.

## Current plan stages

### Stage A — Source-master intake and lock

Purpose: preserve supplied originals, verify their identity, record intended direct use, and correct source naming before any crop/derivative work.

- [x] Open Frontier original registered as `open-frontier-master-v01`.
- [x] Sunmeadow landscape/terrain kit registered as `sunmeadow-landscape-kit-v01`.
- [x] Misnamed `bramblecrest-wardens.jpg` identified, renamed to `sunmeadow-league-assets.jpg`, and registered as `sunmeadow-assets-master-v01`.
- [x] Bramblecrest source master supplied and registered as `bramblecrest-assets-master-v01`.

### Stage B — Direct environment integration

Purpose: use the strongest supplied environment artwork directly before producing any substitute.

- [x] Produce native-aspect crop alternatives for the Open Frontier master.
- [x] Owner selects lane-balanced crop.
- [x] Integrate the original Open Frontier image into the live Canvas renderer without non-uniform stretching.
- [x] Verify via renderer contracts, simulation regression suite, and Chrome screenshot.
- [ ] Later: derive only genuinely needed environment extensions/layers from the Open Frontier and Sunmeadow landscape masters.

### Stage C — Sunmeadow direct-use asset intake **✓ SOURCE SELECTION COMPLETE**

- [x] Source-review crops and direct-use classifications created for Mine, Watchtower, Hearthhall, Sunspire, Miner, Warrior, Archer, and Sun Guard hero.
- [x] Owner approved the building source set and baseline role parent sources.
- [ ] Later, when scheduled: transparent extraction, ground anchors, missing animation/damage states, then TDD-backed renderer integration.

### Stage D — Bramblecrest source intake and matching asset intake **← CURRENT STAGE**

- [x] Actual Bramblecrest source master registered.
- [x] Building/unit/hero source-intake contact sheet and classifications created.
- [x] Lock the Bramblecrest Miner, Warrior, Archer, and Stag-Captain parent sources.
- [ ] Then defer cleanup/state work in the same way as Sunmeadow until the owner schedules production extraction.

### Stage E — Generation/edit gap filling

Only after direct source extraction identifies a real gap. Examples: damage/destroyed states, transparent animation poses, required missing hero state, or a necessary wide map extension. Every derivative must use its matching approved source master as the parent image and be owner-approved before integration.

### Stage F — Two-faction playable visual vertical slice

Integrate approved environment, Sunmeadow, and Bramblecrest assets into the existing deterministic game. Validate normal play, 100-unit stress, min/max zoom, and faction base views in browser before broader production.
