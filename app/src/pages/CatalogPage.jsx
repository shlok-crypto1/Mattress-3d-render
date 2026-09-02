import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { products } from '../data/products';
import ProductLineup from '../components/ProductLineup';
import { publicUrl } from '../lib/publicUrl';
import {
  useSourceRecede,
  useSharedBackSource,
  useElementEntranceTarget,
  useRouteEntranceRevealed,
  enterStyle,
  REVEAL,
} from '../transition/ProductTransition';
import { preloadAllIn, preloadImage } from '../routePreload';

const ACCENT = '#c77d11'; // Veda Gold

// ProductCard defaults to a white card, which was right while this grid stood
// on Paper. On Veda Green-Black a white card punches a hole through the page,
// so the grid passes its own - the same thing the FOAMICO grid does, in the
// same shape, one step up from the stage rather than a slab of white on it.
const CARD = {
  // One step up from the stage was not enough: at #26332A the card measured
  // 1.13 against Veda Green-Black and read as a rectangle of the page rather
  // than an object on it (product owner, 2026-09-01). #3A4F3F measures 1.68,
  // and the rim above it 2.33, which is what makes the card look raised.
  //
  // It cannot simply keep going: the fill has to stay clearly darker than the
  // tickings it frames or it starts competing with the photograph. The binding
  // one is Magic, the only mid-grey ticking, and this holds it at 3.22.
  //
  // The gold badge is unaffected by any of this - it sits on badgeBg, its own
  // chip, so it never touches the fill.
  background: '#3A4F3F',
  border: '#4C6552',
  name: '#F7F5F0',
  badge: ACCENT,
  badgeBg: 'rgba(24,32,26,0.78)',
};

// The inactive position mark on a phone. Veda Chrome's secondary ink, held
// well back: the marks measure the row, they are not a control beside it.
const DOT_IDLE = 'rgba(147,161,151,0.32)';

export default function CatalogPage() {
  // Source when a card is clicked; destination when arriving from the brand
  // selector, where the lotus mark is the shared element landing in the header.
  const recede = useSourceRecede();
  const logoRef = useRef(null);
  useElementEntranceTarget('logo-vedasleep', logoRef);
  const revealed = useRouteEntranceRevealed();
  // Going back reverses it: this page shows the light mark, the selector it
  // returns to is Paper and shows the dark one. See the note in
  // BrandSelectPage.jsx.
  const back = useSharedBackSource({
    id: 'logo-vedasleep',
    toPath: '/',
    variant: 'logo',
    elRef: logoRef,
    toImageUrl: publicUrl('/brand/vedasleep-logo.png'),
  });

  // The dark mark, for the flight back to the Paper selector. That swap is
  // instant by design (see ProductTransition.jsx), which only works if the
  // artwork is already there - an unloaded image at opacity 1 shows nothing,
  // and the mark would vanish rather than merely be the wrong variant. Landing
  // here from the selector means it is cached already; landing here from a
  // direct link or a reload does not, and that is the case this covers.
  useEffect(() => {
    preloadImage(publicUrl('/brand/vedasleep-logo.png'));
  }, []);

  useEffect(() => {
    preloadAllIn('/vedasleep');
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        // Veda Green-Black, matching the product pages this grid opens into -
        // see the note in src/data/brandThemes.js for why the stage is dark
        // rather than a darker grey.
        background:
          'radial-gradient(ellipse 70% 50% at 50% 20%, rgba(199,125,17,0.08) 0%, rgba(199,125,17,0) 60%), #1F2A22',
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
          color: '#93A197',
          textDecoration: 'none',
          background: 'rgba(38,51,42,0.72)',
          padding: '6px 12px',
          borderRadius: 100,
          ...enterStyle(revealed, REVEAL.back),
        }}
      >
        &larr; Brands
      </Link>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
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
            src={publicUrl('/brand/vedasleep-logo-light.png')}
            alt="Veda Sleep"
            style={{ height: 62, width: 'auto', ...enterStyle(revealed, REVEAL.mark) }}
          />
          <div
            style={{
              fontSize: 13,
              color: '#93A197',
              letterSpacing: '0.03em',
              ...enterStyle(revealed, REVEAL.meta),
            }}
          >
            Tap a product to explore it in 3D
          </div>
        </div>

        <ProductLineup
          products={products}
          basePath="/vedasleep"
          theme={CARD}
          accent={ACCENT}
          dotIdle={DOT_IDLE}
          minCardWidth={200}
          revealed={revealed}
          label="VedaSleep products"
        />
      </div>
    </div>
  );
}
