# Aseprite Warrior-Pair Pilot Implementation Plan

> **For Hermes:** Execute only after Silas approves the first visual gate. Keep all work in `C:\Users\simcr\projects\stick-rts-visual-proof` on `agent/visual-proof`; do not touch `stick-rts-watch-speed`. Do not commit, push, or deploy without a separate explicit request.

**Goal:** Prove a reversible Aseprite-to-Canvas workflow with one owner-approved, paired Sunmeadow/Bramblecrest warrior idle slice at actual Stick RTS scale before producing a full animation family.

**Architecture:** Immutable benchmark/source masters remain untouched. Aseprite `.aseprite` documents are the editable source of truth; their nearest-neighbour PNG exports are candidate runtime files; a manifest records master/crop lineage, frame geometry, and a shared ground anchor. The existing deterministic simulation remains unchanged—only later, after approval, will the renderer select a cosmetic sprite frame instead of calling `drawStickFigure()` for `warrior` units.

**Tech stack:** Aseprite `1.3.18.1-x64`, native Canvas renderer, ES modules, Node validation scripts, browser/LAN preview.

---

## Evidence-based current position

- Aseprite is installed at `C:\Program Files\Aseprite\aseprite.exe`; CLI reports version `1.3.18.1-x64`.
- No `.aseprite` documents were found inside either current Stick RTS worktree. Any files Silas has been experimenting with are not yet part of the project source tree.
- The isolated visual worktree is still `C:\Users\simcr\projects\stick-rts-visual-proof` on `agent/visual-proof`. Its direct Open Frontier background integration passes:
  - `node tools/open-frontier-background-check.mjs`
  - `node tools/open-frontier-parallax-integration-check.mjs`
  - `node tools/headless.js`
- Runtime unit art is still procedural: `src/render/renderer.js:58` invokes `drawStickFigure(ctx, unit)` from `src/render/stickFigure.js` for every unit. No sprite renderer exists yet.
- The current ordinary warrior silhouette is approximately `68` world pixels high (ground at `unit.y`, head top at `unit.y - 68`). The initial sprite target should therefore be **72 world pixels tall**, not an arbitrarily scaled portrait.
- The approved source parents and provenance schema already exist:
  - `art-pipeline/BENCHMARK-SOURCE-MASTER-REGISTRY.md`
  - `assets/art/manifest/runtime-sprite-manifest.schema.json`
  - `artifacts/warrior-pair-proof/canonical-source-crops/sunmeadow-warrior-left-centered-v03.png`
  - `assets/art/candidates/bramblecrest/bramblecrest-warrior-idle-keypose-candidate-v01.png`
- The two source parents are faction-readable, but they are **not yet a ready matched pair**: Sunmeadow is a side-on, compact pixel source while the Bramblecrest candidate is larger, painterly, and front/three-quarter. Their shared scale, side-facing pose, silhouette density, and grounding must be deliberately resolved in Aseprite rather than exported directly.

## Non-goals

- No bulk generation or full sprite pack.
- No attempts to regenerate the approved masters for convenience.
- No simulation, economy, AI, collision, input, camera, or combat changes.
- No automatic conversion of a high-resolution painterly candidate directly into a runtime sprite.
- No renderer integration until the paired idle proof is approved in browser.

## Proposed file layout

```text
assets/art/editable/
  sunmeadow/warrior/sunmeadow-warrior-idle-v01.aseprite
  bramblecrest/warrior/bramblecrest-warrior-idle-v01.aseprite

assets/art/runtime-candidates/
  sunmeadow/warrior/sunmeadow-warrior-idle-v01.png
  bramblecrest/warrior/bramblecrest-warrior-idle-v01.png

assets/art/manifest/candidates/
  sunmeadow-warrior-idle-v01.json
  bramblecrest-warrior-idle-v01.json

artifacts/warrior-pair-proof/
  aseprite-scratch-32x32-v01.aseprite
  aseprite-scratch-32x32-v01.png
  warrior-idle-scale-anchor-v01.png
  browser-warrior-idle-proof-v01.png
```

`runtime-candidates/` and `manifest/candidates/` are intentionally separate from approved `runtime/` output. Nothing may be consumed by the game renderer until owner approval.

