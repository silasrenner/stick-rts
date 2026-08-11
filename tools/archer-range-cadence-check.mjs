import { CONFIG } from '../src/config.js';
const archer = CONFIG.UNIT_STATS.archer;
if (archer.range !== 260) throw new Error(`Expected archer range 260; got ${archer.range}`);
if (archer.attackCooldown !== 1.5) throw new Error(`Expected archer cooldown 1.5; got ${archer.attackCooldown}`);
console.log('PASS — archer has 260 range and a 1.5-second attack cooldown.');
