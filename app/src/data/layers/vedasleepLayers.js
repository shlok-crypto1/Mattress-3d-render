// VedaSleep layer stacks, top band first. Same schema and same caveats as
// src/data/layers/foamicoLayers.js - see that file's header for what is
// placeholder and what is confirmed.
//
// Duro is the one product with real material names already signed off; every
// other band here is a numbered placeholder.

const TBD = 'Placeholder description - real material copy to follow.';

const cover = (color, ratio = 0.13) => ({
  id: 'cover',
  name: 'Layer 1 — TBD',
  role: 'Quilted knit cover',
  type: 'fabric-cover',
  thicknessRatio: ratio,
  color,
  description: TBD,
  nameTbd: true,
});

// One layer, not two - see the header of foamicoLayers.js for why the
// transition sheet and the base are inseparable and how `bonded` expresses it.
const base = (color, ratio, sheetColor, sheetRatio) => ({
  id: 'base',
  name: 'Base — TBD',
  role: 'Transition foam bonded to a fabric-wrapped base',
  type: 'fabric-base',
  thicknessRatio: ratio + sheetRatio,
  color,
  bonded: {
    color: sheetColor,
    surface: 'pyramid',
    fraction: sheetRatio / (ratio + sheetRatio),
  },
  description: TBD,
  nameTbd: true,
});

const foam = (id, index, role, ratio, color, surface) => ({
  id,
  name: `Layer ${index} — TBD`,
  role,
  type: 'foam',
  thicknessRatio: ratio,
  color,
  description: TBD,
  nameTbd: true,
  ...(surface ? { surface } : null),
});

// Duro — the corrected stack. The reference photo shows a green foam slab
// between AeroFlex and Ortho Bond; that layer is not in the real product and is
// deliberately absent here - do not add it back.
export const duroLayers = [
  {
    id: 'luxeknit',
    name: 'Super Plush LuxeKnit Fabric',
    role: 'Quilted knit cover',
    type: 'fabric-cover',
    thicknessRatio: 0.26,
    color: '#F4F1E8',
    description: 'Quilted knit cover over plush fibre fill.',
  },
  {
    id: 'aeroflex',
    name: 'AeroFlex Foam',
    role: 'Convoluted airflow foam',
    type: 'foam',
    surface: 'convoluted',
    thicknessRatio: 0.2,
    color: '#E7DD8F',
    description: 'Convoluted airflow foam for ventilation and pressure relief.',
  },
  {
    id: 'orthobond',
    name: 'Ortho Bond Foam',
    role: 'Rebonded support core',
    type: 'foam',
    surface: 'speckled',
    thicknessRatio: 0.24,
    color: '#DCD7CE',
    description: 'High-density rebonded foam for orthopaedic support.',
  },
  base('#646263', 0.16, '#E4883C', 0.14),
];

// Maxa — cover, one convoluted band, one foam layer, base.
//
// The rebonded support core that used to sit under layer 3 is gone, and layer 3
// is 100% of Maxa's foam: the product owner's specification. It therefore takes
// the core's share as well as its own (0.18 + 0.24 = 0.42) so the cover, the
// convoluted band and the bonded base keep the proportions they had. Written
// out rather than built from a shared template - Maxa is now the only product
// with this shape, and Magic's proportions are its own.
export const maxaLayers = [
  cover('#E9E4D6'),
  foam('comfort', 2, 'Convoluted comfort foam', 0.09, '#E4E3A8', 'convoluted'),
  foam('foam-3', 3, 'Comfort foam', 0.42, '#6BC163'),
  base('#5D5C5C', 0.16, '#E8871E', 0.12),
];

// SPEC CHANGE: Magic previously shipped as a single uniform 5" Float Sense Foam
// core with no internal divisions. That is superseded - Magic is a multi-band
// construction from here on.
//
// Magic's proportions are its own. On a 5" mattress the cover and the base take
// their real thicknesses first - they are upholstery and a bonded base, not
// foam anyone specifies a percentage of - and the 4.05" left over is foam. The
// convoluted top band keeps the 5% of that foam it has always had; the product
// owner splits what is under it 25% to layer 3 and 75% to layer 4.
//
// Ratios are normalised against the product's real height at build time, so
// these are written as fractions of the whole 5" and sum to 1.
//
//   cover   0.070     ->  0.350"  upholstery
//   Layer 2 0.0405    ->  0.203"  convoluted    (5% of the 4.05" of foam)
//   Layer 3 0.192375  ->  0.962"  comfort foam  (25% of the 3.8475" below it)
//   Layer 4 0.577125  ->  2.886"  support core  (75%)
//   base    0.1200    ->  0.600"  bonded sheet + base
export const magicLayers = [
  cover('#E9E4D6', 0.07),
  foam('comfort', 2, 'Convoluted comfort foam', 0.0405, '#E4E3A8', 'convoluted'),
  foam('foam-3', 3, 'Comfort foam', 0.192375, '#6BC163'),
  foam('core', 4, 'Rebonded support core', 0.577125, '#C9CE4E', 'speckled'),
  // Split kept at Magic's previous transition:base proportion (0.12 : 0.16).
  base('#5B5C5E', 0.0686, '#E8871E', 0.0514),
];

export const vedasleepLayersBySlug = {
  duro: duroLayers,
  maxa: maxaLayers,
  magic: magicLayers,
};
