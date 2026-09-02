import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { foamicoProducts } from '../data/foamicoProducts';
import ProductLineup from '../components/ProductLineup';
import { FOAMICO } from '../data/brands';
import { publicUrl } from '../lib/publicUrl';
import {
  useSourceRecede,
  useSharedBackSource,
  useElementEntranceTarget,
  useRouteEntranceRevealed,
  enterStyle,
  REVEAL,
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
      // Sand, the brand's secondary ink on dark - the tagline is a second
      // voice under the name, not a second heading.
      tagline: '#9D9E9E',
      badge: FOAMICO.accent,
      badgeBg: 'rgba(18,18,18,0.78)',
    },
    // Sand, held well back: on a phone the position marks sit under the row
    // and should read as a measure of it, not as a control beside it.
    dotIdle: 'rgba(157,158,158,0.32)',
  },
  paper: {
    page: `radial-gradient(ellipse 70% 50% at 50% 20%, rgba(149,193,43,0.09) 0%, rgba(149,193,43,0) 60%), #F6F8F1`,
    tagline: '#8a8a8e',
    card: {
      background: '#fff',
      border: '#e2e4dc',
      name: '#2b2b2b',
      tagline: '#6B6B6B', // Slate Grey, the light-ground counterpart of Sand
      badge: '#5f7d1b', // Kiwi Green darkened to hold contrast on a light chip
      badgeBg: 'rgba(255,255,255,0.9)',
    },
    dotIdle: 'rgba(43,43,43,0.22)',
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

  useEffect(() => {
    preloadAllIn('/foamico');
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background: surface.page,
        // The 24px is also what the phone lineup aligns its first card to and
        // bleeds past - see --lineup-gutter in src/index.css. Change one and
        // the other has to follow.
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
      {/* Three plates at the size the lineup is composed for, plus their two
          gutters. Narrower than this and the cards never reach it; wider and
          they grow past the shape they were specified at. */}
      <div style={{ maxWidth: 1744, margin: '0 auto' }}>
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

        <ProductLineup
          products={foamicoProducts}
          basePath="/foamico"
          theme={surface.card}
          accent={FOAMICO.accent}
          dotIdle={surface.dotIdle}
          revealed={revealed}
          label="FOAMICO products"
        />
      </div>
    </div>
  );
}
