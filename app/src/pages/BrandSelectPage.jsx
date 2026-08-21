import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FOAMICO, VEDASLEEP } from '../data/brands';
import { publicUrl } from '../lib/publicUrl';
import {
  useSharedSource,
  useSourceRecede,
  prefersReducedMotion,
  canHover,
  EASE_ENTER,
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
  padding: '72px 32px',
  minHeight: 'min(50dvh, 340px)',
  background,
  textDecoration: 'none',
  overflow: 'hidden',
});

const wordmarkStyle = (color, size) => ({
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 800,
  fontSize: size,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color,
  lineHeight: 1,
});

const taglineStyle = (color) => ({
  fontSize: 12.5,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color,
});

const markSlot = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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

  const foamico = useSharedSource({ id: 'logo-foamico', toPath: '/foamico', variant: 'logo' });
  const veda = useSharedSource({ id: 'logo-vedasleep', toPath: '/vedasleep', variant: 'logo' });

  const enter = (key) => (hoverCapable ? () => setHovered(key) : undefined);
  const leave = hoverCapable ? () => setHovered(null) : undefined;

  // Hovering one panel lifts its mark and dims the other, so the choice reads
  // as a focus shift rather than two unrelated buttons.
  const panelDim = (key) => (hovered && hovered !== key ? 0.65 : 1);
  const markScale = (key) => (hovered === key ? 1.045 : 1);
  const glow = (key, base) => (hovered === key ? base * 1.9 : base);
  const markMotion = reduced ? 'none' : `transform 320ms ${EASE_ENTER}`;
  const panelMotion = reduced ? 'none' : `opacity 260ms ${EASE_ENTER}`;

  return (
    <div className="brand-select" style={recede}>
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
          opacity: panelDim('foamico'),
          transition: panelMotion,
        }}
      >
        <div style={{ ...markSlot, height: 176 }}>
          <img
            ref={foamico.ref}
            src={publicUrl('/brand/foamico-logo-light.png')}
            alt="Foamico - Luxury Mattress"
            style={{
              height: 172,
              width: 'auto',
              transform: `scale(${markScale('foamico')})`,
              transition: markMotion,
              willChange: hovered === 'foamico' ? 'transform' : 'auto',
            }}
          />
        </div>
        <div style={taglineStyle(FOAMICO.onKey)}>{FOAMICO.tagline}</div>
        <div className="brand-panel__cue" style={cueStyle(FOAMICO.muted)}>
          View collection &rarr;
        </div>
      </Link>

      {/* VedaSleep - Paper / Veda Gold, with the existing lotus wordmark asset */}
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
          opacity: panelDim('vedasleep'),
          transition: panelMotion,
        }}
      >
        <div style={{ ...markSlot, height: 56 }}>
          <img
            ref={veda.ref}
            src={publicUrl('/brand/vedasleep-logo.png')}
            alt=""
            style={{
              height: 52,
              width: 'auto',
              transform: `scale(${markScale('vedasleep')})`,
              transition: markMotion,
              willChange: hovered === 'vedasleep' ? 'transform' : 'auto',
            }}
          />
        </div>
        <div style={wordmarkStyle(VEDASLEEP.onKey, 'clamp(26px, 4vw, 40px)')}>VedaSleep</div>
        <div style={taglineStyle(VEDASLEEP.accent)}>{VEDASLEEP.tagline}</div>
        <div className="brand-panel__cue" style={cueStyle(VEDASLEEP.muted)}>
          View collection &rarr;
        </div>
      </Link>
    </div>
  );
}
