// FOAMICO line. Renders are built from the reference photos in
// "Foamico mattresses/<Name>/" through the same pipeline as the VedaSleep set.
//
// Each product lists the variants docs/PRODUCT_CATALOG.md confirms for it,
// baseline first. The baseline is the variant the collection presents: the grid
// card quotes it and the viewer opens on it.

import { foamicoLayersBySlug } from './layers/foamicoLayers';

const tex = (slug) => ({
  top: `/textures/foamico/${slug}/top.png`,
  topBump: `/textures/foamico/${slug}/top-bump.png`,
  side: `/textures/foamico/${slug}/side.png`,
  bottom: `/textures/foamico/${slug}/bottom.png`,
});

// `quilt` is optional on every product and overrides QUILT_DEFAULTS in
// src/lib/quiltSurface.js - depth, edgeCompression, normalScale, sheen,
// roughness, stitchRadius, stitchTint. Left unset the defaults derive
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
  product('resto', 'Resto', 'Firm', '10-Year Warranty + 5-Year Full Replacement', [
    { variant: 'Classic', height: 6 },
    { variant: 'Premium', height: 6.5 },
    { variant: 'Luxury', height: 7 },
  ]),
  // Classic 6" leads rather than Classic 5" only so the baseline stays the one
  // this product has always presented; both are confirmed Classic variants.
  product('sova', 'Sova', 'Firm', '15-Year Warranty + 5-Year Full Replacement', [
    { variant: 'Classic', height: 6 },
    { variant: 'Classic', height: 5 },
    { variant: 'Premium', height: 6.5 },
    { variant: 'Luxury', height: 7 },
    { variant: 'Natural', height: 6 },
  ]),
  // Corrected by the product owner (2026-08-26): Luma's grades step 6" / 8" /
  // 10" and Classic is the 6". The earlier reading of the catalog had Classic
  // at 8" and put a 5" against Luxury, which is not a Luma thickness at all.
  product('luma', 'Luma', 'Medium', '7-Year Warranty + 5-Year Full Replacement', [
    { variant: 'Classic', height: 6 },
    { variant: 'Premium', height: 8 },
    { variant: 'Luxury', height: 10 },
  ]),
  product('ultima', 'Ultima', 'Firm', '25-Year Warranty + 5-Year Full Replacement', [
    { variant: 'Classic', height: 6 },
    { variant: 'Classic', height: 5 },
    { variant: 'Premium', height: 6 },
    { variant: 'Luxury', height: 6.5 },
    // Natural is 6" across all three products that offer it, per the product
    // owner; the catalog's 7" for Ultima was superseded on 2026-08-26.
    { variant: 'Natural', height: 6 },
  ]),
  // Riva is the only product in either line whose border carries a woven badge.
  // 21.2in x 4.0in is the badge's real size: its 208x85 crop divided by the
  // photograph's own scale on the wall (about 9.8 px/in across, 21.2 px/in up).
  //
  // R1000 leads: this collection presents Riva at its 1000 grade, at the 6" the
  // catalog puts it at. Riva is presented by its R grades alone plus Natural -
  // the product owner's decision (2026-08-26). The Classic / Premium / Luxury
  // rows the catalog also lists for Riva are not offered here, and neither is
  // the second Natural at 8": Natural is one 6" grade wherever it appears.
  product('riva', 'Riva', 'Medium', '30-Year Warranty + 5-Year Full Replacement', [
    { variant: 'R1000', height: 6 },
    { variant: 'R2000', height: 8 },
    { variant: 'R3000', height: 9 },
    { variant: 'Natural', height: 6 },
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
