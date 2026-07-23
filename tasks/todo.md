# S11 — HUD & build-UI redesign (ephemeral scratch, delete at session close)

- [x] Diagnose: reproduce worst-case HUD state live, screenshot, confirm root cause
- [x] Plan approved
- [ ] config.js: add S11 layout constants section
- [ ] ui.js: drawUnitGlyph helper (reuse drawStickFigure at glyph scale)
- [ ] ui.js: structure icon helper (self-contained, no health bar)
- [ ] ui.js: rewrite drawHUD -> bounded-width top strip (gold/units/command row + army glyph row + inline statue tag)
- [ ] ui.js: groupQueueChips helper (consecutive-run grouping + "+N more" overflow)
- [ ] ui.js: rewrite drawBuildMenu -> bottom bar (queue-chip row above build-button row, icons, progress bar on active button)
- [ ] renderer.js: update call sites if functions renamed
- [ ] parallax.js: live-audit at CAMERA_ZOOM_MIN, fix if confirmed broken (zoom-scale wrap), close item either way
- [ ] Verify: 80 units + full queue + hero + statue warning @ min/max/default zoom, nothing overflows/truncates/overlaps
- [ ] Verify: +N more chip overflow path triggered and renders bounded
- [ ] Verify: every build-button state walked live (enabled + each disabled reason + active progress)
- [ ] Verify: Watch AI still hides build bar
- [ ] Verify: parallax fix (or non-issue) confirmed at min zoom
- [ ] Verify: node tools/headless.js passes
- [ ] Verify: zero console errors
- [ ] Commit, record hash in PLAN.md Status
