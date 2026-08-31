// FOAMICO layer stacks, top band first.
//
// `name` is the product owner's confirmed material name (2026-08-31) for every
// band except Riva's layers 2-6, which are still numbered stand-ins - Riva was
// given layer 1 alone for now. `description` remains filler until the real
// material copy arrives. `thicknessRatio` is a relative proportion eyeballed
// from the reference cutaway renders in "Layers/<PRODUCT>.png", not a measured
// spec. `color` is sampled from those same renders and is a stand-in for real
// layer photography.
//
// Also confirmed here is the shape of each stack: the count, the type and the
// order of the bands. `type` drives everything the renderer does - foam gets
// porous grain, fabric gets a woven sheen, coil gets an instanced spring unit -
// so no product is special-cased by slug anywhere in the viewer. A name is
// copy; it does not change how a band is built. Sova's Plush Core Latex and
// Ultima's Zero G Latex therefore stay `type: 'foam'` with the surfaces their
// renders show, because the render is the evidence for how a band looks.
//
// `thicknessRatio` values are relative and normalised against the product's
// real height at build time, so they do not need to sum to 1.
// `surface` is optional and only refines how a band is sculpted:
//   convoluted  egg-crate comfort foam      pyramid  sawtooth transition foam
//   speckled    rebonded chip core          channelled  zoned cut support core
//   quilted / woven  fabric

const TBD = 'Placeholder description - real material copy to follow.';

