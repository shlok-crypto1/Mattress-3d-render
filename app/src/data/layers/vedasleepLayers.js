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

// Maxa / Magic / Signature share the same confirmed band shape.
const vedaFiveBand = (coverColor, comfortColor, foamColor, coreColor, transitionColor, baseColor) => [
  cover(coverColor),
  foam('comfort', 2, 'Convoluted comfort foam', 0.09, comfortColor, 'convoluted'),
  foam('foam-3', 3, 'Comfort foam', 0.18, foamColor),
  foam('core', 4, 'Rebonded support core', 0.24, coreColor, 'speckled'),
  base(baseColor, 0.16, transitionColor, 0.12),
];

export const maxaLayers = vedaFiveBand('#E9E4D6', '#E4E3A8', '#6BC163', '#C9CE4E', '#E8871E', '#5D5C5C');

// SPEC CHANGE: Magic previously shipped as a single uniform 5" Float Sense Foam
// core with no internal divisions. That is superseded - Magic is a multi-band
// construction from here on.
//
// Magic is the first product with real proportions rather than the shared
// template's, so it no longer goes through vedaFiveBand. On a 5" mattress the
// cover and the base take their real thicknesses first - they are upholstery
// and a bonded base, not foam anyone specifies a percentage of - and the 5"
// left over is split across the foam: 80% to the support core, 15% to the
// comfort foam above it, the remaining 5% to the convoluted top band.
//
// Ratios are normalised against the product's real height at build time, so
// these are written as fractions of the whole 5" and sum to 1.
//
//   cover   0.070  ->  0.35"   upholstery
//   Layer 2 0.0405 ->  0.2025" convoluted        (5% of the 4.05" of foam)
//   Layer 3 0.1215 ->  0.6075" comfort foam      (15%)
//   Layer 4 0.6480 ->  3.24"   support core      (80%)
//   base    0.1200 ->  0.60"   bonded sheet + base
//
// Maxa and Signature deliberately still use vedaFiveBand: their proportions
// have not been given yet, and inventing them from Magic's would be a spec
// nobody has confirmed.
export const magicLayers = [
  cover('#E9E4D6', 0.07),
  foam('comfort', 2, 'Convoluted comfort foam', 0.0405, '#E4E3A8', 'convoluted'),
  foam('foam-3', 3, 'Comfort foam', 0.1215, '#6BC163'),
  foam('core', 4, 'Rebonded support core', 0.648, '#C9CE4E', 'speckled'),
  // Split kept at Magic's previous transition:base proportion (0.12 : 0.16).
  base('#5B5C5E', 0.0686, '#E8871E', 0.0514),
];

export const signatureLayers = vedaFiveBand('#E9E4D6', '#E4E3A8', '#DCD9C8', '#C9CE4E', '#E8871E', '#B79692');

export const vedasleepLayersBySlug = {
  duro: duroLayers,
  maxa: maxaLayers,
  magic: magicLayers,
  signature: signatureLayers,
};
