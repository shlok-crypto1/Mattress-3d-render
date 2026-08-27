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
// The transition sheet and the fabric-wrapped base are ONE layer.
//
// The pierced foam sheet is bonded to the top of the base - glued on, not a
// band anyone could lift off it - so the stack must never pull the two apart.
// `bonded` describes the sheet riding on top: it keeps its own sculpted relief
// so it still reads as the orange foam pasted onto the base, and `fraction` is
// its share of the band's thickness. The two ratios are passed separately at
// each call site and summed here, so the proportions stay exactly what they
// were when these shipped as two bands - the merge changes what the stack does,
// not what it looks like.
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

// Layers 3-6 are the foam a product is specified by, and the product owner
// gives their split as percentages of that foam, not of the mattress: 30 / 30 /
// 20 / 20 from the bottom up (layer 6 and layer 5 at 30% each, layers 4 and 3 at
// 20% each). The cover, the convoluted top band and the bonded base are
// unchanged - they are upholstery and a base, not foam anyone quotes a
// percentage of - so the four bands keep their combined 0.52 of the stack and
// only divide it differently. 0.52 x 0.20 = 0.104, 0.52 x 0.30 = 0.156.

// Resto — cover + six foam bands + base. No coil.
export const restoLayers = [
  cover('#B9BCC2'),
  foam('comfort', 2, 'Convoluted comfort foam', 0.09, '#C9D14A', 'convoluted'),
  foam('foam-3', 3, 'Comfort foam', 0.104, '#29B6DC'),
  foam('foam-4', 4, 'Comfort foam', 0.104, '#C07CE0'),
  foam('foam-5', 5, 'Support foam', 0.156, '#EDEDEA'),
  foam('foam-6', 6, 'Support core', 0.156, '#A5764E'),
  base('#484648', 0.13, '#F0921E', 0.15),
];

// Sova — cover + six foam bands (one rebonded chip core) + base.
export const sovaLayers = [
  cover('#E4E4EC'),
  foam('comfort', 2, 'Convoluted comfort foam', 0.09, '#D2D95E', 'convoluted'),
  foam('foam-3', 3, 'Comfort foam', 0.104, '#37B9E0'),
  foam('foam-4', 4, 'Comfort foam', 0.104, '#C07CE0'),
  foam('foam-5', 5, 'Support foam', 0.156, '#6FC04A'),
  foam('core', 6, 'Rebonded support core', 0.156, '#D8D5CC', 'speckled'),
  base('#565555', 0.13, '#F0921E', 0.15),
];

// Luma — the only stack in either line with a pocketed spring unit.
//
// Luma is specified as 80% spring unit, 20% comfort foam: the product owner's
// split of layer 5 against layer 3. As with Resto, Sova and Ultima the two keep
// their combined 0.41 of the stack - cover, convoluted band, the two insulator
// pads and the base are unchanged - and divide it 0.328 / 0.082.
//
// Luma is the only stack whose top grade carries a band the others do not: the
// blue comfort foam at layer 3, present in LUMA LUXURY.png and absent from
// LUMA CLASSIC.png and LUMA PREMIUM.png. Adding it is what shifted every band
// below it down one number - the numbering follows position in the full stack,
// the same as every other product, so the spring unit reads Layer 6 here.
//
// Its 0.235 is solved, not eyeballed. The product owner's rule is that Luxury's
// spring unit is the same size as Premium's, and Premium omits this band: with
// the other seven ratios summing to 0.94, 10 x 0.328 / (0.94 + b) = 8 x 0.328 /
// 0.94 gives b = 0.235 exactly. It makes the blue band 2.00in and leaves every
// other band in Luxury the identical thickness it has in Premium, so Luxury is
// Premium plus this one layer - which is what the two renders show.
//
// Its colour is not a new value: sampled off the render, Luma's blue lands
// within a few points of Resto's blue sampled the same way from the same set,
// so it takes the albedo already established for that foam rather than
// introducing a second near-identical blue.
export const lumaLayers = [
  cover('#DCDEEC'),
  foam('comfort', 2, 'Convoluted comfort foam', 0.08, '#D6DC72', 'convoluted'),
  foam('foam-3', 3, 'Comfort foam', 0.2375, '#29B6DC'),
  foam('foam-4', 4, 'Comfort foam', 0.082, '#F0EFEC'),
  foam('coil-top', 5, 'Coil insulator pad', 0.05, '#8C3A22'),
  {
    id: 'coils',
    name: 'Layer 6 — TBD',
    role: 'Pocketed spring unit',
    type: 'coil',
    thicknessRatio: 0.328,
    color: '#F2F1ED',
    description: TBD,
    nameTbd: true,
  },
  foam('coil-bottom', 7, 'Coil insulator pad', 0.05, '#8C3A22'),
  base('#616163', 0.14, '#F0921E', 0.13),
];

// Ultima — the deepest stack: cover + six foam bands + base.
export const ultimaLayers = [
  cover('#EFEFEC'),
  foam('comfort', 2, 'Convoluted comfort foam', 0.08, '#C9D14A', 'convoluted'),
  foam('foam-3', 3, 'Comfort foam', 0.104, '#29B6DC'),
  foam('foam-4', 4, 'Comfort foam', 0.104, '#C07CE0'),
  foam('core', 5, 'Rebonded support core', 0.156, '#E8E6E1', 'speckled'),
  foam('foam-6', 6, 'Support foam', 0.156, '#B9B4AE'),
  base('#464846', 0.13, '#F0921E', 0.14),
];

// Riva — foam only, explicitly no coil band.
export const rivaLayers = [
  cover('#E8E8E6'),
  foam('foam-2', 2, 'Comfort foam', 0.1, '#D8D6BE'),
  foam('foam-3', 3, 'Comfort foam', 0.1, '#EFEFEC'),
  foam('foam-4', 4, 'Support foam', 0.11, '#C21E4E'),
  foam('foam-5', 5, 'Support foam', 0.11, '#D3D2BC'),
  foam('core', 6, 'Zoned support core', 0.2, '#A9A44E', 'channelled'),
  base('#585559', 0.13, '#F0921E', 0.15),
];

export const foamicoLayersBySlug = {
  resto: restoLayers,
  sova: sovaLayers,
  luma: lumaLayers,
  ultima: ultimaLayers,
  riva: rivaLayers,
};
