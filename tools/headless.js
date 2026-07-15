// Headless invariant runner: drives a scripted match through the same
// src/sim/** modules the browser uses (see sim/tick.js), with no canvas
// or DOM. Uses dynamic import() so this stays a plain CommonJS script —
// no package.json/build step needed to run it.
//
// Usage: node tools/headless.js

async function main() {
  const { createWorld, isAliveEntity } = await import('../src/sim/world.js');
  const { runTick } = await import('../src/sim/tick.js');
  const { buyUnit, buyStructure, getUnitCount } = await import('../src/sim/systems/economy.js');
  const { getCap, livingStructures } = await import('../src/sim/systems/supply.js');
  const { setTeamCommand } = await import('../src/sim/systems/commands.js');

  const world = createWorld();

  for (const team of ['player', 'ai']) {
    buyUnit(world, team, 'miner');
    buyUnit(world, team, 'warrior');
    buyUnit(world, team, 'warrior');
    buyUnit(world, team, 'archer');
    buyStructure(world, team);
    setTeamCommand(world, team, 'attack');
  }

  const dt = 1 / 60;
  const maxTicks = 5000; // ~83 simulated seconds
  const violations = {};
  let ranTicks = 0;

  for (let tick = 0; tick < maxTicks; tick++) {
    runTick(world, dt);
    ranTicks = tick + 1;

    for (const team of ['player', 'ai']) {
      const gold = world.teams[team].gold;
      if (gold < 0 && !violations.negativeGold) {
        violations.negativeGold = `tick ${tick}: ${team} gold went negative (${gold})`;
      }

      const count = getUnitCount(world, team);
      const cap = getCap(world, team);
      if (count > cap && !violations.capExceeded) {
        violations.capExceeded = `tick ${tick}: ${team} unit count ${count} exceeded cap ${cap}`;
      }

      const statue = world.statues[team];
      const hasStructures = livingStructures(world, team).length > 0;
      if (hasStructures && isAliveEntity(statue) && statue.hp < statue.maxHp && !violations.statueGating) {
        violations.statueGating =
          `tick ${tick}: ${team} statue took damage (hp ${statue.hp}/${statue.maxHp}) while structures still stood`;
      }
    }

    if (world.matchState !== 'playing') break;
  }

  console.log(`Ran ${ranTicks} ticks. Final matchState: ${world.matchState}`);
  for (const team of ['player', 'ai']) {
    const statue = world.statues[team];
    console.log(
      `  ${team}: gold=${world.teams[team].gold} units=${getUnitCount(world, team)}/${getCap(world, team)} ` +
        `statueHp=${statue.hp}/${statue.maxHp} structures=${livingStructures(world, team).length}`
    );
  }

  const failures = Object.values(violations);
  if (failures.length > 0) {
    console.error(`\nFAIL — ${failures.length} invariant violation(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log('\nPASS — gold never negative, cap never exceeded, statue immune while structures stood.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Headless runner crashed:', err);
  process.exit(1);
});
