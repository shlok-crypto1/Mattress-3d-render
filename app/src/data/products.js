import { vedasleepLayersBySlug } from './layers/vedasleepLayers';

// VedaSleep line.
//
// Any product may carry an optional `quilt` block overriding QUILT_DEFAULTS in
// src/lib/quiltSurface.js. None do: the defaults derive the quilt's relief from
// each product's own top-bump.png and normalise it against that fabric's own
// contrast, which is what lets one system cover a ticking as flat as Ultima's
// and one as strongly patterned as Magic's.
//
// Every product now declares a `layers` array for the explode view. The shape
// of each stack (count, type, order) is confirmed; the names, descriptions and
// thickness ratios inside them are placeholders - see
// src/data/layers/vedasleepLayers.js.

export const products = [
  {
    slug: 'duro',
    name: 'Duro',
    specLine: {
      variant: 'Classic',
      thickness: 'Multi-Layer Comfort System · 5″',
      warranty: '10-Year Warranty',
    },
    dimensions: { width: 72, length: 72, height: 5 },
    constructionDetail: '',
    layers: vedasleepLayersBySlug.duro,
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
    layers: vedasleepLayersBySlug.maxa,
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
      thickness: '5″ Memory Foam',
      warranty: '10-Year Warranty',
    },
    // 5", confirmed by the product owner. The 6" this carried was never a
    // confirmed figure - PRODUCT_CATALOG.md had Magic's dimensions as TBD - and
    // the layer proportions in vedasleepLayers.js are solved against 5".
    dimensions: { width: 72, length: 72, height: 5 },
    constructionDetail: '',
    // SPEC CHANGE: Magic used to be described as a single uniform Float Sense
    // Foam core with no internal layer divisions. That is superseded - it is a
    // multi-band construction now. Its band proportions are its own, no longer
    // the shared Maxa/Signature template.
    layers: vedasleepLayersBySlug.magic,
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
    layers: vedasleepLayersBySlug.signature,
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
