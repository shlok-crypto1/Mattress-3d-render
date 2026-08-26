// FOAMICO layer stacks, top band first.
//
// PLACEHOLDER DATA. `name` is a numbered stand-in and `description` is filler
// until the real material copy arrives; `thicknessRatio` is a relative
// proportion eyeballed from the reference cutaway renders in
// "Layers/<PRODUCT>.png", not a measured spec. `color` is sampled from those
// same renders and is a stand-in for real layer photography.
//
// What IS confirmed here is the shape of each stack: the count, the type and
// the order of the bands. `type` drives everything the renderer does - foam
// gets porous grain, fabric gets a woven sheen, coil gets an instanced spring
// unit - so no product is special-cased by slug anywhere in the viewer.
//
// `thicknessRatio` values are relative and normalised against the product's
// real height at build time, so they do not need to sum to 1.
// `surface` is optional and only refines how a band is sculpted:
//   convoluted  egg-crate comfort foam      pyramid  sawtooth transition foam
//   speckled    rebonded chip core          channelled  zoned cut support core
//   quilted / woven  fabric

const TBD = 'Placeholder description - real material copy to follow.';

const cover = (color, ratio = 0.09) => ({
  id: 'cover',
  name: 'Layer 1 — TBD',
  role: 'Quilted knit cover',
  type: 'fabric-cover',
  thicknessRatio: ratio,
  color,
  description: TBD,
  nameTbd: true,
});

// `color` is sampled from the product's own textures/<slug>/bottom.png rather
// than eyeballed off the cutaway render. The band is wrapped in that same
// photograph on its underside, so any other value showed the base as one colour
// on its cut face and another on the cloth immediately below it.
const base = (color, ratio = 0.13) => ({
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

// Resto — cover + six foam bands + base. No coil.
export const restoLayers = [
  cover('#B9BCC2'),
  foam('comfort', 2, 'Convoluted comfort foam', 0.09, '#C9D14A', 'convoluted'),
  foam('foam-3', 3, 'Comfort foam', 0.1, '#29B6DC'),
  foam('foam-4', 4, 'Comfort foam', 0.1, '#C07CE0'),
  foam('foam-5', 5, 'Support foam', 0.12, '#EDEDEA'),
  foam('foam-6', 6, 'Support core', 0.2, '#A5764E'),
  foam('transition', 7, 'Pyramid transition foam', 0.15, '#F0921E', 'pyramid'),
  base('#484648'),
];

// Sova — cover + six foam bands (one rebonded chip core) + base.
export const sovaLayers = [
  cover('#E4E4EC'),
  foam('comfort', 2, 'Convoluted comfort foam', 0.09, '#D2D95E', 'convoluted'),
  foam('foam-3', 3, 'Comfort foam', 0.1, '#37B9E0'),
  foam('foam-4', 4, 'Comfort foam', 0.1, '#C07CE0'),
  foam('foam-5', 5, 'Support foam', 0.12, '#6FC04A'),
  foam('core', 6, 'Rebonded support core', 0.2, '#D8D5CC', 'speckled'),
  foam('transition', 7, 'Pyramid transition foam', 0.15, '#F0921E', 'pyramid'),
  base('#565555'),
];

// Luma — the only stack in either line with a pocketed spring unit.
export const lumaLayers = [
  cover('#DCDEEC'),
  foam('comfort', 2, 'Convoluted comfort foam', 0.08, '#D6DC72', 'convoluted'),
  foam('foam-3', 3, 'Comfort foam', 0.13, '#F0EFEC'),
  foam('coil-top', 4, 'Coil insulator pad', 0.05, '#8C3A22'),
  {
    id: 'coils',
    name: 'Layer 5 — TBD',
    role: 'Pocketed spring unit',
    type: 'coil',
    thicknessRatio: 0.28,
    color: '#F2F1ED',
    description: TBD,
    nameTbd: true,
  },
  foam('coil-bottom', 6, 'Coil insulator pad', 0.05, '#8C3A22'),
  foam('transition', 7, 'Pyramid transition foam', 0.13, '#F0921E', 'pyramid'),
  base('#616163', 0.14),
];

// Ultima — the deepest stack: cover + six foam bands + base.
export const ultimaLayers = [
  cover('#EFEFEC'),
  foam('comfort', 2, 'Convoluted comfort foam', 0.08, '#C9D14A', 'convoluted'),
  foam('foam-3', 3, 'Comfort foam', 0.09, '#29B6DC'),
  foam('foam-4', 4, 'Comfort foam', 0.09, '#C07CE0'),
  foam('core', 5, 'Rebonded support core', 0.16, '#E8E6E1', 'speckled'),
  foam('foam-6', 6, 'Support foam', 0.18, '#B9B4AE'),
  foam('transition', 7, 'Pyramid transition foam', 0.14, '#F0921E', 'pyramid'),
  base('#464846'),
];

// Riva — foam only, explicitly no coil band.
export const rivaLayers = [
  cover('#E8E8E6'),
  foam('foam-2', 2, 'Comfort foam', 0.1, '#D8D6BE'),
  foam('foam-3', 3, 'Comfort foam', 0.1, '#EFEFEC'),
  foam('foam-4', 4, 'Support foam', 0.11, '#C21E4E'),
  foam('foam-5', 5, 'Support foam', 0.11, '#D3D2BC'),
  foam('core', 6, 'Zoned support core', 0.2, '#A9A44E', 'channelled'),
  foam('transition', 7, 'Pyramid transition foam', 0.15, '#F0921E', 'pyramid'),
  base('#585559'),
];

export const foamicoLayersBySlug = {
  resto: restoLayers,
  sova: sovaLayers,
  luma: lumaLayers,
  ultima: ultimaLayers,
  riva: rivaLayers,
};
