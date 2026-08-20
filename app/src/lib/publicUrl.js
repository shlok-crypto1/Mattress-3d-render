// Resolves a public/ asset path against the app's actual base path (which
// changes between dev, a root deploy, and the /catalog/ subpath deploy on
// GitHub Pages) instead of hardcoding a leading-slash path that only works
// when the app is served from the domain root.
export function publicUrl(path) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
