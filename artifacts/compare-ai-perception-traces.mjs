import { readFile } from 'node:fs/promises';

const [candidatePath, baselinePath] = process.argv.slice(2);
const candidate = JSON.parse(await readFile(candidatePath, 'utf8'));
const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));

for (const [label, trace] of [['CANDIDATE', candidate], ['BASELINE', baseline]]) {
  console.log(`\n${label}`);
  for (const row of trace.output) {
    const p = row.player;
    const a = row.ai;
    if (row.final) {
      console.log(`FINAL t=${row.time} ${row.matchState} P=${JSON.stringify(p.units)} ${p.command}/${p.goal}; A=${JSON.stringify(a.units)} ${a.command}/${a.goal}`);
      continue;
    }
    console.log(`t=${row.time} P=${JSON.stringify(p.units)} ${p.command}/${p.goal} comp=${JSON.stringify(p.composition)} vis=${JSON.stringify(p.visible)} mem=${JSON.stringify(p.remembered)}; A=${JSON.stringify(a.units)} ${a.command}/${a.goal} comp=${JSON.stringify(a.composition)} vis=${JSON.stringify(a.visible)} mem=${JSON.stringify(a.remembered)}`);
  }
}

console.log('\nFIRST CHECKPOINT DIFFERENCE');
for (let index = 0; index < Math.min(candidate.output.length, baseline.output.length); index += 1) {
  const left = candidate.output[index];
  const right = baseline.output[index];
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    console.log(JSON.stringify({ index, candidate: left, baseline: right }, null, 2));
    break;
  }
}
