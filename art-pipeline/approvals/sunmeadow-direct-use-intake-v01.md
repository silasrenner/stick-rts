# Sunmeadow Direct-Use Intake v01

**Parent master:** `assets/art/source/sunmeadow/sunmeadow-league-assets-master.jpg`  
**Purpose:** classify what may be extracted from the supplied master before any new image generation or renderer replacement.

| Candidate | Visible source content | Intake classification | Required work before runtime use |
|---|---|---|---|
| Mine | Pale-stone mine entrance, green banner, lantern/smoke, flower/grass base | **Crop + clean extraction** | Tighten crop; remove the sheet’s dark backdrop and neighbouring units; define a ground anchor. Damage/destroyed variants are missing. |
| Watchtower | Round pale-stone tower, green conical roof, gold pennant, green banner | **Crop + clean extraction** | Tighten crop; remove backdrop/neighbour content; define ground anchor. Damage/destroyed variants are missing. |
| Hearthhall | Timber-and-stone house, green roof, chimney smoke, supply crates/fence | **Crop + clean extraction** | Tighten crop; remove backdrop/neighbour content; define ground anchor. Damage/destroyed variants are missing. |
| Sunspire / Core | Large cream-stone civic castle, green domes, blue-and-gold banners, glowing blue entry | **Crop + clean extraction** | Tighten crop; remove nearby hero row; define ground anchor. Damage/destroyed variants are missing. |
| Miner | Miner appears among a multi-role roster, not as an isolated game frame | **Role isolation + derivative states** | Extract a clean single-unit base pose, then create/approve walk, mine, carry, defeat states. |
| Warrior | Shield/sword infantry appears in a multi-role roster | **Role isolation + derivative states** | Extract a clean single-unit base pose, then create/approve walk, attack, defeat states. |
| Archer | Bow-bearing infantry appears in a multi-role roster | **Role isolation + derivative states** | Extract a clean single-unit base pose, then create/approve walk, fire, defeat states. |
| Hero family | Several larger hero illustrations and mounted figures | **Derivative design input** | Choose the first playable hero silhouette; create a side-view, ground-anchored gameplay family. The current art is not a drop-in animated sprite sheet. |

## Owner decision — 2026-08-01

**Approved:** Mine, Watchtower, Hearthhall, and Sunspire are the correct direct source masters for Sunmeadow buildings.

**Deferred deliberately:** alpha/background cleanup, neighbouring-fragment cleanup, ground anchors, and damaged/destroyed states. Do not block source intake or broader asset planning on that cleanup.

## Intake conclusion

The master is excellent direct source material, but it is an **art board**, not an export-ready atlas. Buildings are the first direct-use candidates after clean extraction. Unit and hero content must be isolated and receive state-specific derivatives before runtime integration. This is not a request to regenerate their visual identity—the master remains the parent source for every derivative.
