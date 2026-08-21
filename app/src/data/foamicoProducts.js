// FOAMICO line. Renders are built from the reference photos in
// "Foamico mattresses/<Name>/" through the same pipeline as the VedaSleep set.
//
// TO BE SUPPLIED (placeholders below are marked, not invented):
//   - specLine: variant / thickness / warranty text for each product
//   - dimensions.height: the values here are measured off the head-on photos
//     (band height vs the 36" face) and rounded, so they are approximations
//     until the real spec sheet lands.
//   - constructionDetail: layer build-up copy, if you want it on the page.

const tex = (slug) => ({
  top: `/textures/foamico/${slug}/top.png`,
  topBump: `/textures/foamico/${slug}/top-bump.png`,
  side: `/textures/foamico/${slug}/side.png`,
  bottom: `/textures/foamico/${slug}/bottom.png`,
});

const product = (slug, name, height) => ({
  slug,
  name,
  specLine: null, // awaiting real spec text
  dimensions: { width: 72, length: 72, height },
  constructionDetail: '',
  textures: tex(slug),
  placeholder: false,
  specsPending: true, // drives the "specs to follow" note on the product page
});

export const foamicoProducts = [
  product('resto', 'Resto', 8),
  product('sova', 'Sova', 8),
  product('luma', 'Luma', 8),
  product('ultima', 'Ultima', 7),
  product('riva', 'Riva', 7),
];

export const getFoamicoProductBySlug = (slug) =>
  foamicoProducts.find((p) => p.slug === slug);
