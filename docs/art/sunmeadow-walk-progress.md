# Sunmeadow Warrior Walk — Progress Ledger

**Scope:** isolated visual-art worktree only. This ledger is the human-readable status record for the Sunmeadow walk; editable Aseprite documents remain the art source of truth.

## Authorities

| Role | Authoritative file |
|---|---|
| Immutable static identity master | `assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-v08-three-shade-materials.aseprite` |
| Owner-edited motion guide | `assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v03.aseprite` |
| Approved six-pose mannequin motion baseline | `assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v15-six-pose-mannequin-blockout.aseprite` |
| Current source-form Down A working scaffold | `assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-walk-v16-down-a-source-silhouette.aseprite` |

## Approved motion baseline

Playback order:

```text
1 Contact A → 2 Down A → 3 Passing A → 4 Contact B → 5 Down B → 6 Passing B
```

V15 is the approved primary-motion/mannequin baseline. It is not a final source-character sprite and is not registered in the renderer.

Review exports:

- Complete guide-to-blockout board: `artifacts/warrior-pair-proof/sunmeadow-walk-v15-six-pose-guide-vs-mannequin.png`
- Mannequin walk preview: `artifacts/warrior-pair-proof/sunmeadow-walk-v15-six-pose-mannequin-preview.mp4`
- Guide-above-blockout preview: `artifacts/warrior-pair-proof/sunmeadow-walk-v15-guide-above-blockout-preview.mp4`

## Completed gates

- Six-pose owner-edited guide exported directly from V03 and ground-checked.
- Contact A mannequin approved.
- Down A mannequin corrected to retain readable knee bend and proportional leg mass.
- Passing A corrected: guide-limb ownership preserved. The planted orange-equivalent leg begins at screen-left pelvis and the lifted yellow-equivalent leg begins at screen-right pelvis.
- Contact B and Down B built with swapped stride ownership while retaining screen-left sword and screen-right shield.
- Passing B completes the six-pose mannequin loop.
- All blockout poses use ground line `y=90`; no visible blockout pixels may occur below it.

## Hard constraints

```text
Sword + connected sword arm: screen-left
Shield + connected shield arm: screen-right
Ground line: y=90
Visible pixels below ground: 0
Static V08 master: immutable
No runtime/renderer/manifests/integration without explicit owner approval
```

## Lessons learned

1. The owner-edited V03 guide is motion authority; export and inspect saved cels directly. Do not regenerate it.
2. A guide is a joint-path authority, not a set of broad strokes to inflate.
3. Build mannequin legs as separate pelvis → thigh → shin/foot masses; broad strokes collapse to an unreadable skirt/V mass.
4. Map every colour-coded guide leg by **pelvis-side origin, knee route, foot state, and depth order** before creating its monochrome equivalent. Endpoint-only reasoning caused the Passing A ownership error.
5. Before sharing a pose, review continuity, composition/negative space, and proportionality; correct obvious defects first.
6. For full-source silhouette work, use both overlays: V08 provides character identity; V15 provides approved motion mechanics. The older V04 silhouette study is a rejected diagnostic, not a drawing template.

## Current stage

**Stage:** source-form translation — first full-source monochrome Down A gate.

V16 contains locked, 40%-opacity authoring references:

```text
GUIDE — V08 static source
GUIDE — V15 Down A motion
POSE — Down A source silhouette
```

The pose layer has not yet been completed or approved. Final review/export must show only the `POSE` silhouette, never the reference overlays.

## Next single evidence gate

Hand-author one full-source-character **Down A monochrome silhouette** over the V16 references. It must retain the V08 head/plume, sword/arm, shield/arm, torso/pelvis, and source-specific equipment silhouette while following V15 Down A’s grounded feet, compression, and hip → knee → foot paths.

Stop for owner review after that one artifact. Do not advance to other source-form poses, flat colour, materials, secondary motion, or runtime integration.

## Out of scope

- Gameplay, simulation, AI, balance, controls, collision, camera, win conditions
- Commits, pushes, merges, deployments, and renderer integration
- Bramblecrest animation work
