# Open Frontier Visual Overhaul — Discovery and First-Slice Plan

> **For Hermes:** Planning only. Do not modify game code, copy assets, generate art, or change rendering until Silas approves the individual gate being proposed.

**Goal:** Replace the current procedural stick-figure/abstract presentation with a bright, pixel-inspired *Open Frontier* visual language that is readable during live RTS play, beginning with one real in-game scene rather than a broad asset-system rewrite.

**Creative baseline:** Silas’s **Creative Direction Primer — v0.1** and supplied boards are authoritative for early visual development. Silas explicitly authorizes using the supplied examples as the direct source artwork for the first overhaul slice: environment portions may be used as scene layers and depicted units/buildings may be cropped, cleaned, and rendered in-game. Do not introduce external art procurement or a separate asset-production decision before demonstrating that slice.

**Architecture:** Preserve the deterministic simulator and game state. Replace rendering incrementally at the Canvas layer: asset-backed environmental layers and role-readable sprite/structure rendering consume the existing `world` state without changing economy, movement, combat, AI, input, or match rules. Keep old and replacement rendering mutually exclusive per asset category.

**Tech stack:** Existing Canvas renderer under `src/render/`; original licensed/user-supplied pixel assets or explicitly approved generated/commissioned assets; deterministic browser screenshot checks and LAN preview for visual review.

---

## Outcome anchor

**User-visible outcome:** A LAN-accessible real match on the Open Frontier where the player can immediately recognize the new scenic grassland setting, both faction identities, the combat lane, and the primary gameplay objects at normal zoom.

**Not success:**

```text
A moodboard displayed in-game.
A disconnected mockup.
A new asset loader with placeholder art.
A palette swap over stick figures.
A passing screenshot test without Silas’s visual approval.
```

## Established direction

- Bright, welcoming, pixel-inspired fantasy; crisp pixel clusters with polished 16-bit density.
- Open blue sky, layered mountains, rolling grasslands, distant tree line, stream, ruins, wildflowers, and an intentionally quiet combat lane.
- **Sunmeadow League:** cream/pale stone, green roofs, warm gold, cobalt accents, sun/horse/wheat motifs; open, civic, upright silhouettes.
- **Bramblecrest Wardens:** pine green, brick red, warm timber, iron gray, pale stone, antler/rune/stag motifs; grounded, sturdy, frontier-defense silhouettes.
- Readability outranks ornamental detail. Both factions are sympathetic; no grimdark, generic evil, or direct imitation of reference properties.

## Scope exclusions through first-slice approval

```text
No RL work.
No simulation, balance, economy, combat, AI, input, camera, or map-rule changes.
No broad replacement of every unit, building, HUD, and menu at once.
No unapproved use of user reference images as shipped game art.
No Netlify/production push without explicit authorization.
```

---

# Gate 0 — Prepare supplied examples for direct in-game use

**Objective:** Use the supplied art boards directly for the first scene—without commissioning, generating, or redesigning a separate art set.

## Minimal preparation

1. Preserve the original supplied image files unchanged in a project reference directory.
2. Create derivative crops only for the visual elements the first scene needs:

```text
Open Frontier sky/mountain/field composition
Sunmeadow landmark or building
Bramblecrest landmark or building
one Sunmeadow unit depiction
one Bramblecrest unit depiction
```

3. Remove presentation-board margins, labels, and unrelated neighboring panels from those *derivative* crops. Keep their intended visual content intact.
4. Use the environmental reference as scenic layers/background where practical; use cropped faction art as the first in-game unit/structure renderings.

The game does not need a "final asset pipeline" before this. The only necessary implementation detail is a small image manifest so the existing Canvas renderer can load and draw the supplied images predictably.

**Pass:** The original examples and named first-slice crops are available to the renderer, while the originals remain preserved.

**Stop:** If a needed element cannot be cropped cleanly at gameplay scale, use the relevant board element as a larger scenic/background layer and report exactly which sprite needs a cleaner follow-up—not a new art system.

---

# Gate 1 — Create a compact visual-production brief

**Objective:** Convert the creative primer into an implementation-ready contract for the first scene, without designing lore or art systems that are not needed.

**Files:**

- Create: `docs/art-direction/open-frontier-v1.md`
- Create when approved: `docs/art-direction/reference/README.md`
- Copy only approved references to: `docs/art-direction/reference/`

## Brief contents

1. **Camera/readability contract**
   - Combat lane occupies the lower world strip.
   - Units remain readable against a simpler ground-value band.
   - Background contrast/saturation decreases with depth.
   - Buildings read through roofline, faction emblem, and silhouette before texture.

2. **First-slice palette and material rules**
   - Shared environment: sky blue, warm daylight, grass greens, dirt ochre, river blue, pale stone.
   - Sunmeadow: cream/pale stone + green + gold + limited cobalt.
   - Bramblecrest: timber/pale stone + pine green + brick red + iron gray.

3. **Scale contract**
   - Declare actual Canvas sprite pixel dimensions for standard units, heroes, small props, structures, and cores only after checking the real gameplay zoom/viewport.
   - Define a minimum at-normal-zoom identifier for each role: shield, bow, pickaxe/lantern, hero emblem, roofline, banner.

