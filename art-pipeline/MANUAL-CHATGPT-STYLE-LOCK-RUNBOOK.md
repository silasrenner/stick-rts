# Stick RTS — Manual ChatGPT Style-Lock Runbook

Use this runbook in the ChatGPT image generator under the owner’s existing subscription. This is the no-API-cost exploratory path.

## Rules for every pass

1. Start a **new image-generation chat for each of the three style locks**; do not mix factions in one conversation.
2. Attach **only the matching supplied benchmark** for the pass:
   - Frontier → `reference/open-frontier-benchmark-crop.jpg`
   - Sunmeadow → `reference/sunmeadow-league.jpg`
   - Bramblecrest → *source master not yet supplied*
3. The attached image is a **quality/style/composition benchmark**, not a request to reproduce its exact pixels, characters, or buildings.
4. Generate one candidate, then use the refinement prompts in the *same* chat. Save every candidate at full resolution and send it back to Hermes with its pass label.
5. We approve one style lock per category before generating any game sprites, buildings, or maps.

## Pass A — Open Frontier

### Attach

`docs/creative-direction/reference/open-frontier-benchmark-crop.jpg`

### Initial prompt

```text
Use the attached image as the strict visual-quality and composition benchmark.

Create an original wide 16:9 gameplay-art keyframe for Stick RTS: a bright,
side-view, pixel-art fantasy real-time strategy battlefield named Open Frontier.
It must have the same standard of scenic depth, color hierarchy, polish, and
pixel-art finish as the benchmark, but do not reproduce its exact pixels,
objects, characters, or locations.

Show a broad blue sky with large soft clouds; layered blue mountains; rolling
lush green hills; a distant tree line; a shallow stream or pond; one weathered
stone watchtower ruin; sparse wooden fences and road markers; and foreground
wild grass and flowers. Keep a broad, flat, uncluttered lower combat lane for
an RTS battle. The world feels heroic, warm, adventurous, and alive—not
bleak, grimdark, photorealistic, painterly, or vector-like.

Use crisp deliberate pixel clusters and polished 16-bit-level detail. No units,
no buildings, no UI, no text, no logos, no watermark, and no border.
```

### Refinement prompts — run only as needed

```text
Keep the established style. Improve the scenic depth and landmark hierarchy:
make the sky, mountains, hills, tree line, stream, and foreground read as
separate pixel-art layers. Keep the central combat lane clear and low-detail.
```

```text
Keep the established style and composition. Make the pixel work more deliberate
and polished: crisp clusters, richer but controlled color transitions, and a
warm fantasy-game finish. Do not make it painterly or use smooth vector shapes.
```

### Approve only if

- It immediately reads as a bright, expansive frontier at benchmark quality.
- The combat lane is clear enough for 100-unit gameplay.
- It has clear separable depth layers.
- It contains no text/UI/watermark and no copied benchmark element.

## Pass B — Sunmeadow League

Run only after the Open Frontier style lock is approved.

### Attach

`docs/creative-direction/reference/sunmeadow-league.jpg`

### Initial prompt

```text
Use the attached image as the strict visual-quality benchmark.

Create an original polished pixel-art faction keyframe for the Sunmeadow League
in Stick RTS. Match the benchmark’s quality, pixel density, warm daylight, and
cheerful civic-fantasy scale, but do not reproduce its exact pixels, characters,
or architecture.

Show a compact readable side-view base group in a bright grassland: a pale-stone
mine with oak supports and lanterns; a rounded green-roof watchtower with a
banner; a warm timber-and-stone Hearthhall with supplies and chimney smoke; and
a luminous civic Sunspire Core with layered towers and visible magical center.

Include small but gameplay-readable silhouettes: a friendly miner with bronze
helmet, pick, and lantern; a warrior with a round shield; an archer with longbow
and short cloak; and a heroic banner-bearing leader. Shapes are rounded,
upright, open, organized, and optimistic. Use cream stone, meadow green, warm
gold, cobalt accents, oak timber, bronze, painted cloth, and sun/wheat/lantern
motifs.

Crisp deliberate pixel clusters, polished 16-bit-level execution, game-art
side view, no UI, text, logos, watermark, generic castle, grimdark tone, or
faceless medieval army.
```

### Approve only if

- Sunmeadow reads as civic, optimistic, and mobile before reading fine detail.
- The miner, warrior, archer, hero, mine, tower, hall, and Core are distinct.
- The style clearly shares the approved Open Frontier’s rendering language.

## Pass C — Bramblecrest Wardens

Run only after the Open Frontier and Sunmeadow locks are approved.

### Attach

*No Bramblecrest source master has been supplied yet. Do not run this pass until one is added.*

### Initial prompt

```text
Use the attached image as the strict visual-quality benchmark.

Create an original polished pixel-art faction keyframe for the Bramblecrest
Wardens in Stick RTS. Match the benchmark’s quality, pixel density, grounded
material richness, and silhouette hierarchy, but do not reproduce its exact
pixels, characters, or architecture.

Show a compact readable side-view base group in a bright frontier woodland-hill
setting: a rugged rock-cut iron mine with timber beams, lanterns, and carts; a
fortified stone-and-timber Warden Tower with a defensive platform and stag
banner; a low sturdy Warden Hall with supplies, carved posts, and protective
fencing; and a Runewood Core built around glowing standing stones, carved runes,
timber architecture, and restrained vegetation.

Include small gameplay-readable silhouettes: a miner with iron helmet, pick,
and lantern; a broad warrior with sturdy shield; a hooded practical ranger with
bow; and a commanding stag/rune leader. Shapes are sturdy, grounded, slightly
angular, resilient, and crafted—not evil, savage, horror-themed, or excessively
dark. Use pine green, brick red, warm brown, iron gray, pale stone, leather,
and stag/thorn/rune/pine motifs.

Crisp deliberate pixel clusters, polished 16-bit-level execution, game-art
side view, no UI, text, logos, or watermark.
```

### Approve only if

- Bramblecrest is distinct from Sunmeadow by silhouette/material as well as color.
- It feels sympathetic, defensive, and land-conscious—not villainous.
- It shares the approved Open Frontier art bar.

## How to return candidates to Hermes

For each output, send the image plus this label:

```text
STYLE-LOCK / <frontier|sunmeadow|bramblecrest> / candidate <number>
Status: candidate
Notes: <what you like or dislike>
```

Hermes will review against the Primer and benchmark, record an approval/rejection rationale, and produce the next constrained pass. Do not generate the full asset stack until all three locks are approved.
