import { Link } from 'react-router-dom';
import { FOAMICO, VEDASLEEP } from '../data/brands';
import { publicUrl } from '../lib/publicUrl';

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
  height: 52,
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
  return (
    <div className="brand-select">
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
        .brand-panel__rule { transition: width 0.3s ease; }
        .brand-panel:hover .brand-panel__rule { width: 64px; }
      `}</style>

      {/* FOAMICO - Key Black / Kiwi Green / Egg White */}
      <Link
        to="/foamico"
        className="brand-panel"
        style={panelStyle(
          `radial-gradient(ellipse 70% 60% at 50% 40%, rgba(149,193,43,0.10) 0%, rgba(149,193,43,0) 65%), ${FOAMICO.key}`,
        )}
      >
        <div style={{ ...markSlot, height: 176 }}>
          <img
            src={publicUrl('/brand/foamico-logo-light.png')}
            alt="Foamico - Luxury Mattress"
            style={{ height: 172, width: 'auto' }}
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
        style={panelStyle(
          `radial-gradient(ellipse 70% 60% at 50% 40%, rgba(199,125,17,0.09) 0%, rgba(199,125,17,0) 65%), ${VEDASLEEP.key}`,
        )}
      >
        <div style={{ ...markSlot, height: 56 }}>
          <img src={publicUrl('/brand/vedasleep-logo.png')} alt="" style={{ height: 52, width: 'auto' }} />
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
