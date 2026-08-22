import { Component, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import BrandSelectPage from './pages/BrandSelectPage';
import { TransitionProvider } from './transition/ProductTransition';
import { MOTION, EASE } from './lib/motion';

// Only the brand selector ships in the entry chunk. Both grids are lazy so that
// landing on "/" pulls neither brand's product data - and therefore none of
// either brand's texture images, which the grids reference as card backgrounds.
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const FoamicoCatalogPage = lazy(() => import('./pages/FoamicoCatalogPage'));

// Each product route is its own chunk, so visiting one product never pulls in
// a sibling's page code (and never triggers its texture loads - those only
// start once MattressViewer actually mounts).
const DuroPage = lazy(() => import('./pages/DuroPage'));
const MaxaPage = lazy(() => import('./pages/MaxaPage'));
const MagicPage = lazy(() => import('./pages/MagicPage'));
const SignaturePage = lazy(() => import('./pages/SignaturePage'));

const RestoPage = lazy(() => import('./pages/foamico/RestoPage'));
const SovaPage = lazy(() => import('./pages/foamico/SovaPage'));
const LumaPage = lazy(() => import('./pages/foamico/LumaPage'));
const UltimaPage = lazy(() => import('./pages/foamico/UltimaPage'));
const RivaPage = lazy(() => import('./pages/foamico/RivaPage'));

// Just enough of each brand to paint a holding screen. Deliberately not the
// full BRAND_THEMES table from MattressViewer: importing that would pull the
// whole 3D viewer into the entry chunk, and the entire point of the lazy routes
// is that landing anywhere loads only what that page needs.
const CHROME = {
  foamico: { bg: '#1A1A1A', ink: '#FEFEFE', dim: '#8f8f8f', accent: '#95C12B', word: 'FOAMICO' },
  vedasleep: { bg: '#F6F8F1', ink: '#2b2b2b', dim: '#8a8a8e', accent: '#c77d11', word: 'VEDASLEEP' },
};

/** Brand and product implied by a route, for chrome that renders before it. */
function routeIdentity(pathname) {
  const [, brand, slug] = pathname.split('/');
  const chrome = CHROME[brand] ?? CHROME.vedasleep;
  return { chrome, word: CHROME[brand] ? chrome.word : null, slug: slug ?? null };
}

/**
 * Holding screen while a route chunk loads.
 *
 * It used to be the word "Loading" centred on VedaSleep cream regardless of
 * destination, so every Foamico route opened with a flash of the wrong brand's
 * background before going dark. Now it establishes the brand it is about to
 * become, and names the product, so the wait is part of the arrival rather than
 * an interruption in it.
 *
 * The progress bar is indeterminate on purpose: real progress is not available
 * here, and inventing a percentage would be a lie about how long this takes.
 */
function RouteFallback() {
  const { pathname } = useLocation();
  const { chrome, word, slug } = routeIdentity(pathname);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        height: '100dvh',
        background: chrome.bg,
        color: chrome.ink,
        fontFamily: "'Poppins', -apple-system, sans-serif",
      }}
    >
      {word ? (
        <div style={{ fontSize: 11, letterSpacing: '0.32em', color: chrome.dim }}>{word}</div>
      ) : null}
      {slug ? (
        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(20px, 6vw, 30px)',
            letterSpacing: '0.13em',
            textIndent: '0.13em',
            textTransform: 'uppercase',
          }}
        >
          {slug}
        </div>
      ) : null}
      <div style={{ width: 96, height: 1, background: chrome.dim, opacity: 0.3, overflow: 'hidden' }}>
        <div className="route-progress" style={{ height: '100%', width: '40%', background: chrome.accent }} />
      </div>
      <style>{`
        .route-progress { animation: route-sweep 1.1s ${EASE.enter} infinite; }
        @keyframes route-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .route-progress { animation: none; width: 100%; opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/**
 * Keeps a failure inside one route from blanking the whole site.
 *
 * There was no boundary at all, so anything that threw during a product route -
 * a WebGL context this device will not give us, a texture that 404s - left the
 * viewer on an empty page with nothing to do next.
 */
class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Route failed to render', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <RouteError onRetry={() => this.setState({ failed: false })} />;
  }
}

function RouteError({ onRetry }) {
  const { pathname } = useLocation();
  const { chrome } = routeIdentity(pathname);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        height: '100dvh',
        padding: 24,
        textAlign: 'center',
        background: chrome.bg,
        color: chrome.ink,
        fontFamily: "'Poppins', -apple-system, sans-serif",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 500 }}>This mattress could not be displayed.</div>
      <div style={{ fontSize: 13, color: chrome.dim, maxWidth: 320, lineHeight: 1.5 }}>
        The 3D view needs a browser with WebGL enabled.
      </div>
      <button
        type="button"
        onClick={onRetry}
        style={{
          marginTop: 4,
          border: `1px solid ${chrome.accent}`,
          background: 'transparent',
          color: chrome.accent,
          borderRadius: 100,
          padding: '9px 20px',
          fontSize: 12,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: `background ${MOTION.fast}ms ease, color ${MOTION.fast}ms ease`,
        }}
      >
        Try again
      </button>
    </div>
  );
}

export default function App() {
  return (
    // HashRouter (not BrowserRouter): this is a static "deploy from branch"
    // GitHub Pages site with no server-side rewrite, so a direct link to
    // /foamico/resto would 404 under BrowserRouter. Hash-based routes
    // (/#/foamico/resto) always resolve to index.html first, so direct links
    // work without any extra server config.
    <HashRouter>
      <TransitionProvider>
        <RouteErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<BrandSelectPage />} />

            <Route path="/vedasleep" element={<CatalogPage />} />
            <Route path="/vedasleep/duro" element={<DuroPage />} />
            <Route path="/vedasleep/maxa" element={<MaxaPage />} />
            <Route path="/vedasleep/magic" element={<MagicPage />} />
            <Route path="/vedasleep/signature" element={<SignaturePage />} />

            <Route path="/foamico" element={<FoamicoCatalogPage />} />
            <Route path="/foamico/resto" element={<RestoPage />} />
            <Route path="/foamico/sova" element={<SovaPage />} />
            <Route path="/foamico/luma" element={<LumaPage />} />
            <Route path="/foamico/ultima" element={<UltimaPage />} />
            <Route path="/foamico/riva" element={<RivaPage />} />

            {/* Links shared before the brand split pointed at /#/duro etc. */}
            <Route path="/duro" element={<Navigate to="/vedasleep/duro" replace />} />
            <Route path="/maxa" element={<Navigate to="/vedasleep/maxa" replace />} />
            <Route path="/magic" element={<Navigate to="/vedasleep/magic" replace />} />
            <Route path="/signature" element={<Navigate to="/vedasleep/signature" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </RouteErrorBoundary>
      </TransitionProvider>
    </HashRouter>
  );
}
