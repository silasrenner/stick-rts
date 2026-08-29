import { CONFIG } from '../src/config.js';
import { getLandingRavenFogSource, getLandingRavenFrame, LANDING_RAVEN_REVEAL_LINGER_SECONDS } from '../src/render/landingRaven.js';
import { getControlSurfaceStyle } from '../src/render/ui.js';

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const flightDuration = (CONFIG.WORLD_WIDTH + 120) / 560;

expect(getLandingRavenFrame(0) !== null, 'Landing Raven must be present at the start of its flight.');
const flightSource = getLandingRavenFogSource(0);
expect(flightSource?.radius === CONFIG.RAVEN.movingVisionRadius, 'Flying landing Raven must clear with the gameplay Raven vision radius.');
expect(flightSource?.alpha === 1, 'Flying landing Raven clearance must begin fully clear.');

const lingeringSource = getLandingRavenFogSource(flightDuration + LANDING_RAVEN_REVEAL_LINGER_SECONDS / 2);
expect(lingeringSource !== null, 'Landing fog clearance must linger after the Raven exits.');
expect(lingeringSource.alpha > 0 && lingeringSource.alpha < 1, 'Lingering landing fog clearance must restore gradually.');
expect(getLandingRavenFogSource(flightDuration + LANDING_RAVEN_REVEAL_LINGER_SECONDS) === null, 'Landing fog must fully restore after the linger interval.');

const normal = getControlSurfaceStyle();
const active = getControlSurfaceStyle({ active: true });
const disabled = getControlSurfaceStyle({ disabled: true });
expect(normal.fill !== '#17171d' && normal.border !== '#55555f', 'Normal controls must separate from the canvas background and old muted border.');
expect(active.border !== normal.border, 'Active controls must have a distinct hierarchy signal.');
expect(disabled.label !== normal.label, 'Disabled controls must remain visibly distinct.');

console.log('PASS — landing Raven fog lifecycle and elevated control hierarchy contracts hold.');
