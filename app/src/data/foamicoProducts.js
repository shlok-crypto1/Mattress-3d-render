// FOAMICO line. Renders are built from the reference photos in
// "Foamico mattresses/<Name>/" through the same pipeline as the VedaSleep set.
//
// Each product lists the variants docs/PRODUCT_CATALOG.md confirms for it,
// baseline first. The baseline is the product's top grade: a page opens on the
// best version of the product it can show, and every product does the same, so
// which grade that is is a data question rather than a per-product decision.

import {
  foamicoLayersBySlug,
  ultimaNaturalLayers,
  sovaNaturalLayers,
  rivaNaturalLayers,
} from './layers/foamicoLayers';

const tex = (slug) => ({
  top: `/textures/foamico/${slug}/top.png`,
  topBump: `/textures/foamico/${slug}/top-bump.png`,
  side: `/textures/foamico/${slug}/side.png`,
  bottom: `/textures/foamico/${slug}/bottom.png`,
});

// `quilt` is optional on every product and overrides QUILT_DEFAULTS in
// src/lib/quiltSurface.js - depth, depthMax, puffRelief, edgeCompression,
// normalScale, sheen, roughness, stitchRadius, stitchTint. Left unset the defaults derive
// everything from the product's own top-bump.png, including normalising the
// relief against that fabric's contrast, so a new product needs no tuning to
// look right; this is here for the case where one genuinely wants to differ.
// `sideBadge` is optional and declares a woven brand badge sewn onto the border.
// It is rendered as a decal on the head and foot faces only - see MattressViewer -
// so the badge appears exactly twice, which is how a real mattress is made up.
// `width`/`height` are inches, sized from the badge's own footprint in the
// product's side photograph. Only a product that genuinely carries one sets it.
//
// `variants` is the product's confirmed variant list, baseline first. Each entry
// is `{ variant, height }` and `height` is a number of inches, not a label: the
// viewer renders the selected variant at that thickness, so it has to be a
// figure the code can use directly. A label like "4\"/5\"" would have to be
// parsed back into a number and there is no honest way to turn a pair into one
// - such a range is listed as the two variants it actually is.
//
// The spec line and `dimensions.height` are both derived from the baseline
// rather than passed in beside it, so a product's thickness is written down
// once and the card cannot drift out of step with what the viewer draws.
const product = (slug, name, feel, warranty, variants, extra = {}) => {
  const [baseline] = variants;
  return {
    slug,
    name,
    ...(extra.quilt ? { quilt: extra.quilt } : null),
    ...(extra.sideBadge ? { sideBadge: extra.sideBadge } : null),
    // Opt-in, per product: hold the cover and the bonded base at the real
    // thickness they have at the baseline grade instead of letting them scale
    // with the mattress. See src/lib/variantLayers.js for why this is a choice
    // rather than the default.
    ...(extra.holdUpholstery ? { holdUpholstery: true } : null),
    variants,
    specLine: {
      variant: baseline.variant,
      thickness: `${baseline.height}\u2033 ${feel}`,
      warranty,
    },
    dimensions: { width: 72, length: 72, height: baseline.height },
    constructionDetail: '',
    // Explode stack. Shape (count/type/order) is confirmed; names, copy and
    // proportions are placeholders - see src/data/layers/foamicoLayers.js.
    layers: foamicoLayersBySlug[slug] ?? null,
    textures: tex(slug),
    placeholder: false,
  };
};

// Sofa cum Bed is the one FOAMICO product that is not a mattress slab: three
// hinged foam panels in a single upholstered cover, folding from a seat into a
// flat bed. It has no layer stack - explicitly confirmed as having no layers -
// and MattressViewer cannot build its shape.
//
// It is presented through its own photography rather than in 3D, per the
// product owner: a fold is a thing this product does, and the studio set
// records all three positions of it directly. `media: 'photo'` is what routes
// it to SofaPhotoViewer. The three views replace a camera orbit, so they are
// named for what the product is doing in each - it is folded flat as a bed
// (front), seen from the end mid-fold (side), and stood up as a seat (sitting)
// - rather than for where a camera would be.
//
// No spec line and no variant list: variant, thickness, feel, warranty and
// dimensions are all unconfirmed for this product. Per guidelines/DO_NOT_CHANGE.md
// they are left out rather than guessed, and are recorded as TBD in
// docs/PRODUCT_CATALOG.md. The catalog does record "Classic 8\"" and "Premium 8\""
// for it, but this product has no MattressViewer and no thickness to drive, so
// there is nothing here for a variant control to change.
// The model's proportions are measured off the product photography and are
// shape, not size - see sofaModel.js.
export const sofaCumBed = {
  slug: 'sofa-cum-bed',
  name: 'Sofa cum Bed',
  media: 'photo',
  cardImage: '/products/sofa-cum-bed/card.jpg',
  // Derived from the supplied studio set at 1600px wide - see
  // docs/ASSET_MANAGEMENT.md for which original each one is. First entry is
  // the view the page opens on.
  views: [
    { key: 'front', label: 'Front', src: '/products/sofa-cum-bed/front.jpg', alt: 'Sofa cum Bed opened flat as a single bed' },
    { key: 'side', label: 'Side', src: '/products/sofa-cum-bed/side.jpg', alt: 'Sofa cum Bed from the end, part-folded' },
    { key: 'sitting', label: 'Sitting', src: '/products/sofa-cum-bed/sitting.jpg', alt: 'Sofa cum Bed folded upright as a seat' },
  ],
  specLine: null,
  layers: null,
  placeholder: false,
};

