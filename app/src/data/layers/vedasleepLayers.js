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

const base = (color, ratio = 0.16) => ({
  id: 'base',
  name: 'Base — TBD',
  role: 'Fabric-wrapped base',
  type: 'fabric-base',
  thicknessRatio: ratio,
  color,
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
  {
    id: 'transition',
    name: 'Layer 4 — TBD',
    role: 'Pyramid transition foam',
    type: 'foam',
    surface: 'pyramid',
    thicknessRatio: 0.14,
    color: '#E4883C',
    description: TBD,
    nameTbd: true,
  },
  base('#DCD3BE'),
];

// Maxa / Magic / Signature share the same confirmed band shape.
const vedaFiveBand = (coverColor, comfortColor, foamColor, coreColor, transitionColor, baseColor) => [
  cover(coverColor),
  foam('comfort', 2, 'Convoluted comfort foam', 0.09, comfortColor, 'convoluted'),
  foam('foam-3', 3, 'Comfort foam', 0.18, foamColor),
  foam('core', 4, 'Rebonded support core', 0.24, coreColor, 'speckled'),
  foam('transition', 5, 'Pyramid transition foam', 0.12, transitionColor, 'pyramid'),
  base(baseColor),
];

export const maxaLayers = vedaFiveBand('#E9E4D6', '#E4E3A8', '#6BC163', '#C9CE4E', '#E8871E', '#B9AE96');

// SPEC CHANGE: Magic previously shipped as a single uniform 5" Float Sense Foam
// core with no internal divisions. That is superseded - Magic is a multi-band
// construction from here on.
export const magicLayers = vedaFiveBand('#E9E4D6', '#E4E3A8', '#6BC163', '#C9CE4E', '#E8871E', '#B9AE96');

export const signatureLayers = vedaFiveBand('#E9E4D6', '#E4E3A8', '#DCD9C8', '#C9CE4E', '#E8871E', '#B9AE96');

export const vedasleepLayersBySlug = {
  duro: duroLayers,
  maxa: maxaLayers,
  magic: magicLayers,
  signature: signatureLayers,
};
