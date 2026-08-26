// FOAMICO line. Renders are built from the reference photos in
// "Foamico mattresses/<Name>/" through the same pipeline as the VedaSleep set.
// The collection uses the official baseline variant for each range: Classic
// for Resto, Sova, Luma and Ultima; Riva 1000 for Riva.

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
const product = (slug, name, variant, height, feel, warranty, quilt) => ({
  slug,
  name,
  ...(quilt ? { quilt } : null),
  specLine: {
    variant,
    thickness: `${height}\u2033 ${feel}`,
    warranty,
  },
  dimensions: { width: 72, length: 72, height },
  constructionDetail: '',
  // Explode stack. Shape (count/type/order) is confirmed; names, copy and
  // proportions are placeholders - see src/data/layers/foamicoLayers.js.
  layers: foamicoLayersBySlug[slug] ?? null,
  textures: tex(slug),
  placeholder: false,
});

// Sofa cum Bed is the one FOAMICO product that is not a mattress slab: it is a
// tri-fold foam unit that opens from a seat into a flat bed, so it has neither
// a layer stack to explode nor a geometry the 3D viewer can build. `media`
// marks it as presented through its own photography instead, and is what routes
// it to SofaCumBedPage rather than MattressViewer.
//
// No spec line: variant, thickness, feel, warranty and dimensions are all
// unconfirmed for this product. Per guidelines/DO_NOT_CHANGE.md they are left
// out rather than guessed, and are recorded as TBD in docs/PRODUCT_CATALOG.md.
const SOFA_SHOTS = [
  ['01-sofa-front', 'Sofa cum Bed folded into seat position, seen from the front'],
  ['02-sofa-angle', 'Sofa cum Bed in seat position, three-quarter view'],
  ['03-unfolding-side', 'Side profile part-way through unfolding'],
  ['04-lounger-angle', 'Backrest reclined into a lounger, with pillow'],
  ['05-bed-pillow', 'Opened flat into bed position, with pillow'],
  ['06-bed-angle', 'Opened flat into bed position, three-quarter view'],
];

export const sofaCumBed = {
  slug: 'sofa-cum-bed',
  name: 'Sofa cum Bed',
  media: 'photo',
  cardImage: '/products/sofa-cum-bed/card.jpg',
  gallery: SOFA_SHOTS.map(([slug, alt]) => ({
    src: `/products/sofa-cum-bed/${slug}.jpg`,
    alt,
  })),
  specLine: null,
  layers: null,
  placeholder: false,
};

export const foamicoProducts = [
  product('resto', 'Resto', 'Classic', 6, 'Firm', '10-Year Warranty + 5-Year Full Replacement'),
  product('sova', 'Sova', 'Classic', 6, 'Firm', '15-Year Warranty + 5-Year Full Replacement'),
  product('luma', 'Luma', 'Classic', 6, 'Medium', '7-Year Warranty + 5-Year Full Replacement'),
  product('ultima', 'Ultima', 'Classic', 6, 'Firm', '25-Year Warranty + 5-Year Full Replacement'),
  product('riva', 'Riva', '1000', 8, 'Medium', '30-Year Warranty + 5-Year Full Replacement'),
  sofaCumBed,
];

export const getFoamicoProductBySlug = (slug) =>
  foamicoProducts.find((p) => p.slug === slug);