const cover = (name, color, ratio = 0.09) => ({
  id: 'cover',
  name,
  role: 'Quilted knit cover',
  type: 'fabric-cover',
  thicknessRatio: ratio,
  color,
  description: TBD,
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
//
// The band is named Quilted Foam in every product of both brands, so the name
// is fixed here rather than passed in - there is no per-product variation to
// express and a parameter would only invite one.
const base = (color, ratio, sheetColor, sheetRatio) => ({
  id: 'base',
  name: 'Quilted Foam',
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
});

// `name` is the confirmed material name; pass null where one has not been given
// yet and the band falls back to its numbered stand-in and stays flagged
// `nameTbd`. Only Riva's layers 2-6 still take that path.
const foam = (id, index, name, role, ratio, color, surface) => ({
  id,
  name: name ?? `Layer ${index} — TBD`,
  role,
  type: 'foam',
  thicknessRatio: ratio,
  color,
  description: TBD,
  ...(name ? null : { nameTbd: true }),
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
  cover('AirKnit Fabric', '#B9BCC2'),
  foam('comfort', 2, 'AeroFlex Foam', 'Convoluted comfort foam', 0.09, '#C9D14A', 'convoluted'),
  foam('foam-3', 3, 'Memorest Foam', 'Comfort foam', 0.104, '#29B6DC'),
  foam('foam-4', 4, 'Cosmic Foam', 'Comfort foam', 0.104, '#C07CE0'),
  foam('foam-5', 5, 'Pro Nexa Foam', 'Support foam', 0.156, '#EDEDEA'),
  foam('foam-6', 6, 'Enduro HR Foam', 'Support core', 0.156, '#A5764E'),
  base('#484648', 0.13, '#F0921E', 0.15),
];

// Sova — cover + six foam bands (one rebonded chip core) + base.
export const sovaLayers = [
  cover('AirKnit Fabric', '#E4E4EC'),
  foam('comfort', 2, 'AeroFlex Foam', 'Convoluted comfort foam', 0.09, '#D2D95E', 'convoluted'),
  foam('foam-3', 3, 'Memorest Foam', 'Comfort foam', 0.104, '#37B9E0'),
  foam('foam-4', 4, 'Cosmic Foam', 'Comfort foam', 0.104, '#C07CE0'),
  foam('foam-5', 5, 'Plush Core Latex', 'Support foam', 0.156, '#6FC04A'),
  foam('core', 6, 'OrthoBond Foam', 'Rebonded support core', 0.156, '#D8D5CC', 'speckled'),
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
// the same as every other product, so the spring unit reads Layer 6 here. The
// names confirmed on 2026-08-31 corroborate that numbering independently: the
// owner gave layers 5 and 7 the same name, Guard Flex, which is exactly the
// pair of coil insulator pads, and put Hybrid Pocket Springs between them at 6.
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
  cover('AirKnit Fabric', '#DCDEEC'),
  foam('comfort', 2, 'AeroFlex Foam', 'Convoluted comfort foam', 0.08, '#D6DC72', 'convoluted'),
  foam('foam-3', 3, 'Memorest Foam', 'Comfort foam', 0.2375, '#29B6DC'),
  foam('foam-4', 4, 'Pro Nexa Foam', 'Comfort foam', 0.082, '#F0EFEC'),
  foam('coil-top', 5, 'Guard Flex', 'Coil insulator pad', 0.05, '#8C3A22'),
  {
    id: 'coils',
    name: 'Hybrid Pocket Springs',
    role: 'Pocketed spring unit',
    type: 'coil',
    thicknessRatio: 0.328,
    color: '#F2F1ED',
    description: TBD,
  },
  foam('coil-bottom', 7, 'Guard Flex', 'Coil insulator pad', 0.05, '#8C3A22'),
  base('#616163', 0.14, '#F0921E', 0.13),
];

// Ultima — the deepest stack: cover + six foam bands + base.
export const ultimaLayers = [
  cover('AirKnit Fabric', '#EFEFEC'),
  foam('comfort', 2, 'AeroFlex Foam', 'Convoluted comfort foam', 0.08, '#C9D14A', 'convoluted'),
  foam('foam-3', 3, 'Memorest Foam', 'Comfort foam', 0.104, '#29B6DC'),
  foam('foam-4', 4, 'Cosmic Foam', 'Comfort foam', 0.104, '#C07CE0'),
  foam('core', 5, 'Cloud Sense Foam', 'Rebonded support core', 0.156, '#E8E6E1', 'speckled'),
  foam('foam-6', 6, 'Zero G Latex', 'Support foam', 0.156, '#B9B4AE'),
  base('#464846', 0.13, '#F0921E', 0.14),
];

// Riva — foam only, explicitly no coil band.
//
// The product owner named layer 1 alone on 2026-08-31 and said the rest would
// follow, so layers 2-6 keep their numbered stand-ins. Riva's cover is the one
// cover in either brand that is not AirKnit Fabric.
export const rivaLayers = [
  cover('Bio Weave', '#E8E8E6'),
  foam('foam-2', 2, null, 'Comfort foam', 0.1, '#D8D6BE'),
  foam('foam-3', 3, null, 'Comfort foam', 0.1, '#EFEFEC'),
  foam('foam-4', 4, null, 'Support foam', 0.11, '#C21E4E'),
  foam('foam-5', 5, null, 'Support foam', 0.11, '#D3D2BC'),
  foam('core', 6, null, 'Zoned support core', 0.2, '#A9A44E', 'channelled'),
  base('#585559', 0.13, '#F0921E', 0.15),
];

// ---- Natural grades -------------------------------------------------------
//
// Natural is not its product's stack with bands taken out - it is a different
// build, with a perforated natural-latex slab where the standard grade carries
// comfort foam. That is why these are whole arrays rather than an `omitLayers`
// list, and why a variant may carry its own `layers` (see
// src/lib/variantLayers.js).
//
// Shape - count, order, type and surface - is read from the reference renders
// "Layers/<PRODUCT> NATURAL.png", and is the confirmed part, as it is for every
// stack in this file. `thicknessRatio` is eyeballed from those same renders and
// is a placeholder until the product owner gives Natural's foam split, exactly
// as every other stack here began. Names are the owner's, given 2026-08-31, and
// they corroborate these stacks from an independent direction: each Natural's
// name list is exactly as long as the band count read off its render, and every
// material that also appears in the product's standard grade kept the same name
// there - Cloud Sense and Zero G on Ultima, OrthoBond on Sova. `Pincore Latex`
// names the perforations the renders show, which is what the latex slab is.
//
// The renders are read by filename: two of the three carry a woven "ULTIMA
// NATURAL" tag, including the one named for Sova, and the product owner's
// instruction is to go by the filename and disregard the tag.
//
// Colour: one new albedo between the three of them, for the latex slab no other
// grade has. Every other band reuses the value its own product already
// established for that material, so switching to Natural never shifts a foam's
// colour - the bands that carry over look like themselves.
const NATURAL_LATEX = '#D9D5C0';

// Ultima Natural - cover, convoluted, latex, rebonded chip core, support foam,
// bonded base. Six bands against the standard grade's seven, and the blue and
// purple comfort foams are gone rather than merely thinner.
export const ultimaNaturalLayers = [
  cover('AirKnit Fabric', '#EFEFEC'),
  foam('comfort', 2, 'AeroFlex Foam', 'Convoluted comfort foam', 0.08, '#C9D14A', 'convoluted'),
  foam('latex', 3, 'Pincore Latex', 'Pin-perforated natural latex', 0.22, NATURAL_LATEX),
  foam('core', 4, 'Cloud Sense Foam', 'Rebonded support core', 0.19, '#E8E6E1', 'speckled'),
  foam('foam-5', 5, 'Zero G Latex', 'Support foam', 0.15, '#B9B4AE'),
  base('#464846', 0.13, '#F0921E', 0.14),
];

// Sova Natural - the latex sits under the purple comfort foam here, not above
// it, and the chip core below is the multicoloured one its render shows.
export const sovaNaturalLayers = [
  cover('AirKnit Fabric', '#E4E4EC'),
  foam('comfort', 2, 'AeroFlex Foam', 'Convoluted comfort foam', 0.09, '#D2D95E', 'convoluted'),
  foam('foam-3', 3, 'Cosmic Byte Foam', 'Comfort foam', 0.13, '#C07CE0'),
  foam('latex', 4, 'Pincore Latex', 'Pin-perforated natural latex', 0.20, NATURAL_LATEX),
  foam('core', 5, 'OrthoBond Foam', 'Rebonded support core', 0.21, '#D8D5CC', 'speckled'),
  base('#565555', 0.13, '#F0921E', 0.15),
];

// Riva Natural - the shortest stack of any FOAMICO grade: four bands, and the
// latex slab is over half the mattress. Riva's cover is Bio Weave, as it is at
// every other grade.
export const rivaNaturalLayers = [
  cover('Bio Weave', '#E8E8E6'),
  foam('comfort', 2, 'AeroFlex Foam', 'Convoluted comfort foam', 0.09, '#C9D14A', 'convoluted'),
  foam('latex', 3, '7 Zone Latex', 'Zoned natural latex', 0.54, NATURAL_LATEX),
  base('#585559', 0.13, '#F0921E', 0.15),
];

export const foamicoLayersBySlug = {
  resto: restoLayers,
  sova: sovaLayers,
  luma: lumaLayers,
  ultima: ultimaLayers,
  riva: rivaLayers,
};
