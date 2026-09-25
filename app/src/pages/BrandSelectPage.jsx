import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MOTION, EASE, REVEAL_STEP } from '../lib/motion';
import { FOAMICO, VEDASLEEP } from '../data/brands';
import { publicUrl } from '../lib/publicUrl';
import { preloadImage } from '../routePreload';
import {
  useSharedSource,
  useSourceRecede,
  useElementEntranceTarget,
  useRouteEntranceRevealed,
  REVEAL,
  prefersReducedMotion,
  canHover,
} from '../transition/ProductTransition';

// The front door. Two equal panels, each rendered entirely in its own brand's
// palette so neither reads as the secondary choice. Deliberately imports no
// product data - visiting "/" must not pull either brand's textures.

const panelStyle = (background) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  // Each panel is the ground here, so it runs under the status bar and the
  // home indicator and its centred column is held off them instead.
  padding:
    'calc(72px + var(--safe-top)) calc(32px + var(--safe-right))'
    + ' calc(72px + var(--safe-bottom)) calc(32px + var(--safe-left))',
  minHeight: 'min(50dvh, 340px)',
  background,
  textDecoration: 'none',
  overflow: 'hidden',
});

// Both panels reserve the same height for their mark, whatever size the mark
// itself is. Without this the shorter lockup made a shorter column, and since
// each panel centres its own column the "View collection" cues ended up at
// different heights across the split - the one thing on this screen that has to
// line up, because it is the same affordance offered twice.
const MARK_SLOT = 176;

const markSlot = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: MARK_SLOT,
};

// The page's heading, for assistive tech only. The two marks are the visible
// title and the screen already says what it is; a screen reader has only the
// link names to go on without it.
const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
  // A heading is bold by default, and that alone would fetch a Poppins weight
  // nothing visible on this page uses. Set in the weight the page already has.
  fontWeight: 400,
};

const cueStyle = (color) => ({
  marginTop: 10,
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color,
});

