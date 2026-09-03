import { CONFIG } from '../src/config.js';

const [nearTurret, ...outerTurrets] = CONFIG.TURRET_SLOT_OFFSETS;
const outerSpacing = 520;
if (nearTurret !== 700 || !(nearTurret > CONFIG.MINE_OFFSET + 60)) throw new Error(`First buildable turret must clear the miner/deposit line at 700px; got ${nearTurret}.`);
for (const [index, turret] of outerTurrets.entries()) {
  const expected = nearTurret + (index + 1) * outerSpacing;
  if (turret !== expected) throw new Error(`Buildable turret ${index + 2} must preserve the ${outerSpacing}px outward spacing: expected ${expected}, got ${turret}.`);
}
if (CONFIG.DEFEND_SCREEN_OFFSET !== nearTurret) throw new Error('Inner-defense reference must track turret one.');
if (CONFIG.FORMATION_SLOT_SPACING_X < 60) throw new Error(`Formation columns are too crowded: ${CONFIG.FORMATION_SLOT_SPACING_X}`);
console.log('PASS — first buildable turret clears miners and all defense turrets extend outward at the approved 520px spacing.');
