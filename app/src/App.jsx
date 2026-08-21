import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import BrandSelectPage from './pages/BrandSelectPage';

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

function RouteFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        background: '#F6F8F1',
        color: '#8a8a8e',
        fontFamily: "'Poppins', -apple-system, sans-serif",
        fontSize: 13,
        letterSpacing: '0.03em',
      }}
    >
      Loading&hellip;
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
    </HashRouter>
  );
}
