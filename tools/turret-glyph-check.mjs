import { getBuildGlyphVariant } from '../src/render/ui.js';

if (getBuildGlyphVariant({ action: 'turret', kind: 'turret' }) !== 'turret') {
  throw new Error('Turret build button must use the dedicated turret glyph.');
}
if (getBuildGlyphVariant({ action: 'unit', kind: 'warrior' }) !== 'unit') {
  throw new Error('Unit build buttons must continue to use unit glyphs.');
}
console.log('PASS — turret button is routed to a dedicated turret glyph.');
