# Stick RTS — Benchmark-Fidelity Visual Rehaul Plan

> **For Hermes:** This supersedes `2026-08-01_100532-visual-proof-v0.md`. Do not extend the rejected procedural V0. Implement only after the owner approves this plan and an asset-production path exists.

**Goal:** Rebuild Stick RTS so the playable game visually matches the supplied Open Frontier, Sunmeadow League, and Bramblecrest Wardens benchmarks **and** the existing Creative Direction Primer: a polished pixel-art fantasy RTS with lush scenic depth, substantial faction architecture, and character/structure art—not a Canvas line-art game with similar colors.

**Architecture:** Keep the deterministic simulation untouched, but replace procedural world art as the visual source of truth. Canvas becomes a compositor for authored raster assets: layered scenery plates, faction-specific building sprites, unit sprite sheets, effects, and UI panels. The supplied benchmark images are the fixed visual quality/composition target; the primer supplies the world, faction, gameplay, and readability constraints. All production assets must be original/appropriately licensed outputs, not cropped or traced copies of third-party art.

**Tech Stack:** Existing Vanilla JS + Canvas 2D renderer; PNG/WebP art assets and sprite sheets; image-editor/export pipeline; optional approved image-generation or commissioned-art pipeline; existing Node headless/browser checks.

---

## Non-negotiable definition of done

The first playable visual slice is not accepted because “the code works.” It is accepted only when its browser screenshot can credibly sit beside the supplied benchmarks without reading as placeholder/vector/stick art:

- environment has the same *level of scenic depth, warmth, color hierarchy, and landmark composition*;
- Sunmeadow and Bramblecrest have distinct, substantial architectural and character art;
- units are animated sprites/silhouettes, not procedural lines;
- a 100-unit battle stays readable at the game’s actual zoom levels;
- UI supports the new art language but never obscures tactical play.

## Explicitly rejected approach

Do **not** continue the prior V0 strategy of attempting to reach the benchmark through primitive Canvas geometry, a restricted color map, or “inspired” mountain/tree/bush shapes. That can only produce a stylised prototype, not the requested result.

## Prerequisite: real production-asset source

The benchmark quality cannot be produced by code alone. Before renderer work, establish one approved source for original production assets:

1. Owner-provided finished/licensed game assets; or
2. A commissioned artist pipeline; or
3. An approved image-generation workflow that creates original, consistent asset packs using the three supplied images plus the primer as references.

For path 3, outputs must be produced as separated layers and sprite-ready images—not one attractive flattened illustration. The art source must be able to deliver transparent-background units/buildings, consistent facing/scale, and a licence suitable for the game.

---

## Task 1: Return the visual branch to a true baseline

**Objective:** Remove the rejected V0 proof from the visual worktree without disturbing the active commander/Watch AI worktree.

**Files:**
- Delete from `agent/visual-proof`: rejected V0 renderer edits, V0 tools, and V0 screenshot artifacts.
- Preserve: `docs/creative-direction/creative-direction-primer-v0.1.md` and `docs/creative-direction/reference/*`.

**Step 1: Verify scope before reset**

Run:
```bash
git status --short
git diff -- src/render/parallax.js src/render/stickFigure.js src/render/structures.js
```

Expected: only rejected V0 visual files in this isolated worktree are reverted.

**Step 2: Restore baseline renderer**

Restore these tracked files from `78693c4`:
```text
src/render/parallax.js
src/render/stickFigure.js
src/render/structures.js
```

Remove only V0-only files:
```text
src/render/visualTheme.js
tools/visual-proof-contract-check.mjs
tools/visual-proof-browser-check.mjs
artifacts/visual-proof-v0/
```

**Step 3: Verify isolation**

Run `git status --short` in both worktrees. The active `stick-rts-watch-speed` worktree must be byte-for-byte untouched.

---

## Task 2: Freeze a production visual specification from the supplied materials

**Objective:** Convert the benchmark images and creative primer into an asset-by-asset acceptance sheet—without inventing a new visual direction.

**Files:**
- Create: `docs/creative-direction/production-visual-spec-v1.md`
- Create: `docs/creative-direction/asset-manifest-v1.json`

**Step 1: Write acceptance criteria for the actual benchmark qualities**

The specification must pin:

- target resolution and camera framing: 1400×540 gameplay viewport;
- Open Frontier composition: broad sky, cloud scale, blue mountains, rolling hills, tree line, readable lane, one stream/ruin/tree landmark system;
- Sunmeadow material/palette/silhouette rules exactly as defined in the primer;
- Bramblecrest material/palette/silhouette rules exactly as defined in the primer;
- pixel-art standard: crisp, hand-authored clusters/tiles and polished 16-bit-scale detail, no generic vector-line substitute;
- screen-space readability requirements for units, towers, Cores, projectiles, health bars, and UI.

**Step 2: Make the manifest concrete**

The initial vertical-slice manifest must list these exact deliverables:

```text
Environment:
  sky plate, cloud plate, far mountains, near mountains, hills/tree line,
  midground landmark plate, lane/grass foreground plate

Sunmeadow:
  miner, warrior, archer, one hero
  mine, tower, supply hall, Sunspire Core

Bramblecrest:
  miner, warrior, archer, one hero
  mine, tower, Warden tower, Warden Hall, Runewood Core

Shared:
  projectile/effect set, health-bar treatment, selected-unit marker,
  UI panel/border/icon treatment
```

For every asset, record source file, frame dimensions, animation frames, pivot/ground anchor, z-layer, palette, and acceptance screenshot.

**Step 3: Review before asset production**

