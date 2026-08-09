import { CONFIG } from '../src/config.js';

const [nearTurret, farTurret] = CONFIG.TURRET_SLOT_OFFSETS;
if (!(nearTurret > CONFIG.MINE_OFFSET + 60)) throw new Error(`Near turret is too close to the mine: ${nearTurret}`);
if (!(farTurret >= nearTurret * 2.3)) throw new Error(`Outer turret should sit materially farther out than the inner turret: ${nearTurret}, ${farTurret}`);
if (CONFIG.DEFEND_SCREEN_OFFSET !== nearTurret) throw new Error('Inner-defense reference must track turret one.');
if (CONFIG.FORMATION_SLOT_SPACING_X < 60) throw new Error(`Formation columns are too crowded: ${CONFIG.FORMATION_SLOT_SPACING_X}`);
console.log('PASS — defense begins at the inner turret and extends outward toward the outer turret.');
