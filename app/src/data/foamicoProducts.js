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
// `sideBadge` is optional and declares a woven brand badge sewn onto the border.
// It is rendered as a decal on the head and foot faces only - see MattressViewer -
// so the badge appears exactly twice, which is how a real mattress is made up.
// `width`/`height` are inches, sized from the badge's own footprint in the
// product's side photograph. Only a product that genuinely carries one sets it.
const product = (slug, name, variant, height, feel, warranty, quilt, sideBadge) => ({
  slug,
  name,
  ...(quilt ? { quilt } : null),
  ...(sideBadge ? { sideBadge } : null),
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

// Sofa cum Bed is the one FOAMICO product that is not a mattress slab: three
// hinged foam panels in a single upholstered cover, folding from a seat into a
// flat bed. It has no layer stack - explicitly confirmed as having no layers -
// and MattressViewer cannot build its shape, so it is rendered by SofaViewer
// off the model in src/lib/sofaModel.js. `media: '3d'` is what routes it there.
//
// No spec line: variant, thickness, feel, warranty and dimensions are all
// unconfirmed for this product. Per guidelines/DO_NOT_CHANGE.md they are left
// out rather than guessed, and are recorded as TBD in docs/PRODUCT_CATALOG.md.
// The model's proportions are measured off the product photography and are
// shape, not size - see sofaModel.js.
export const sofaCumBed = {
  slug: 'sofa-cum-bed',
  name: 'Sofa cum Bed',
  media: '3d',
  cardImage: '/products/sofa-cum-bed/card.jpg',
  model: {
    fabric: '/textures/sofa-cum-bed/fabric.png',
  },
  specLine: null,
  layers: null,
  placeholder: false,
};

export const foamicoProducts = [
  product('resto', 'Resto', 'Classic', 6, 'Firm', '10-Year Warranty + 5-Year Full Replacement'),
  product('sova', 'Sova', 'Classic', 6, 'Firm', '15-Year Warranty + 5-Year Full Replacement'),
  product('luma', 'Luma', 'Classic', 6, 'Medium', '7-Year Warranty + 5-Year Full Replacement'),
  product('ultima', 'Ultima', 'Classic', 6, 'Firm', '25-Year Warranty + 5-Year Full Replacement'),
  // Riva is the only product in either line whose border carries a woven badge.
  // 21.2in x 4.0in is the badge's real size: its 208x85 crop divided by the
  // photograph's own scale on the wall (about 9.8 px/in across, 21.2 px/in up).
  product('riva', 'Riva', '1000', 8, 'Medium', '30-Year Warranty + 5-Year Full Replacement', undefined, {
    src: '/textures/foamico/riva/side-badge.png',
    width: 21.2,
    height: 4,
  }),
  sofaCumBed,
];

export const getFoamicoProductBySlug = (slug) =>
  foamicoProducts.find((p) => p.slug === slug);
