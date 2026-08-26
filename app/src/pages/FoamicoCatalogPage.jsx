import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { foamicoProducts } from '../data/foamicoProducts';
import ProductCard from '../components/ProductCard';
import { FOAMICO } from '../data/brands';
import { publicUrl } from '../lib/publicUrl';
import {
  useSourceRecede,
  useSharedBackSource,
  useElementEntranceTarget,
  useRouteEntranceRevealed,
  enterStyle,
  REVEAL,
  REVEAL_STEP,
} from '../transition/ProductTransition';
import { preloadAllIn } from '../routePreload';

// Same structure as the VedaSleep grid (header + wordmark + tagline + card row),
// re-themed to Key Black / Kiwi Green. No Veda Gold anywhere on this screen.
//
// The brief asked to try the dark surface first and compare it against Paper.
// Both are defined here; flip SURFACE to 'paper' and everything derives from it.
const SURFACE = 'dark';

const SURFACES = {
  dark: {
    page: `radial-gradient(ellipse 70% 50% at 50% 20%, rgba(149,193,43,0.10) 0%, rgba(149,193,43,0) 60%), ${FOAMICO.key}`,
    tagline: FOAMICO.muted,
    card: {
      background: '#141414',
      border: '#2c2c2c',
      name: FOAMICO.onKey,
      spec: FOAMICO.muted,
      badge: FOAMICO.accent,
      badgeBg: 'rgba(18,18,18,0.78)',
    },
  },
  paper: {
    page: `radial-gradient(ellipse 70% 50% at 50% 20%, rgba(149,193,43,0.09) 0%, rgba(149,193,43,0) 60%), #F6F8F1`,
    tagline: '#8a8a8e',
    card: {
      background: '#fff',
      border: '#e2e4dc',
      name: '#2b2b2b',
      spec: '#8a8a8e',
      badge: '#5f7d1b', // Kiwi Green darkened to hold contrast on a light chip
      badgeBg: 'rgba(255,255,255,0.9)',
    },
  },
};

export default function FoamicoCatalogPage() {
  const surface = SURFACES[SURFACE];
  const dark = SURFACE === 'dark';

  // Source when a card is clicked; destination when arriving from the brand
  // selector, where the FOAMICO mark is the shared element landing here.
  const recede = useSourceRecede();
  const logoRef = useRef(null);
  useElementEntranceTarget('logo-foamico', logoRef);
  const revealed = useRouteEntranceRevealed();
  const back = useSharedBackSource({ id: 'logo-foamico', toPath: '/', variant: 'logo', elRef: logoRef });
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    preloadAllIn('/foamico');
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: surface.page,
        padding: '48px 24px 64px',
        ...recede,
      }}
    >
      <Link
        to="/"
        onClick={back.onClick}
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          zIndex: 10,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.03em',
          color: dark ? '#b5b5b5' : '#8a8a8e',
          textDecoration: 'none',
          background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
          padding: '6px 12px',
          borderRadius: 100,
          ...enterStyle(revealed, REVEAL.back),
        }}
      >
        &larr; Brands
      </Link>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            textAlign: 'center',
            marginBottom: 48,
          }}
        >
          <img
            ref={logoRef}
            src={publicUrl(dark ? '/brand/foamico-logo-light.png' : '/brand/foamico-logo.png')}
            alt="Foamico - Luxury Mattress"
            style={{ height: 72, width: 'auto', ...enterStyle(revealed, REVEAL.mark) }}
          />
          <div
            style={{
              fontSize: 13,
              color: surface.tagline,
              letterSpacing: '0.03em',
              ...enterStyle(revealed, REVEAL.meta),
            }}
          >
            Tap a product to explore it in 3D
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))',
            gap: 20,
            alignItems: 'stretch',
          }}
        >
          {foamicoProducts.map((product, i) => (
            <div key={product.slug} style={{ display: 'flex', ...enterStyle(revealed, REVEAL.controls + i * REVEAL_STEP) }}>
              <ProductCard
                product={product}
                basePath="/foamico"
                theme={surface.card}
                accent={FOAMICO.accent}
                hovered={hovered}
                onHover={setHovered}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
