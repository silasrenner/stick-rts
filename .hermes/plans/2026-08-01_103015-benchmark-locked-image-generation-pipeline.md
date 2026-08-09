# Stick RTS — Benchmark-Locked Image-Generation Asset Pipeline

> **For Hermes:** This supersedes the prior procedural V0 and the generic benchmark-fidelity plan. The supplied benchmark images are the visual quality target. The Creative Direction Primer is the content and faction contract. Use controlled image generation to create an original, game-ready asset stack; do not approximate the target with procedural geometry or copy/traces of the reference pixels.

**Goal:** Produce, approve, integrate, and verify a complete original art stack for Stick RTS that visibly matches the supplied Open Frontier / Sunmeadow League / Bramblecrest Wardens benchmarks in quality, palette hierarchy, scenic depth, material richness, and pixel-art finish while implementing the Primer’s exact faction, unit, building, and world descriptions.

**Architecture:** Treat visual production as a versioned asset pipeline. A benchmark-locked style package feeds controlled generation; every accepted output is registered in an asset manifest with its source prompt, reference inputs, seed, generation workflow, dimensions, alpha/pivot metadata, and approval status. A manifest-driven Canvas sprite compositor consumes only approved assets. The deterministic simulation remains untouched.

**Tech Stack:** Existing Vanilla JS + Canvas 2D; ChatGPT/GPT Image for owner-facing exploration and approval; OpenAI GPT Image API or Responses API for repeatable reference-conditioned generation and edits; lossless PNG/WebP source art; Node validation and Chrome/CDP evidence scripts. ComfyUI is an optional escalation only if GPT Image cannot deliver a required controlled asset family.

---

## Product contract

The visual target is not “inspired by” the supplied images. It is:

```text
A playable Stick RTS frame should credibly belong beside the supplied
Open Frontier, Sunmeadow League, and Bramblecrest Wardens benchmarks.
```

The Primer governs what must appear in that frame:

- **Open Frontier:** bright grassland, broad sky, layered blue mountains, rolling hills, tree line, stream/pond, ruins, fences, flowers, and an uncluttered combat lane.
- **Sunmeadow:** cream stone, oak, green roofs, warm gold/cobalt accents, rounded/open civic forms, lantern/sun/wheat/banners.
- **Bramblecrest:** rugged stone/timber, pine/brick/iron tones, sturdy/angular defensive forms, stag/thorn/rune/palisade motifs.
- **Gameplay readability:** roles and factions are identifiable at actual battle zoom; background detail never hides combat.

No production asset is accepted solely because it is attractive. It must meet the benchmark contract, Primer, game camera, and sprite-readability constraints together.

---

## Phase 0 — Establish the GPT Image production environment

**Goal:** Create a reproducible, reviewable GPT Image path before any game renderer changes.

**Default backend:** ChatGPT/GPT Image is the primary art-generation system.

- Use the **ChatGPT image experience** for fast owner-facing exploration: supply the benchmark/reference material, request small controlled batches, inspect results together, and lock the three canonical style keyframes.
- Use the **OpenAI GPT Image API / Responses API** for repeatable production generation: save inputs/outputs, prompt revisions, response IDs, model/version, dimensions, and approval state beside each generated candidate.
- Use image **edits** and multi-turn/reference-image inputs to keep later unit/building outputs visually tied to the approved keyframes.
- Escalate to ComfyUI only if a specific job needs fine-grained pose/animation or batch-control capabilities GPT Image demonstrably cannot provide.

**Files:**
- Create: `art-pipeline/workflows/`
- Create: `art-pipeline/prompts/`
- Create: `art-pipeline/outputs/`
- Create: `art-pipeline/approvals/`
- Create: `docs/creative-direction/benchmark-lock.md`

### Task 0.1: Benchmark lock sheet

Create `benchmark-lock.md` from the three supplied reference images and Primer. It contains only observable target requirements:

- camera/view framing;
- pixel-art density and edge treatment;
- sky/mountain/terrain depth hierarchy;
- faction palette/material/shape language;
- unit/building scale relationship;
- forbidden outcomes: generic vector art, line figures, muddy realism, grimdark desaturation, unrelated fantasy races, direct copyrighted character/location copying.

### Task 0.2: Reproducibility and provenance contract

Every generated candidate gets a metadata sidecar:

```json
{
  "asset_id": "sunmeadow-warrior-keyframe-v01",
  "parent_style_pack": "style-lock-v01",
  "workflow": "gpt-image-request.json",
  "prompt_file": "prompts/sunmeadow-warrior-keyframe.md",
  "references": ["docs/creative-direction/reference/sunmeadow-league.jpg"],
  "generation_id": "provider-response-or-image-id",
  "seed": null,
  "model": "exact-model-name-and-version",
  "dimensions": [1024, 1024],
  "status": "candidate",
  "approval": null
}
```

