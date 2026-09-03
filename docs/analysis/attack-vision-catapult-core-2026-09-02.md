# Attack vision, Catapult sight, full-map zoom, and core scale — 2026-09-02

## Scope

A local-only review candidate extends Player presentation disclosure from attacked enemy statics to all actively targeted enemy entities, adds Catapult team vision, corrects the full-map zoom minimum after the world grew to 6200 pixels, and makes both core render paths three times larger.

## Rules and boundaries

- `getPlayerAttackTargetRevealSources` is renderer-only. It reads a living Player unit's current `targetId`, emits the living AI target's configured vision bubble, and stops immediately once that target is cleared. It does not add simulation vision sources, alter AI knowledge, or change targeting/combat.
- Catapult vision is authoritative team vision at `900` pixels, equal to its acquisition range. It is a normal `VISION_RANGES.units` entry; no special fog/AI exception exists.
- `CAMERA_ZOOM_MIN` derives from `VIEWPORT_WIDTH / WORLD_WIDTH`. At the current `1400/6200`, the visible world width is exactly 6200 and panning clamps to zero.
- `CORE_RENDER_SCALE: 3` changes only Canvas dimensions: live core, known fog silhouette, and live health-bar geometry. Core HP, range, vision radius, and mechanics are untouched.

## Focused evidence

`tools/attack-vision-core-scale-check.mjs` verifies:

1. A targeted hidden enemy mobile receives one Player disclosure source at its configured radius and loses it when the Player target clears.
2. A Catapult contributes 900 team vision.
3. Zoom-out clamps at the derived full-map minimum and cannot pan beyond the map.
4. Live and fogged-known core body/outline dimensions are 102×240, with a 120-pixel health bar above the live core.

## Retained checks

Passed: Player fog, vision/fog Canvas rendering, vision sustain, Catapult production/combat, core-turret shield, and the 5,000-tick headless invariant run.

## Browser/LAN review limitation

A headless Chrome CDP fixture served from the candidate LAN server set full-map zoom, one Player Catapult, and one distant targeted AI Warrior. It confirmed a `1400×540` canvas and a 6200-pixel visible world width, then captured `artifacts/screenshots/attack-vision-catapult-core-browser.png`. The fixture is an explicit render/input-state proof, not a natural-match timing replay. No remote push or production deployment occurred.
