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
//
// Every product also declares `variants`: the variant list confirmed for it in
// docs/PRODUCT_CATALOG.md, baseline first - and the baseline is the product's
// top grade, because a page opens on the best version of the product it can
// show. Each entry is `{ variant, height }`
// with `height` a number of inches. See the header of ./foamicoProducts.js for
// why the height is a number and not a label. `dimensions.height` is filled in
// from the baseline below rather than written out here, so the thickness the
// viewer renders and the thickness the card quotes cannot drift apart.

const catalog = [
  {
    slug: 'duro',
    name: 'Duro',
    specLine: {
      variant: 'Luxury',
      thickness: 'Multi-Layer Comfort System · 6″',
      warranty: '10-Year Warranty',
    },
    dimensions: { width: 72, length: 72 },
    constructionDetail: '',
    layers: vedasleepLayersBySlug.duro,
    textures: {
      top: '/textures/duro/top.png',
      topBump: '/textures/duro/top-bump.png',
      side: '/textures/duro/side.png',
      bottom: '/textures/duro/bottom.png',
    },
    placeholder: false,
    variants: [
      { variant: 'Luxury', height: 6 },
      { variant: 'Classic', height: 5 },
      { variant: 'Premium', height: 6 },
    ],
  },
  {
    slug: 'maxa',
    name: 'Maxa',
    specLine: {
      // "Comfort" is Maxa's category in the catalog (VedaSleep Comfort), not a
      // variant of it. The one confirmed variant is Classic, at 5" - so the 6"
      // this product used to render was not sourced from anywhere.
      variant: 'Classic',
      thickness: '5″ High-Density Foam',
      warranty: '10-Year Warranty',
    },
    dimensions: { width: 72, length: 72 },
    constructionDetail: '',
    layers: vedasleepLayersBySlug.maxa,
    textures: {
      top: '/textures/maxa/top.png',
      topBump: '/textures/maxa/top-bump.png',
      side: '/textures/maxa/side.png',
      bottom: '/textures/maxa/bottom.png',
    },
    placeholder: false,
    variants: [
      { variant: 'Classic', height: 5 },
    ],
  },
  {
    slug: 'magic',
    name: 'Magic',
    specLine: {
      // As with Maxa, "Memory Foam" is Magic's category rather than its
      // variant; the confirmed variant is Classic. The thickness below is
      // unchanged - Classic is 5", which is what this already rendered.
      variant: 'Classic',
      thickness: '5″ Memory Foam',
      warranty: '10-Year Warranty',
    },
    // 5", confirmed by the product owner. The 6" this carried was never a
    // confirmed figure - PRODUCT_CATALOG.md had Magic's dimensions as TBD - and
    // the layer proportions in vedasleepLayers.js are solved against 5".
    dimensions: { width: 72, length: 72 },
    constructionDetail: '',
    // SPEC CHANGE: Magic used to be described as a single uniform Float Sense
    // Foam core with no internal layer divisions. That is superseded - it is a
    // multi-band construction now, with proportions of its own.
    layers: vedasleepLayersBySlug.magic,
    textures: {
      top: '/textures/magic/top.png',
      topBump: '/textures/magic/top-bump.png',
      side: '/textures/magic/side.png',
      bottom: '/textures/magic/bottom.png',
    },
    placeholder: false,
    variants: [
      { variant: 'Classic', height: 5 },
    ],
  },
];

// The baseline variant is the first one listed - the product's top grade - and
// it is the single source of the product's rendered thickness. FOAMICO does the
// same through the `product` factory in ./foamicoProducts.js; these are object
// literals, so it happens here.
export const products = catalog.map((p) => ({
  ...p,
  dimensions: { ...p.dimensions, height: p.variants[0].height },
}));

export const getProductBySlug = (slug) => products.find((p) => p.slug === slug);