No anonymous downloads, no unexplained hand-edits, and no accepted visual with an unknown generation source.

### Task 0.3: Generation smoke test

Run one small reference-conditioned image from each faction benchmark and record:

- workflow executes;
- output is saved locally;
- actual seed/workflow/model are captured;
- image does not reproduce the benchmark verbatim;
- output licence and source are recorded.

**Approval Gate A — generation capability:** owner sees six small outputs (three per faction). Decide only whether the generation workflow can reach the required graphic bar before we generate production art.

---

## Phase 1 — Lock the visual universe with three canonical keyframes

**Goal:** Eliminate style drift before generating dozens of game assets.

**Files:**
- Create: `art-pipeline/prompts/style-lock/`
- Create: `art-pipeline/outputs/style-lock-v01/`
- Create: `art-pipeline/approvals/style-lock-v01-review.md`

### Task 1.1: Open Frontier canonical keyframe

Generate 8–12 controlled variations of one wide gameplay-like scene:

```text
bright pixel-art side-view fantasy RTS battlefield; wide blue sky; soft clouds;
layered blue mountains; rolling grassland hills; distant forest; shallow stream;
weathered stone ruin; foreground combat lane with grass/flowers; warm daylight;
polished 16-bit execution; no UI; no text; no characters copied from references
```

Condition it against `open-frontier.jpg` and the benchmark lock sheet. Curate the strongest three; document why they do or do not match the benchmark in scenic depth, palette, and lane readability.

### Task 1.2: Sunmeadow canonical faction keyframe

Generate 8–12 variations containing one small Sunmeadow base group and readable miner, warrior, archer, and hero silhouettes. Enforce the Primer’s materials/motifs and the benchmark’s degree of pixel-art polish.

### Task 1.3: Bramblecrest canonical faction keyframe

Generate the matching Bramblecrest scene using the Primer’s defensive, timber/stone/rune language—without making it dark, evil, or a generic forest faction.

**Approval Gate B — style lock:** owner approves exactly one Open Frontier keyframe and one faction keyframe per faction. These three approved images are the hard reference package for every later generation batch. No sprites, atlas work, or renderer work begins before this approval.

---

## Phase 2 — Produce the vertical-slice asset stack

**Goal:** Generate the exact original assets needed for a playable two-faction proof before attempting the whole game.

**Files:**
- Create: `assets/art/source/open-frontier/`
- Create: `assets/art/source/sunmeadow/`
- Create: `assets/art/source/bramblecrest/`
- Create: `assets/art/manifest-v1.json`
- Create: `art-pipeline/prompts/vertical-slice/`

### Task 2.1: Generate separated environment layers

Generate or compose the approved Open Frontier visual system as independent art plates—not one flattened wallpaper:

```text
01 sky and clouds
02 far mountains
03 near mountains and hills
04 forest/tree line
05 stream / ruin / fence / landmark middle distance
06 lane and grass/flower foreground
```

Each layer must support parallax and a 1400×540 viewport without seams. Keep the battlefield lane visually quiet.

### Task 2.2: Generate faction building sheets

Per faction, create source art for:

```text
mine
supply building
watchtower/turret
Core
```

Each needs intact, damaged, and destroyed reads. All buildings use a consistent ground plane, scale, lighting direction, and transparent/clean background suitable for extraction.

### Task 2.3: Generate baseline unit sheets

Per faction, create:

```text
miner
warrior
archer
one representative hero
```

For each unit, generate a consistent asset family with the required states:

```text
idle / walk / attack / defeat
```

Do not rely on a single model request to output a usable animation sheet. Generate canonical character/key pose assets first, use locked references/pose conditioning for each action, then curate and normalize the frames.

### Task 2.4: Curate and normalize into game-ready assets

For each candidate:

- reject off-style, wrong-faction, malformed, muddy, or unreadable outputs;
- remove/replace unsuitable backgrounds while preserving the actual sprite silhouette;
- crop to common frame dimensions;
- place feet/base on a defined pivot line;
- export lossless transparent PNG frames;
- register frame count, pivot, source metadata, and owner approval state in `manifest-v1.json`.

**Approval Gate C — asset-pack intake:** owner sees contact sheets for every vertical-slice environment layer, building, and unit state, with the three style-lock references beside them. Approval is by asset family, not by an opaque bulk drop.

---

## Phase 3 — Integrate approved art through a manifest-driven renderer

