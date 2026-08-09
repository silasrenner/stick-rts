# Stick RTS Source-Art Animation Production Plan

> **For Hermes:** This is a production-extraction plan, not authorization to begin image cleanup, generation, renderer replacement, commits, or deployment. Obtain approval at the stated visual gates.

**Goal:** Turn the locked Sunmeadow and Bramblecrest source masters into a small, readable, animated two-faction vertical slice without changing simulation rules or regenerating artwork that already exists.

**Architecture:** Work by **animation family and paired faction role**, not by completing every graphic one at a time. Each approved runtime asset is a transparent raster/sprite sheet with stable ground-anchor metadata; the Canvas renderer later selects frames from existing simulation state. The simulation remains authoritative for movement, combat, death, mining, and facing; rendering owns only asset selection, frame timing, and cosmetic effects.

**Current approved inputs:**
- Open Frontier master integrated as the background.
- Sunmeadow: Mine, Watchtower, Hearthhall, Sunspire; Miner, Warrior, Archer, Sun Guard source parents.
- Bramblecrest: Iron Mine, Warden Tower, Warden Hall, Runewood Core; Miner, Warrior, Archer, Stag-Captain source parents.

---

## Strategy decision

**Do not** create every possible frame for every building/unit serially. That delays playable proof and risks discovering late that scale, anchors, or animation cadence are wrong.

Instead, use this sequence:

```text
one canonical pose per paired role
→ one complete small animation family across both factions
→ browser proof at real gameplay scale
→ next role family
→ buildings/effects
→ hero and expanded states
```

Paired faction roles are important: the same gameplay mechanic gets comparable visual coverage and neither faction becomes a placeholder while the other advances.

## Batch 0 — Runtime asset contract (no art production)

**Purpose:** Prevent unusable “pretty images” from entering the renderer.

1. Define the asset manifest schema in `assets/art/manifest/`:
   - asset ID and faction/role;
   - immutable source-master ID and source crop;
   - PNG file path;
   - pixel dimensions;
   - per-frame rectangle and duration;
   - ground anchor/pivot for every frame;
   - facing/mirroring policy;
   - state clip names;
   - owner approval and derivative provenance.
2. Establish a shared gameplay-scale target using real in-browser unit height, not an arbitrary export size.
3. Make an anchor-preview sheet: each candidate stands on the same ground line with a one-unit grid, source crop beside it.
4. Define a pixel rule: nearest-neighbour only; no non-integer scaling, blur, or skeletal deformation in the first slice.

**Gate A:** owner approves the scale/anchor preview before any complete animation family is produced.

## Batch 1 — Warrior pair: the first full combat animation family

**Why first:** It proves motion readability during the most important RTS interaction: two sides approaching, attacking, dying, and being seen at camera zoom.

Produce both factions in parallel:

```text
Sunmeadow Warrior        Bramblecrest Warrior
idle       2 frames — a canonical ready pose plus a 1–2px lowered/shifted companion frame, alternating slowly for breathing/weight movement without a simulation-state change.      idle       2 frames — the matching Bramblecrest ready-pose pair, also alternating slowly.
walk       4 frames      walk       4 frames
attack     4 frames      attack     4 frames
defeat     3 frames      defeat     3 frames
```

1. Extract one clean canonical standing pose per faction from the locked parent source.
2. Create an approval sheet containing only the two cleaned idle key poses at planned game scale and their ground anchors.
3. After approval, derive the short state loops. Do not add a separate “retreat” clip initially: normal walking with opposite facing/movement conveys retreat under existing rules.
4. Export each faction to a transparent sheet plus manifest JSON.
5. Add renderer lookup only for `warrior` so legacy stick figures continue drawing every other role.
6. Map current simulation signals:
   - `idle` → idle loop;
   - `walking` → walk loop;
   - `attackAnimTimer > 0` → attack clip progress;
   - `dying` / `deathTimer` → defeat clip progress;
   - `facing` → horizontal mirroring.
7. Browser-verify a live Sunmeadow-vs-Bramblecrest warrior battle at normal, min, and max zoom.

**Gate B:** owner approves real browser evidence before additional roles are produced.

## Batch 2 — Miner pair: economic motion family

Produce both factions in parallel:

```text
idle       2 frames
walk       4 frames
mine       4 frames
carry      4 frames
defeat     3 frames
```

1. First approve the paired clean miner poses at the shared scale/anchor.
2. Add `mine` and `carry` only if the simulation exposes (or can safely expose) an existing visual task signal. Do not alter economy timing or introduce hidden logic just to animate.
3. Otherwise render idle/walk first and create a narrowly scoped presentation-event bridge in a later approved code task.
4. Browser-verify miners traveling, working, and delivering resources with both faction mines visible.

**Gate C:** owner approves the economic visual loop.

## Batch 3 — Buildings plus micro-animation layers

Start static source-derived buildings, then add movement as independent tiny layers.

1. Extract both faction mines and cores first; then tower/hall.
2. Use one grounded static image per building for the first browser slice.
3. Add only restrained cosmetic loops after static composition is approved:
   - 2–3-frame banner flutter;
   - smoke puff loop;
   - rune/core glow;
   - lantern/fire flicker.
4. Add damaged/destroyed versions only when the game’s structure damage state is mapped and source/derivative art is approved.

**Gate D:** owner approves a base-view browser comparison before buildings expand further.

## Batch 4 — Archer pair, then first heroes

Archer pair:

```text
idle 2 | walk 4 | fire 4 | defeat 3
```

Hero pair:

```text
idle 2–4 | walk 4 | attack 4 | special 4–6 | defeat 3–5
```

1. Complete both archers before beginning either hero.
2. Use Sun Guard and Stag-Captain as the first hero pair.
3. Keep hero special effects as separate overlay sheets where possible; do not bake the entire effect into every character frame.

**Gate E:** owner approves a mixed-role battle proof before optional hero variants or extra unit types.

## Batch 5 — Gap filling, only where evidence proves a gap

Use manual ChatGPT/GPT Image editing with the exact approved parent master only when a required pose/state cannot be made through direct crop, cleanup, or hand pixel editing.

For every derivative, store:

```text
parent master + parent crop
prompt/edit note
candidate output
approval status
final sheet/manifest entry
```

Reject anything with changed faction identity, unstable costume/weapon geometry, smeared pixels, or incompatible camera angle.

## Browser acceptance criteria for every batch

- normal play screenshot;
- crowded/stress screenshot;
- min and max zoom screenshot;
- both faction base/objective views when buildings are included;
- no non-uniform art stretch;
- no gameplay/simulation behavior changes;
- all sprites share their declared ground line;
- assets remain legible as small game pieces, not only as enlarged contact-sheet art.

## Likely code/art paths when implementation begins

- Create: `assets/art/manifest/*.json`
- Create: `assets/art/runtime/{sunmeadow,bramblecrest}/...`
- Create: `src/render/assetManifest.js`
- Create: `src/render/spriteRenderer.js`
- Modify: `src/render/renderer.js`
- Modify or replace gradually: `src/render/stickFigure.js`, `src/render/structures.js`
- Create: `tools/*-asset-contract-check.mjs` and browser evidence scripts

## Explicit non-goals for the first slice

- No renderer/engine migration to Phaser or PixiJS.
- No bulk generation of complete sprite packs.
- No full 8-direction animation set; Stick RTS uses a side-on battlefield and horizontal mirroring first.
- No simulation, economy, collision, AI, controls, or camera-rule changes.
- No automatic commit, push, merge, or deployment.
