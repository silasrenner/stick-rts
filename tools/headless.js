// Headless runner: drives matches through the same src/sim/** modules the
// browser uses (see sim/tick.js), with no canvas or DOM. Uses dynamic
// import() so this stays a plain CommonJS script — no package.json/build
// step needed to run it.
//
// Usage:
//   node tools/headless.js
//     Scripted invariant check (default): gold never negative, cap never
//     exceeded, statue immune while structures stand.
//
//   node tools/headless.js --batch --player=<easy|medium|hard> --enemy=<easy|medium|hard> --trials=N [--ticks=N]
//     Runs N AI-vs-AI trials at the given difficulty pairing and reports
//     win rate / match length — the AI-vs-AI evaluation tool PLAN.md §2.5
//     designed this file toward from the start.

function getArg(args, name, fallback) {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

async function runInvariantCheck() {
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

async function runBatch(args) {
  const { createWorld } = await import('../src/sim/world.js');
  const { runTick } = await import('../src/sim/tick.js');

  const playerDifficulty = getArg(args, 'player', 'medium');
  const enemyDifficulty = getArg(args, 'enemy', 'medium');
  const trials = parseInt(getArg(args, 'trials', '10'), 10);
  // S8: raised from 60000 — the production queue roughly triples average
  // match length (verified: several pairings that used to resolve by
  // ~1000s now take up to ~1400s), so the old default was cutting off
  // matches that go on to resolve cleanly, misreporting them "undecided."
  const maxTicks = parseInt(getArg(args, 'ticks', '180000'), 10); // ~3000 simulated seconds

  const dt = 1 / 60;
  const results = [];

  for (let trial = 0; trial < trials; trial++) {
    const world = createWorld();
    world.teams.player.difficulty = playerDifficulty;
    world.teams.ai.difficulty = enemyDifficulty;

    let ticks = 0;
    for (; ticks < maxTicks; ticks++) {
      runTick(world, dt);
      if (world.matchState !== 'playing') break;
    }

    results.push({ outcome: world.matchState, ticks });
  }

  console.log(`AI-vs-AI batch: player=${playerDifficulty} vs enemy=${enemyDifficulty}, ${trials} trial(s)\n`);

  let playerWins = 0;
  let enemyWins = 0;
  let undecided = 0;
  let totalTicks = 0;

  results.forEach((r, i) => {
    const winner = r.outcome === 'won' ? 'player' : r.outcome === 'lost' ? 'enemy' : 'undecided';
    if (winner === 'player') playerWins++;
    else if (winner === 'enemy') enemyWins++;
    else undecided++;
    totalTicks += r.ticks;
    console.log(`  trial ${i + 1}: ${winner} wins (${(r.ticks / 60).toFixed(1)}s)`);
  });

  console.log(
    `\nplayer(${playerDifficulty}) wins: ${playerWins}/${trials}  ` +
      `enemy(${enemyDifficulty}) wins: ${enemyWins}/${trials}  ` +
      `undecided: ${undecided}/${trials}  avg length: ${(totalTicks / trials / 60).toFixed(1)}s`
  );

  process.exit(0);
}

const args = process.argv.slice(2);

if (args.includes('--batch')) {
  runBatch(args).catch((err) => {
    console.error('Headless batch runner crashed:', err);
    process.exit(1);
  });
} else {
  runInvariantCheck().catch((err) => {
    console.error('Headless runner crashed:', err);
    process.exit(1);
  });
}
