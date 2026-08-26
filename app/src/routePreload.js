// Every product route is its own React.lazy() chunk (see App.jsx), and all of
// them pull in the shared ProductPage+MattressViewer+three bundle (~130KB
// gzipped) the first time ANY product page is visited. Without prefetching,
// a shared-element transition can outrun that download and land on the
// Suspense fallback screen mid-flight - exactly the "page flash" a smooth
// transition is supposed to avoid. These loaders let callers warm the cache
// ahead of the click.
const loaders = {
  'vedasleep/duro': () => import('./pages/DuroPage'),
  'vedasleep/maxa': () => import('./pages/MaxaPage'),
  'vedasleep/magic': () => import('./pages/MagicPage'),
  'vedasleep/signature': () => import('./pages/SignaturePage'),
  'foamico/resto': () => import('./pages/foamico/RestoPage'),
  'foamico/sova': () => import('./pages/foamico/SovaPage'),
  'foamico/luma': () => import('./pages/foamico/LumaPage'),
  'foamico/ultima': () => import('./pages/foamico/UltimaPage'),
  'foamico/riva': () => import('./pages/foamico/RivaPage'),
  'foamico/sofa-cum-bed': () => import('./pages/foamico/SofaCumBedPage'),
};

const key = (basePath, slug) => `${basePath.replace(/^\//, '')}/${slug}`;

export function preloadRoute(basePath, slug) {
  loaders[key(basePath, slug)]?.();
}

/** Warm every product chunk under a brand once the grid is idle. */
export function preloadAllIn(basePath) {
  const prefix = `${basePath.replace(/^\//, '')}/`;
  const run = () => Object.keys(loaders).forEach((k) => k.startsWith(prefix) && loaders[k]());
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1500 });
  else setTimeout(run, 400);
}
