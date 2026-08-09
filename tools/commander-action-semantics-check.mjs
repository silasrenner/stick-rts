import { CONFIG } from '../src/config.js';
import { createWorld, createUnit } from '../src/sim/world.js';
import { updateFormationSlots } from '../src/sim/systems/formation.js';
import { applyCommanderDecision } from '../src/commander/runtime.js';
import { getCommanderTargetAnchor, validateCommanderTargetIntent } from '../src/commander/actionContract.js';

const world = createWorld(9201);
const player = 'player';
const ai = 'ai';
const midpoint = (CONFIG.PLAYER_HOME_X + CONFIG.AI_HOME_X) / 2;

const expected = {
  'hold-own-mine': { command: 'defend', x: world.mines[player].x },
  'contest-mid': { command: 'attack', x: midpoint },
  'pressure-enemy-mine': { command: 'attack', x: world.mines[ai].x },
  'siege-enemy-outer': { command: 'attack', x: CONFIG.AI_HOME_X - CONFIG.TURRET_SLOT_OFFSETS[1] },
  'attack-enemy-core': { command: 'attack', x: world.statues[ai].x },
  'retreat-home': { command: 'retreat', x: CONFIG.PLAYER_HOME_X },
};

for (const [targetIntent, expectedAnchor] of Object.entries(expected)) {
  const result = validateCommanderTargetIntent(targetIntent, expectedAnchor.command);
  if (!result.ok) throw new Error(`${targetIntent} should validate: ${JSON.stringify(result)}`);
  const anchor = getCommanderTargetAnchor(world, player, targetIntent);
  if (!anchor || anchor.x !== expectedAnchor.x || anchor.command !== expectedAnchor.command) {
    throw new Error(`${targetIntent} mapped to the wrong deterministic anchor: ${JSON.stringify(anchor)}`);
  }
}

const unit = createUnit('warrior', player, CONFIG.PLAYER_HOME_X, CONFIG.GROUND_Y);
world.units.push(unit);
for (const [targetIntent, expectedAnchor] of Object.entries(expected)) {
  if (targetIntent === 'retreat-home') continue;
  const applied = applyCommanderDecision(world, player, {
    ok: true,
    decision: { command: expectedAnchor.command, objective: 'pressure', targetIntent, horizonSeconds: 30, purchasePriority: ['warrior'] },
  });
  if (!applied.ok) throw new Error(`${targetIntent} was rejected by the commander runtime.`);
  updateFormationSlots(world);
  if (unit.slotX !== expectedAnchor.x) {
    throw new Error(`${targetIntent} did not drive the formation to its mapped anchor: expected ${expectedAnchor.x}, received ${unit.slotX}`);
  }
}

for (const [targetIntent, wrongCommand] of [['hold-own-mine', 'attack'], ['contest-mid', 'defend'], ['retreat-home', 'attack']]) {
  const result = validateCommanderTargetIntent(targetIntent, wrongCommand);
  if (result.ok || result.reason !== 'rejected-schema') {
    throw new Error(`Invalid command/target pairing was accepted: ${targetIntent}/${wrongCommand}`);
  }
}

console.log('PASS — every commander target intent has one explicit legal command and real-world anchor.');
