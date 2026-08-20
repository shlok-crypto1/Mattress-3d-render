import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import CatalogPage from './pages/CatalogPage';

// Each product route is its own lazy chunk, so visiting /magic doesn't pull in
// Duro/Maxa/Signature's page code (and, more importantly, never triggers their
// texture loads - those only start once MattressViewer actually mounts).
const DuroPage = lazy(() => import('./pages/DuroPage'));
const MaxaPage = lazy(() => import('./pages/MaxaPage'));
const MagicPage = lazy(() => import('./pages/MagicPage'));
const SignaturePage = lazy(() => import('./pages/SignaturePage'));

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
    // /catalog/maxa would 404 under BrowserRouter. Hash-based routes
    // (/catalog/#/maxa) always resolve to /catalog/index.html first, so
    // direct links work without any extra server config.
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/duro" element={<DuroPage />} />
          <Route path="/maxa" element={<MaxaPage />} />
          <Route path="/magic" element={<MagicPage />} />
          <Route path="/signature" element={<SignaturePage />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