export const foamicoProducts = [
  // Resto is the one product whose grades are built from different stacks, not
  // just cut to different thicknesses: Luxury is the full seven-band build and
  // the grades below it drop comfort foam. `omitLayers` names the layer ids a
  // grade leaves out - subtractive, because that is the direction the product
  // is actually specified in, and because a list of what is missing can never
  // accidentally drop the base the way a list of what is present could.
  product('resto', 'Resto', 'Firm', '10-Year Warranty + 5-Year Full Replacement', [
    { variant: 'Luxury', height: 7 },
    { variant: 'Classic', height: 6, omitLayers: ['foam-3', 'foam-4'] },
    { variant: 'Premium', height: 6.5, omitLayers: ['foam-3'] },
  ], { holdUpholstery: true }),
  // Both Classic heights drop the same two bands: the product owner gave one
  // rule for "sova classic" and Sova presents two of them.
  product('sova', 'Sova', 'Firm', '15-Year Warranty + 5-Year Full Replacement', [
    { variant: 'Luxury', height: 7 },
    { variant: 'Classic', height: 6, omitLayers: ['foam-3', 'foam-4'] },
    { variant: 'Classic', height: 5, omitLayers: ['foam-3', 'foam-4'] },
    { variant: 'Premium', height: 6.5, omitLayers: ['foam-3'] },
    // Natural is a different build, not this stack thinned: a perforated latex
    // slab sits under the purple comfort foam where the standard grade carries
    // the blue one. Read from "Layers/SOVA NATURAL.png".
    { variant: 'Natural', height: 6, layers: sovaNaturalLayers },
  ]),
  // Corrected by the product owner (2026-08-26): Luma's grades step 6" / 8" /
  // 10" and Classic is the 6". The earlier reading of the catalog had Classic
  // at 8" and put a 5" against Luxury, which is not a Luma thickness at all.
  // Luxury alone carries the blue comfort band at layer 3. Everything else is
  // shared: Classic and Premium hold the same bands as each other and differ
  // only in how tall the spring unit is, and Luxury's spring unit matches
  // Premium's exactly - see the ratio solved in layers/foamicoLayers.js.
  product('luma', 'Luma', 'Medium', '7-Year Warranty + 5-Year Full Replacement', [
    { variant: 'Luxury', height: 10 },
    { variant: 'Classic', height: 6, omitLayers: ['foam-3'] },
    { variant: 'Premium', height: 8, omitLayers: ['foam-3'] },
  ]),
  product('ultima', 'Ultima', 'Firm', '25-Year Warranty + 5-Year Full Replacement', [
    // 7", not the 6.5" carried here until 2026-08-31. Ultima's Luxury is the
    // same height as Resto's and Sova's; the 6.5" was the odd one out.
    { variant: 'Luxury', height: 7 },
    // Classic and Premium are both 6" here and are still different builds:
    // Premium keeps layer 4, Classic does not. Same height, different stack.
    { variant: 'Classic', height: 6, omitLayers: ['foam-3', 'foam-4'] },
    { variant: 'Classic', height: 5, omitLayers: ['foam-3', 'foam-4'] },
    { variant: 'Premium', height: 6, omitLayers: ['foam-3'] },
    // Natural is 6" across all three products that offer it, per the product
    // owner; the catalog's 7" for Ultima was superseded on 2026-08-26. Its
    // composition is a different build rather than this stack thinned - a
    // perforated latex slab in place of the blue and purple comfort foams.
    // Read from "Layers/ULTIMA NATURAL.png".
    { variant: 'Natural', height: 6, layers: ultimaNaturalLayers },
  ]),
  // Riva is the only product in either line whose border carries a woven badge.
  // 21.2in x 4.0in is the badge's real size: its 208x85 crop divided by the
  // photograph's own scale on the wall (about 9.8 px/in across, 21.2 px/in up).
  //
  // R3000 leads: Riva has no grade called Luxury in what it presents, and R3000
  // is the top of its R ladder, so that is the grade its page opens on - the
  // product owner's decision (2026-08-26), matching every other product opening
  // on its best. Riva is presented by its R grades alone plus Natural -
  // the product owner's decision (2026-08-26). The Classic / Premium / Luxury
  // rows the catalog also lists for Riva are not offered here, and neither is
  // the second Natural at 8": Natural is one 6" grade wherever it appears.
  product('riva', 'Riva', 'Medium', '30-Year Warranty + 5-Year Full Replacement', [
    // The R ladder is 8" / 9" / 10", corrected by the product owner on
    // 2026-08-31 from the 6" / 8" / 9" recorded before. All three grades moved,
    // so this is a new ladder rather than an adjustment to one rung of it, and
    // R3000 at 10" makes Riva the tallest product in the experience, level with
    // Luma's Luxury. Which bands each grade carries is unchanged - heights and
    // band membership are separate facts and only the heights were corrected.
    { variant: 'R3000', height: 10 },
    // Riva thins from the top of the comfort stack down, not from the middle:
    // R2000 drops layer 2 and R1000 drops layers 2 and 3.
    { variant: 'R1000', height: 8, omitLayers: ['foam-2', 'foam-3'] },
    { variant: 'R2000', height: 9, omitLayers: ['foam-2'] },
    // Natural is the shortest stack of any FOAMICO grade - four bands, with the
    // latex slab over half the mattress. Read from "Layers/RIVA NATURAL.png".
    { variant: 'Natural', height: 6, layers: rivaNaturalLayers },
  ], {
    sideBadge: {
      src: '/textures/foamico/riva/side-badge.png',
      width: 21.2,
      height: 4,
    },
  }),
  sofaCumBed,
];

export const getFoamicoProductBySlug = (slug) =>
  foamicoProducts.find((p) => p.slug === slug);
