import { CONFIG } from '../../config.js';

function ravenSource(raven, sourceType, radius) {
  return {
    team: raven.team,
    x: raven.x,
    y: raven.y,
    radius,
    active: true,
    ravenId: raven.id,
    ravenSource: sourceType,
  };
}

function synchronizeRavenVisionSources(world) {
  const nonRavenSources = (world.visionSources ?? []).filter((source) => source.ravenId == null);
  const ravenSources = [];
  for (const raven of world.ravens) {
    if (raven.state === 'flying') ravenSources.push(ravenSource(raven, 'moving', CONFIG.RAVEN.movingVisionRadius));
    if (raven.state === 'revealing') ravenSources.push(ravenSource(raven, 'reveal', CONFIG.RAVEN.enemyBaseRevealRadius));
  }
  world.visionSources = [...nonRavenSources, ...ravenSources];
}

// Separate temporary-action lifecycle. It consumes no RNG and never calls
// movement/combat/formation systems; visibility consumers see only generic
// descriptors projected into world.visionSources.
export function updateRavens(world, dt) {
  for (const team of ['player', 'ai']) {
    world.teams[team].ravenCooldownTimer = Math.max(0, world.teams[team].ravenCooldownTimer - dt);
  }

  for (const raven of world.ravens) {
    if (raven.state === 'preparing') {
      raven.preparationRemaining -= dt;
      if (raven.preparationRemaining <= 1e-9) {
        raven.preparationRemaining = 0;
        raven.state = 'flying';
      }
      continue;
    }
    if (raven.state === 'flying') {
      raven.x += raven.direction * CONFIG.RAVEN.movementSpeed * dt;
      if ((raven.x - raven.enemyHomeX) * raven.direction >= 0) {
        raven.x = raven.enemyHomeX;
        raven.state = 'revealing';
        raven.revealRemaining = CONFIG.RAVEN.revealDuration;
      }
      continue;
    }
    if (raven.state === 'revealing') {
      raven.revealRemaining -= dt;
      if (raven.revealRemaining <= 1e-9) {
        raven.revealRemaining = 0;
        raven.state = 'exiting';
      }
      continue;
    }
    if (raven.state === 'exiting') raven.x += raven.direction * CONFIG.RAVEN.exitSpeed * dt;
  }

  world.ravens = world.ravens.filter((raven) =>
    raven.state !== 'exiting' || Math.abs(raven.x - raven.enemyHomeX) < CONFIG.RAVEN.exitDistance,
  );
  synchronizeRavenVisionSources(world);
}
