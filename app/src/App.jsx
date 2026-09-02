import { Component, Suspense, lazy, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import BrandSelectPage from './pages/BrandSelectPage';
import ChatWidget from './components/ChatWidget';
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

const RestoPage = lazy(() => import('./pages/foamico/RestoPage'));
const SovaPage = lazy(() => import('./pages/foamico/SovaPage'));
const LumaPage = lazy(() => import('./pages/foamico/LumaPage'));
const UltimaPage = lazy(() => import('./pages/foamico/UltimaPage'));
const RivaPage = lazy(() => import('./pages/foamico/RivaPage'));
// Photo-only product - its chunk pulls no three.js at all.
const SofaCumBedPage = lazy(() => import('./pages/foamico/SofaCumBedPage'));

// Just enough of each brand to paint a holding screen. Deliberately not the
// full BRAND_THEMES table from MattressViewer: importing that would pull the
// whole 3D viewer into the entry chunk, and the entire point of the lazy routes
// is that landing anywhere loads only what that page needs.
const CHROME = {
  foamico: { bg: '#1A1A1A', ink: '#FEFEFE', dim: '#8f8f8f', accent: '#95C12B', word: 'FOAMICO' },
  // Every VedaSleep route that reaches this fallback is either the card grid
  // or a product page, and both of those are Veda Green-Black - so the holding
  // screen is too, or each navigation flashes cream before settling. These four
  // values are a deliberate copy of the vedasleep entry in BRAND_THEMES (see
  // the note above on why this table exists); if the stage moves, move both.
  vedasleep: { bg: '#1F2A22', ink: '#F7F5F0', dim: '#93A197', accent: '#c77d11', word: 'VEDASLEEP' },
};

/**
 * The ground a route stands on - the colour behind everything it paints.
 *
 * The selector is the one split screen, and a canvas takes a single colour, so
 * it takes the panel at the top: FOAMICO's Key Black on a phone, where the
 * panels stack, and the half the status bar sits over on a desktop.
 */
function pageGround(pathname) {
  const [, brand] = pathname.split('/');
  return (CHROME[brand] ?? CHROME.foamico).bg;
}

/**
 * Keeps the page ground in step with the route.
 *
 * This is not a page's own background - every page paints that itself. It is
 * the colour of the canvas: what iOS Safari tints its status bar and its bottom
 * toolbar from, and what a rubber-band overscroll uncovers past either end of a
 * scroll. It was Paper for every route, being body's background propagated up,
 * which put a cream band above and below a Key Black page on an iPhone.
 *
 * Two things are set because Safari uses two. `theme-color` is what it prefers,
 * and the only one that reaches the bottom toolbar at all; the custom property
 * is what actually paints the document, and what every other browser overscrolls
 * into. See --page-ground in src/index.css.
 */
function PageGround() {
  const { pathname } = useLocation();
  const ground = pageGround(pathname);

  useEffect(() => {
    document.documentElement.style.setProperty('--page-ground', ground);
    let meta = document.head.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', ground);
  }, [ground]);

  return null;
}

/** Brand and product implied by a route, for chrome that renders before it. */
function routeIdentity(pathname) {
  const [, brand, slug] = pathname.split('/');
  const chrome = CHROME[brand] ?? CHROME.vedasleep;
  // Slugs are the product name lowercased, so they read back as the name once
  // the hyphens are spaces again - "sofa-cum-bed" holding screen should say
  // SOFA CUM BED, not SOFA-CUM-BED.
  return { chrome, word: CHROME[brand] ? chrome.word : null, slug: slug ? slug.replace(/-/g, ' ') : null };
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
      <PageGround />
      <TransitionProvider>
        <RouteErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<BrandSelectPage />} />

            <Route path="/vedasleep" element={<CatalogPage />} />
            <Route path="/vedasleep/duro" element={<DuroPage />} />
            <Route path="/vedasleep/maxa" element={<MaxaPage />} />
            <Route path="/vedasleep/magic" element={<MagicPage />} />

            <Route path="/foamico" element={<FoamicoCatalogPage />} />
            <Route path="/foamico/resto" element={<RestoPage />} />
            <Route path="/foamico/sova" element={<SovaPage />} />
            <Route path="/foamico/luma" element={<LumaPage />} />
            <Route path="/foamico/ultima" element={<UltimaPage />} />
            <Route path="/foamico/riva" element={<RivaPage />} />
            <Route path="/foamico/sofa-cum-bed" element={<SofaCumBedPage />} />

            {/* Links shared before the brand split pointed at /#/duro etc. */}
            <Route path="/duro" element={<Navigate to="/vedasleep/duro" replace />} />
            <Route path="/maxa" element={<Navigate to="/vedasleep/maxa" replace />} />
            <Route path="/magic" element={<Navigate to="/vedasleep/magic" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </RouteErrorBoundary>
        {/* Outside <Routes> on purpose. The dock decides for itself which
            routes it belongs on (the brand selector and the two card grids -
            never a product viewer), and mounting it once here rather than
            inside three page components means the conversation survives moving
            between those pages instead of restarting on each one. It portals
            to <body>, so the receding blur a page applies to itself while
            navigating away never reaches it. */}
        <ChatWidget />
      </TransitionProvider>
    </HashRouter>
  );
}
