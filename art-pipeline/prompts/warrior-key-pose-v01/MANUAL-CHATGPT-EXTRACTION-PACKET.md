# Warrior Key-Pose Extraction Packet v01

## Purpose

Produce **one clean, transparent canonical idle key pose per faction** for the scale-and-anchor review. This is not yet a walk/attack sheet and must not redesign the approved parent art.

## Inputs to attach in ChatGPT image editing

For each request, attach both files named in that request:

- the full immutable faction source master;
- the supplied rough crop, which identifies the intended warrior even where neighbouring board art overlaps it.

Do one faction per request. Save the returned image without recompressing it and return the PNG to this chat for intake.

## Request A — Sunmeadow Warrior

**Attach**

```text
assets/art/source/sunmeadow/sunmeadow-league-assets-master.jpg
artifacts/warrior-pair-proof/canonical-source-crops/sunmeadow-warrior-left-centered-v03.png
```

**Copy/paste prompt**

```text
Use the attached Sunmeadow source master and the attached rough crop only as the approved parent reference. Extract the blue-plumed Sunmeadow sword-and-sun-shield warrior indicated by the rough crop into one complete, full-body, side-view ready stance.

Deliver ONE transparent-background PNG. Preserve the original source's green-and-gold palette, pale armor, blue plume, sun-emblem round shield, sword silhouette, pixel-art edge treatment, and grounded side-view camera angle. Keep the full head, weapon, shield, hands, feet, and a small amount of clear padding. Put the feet on one horizontal baseline. Do not include a label, dark art-board background, other soldiers, horse, building, banner, terrain, cast shadow, glow, or new visual design.

This is animation Frame 1 only: a calm ready/idle pose, not an attack pose. Do not make a sheet and do not add extra frames.
```

**Acceptance check**

```text
- one complete warrior only
- transparent background
- full sword, shield, and feet visible
- same Sunmeadow identity as source master
- no neighbouring warrior contamination
- no pose redesign or soft/blurred interpolation
```

## Request B — Bramblecrest Warrior

**Attach**

```text
assets/art/source/bramblecrest/bramblecrest-wardens-assets-master.jpg
artifacts/warrior-pair-proof/canonical-source-crops/bramblecrest-warrior-primary.png
```

**Copy/paste prompt**

```text
Use the attached Bramblecrest source master and the attached rough crop only as the approved parent reference. Extract the indicated Bramblecrest Warden warrior into one complete, full-body, side-view ready stance.

Deliver ONE transparent-background PNG. Preserve the original source's rugged iron, dark green, brick-red, and woodland palette; the round Warden shield; the heavy weapon; the stout defensive silhouette; and the source's pixel-art edge treatment. Keep the full head, weapon, shield, hands, feet, and a small amount of clear padding. Put the feet on one horizontal baseline. Do not include a label, dark art-board background, neighbouring units, building, banner, terrain, cast shadow, glow, or a new visual design.

This is animation Frame 1 only: a calm ready/idle pose, not an attack pose. Do not make a sheet and do not add extra frames.
```

**Acceptance check**

```text
- one complete warrior only
- transparent background
- full weapon, shield, and feet visible
- same Bramblecrest Warden identity as source master
- no neighbouring-unit contamination
- no pose redesign or soft/blurred interpolation
```

## What happens after intake

Once both PNGs are returned here, we will record their parent source/crops, make the real gameplay-scale ground-anchor comparison, and ask for a single bounded approval before producing the two-frame idle loops.
