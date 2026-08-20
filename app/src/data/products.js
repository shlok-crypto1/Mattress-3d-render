export const products = [
  {
    slug: 'duro',
    name: 'Duro',
    specLine: {
      variant: 'Classic',
      thickness: '5″ High-Density Foam',
      warranty: '10-Year Warranty',
    },
    dimensions: { width: 72, length: 72, height: 5 },
    constructionDetail: '',
    textures: {
      top: '/textures/duro/top.png',
      topBump: '/textures/duro/top-bump.png',
      side: '/textures/duro/side.png',
      bottom: '/textures/duro/bottom.png',
    },
    placeholder: false,
  },
  {
    slug: 'maxa',
    name: 'Maxa',
    specLine: {
      variant: 'Comfort',
      thickness: '6″ High-Density Foam',
      warranty: '10-Year Warranty',
    },
    dimensions: { width: 72, length: 72, height: 6 },
    constructionDetail: '',
    textures: {
      top: '/textures/maxa/top.png',
      topBump: '/textures/maxa/top-bump.png',
      side: '/textures/maxa/side.png',
      bottom: '/textures/maxa/bottom.png',
    },
    placeholder: false,
  },
  {
    slug: 'magic',
    name: 'Magic',
    specLine: {
      variant: 'Memory Foam',
      thickness: '6″ Memory Foam',
      warranty: '10-Year Warranty',
    },
    dimensions: { width: 72, length: 72, height: 6 },
    constructionDetail: '',
    textures: {
      top: '/textures/magic/top.png',
      topBump: '/textures/magic/top-bump.png',
      side: '/textures/magic/side.png',
      bottom: '/textures/magic/bottom.png',
    },
    placeholder: false,
  },
  {
    slug: 'signature',
    name: 'Signature',
    specLine: {
      variant: 'Premium',
      thickness: '8″ Pocket Spring + Foam',
      warranty: '12-Year Warranty',
    },
    dimensions: { width: 72, length: 72, height: 8 },
    constructionDetail: '',
    textures: {
      top: '/textures/signature/top.png',
      topBump: '/textures/signature/top-bump.png',
      side: '/textures/signature/side.png',
      bottom: '/textures/signature/bottom.png',
    },
    placeholder: false,
  },
];

export const getProductBySlug = (slug) => products.find((p) => p.slug === slug);