export default function BrandSelectPage() {
  const recede = useSourceRecede();
  const [hovered, setHovered] = useState(null);
  const [hoverCapable, setHoverCapable] = useState(false);
  const reduced = prefersReducedMotion();

  // Pointer capability is a client-only fact; resolving it after mount keeps
  // the first paint identical everywhere and skips hover work on touch.
  useEffect(() => {
    setHoverCapable(canHover() && !prefersReducedMotion());
  }, []);

  // The light VedaSleep mark is not otherwise fetched on this page,
  // so on a first visit the cross-fade below would have nothing to fade into
  // and the mark would thin out in mid-flight. Warmed at idle rather than on
  // hover, so a touch device - which never hovers - gets it too.
  useEffect(() => {
    preloadImage(publicUrl('/brand/vedasleep-logo-light.webp'));
  }, []);

  const foamico = useSharedSource({ id: 'logo-foamico', toPath: '/foamico', variant: 'logo' });
  // The VedaSleep mark is the one shared element whose artwork differs at the
  // two ends: this panel is Paper and shows the dark mark, the catalog is Veda
  // Green-Black and shows the light one. Handing the flight both lets it
  // cross-fade, instead of carrying near-black "VEDA" across a dark page.
  // FOAMICO needs nothing here - its panel and its catalog are both dark, so
  // the same light mark is correct at both ends.
  const veda = useSharedSource({
    id: 'logo-vedasleep',
    toPath: '/vedasleep',
    variant: 'logo',
    toImageUrl: publicUrl('/brand/vedasleep-logo-light.webp'),
  });
  useElementEntranceTarget('logo-foamico', foamico.ref);
  useElementEntranceTarget('logo-vedasleep', veda.ref);
  const revealed = useRouteEntranceRevealed();

  const enter = (key) => (hoverCapable ? () => setHovered(key) : undefined);
  const leave = hoverCapable ? () => setHovered(null) : undefined;

  // Hovering one panel lifts its mark and warms its glow. The other panel is
  // deliberately left at full strength - neither brand should ever read as the
  // dimmed-out alternative to the one under the pointer.
  const markScale = (key) => (hovered === key ? 1.045 : 1);
  const glow = (key, base) => (hovered === key ? base * 1.9 : base);
  const markMotion = reduced ? 'none' : `transform ${MOTION.normal}ms ${EASE.enter}`;

  return (
    // <main> rather than a div: this split is the whole of the page's content,
    // and a landmark is how a screen reader user gets straight to it.
    <main id="main-content" className="brand-select" style={recede}>
      <h1 style={visuallyHidden}>FOAMICO and VedaSleep mattress collections</h1>
      <style>{`
        .brand-select {
          min-height: 100dvh;
          display: grid;
          grid-template-columns: 1fr;
        }
        @media (min-width: 760px) {
          .brand-select { grid-template-columns: 1fr 1fr; }
        }
        .brand-panel__cue { opacity: 0.75; transition: opacity 0.25s ease, transform 0.25s ease; }
        .brand-panel:hover .brand-panel__cue,
        .brand-panel:focus-visible .brand-panel__cue { opacity: 1; transform: translateX(4px); }
        .brand-panel:focus-visible { outline: 2px solid currentColor; outline-offset: -6px; }
        @media (prefers-reduced-motion: reduce) {
          .brand-panel__cue { transition: none; }
          .brand-panel:hover .brand-panel__cue,
          .brand-panel:focus-visible .brand-panel__cue { transform: none; }
        }
      `}</style>

      {/* FOAMICO - Key Black / Kiwi Green / Egg White */}
      <Link
        to="/foamico"
        className="brand-panel"
        onClick={foamico.onClick}
        onPointerEnter={enter('foamico')}
        onPointerLeave={leave}
        onFocus={enter('foamico')}
        onBlur={leave}
        style={{
          ...panelStyle(
            `radial-gradient(ellipse 70% 60% at 50% 40%, rgba(149,193,43,${glow('foamico', 0.1)}) 0%, rgba(149,193,43,0) 65%), ${FOAMICO.key}`
          ),
          opacity: revealed ? 1 : 0,
          transition: revealed
            ? `opacity ${MOTION.enter}ms ${EASE.enter} ${REVEAL.controls}ms, transform ${MOTION.enter}ms ${EASE.enter} ${REVEAL.controls}ms`
            : 'none',
        }}
      >
        <div style={markSlot}>
          <img
            ref={foamico.ref}
            src={publicUrl('/brand/foamico-logo-light.webp')}
            // Each screen density gets a file drawn at its own size. Keep in
            // step with the preloads in index.html, which must name the same
            // candidates or the browser fetches the mark twice.
            srcSet={`${publicUrl('/brand/foamico-logo-light@1x.webp')} 1x, ${publicUrl('/brand/foamico-logo-light.webp')} 2x`}
            alt="Foamico - Luxury Mattress"
            // Intrinsic size, so the box is reserved before the file arrives;
            // the style below still sets the rendered height. The two marks
            // are this page's largest paint, and index.html preloads both.
            width={473}
            height={321}
            fetchPriority="high"
            decoding="async"
            style={{
              height: 172,
              width: 'auto',
              transform: `scale(${markScale('foamico')})`,
              transition: markMotion,
              willChange: hovered === 'foamico' ? 'transform' : 'auto',
            }}
          />
        </div>
        <div className="brand-panel__cue" style={cueStyle(FOAMICO.muted)}>
          View collection &rarr;
        </div>
      </Link>

      {/* VedaSleep - Paper / Veda Gold. The lotus lockup already sets the
          brand name, so no separate text wordmark rides underneath it. */}
      <Link
        to="/vedasleep"
        className="brand-panel"
        onClick={veda.onClick}
        onPointerEnter={enter('vedasleep')}
        onPointerLeave={leave}
        onFocus={enter('vedasleep')}
        onBlur={leave}
        style={{
          ...panelStyle(
            `radial-gradient(ellipse 70% 60% at 50% 40%, rgba(199,125,17,${glow('vedasleep', 0.09)}) 0%, rgba(199,125,17,0) 65%), ${VEDASLEEP.key}`
          ),
          opacity: revealed ? 1 : 0,
          transition: revealed
            ? `opacity ${MOTION.enter}ms ${EASE.enter} ${REVEAL.controls + REVEAL_STEP}ms, transform ${MOTION.enter}ms ${EASE.enter} ${REVEAL.controls + REVEAL_STEP}ms`
            : 'none',
        }}
      >
        <div style={markSlot}>
          <img
            ref={veda.ref}
            src={publicUrl('/brand/vedasleep-logo.webp')}
            // The 3x file keeps the lockup as sharp as the original artwork on
            // a 3x phone.
            srcSet={`${publicUrl('/brand/vedasleep-logo@1x.webp')} 1x, ${publicUrl('/brand/vedasleep-logo.webp')} 2x, ${publicUrl('/brand/vedasleep-logo@3x.webp')} 3x`}
            alt="VedaSleep"
            width={505}
            height={196}
            fetchPriority="high"
            decoding="async"
            style={{
              height: 98,
              width: 'auto',
              transform: `scale(${markScale('vedasleep')})`,
              transition: markMotion,
              willChange: hovered === 'vedasleep' ? 'transform' : 'auto',
            }}
          />
        </div>
        <div className="brand-panel__cue" style={cueStyle(VEDASLEEP.muted)}>
          View collection &rarr;
        </div>
      </Link>
    </main>
  );
}