The owner approves the asset sheet once. It becomes the acceptance contract for all generated/commissioned/imported artwork.

---

## Task 3: Produce and approve the actual art pack before integrating it

**Objective:** Obtain real, original graphics that can meet the benchmark rather than coding placeholders.

**Files:**
- Create: `assets/art/open-frontier/`
- Create: `assets/art/factions/sunmeadow/`
- Create: `assets/art/factions/bramblecrest/`
- Create: `assets/art/shared/`
- Create: `assets/art/README.md`

**Step 1: Produce the Open Frontier layer pack**

Export each scenery layer separately with transparency where appropriate. The layers must compose at 1400×540 without a visible seam. The game does not use the flattened benchmark image as a stretched background; it uses a compatible original scene pack that can parallax and repeat safely.

**Step 2: Produce a two-faction vertical-slice pack**

Create raster sprites for the three baseline roles and four key structures per faction. Units must have at least idle, walk, attack, and defeat frames; buildings require intact and destroyed states.

**Step 3: Asset intake validation**

Create a Node manifest checker that rejects assets with missing files, invalid transparency, absent required animation frames, duplicate pivots, or non-matching frame dimensions.

Run it against the complete pack. Expected: PASS only when every vertical-slice entry is present.

---

## Task 4: Build a sprite/scene compositor (test first)

**Objective:** Replace procedural world art with real asset rendering while keeping the simulation and render boundaries intact.

**Files:**
- Create: `src/render/assets.js`
- Create: `src/render/spriteAtlas.js`
- Create: `src/render/environment.js`
- Modify: `src/render/renderer.js`
- Modify: `src/render/stickFigure.js` (replace call sites; retire after parity)
- Modify: `src/render/structures.js` (replace call sites; retire after parity)
- Test: `tools/art-manifest-check.mjs`
- Test: `tools/render-layer-contract-check.mjs`

**Step 1: Write failing contract checks**

Assert that:

- all required assets resolve from the manifest;
- render modules import no simulation mutators;
- team → faction mapping selects the correct sprite family;
- environment draw order is sky → far scenery → midground → world entities → foreground → screen UI;
- sprite anchors keep feet/building bases aligned to existing world coordinates;
- rendering never calls `Math.random`.

Run both checks. Expected: FAIL before compositor implementation.

**Step 2: Implement image loading and sprite selection**

Use one manifest-driven loader with explicit asset IDs, no scattered image paths. Map simulation `player` and `ai` to their current visual factions only in `/src/render`.

**Step 3: Implement environment composition**

Draw actual layer assets using the existing camera/zoom transform. Parallax offsets are per layer; the foreground/lane must remain stable enough for combat readability.

**Step 4: Implement unit and structure sprite rendering**

Use existing entity state (`kind`, `state`, `facing`, `attackAnimTimer`, `destroyTimer`) only to select sprite frames. Do not change world state, hitboxes, targeting, timing, or simulation RNG.

**Step 5: Run checks to GREEN**

Run:
```bash
node tools/art-manifest-check.mjs
node tools/render-layer-contract-check.mjs
node tools/headless.js
```

Expected: all pass; headless output unchanged because it imports no render assets.

---

## Task 5: Build the genuine vertical slice and judge it side by side

**Objective:** Prove the game—not a concept sheet—looks like the supplied benchmark standard.

**Files:**
- Create: `tools/benchmark-visual-browser-check.mjs`
- Create: `artifacts/benchmark-vertical-slice/`

**Step 1: Create controlled scene states**

Use the existing game/debug harness to capture:

1. standard gameplay at default zoom;
2. a 100-unit battle at default zoom;
3. min zoom whole-map composition;
4. max zoom close combat near a tower/Core;
5. one Sunmeadow-side and one Bramblecrest-side base view.

**Step 2: Browser evidence**

The browser script captures lossless PNGs and fails on console exceptions. Include the supplied benchmark images beside the captures in a review packet without modifying the reference files.

**Step 3: Owner evidence gate**

Present only:

- the six actual game screenshots;
- the corresponding benchmark/reference image;
- a concise gap list: benchmark-match, deliberate gameplay compromise, remaining shortfall.

Do not proceed to full content coverage if the owner says the visual bar is not met.

---

## Task 6: Expand only after the vertical slice is approved

**Objective:** Fill out remaining heroes, building states, effects, UI skin, menus, and map variation using the approved asset/style system.

**Files:** manifest and assets only as needed; renderer changes must remain generic.

Expand in this order:

1. all three heroes per faction;
2. remaining building and death/damage states;
3. projectiles, Core/tower effects, banners, smoke, grass ambience;
4. UI panel/icon skin tied to the approved world art;
5. additional scenic landmarks and map variants.

Each addition receives browser screenshot evidence at the real gameplay zoom.

---

## Risks and decisions deliberately surfaced

- **Hard blocker:** benchmark-quality graphics require actual production assets. No amount of procedural Canvas work substitutes for that.
- **Legal/source requirement:** supplied references may guide the result, but production assets must be original or licensed for game use.
- **Asset consistency:** independently generated images will not form a coherent RTS sprite pack without a controlled seed/style/reference workflow and an intake manifest.
- **Performance:** measure the real loaded art pack at 100 units; sprite atlases and culling are the fallback if raw individual images are too expensive.
- **Scope discipline:** visual completion is gated by the first playable vertical slice, not an open-ended art rewrite.

## Final acceptance gate

The owner sees a real browser/LAN vertical slice that visually belongs beside the three supplied benchmarks. Only then do we expand the asset pack and commit/push the visual rehaul.
