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

const product = (slug, name, variant, height, feel, warranty) => ({
  slug,
  name,
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

export const foamicoProducts = [
  product('resto', 'Resto', 'Classic', 6, 'Firm', '10-Year Warranty + 5-Year Full Replacement'),
  product('sova', 'Sova', 'Classic', 6, 'Firm', '15-Year Warranty + 5-Year Full Replacement'),
  product('luma', 'Luma', 'Classic', 6, 'Medium', '7-Year Warranty + 5-Year Full Replacement'),
  product('ultima', 'Ultima', 'Classic', 6, 'Firm', '25-Year Warranty + 5-Year Full Replacement'),
  product('riva', 'Riva', '1000', 8, 'Medium', '30-Year Warranty + 5-Year Full Replacement'),
];

export const getFoamicoProductBySlug = (slug) =>
  foamicoProducts.find((p) => p.slug === slug);
