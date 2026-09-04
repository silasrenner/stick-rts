export function getTotalGoldDifference(world) {
  const total = (team) => world.teams[team].gold + (world.teams[team].goldSpent ?? 0);
  return total('player') - total('ai');
}

export function recordGoldHistory(world) {
  const history = world.goldHistory;
  while (world.matchElapsedTime >= history.nextSampleAt) {
    history.samples.push({ time: history.nextSampleAt, difference: getTotalGoldDifference(world) });
    history.nextSampleAt += 1;
  }
}

export function getGoldChartScale(samples) {
  return Math.max(1, ...samples.map((sample) => Math.abs(sample.difference)));
}

export function formatGameTime(seconds) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(wholeSeconds / 60)).padStart(2, '0')}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

export function getGoldChartSegments(samples, x, y, width, height) {
  if (samples.length < 2) return [];
  const maxTime = Math.max(1, samples.at(-1).time);
  const maxAbs = getGoldChartScale(samples);
  const zeroY = y + height / 2;
  const point = (sample) => ({ x: x + width * (sample.time / maxTime), y: zeroY - (sample.difference / maxAbs) * (height / 2) });
  return samples.slice(1).map((sample, index) => ({ team: sample.difference >= 0 ? 'player' : 'ai', from: point(samples[index]), to: point(sample), zeroY }));
}