---

### Task 1: Bring one Aseprite experiment into the project safely

**Objective:** Establish a recoverable editable-source path without touching master art or the renderer.

**Files:**
- Create: `assets/art/editable/_scratch/aseprite-scratch-32x32-v01.aseprite`
- Create: `assets/art/editable/_scratch/aseprite-scratch-32x32-v01.png`

**Step 1: Save source in the worktree**

In Aseprite, create a `32×32` RGBA document with one opaque pixel-art shape over a transparent background. Save its editable document at:

```text
assets/art/editable/_scratch/aseprite-scratch-32x32-v01.aseprite
```

Do not save only the exported PNG.

**Step 2: Export nearest-neighbour proof**

Export a transparent PNG beside it as `aseprite-scratch-32x32-v01.png`. Use no smoothing, interpolation, opaque matte, or background layer.

**Step 3: Verify before proceeding**

Run:

```bash
"/c/Program Files/Aseprite/aseprite.exe" --version
python -c "from PIL import Image; im=Image.open('assets/art/editable/_scratch/aseprite-scratch-32x32-v01.png'); print(im.mode, im.size)"
```

Expected: Aseprite version output, then `RGBA (32, 32)`.

**Gate 0:** Hermes inspects the actual Aseprite source and PNG alpha before warrior work begins.

---

### Task 2: Create one matched, paired warrior idle key-pose sheet

**Objective:** Make a reviewable visual decision about style, scale, and ground anchoring before animation or code.

**Files:**
- Create: `assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-idle-v01.aseprite`
- Create: `assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-idle-v01.aseprite`
- Create: `artifacts/warrior-pair-proof/warrior-idle-scale-anchor-v01.png`

**Step 1: Use locked parents as reference layers**

- Sunmeadow reference: `artifacts/warrior-pair-proof/canonical-source-crops/sunmeadow-warrior-left-centered-v03.png`
- Bramblecrest reference: `assets/art/candidates/bramblecrest/bramblecrest-warrior-idle-keypose-candidate-v01.png`

Import each reference into its respective Aseprite document on a locked, non-exported `reference` layer. The reference must remain visually separate from the edited sprite layers.

**Step 2: Use the same frame contract for both factions**

Create both documents as `96×96` RGBA frames with:

```text
runtime visual height: 72 world pixels
shared ground anchor:  x=48, y=84
initial state:          idle key pose only
facing:                 player/right; mirror at render time later
palette/scaling:        nearest-neighbour only
```

The 12px upper margin and 12px lower foot/anchor margin are intentional breathing room; the actual feet must meet the shared `y=84` anchor line.

**Step 3: Preserve faction identity while normalising play readability**

- Sunmeadow: preserve its gold/green palette, shield warrior identity, and side-on silhouette.
- Bramblecrest: preserve axe, round shield, beard, leafy mantle, and heavy silhouette, but resolve to a side-readable battle pose rather than exporting the large front-facing portrait as-is.
- Keep both figures broadly comparable in screen presence. Do not force identical anatomy, weapon width, or faction palettes.

**Step 4: Produce a contact sheet**

Export a scale/anchor review sheet showing both sprites at native `96×96`, each with:

```text
transparent checkerboard
shared y=84 anchor line
96px frame bounds
reference crop thumbnail
faction/role/anchor label
```

**Gate A — owner visual approval:** Silas approves the paired native-scale key poses before a second idle frame, walk, attack, defeat, or renderer integration is created.

---

### Task 3: Add only a restrained second idle frame after Gate A

**Objective:** Prove the intended subtle, hand-made motion cadence rather than a skeletal or interpolated animation.

**Files:**
- Modify: `assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-idle-v01.aseprite`
- Modify: `assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-idle-v01.aseprite`
- Create: `assets/art/runtime-candidates/{sunmeadow,bramblecrest}/warrior/*-idle-v01.png`

**Step 1: Add one companion frame per faction**

Duplicate the approved key pose and make only a `1–2px` breathing/weight-shift change. Keep the feet on `y=84`; no tweening, blur, or transform interpolation.

**Step 2: Export candidate strips**