4. **First-slice composition**
   ```text
   sky/cloud layer
   mountain layer
   tree-line / hills layer
   midground stream, ruins, lone tree, fence/banner landmarks
   quiet foreground combat lane
   grass-edge/flower/rock foreground accents
   one Sunmeadow unit + one Bramblecrest unit
   one faction landmark/structure per side
   ```

**Pass:** Silas approves the compact brief and first-slice composition before code changes.

**Stop:** If the brief reveals unclear scale, asset source, or faction-readability decisions, resolve those rather than building renderer infrastructure.

---

# Gate 2 — Inspect rendering seams and choose the smallest asset path

**Objective:** Determine the minimum rendering changes required for the approved first scene.

**Read-only files to inspect:**

- `src/render/renderer.js`
- `src/render/parallax.js`
- `src/render/stickFigure.js`
- `src/render/structures.js`
- `src/render/ui.js`
- `src/config.js`
- relevant camera/Canvas browser checks

**Known seam:** `src/render/renderer.js` already draws world layers in a usable order:

```text
parallax
→ mines/statues
→ structures
→ units/health bars
→ projectiles
→ HUD and controls
```

## Required design decision

Choose one narrow asset integration approach after the inspection:

```text
A. Individual transparent PNG/WebP assets, loaded by a small manifest.
B. A deliberately packed sprite atlas with named rectangles.
C. A temporary procedural composition pass only if the approved first-slice
   asset source cannot yet supply sprites.
```

**Default recommendation:** A small named-asset manifest for the first slice. Do not create a generalized animation/atlas editor until real asset volume requires it.

**Pass:** The selected path identifies exact files, assets, scaling policy (`imageSmoothingEnabled = false` if pixel assets are used), loading/fallback behavior, and no simulation changes.

**Stop:** If a proposed integration needs game-state changes merely to draw art, redesign the rendering boundary first.

---

# Gate 3 — First real in-game Open Frontier slice

**Objective:** Put the approved visual direction into a deterministic playable/watchable game scene.

**Likely files (final exact paths only after Gate 2):**

- Create: `src/render/assets/manifest.js` or `src/render/assets.js`
- Create: `public/assets/open-frontier/...` or approved source asset directory
- Modify: `src/render/parallax.js`
- Modify: `src/render/renderer.js`
- Modify: `src/render/stickFigure.js` *only for the two approved unit renderers*
- Modify: `src/render/structures.js` *only for approved landmark(s)*
- Create: focused deterministic/browser visual check

## Slice boundaries

Implement only:

```text
Open Frontier scenic layers
combat-lane ground treatment
Sunmeadow and Bramblecrest banner/faction treatment
one standard unit appearance per faction
one approved landmark or structure appearance per faction
one readable projectile/effect treatment if needed for contrast
```

Keep existing structures, units, commands, collision/hitboxes, health bars, and simulation semantics intact. Replacement rendering must not sit on top of the old procedural artwork; one renderer owns each replaced category.

## Verification

1. Run the existing deterministic simulation checks affected by the scene.
2. Run a browser test against a fixed seed and fixed camera position.
3. Capture deterministic desktop screenshots for:

```text
normal zoom: both factions visible in the combat lane
zoomed-out view: environment reads in layers without hiding units
zoomed-in view: pixel scaling remains crisp and structures remain legible
```

4. Start the approved LAN preview and obtain Silas’s visual feedback.

**Pass:** Silas confirms the scene communicates the intended Open Frontier direction *and* still reads as an RTS match at normal play scale.

**Fail / stop:** If it is attractive but unreadable, or readable but visually off-direction, revise only the approved scene/brief. Do not expand into all units, buildings, menus, or a general asset system.

---

# Gate 4 — Expand by approved visual category

Start only after the first-slice LAN review is positive. One category at a time:

1. Shared environment props and weather/ambient motion.
2. Standard units: miner, warrior, archer for both factions.
3. Mines, supply halls, towers/turrets, and cores for both factions.
4. Heroes and hero-specific readable effects.
5. Combat effects, banners, production/selection feedback.
6. HUD, menus, and Watch-mode presentation.
7. Mobile/responsive composition review.

Each category gets:

```text
one approved art target
one rendering slice
fixed-seed screenshots
LAN review
explicit approval before the next category
```

---

## Risks and controls

| Risk | Control |
|---|---|
| Reference images are mistaken for usable assets | Gate 0 rights/classification before copying or shipping art. |
| Beautiful scenery obscures combat | Quiet combat lane; depth/contrast reduction; fixed normal-zoom screenshots. |
| Factions collapse into green/brown visual noise | Use silhouette, banner/emblem, roofline, and controlled accent colors—not palette alone. |
| Asset work turns into a renderer rewrite | Named minimal manifest first; expand only when real asset count demands it. |
| Art changes accidentally alter gameplay | Rendering reads world state only; retain deterministic checks and unchanged hitboxes. |
| Full overhaul becomes an unreviewable batch | One category and one LAN-visible decision per gate. |

## First decision needed

Before any implementation: **Which asset-production path may be used for this project—user/licensed art, commissioned art, explicitly approved generated art, or temporary original prototype art?**
