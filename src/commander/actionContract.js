import { CONFIG } from '../config.js';

const TARGET_COMMANDS = {
  'hold-own-mine': 'defend',
  'contest-mid': 'attack',
  'pressure-enemy-mine': 'attack',
  'siege-enemy-outer': 'attack',
  'attack-enemy-core': 'attack',
  'retreat-home': 'retreat',
};

export const COMMANDER_TARGET_INTENTS = Object.freeze(Object.keys(TARGET_COMMANDS));

function homeX(team) {
  return team === 'player' ? CONFIG.PLAYER_HOME_X : CONFIG.AI_HOME_X;
}

function enemyTeam(team) {
  return team === 'player' ? 'ai' : 'player';
}

// A named target is mapped only from real map/config locations. It is never a
// hidden tactical preference or a free-form coordinate supplied by the model.
export function getCommanderTargetAnchor(world, team, targetIntent) {
  const command = TARGET_COMMANDS[targetIntent];
  if (!command) return null;
  const enemy = enemyTeam(team);
  const direction = team === 'player' ? 1 : -1;
  const ownHome = homeX(team);
  const enemyHome = homeX(enemy);
  const anchors = {
    'hold-own-mine': { id: 'own-mine', x: world.mines[team].x, command },
    'contest-mid': { id: 'midpoint', x: (CONFIG.PLAYER_HOME_X + CONFIG.AI_HOME_X) / 2, command },
    'pressure-enemy-mine': { id: 'enemy-mine', x: world.mines[enemy].x, command },
    'siege-enemy-outer': { id: 'enemy-outer-turret', x: enemyHome - direction * CONFIG.TURRET_SLOT_OFFSETS[1], command },
    'attack-enemy-core': { id: 'enemy-core', x: world.statues[enemy].x, command },
    'retreat-home': { id: 'home', x: ownHome, command },
  };
  return anchors[targetIntent];
}

export function validateCommanderTargetIntent(targetIntent, command) {
  const expectedCommand = TARGET_COMMANDS[targetIntent];
  if (!expectedCommand) return { ok: false, reason: 'rejected-schema', detail: 'invalid targetIntent' };
  if (command !== expectedCommand) return { ok: false, reason: 'rejected-schema', detail: `targetIntent ${targetIntent} requires ${expectedCommand}` };
  return { ok: true };
}
