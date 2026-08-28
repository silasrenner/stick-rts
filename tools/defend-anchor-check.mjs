import { CONFIG } from '../src/config.js';
import { createWorld, createStructure } from '../src/sim/world.js';
import { buyTurret } from '../src/sim/systems/economy.js';
import { updateProductionQueue } from '../src/sim/systems/production.js';
import { setTeamCommand } from '../src/sim/systems/commands.js';

const world = createWorld(117);
world.teams.player.gold = 5_000;
if (!buyTurret(world, 'player').ok) throw new Error('First buildable turret could not queue.');
updateProductionQueue(world, CONFIG.TURRET_BUILD_TIME);
world.structures.push(createStructure('player', CONFIG.PLAYER_HOME_X + CONFIG.STRUCTURE_SLOT_OFFSETS[0], CONFIG.GROUND_Y));
if (!buyTurret(world, 'player').ok) throw new Error('Second buildable turret could not queue.');
updateProductionQueue(world, CONFIG.TURRET_BUILD_TIME);
if (world.teams.player.defendAnchorIndex !== 0) throw new Error('A completed second turret must not automatically advance the selected defense anchor.');
setTeamCommand(world, 'player', 'defend', { userInitiated: true });
if (world.teams.player.defendAnchorIndex !== 0) throw new Error('First Player Defend must retain the inner turret.');
setTeamCommand(world, 'player', 'defend', { userInitiated: true });
if (world.teams.player.defendAnchorIndex !== 1) throw new Error('Second Player Defend must advance to the second turret.');
console.log('PASS — completed turrets do not move defense automatically; Player Defend advances outward.');