**Goal:** Make the actual game render the accepted art without altering gameplay.

**Files:**
- Create: `src/render/assets.js`
- Create: `src/render/assetManifest.js`
- Create: `src/render/environment.js`
- Create: `src/render/spriteRenderer.js`
- Modify: `src/render/renderer.js`
- Modify: `src/render/stickFigure.js` (remove from active world path after parity)
- Modify: `src/render/structures.js` (remove from active world path after parity)
- Test: `tools/art-manifest-check.mjs`
- Test: `tools/render-layer-contract-check.mjs`

### Task 3.1: Test the loader contract first (RED)

Write failing checks proving:

- every manifest asset exists, loads, has expected dimensions and alpha where required;
- every required faction/kind/state has an approved frame entry;
- assets carry valid pivots and z-layer metadata;
- renderer modules do not import simulation mutation code;
- no renderer module uses `Math.random`.

### Task 3.2: Implement asset loading and faction selection (GREEN)

Simulation remains keyed by `player`/`ai`; `assetManifest.js` alone maps those teams to Sunmeadow/Bramblecrest art families. The mapping is render-only.

### Task 3.3: Implement true environment composition

Replace procedural background primitives with the approved layer plates. Preserve the existing camera, zoom, culling, and UI screen-space rules.

### Task 3.4: Implement animated sprites

Map entity `kind`, `state`, `facing`, attack/death timing, and world ground anchor to the accepted sprite frames. Do not alter entity size, collision, formation slot, targeting, damage, production, or RNG.

### Task 3.5: Remove placeholder art only after parity

Keep old procedural drawing behind a temporary development flag until all vertical-slice assets are present and the sprite renderer passes browser checks. Then remove it from the normal render path.

---

## Phase 4 — Browser proof against the benchmark

**Goal:** Demonstrate benchmark fidelity in the playable game, not in standalone concept art.

**Files:**
- Create: `tools/benchmark-visual-browser-check.mjs`
- Create: `artifacts/benchmark-vertical-slice/`
- Create: `artifacts/benchmark-vertical-slice/review-packet.md`

### Task 4.1: Capture controlled gameplay scenes

Use the real game/debug harness to capture:

1. Sunmeadow-side opening at default zoom;
2. Bramblecrest-side opening at default zoom;
3. normal battle with miners, warriors, archers, structures, and a hero;
4. 100-unit stress battle at default zoom;
5. whole-map composition at min zoom;
6. tower/Core close combat at max zoom.

### Task 4.2: Automated checks

Run:

```bash
node tools/art-manifest-check.mjs
node tools/render-layer-contract-check.mjs
node tools/headless.js
node tools/benchmark-visual-browser-check.mjs
```

The browser check fails on image-load errors, missing art, console exceptions, incorrect canvas size, or missing screenshot output. Headless simulation must still pass unchanged.

### Task 4.3: Owner evidence gate

Deliver a compact packet containing:

- the six real game screenshots;
- the approved style-lock images and original supplied benchmarks for comparison;
- a three-column assessment: **matches target / deliberate gameplay compromise / visible gap**.

**Approval Gate D — playable visual bar:** owner either approves the vertical slice or identifies concrete gaps. We fix gaps before broad expansion.

---

## Phase 5 — Expand by approved batches

Only after Gate D, repeat the same generate → curate → asset-intake approval → renderer integration → browser evidence loop for:

1. remaining heroes per faction;
2. building variants and all damage/death/effect states;
3. banners, smoke, Core energy, projectiles, hit effects, ambient world life;
4. UI panels, icons, menus, spectator screens;
5. further Open Frontier landmarks and later maps.

Each batch has a manifest version, metadata, contact sheet, browser screenshots, and an owner approval point.

---

## Roles and decision cadence

| Responsibility | Owner | Hermes |
|---|---:|---:|
| Approve generation backend/credentials and commercial-use posture | Yes | Recommend/setup after approval |
| Define benchmark + Primer as locked target | Yes | Convert to prompts/spec/acceptance tests |
| Generate variants, record source/seed/workflow | Review | Execute/manage |
| Select style lock and asset families | Yes | Curate, annotate gaps, present contact sheets |
| Integrate asset batches and preserve sim determinism | Review | Implement/test |
| Final visual go/no-go | Yes | Supply real browser/LAN evidence |

## Hard rules

- No procedural substitute is presented as benchmark-quality art.
- No uncontrolled one-off generation becomes a production asset.
- No full bulk asset run before the three style locks are approved.
- No renderer integration before the corresponding asset family is approved.
- No gameplay/simulation changes disguised as a visual task.
- No claim of visual match without side-by-side actual-browser evidence.
