export const products = [
  {
    slug: 'duro',
    name: 'Duro',
    specLine: {
      variant: 'Classic',
      thickness: '5″ High-Density Foam',
      warranty: '10-Year Warranty',
    },
    dimensions: { width: 36, length: 72, height: 5 },
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
      topBump: null,
      side: '/textures/maxa/side.png',
      bottom: '/textures/maxa/bottom.png',
    },
    placeholder: true,
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
      top: '/textures/_placeholder/top.png',
      topBump: null,
      side: '/textures/_placeholder/side.png',
      bottom: '/textures/_placeholder/bottom.png',
    },
    placeholder: true,
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
      top: '/textures/_placeholder/top.png',
      topBump: null,
      side: '/textures/_placeholder/side.png',
      bottom: '/textures/_placeholder/bottom.png',
    },
    placeholder: true,
  },
];

export const getProductBySlug = (slug) => products.find((p) => p.slug === slug);
