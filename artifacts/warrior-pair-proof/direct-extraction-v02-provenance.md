# Warrior Direct-Extraction V02 — Provenance

**Status:** Gate A review candidate only. Not renderer-integrated, animated, committed, or pushed.

## Rule used

Each candidate is a literal source-pixel extraction. Visible RGB values are byte-identical to the selected source pixels. The only automated operation was conservative removal of the surrounding near-black matte, plus a one-pixel alpha rim to avoid clipping dark linework. No palette substitution, resampling, repaint, pose change, or semantic redraw occurred.

## Sunmeadow

- Parent: `canonical-source-crops/sunmeadow-warrior-left-centered-v03.png`
- Selected source rectangle: `x=0..109`, `y=48..144` (`110×97`)
- Editable source: `assets/art/editable/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v02.aseprite`
- Transparent candidate: `assets/art/runtime-candidates/sunmeadow/warrior/sunmeadow-warrior-direct-extraction-v02.png`

## Bramblecrest

- Parent: `bramblecrest-intake-v01/preferred-role-sources-v02/warrior-shield-source.png`
- Selected source rectangle: entire original crop (`170×130`)
- Editable source: `assets/art/editable/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v02.aseprite`
- Transparent candidate: `assets/art/runtime-candidates/bramblecrest/warrior/bramblecrest-warrior-direct-extraction-v02.png`

## Verification

`tools/warrior-direct-extraction-check.py` verifies that:

1. candidate dimensions retain the selected native source bounds;
2. each candidate contains both transparent background and visible pixels;
3. every visible candidate RGB pixel exactly equals the corresponding selected source RGB pixel.

Review sheet: `artifacts/warrior-pair-proof/warrior-direct-extraction-v02-contact-sheet.png`.
