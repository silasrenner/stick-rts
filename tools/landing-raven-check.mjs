import { getLandingRavenFrame, LANDING_RAVEN_INTERVAL_SECONDS, LANDING_RAVEN_SPEED } from '../src/render/landingRaven.js';

const canvasWidth = 1400;
const first = getLandingRavenFrame(0, canvasWidth);
if (!first || first.x !== -60 || first.speed !== LANDING_RAVEN_SPEED) throw new Error(`Landing Raven must enter from the left at its normal speed: ${JSON.stringify(first)}`);
const mid = getLandingRavenFrame(1, canvasWidth);
if (!(mid.x > first.x && mid.x < canvasWidth + 60)) throw new Error(`Landing Raven must advance during its flight: ${JSON.stringify({ first, mid })}`);
const afterFlight = getLandingRavenFrame(10, canvasWidth);
if (afterFlight !== null) throw new Error(`Landing Raven must be absent between passes: ${JSON.stringify(afterFlight)}`);
if (!(LANDING_RAVEN_INTERVAL_SECONDS >= 10 && LANDING_RAVEN_INTERVAL_SECONDS <= 20)) throw new Error(`Landing Raven repeat wait must be 10–20 seconds: ${LANDING_RAVEN_INTERVAL_SECONDS}`);
console.log('PASS — landing Raven is a menu-only 1× wall-clock fly-by with a bounded repeat interval.');