Export each two-frame strip as a transparent `192×96` PNG: frame 0 at `x=0`, frame 1 at `x=96`. Use `800ms` per frame as the initial candidate cadence.

**Step 3: Verify asset facts**

Check dimensions, `RGBA` mode, fully transparent background, and identical per-frame anchor position. Reject a sheet that contains opaque background, antialiased resampling, or drifting feet.

---

### Task 4: Create candidate manifests before renderer work

**Objective:** Make lineage and frame ownership explicit before an asset can reach runtime code.

**Files:**
- Create: `assets/art/manifest/candidates/sunmeadow-warrior-idle-v01.json`
- Create: `assets/art/manifest/candidates/bramblecrest-warrior-idle-v01.json`
- Test: `tools/warrior-candidate-asset-contract-check.mjs`

**Step 1: Write a failing contract test**

Create `tools/warrior-candidate-asset-contract-check.mjs` that fails unless both manifests:

- validate against `assets/art/manifest/runtime-sprite-manifest.schema.json`;
- reference the correct immutable master ID/hash and review crop;
- declare `96×96` frames, a `48,84` anchor, `world_height: 72`, and a two-frame looping `idle` clip;
- reference a real `RGBA` candidate PNG at `192×96`.

Expected initial failure: missing manifests and/or exports.

**Step 2: Write minimal candidate manifests**

Each manifest must have `approval_status: "candidate"`; it must not claim owner approval.

**Step 3: Run contract test until green**

Run:

```bash
node tools/warrior-candidate-asset-contract-check.mjs
```

Expected: clear PASS report listing both faction candidate sheet paths, dimensions, anchors, and parent master IDs.

---

### Task 5: Browser-only sprite integration after explicit approval

**Objective:** Replace procedural art for warriors only, without touching deterministic gameplay.

**Files:**
- Create: `src/render/assetManifest.js`
- Create: `src/render/spriteRenderer.js`
- Modify: `src/render/renderer.js:1-6,56-60`
- Test: `tools/warrior-sprite-renderer-check.mjs`
- Test: existing `tools/headless.js`

**Step 1: Write failing renderer contract test**

The test should fail until `warrior` units select a candidate/approved sprite clip based only on existing render-visible fields:

```text
unit.kind === 'warrior'
unit.team → faction mapping
unit.state / attackAnimTimer / deathTimer
unit.facing
unit.animPhase or render clock
```

It must assert that non-warrior units still call the legacy procedural drawing path and that no simulation modules are imported or modified.

**Step 2: Implement minimum render-only lookup**

Load only approved manifests/exports—not raw Aseprite documents or candidate files. Draw at the declared ground anchor, use `ctx.imageSmoothingEnabled = false`, and mirror with Canvas transforms for opposite facing.

**Step 3: Browser evidence**

Capture normal play, a crowded battle, minimum zoom, and maximum zoom. Verify both factions’ warrior feet sit on the same world ground line and that no bars/health UI move with the sprite.

**Gate B — owner browser approval:** Silas approves live paired warrior combat before miners, buildings, archers, or a full warrior motion set begins.

---

## Risks and decisions to resolve at Gate A

1. **Bramblecrest pose mismatch:** The current reference is visually strong but too portrait-like and painterly to export directly. The pilot must prove it can be translated into the established pixel-art game language while retaining faction identity.
2. **Scale is a game decision:** `72` world pixels is a grounded initial target based on the current `68px` procedural warrior, not a permanent art law. Gate A can revise it once, for both factions together.
3. **No hidden work:** A full walk/attack/defeat family begins only after the paired idle proof; do not produce one faction’s complete pack first.
4. **Aseprite handoff:** If Silas has an existing experiment he likes, save its `.aseprite` document directly under `assets/art/editable/_scratch/` or share its exact local path. Hermes can then inspect/export/verify it without recreating it.

## First approval request

Approve only this bounded experiment:

```text
Aseprite 32×32 alpha/export proof
→ paired 96×96 Sunmeadow + Bramblecrest warrior idle-key-pose/anchor sheet
→ visual review
```

No runtime integration, no full animation set, no commits, and no pushes are included in that first approval.
