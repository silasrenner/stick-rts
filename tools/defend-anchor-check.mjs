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
if (world.teams.player.defendAnchor !== 'outer') throw new Error('Second turret must advance the defend anchor outward.');
setTeamCommand(world, 'player', 'defend', { userInitiated: true });
if (world.teams.player.defendAnchor !== 'inner') throw new Error('Player Defend reissue must fall back to the inner turret.');
console.log('PASS — second turret advances defense and player Defend falls back to turret one.');
