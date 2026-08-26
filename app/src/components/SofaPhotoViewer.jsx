import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicUrl } from '../lib/publicUrl';
import { BRAND_THEMES } from '../data/brandThemes';
import { MOTION, EASE } from '../lib/motion';
import { useElementEntranceTarget, enterStyle, prefersReducedMotion } from '../transition/ProductTransition';

// Product page for the Sofa cum Bed, shown in photography rather than in 3D.
//
// It wears the same chrome as the mattress pages - same back link, same head,
// same control row, same entrance - so the two kinds of product page are
// visibly the same place; only the stage differs. Where a mattress page holds
// a canvas you orbit, this holds a plate you switch, because the thing worth
// seeing about this product is the fold, and the studio set records all three
// positions of it better than an orbit around any one of them would.
//
// The three buttons therefore name positions, not camera angles: the product
// is flat as a bed (Front), part-folded seen from its end (Side), and stood up
// as a seat (Sitting). Which photograph is which lives in the product data,
// not here.

export default function SofaPhotoViewer({ product, brand = 'foamico', transitionId = null, backTo = '/foamico' }) {
  const plateRef = useRef(null);
  const views = product.views ?? [];
  const [viewKey, setViewKey] = useState(views[0]?.key);
  const t = BRAND_THEMES[brand] ?? BRAND_THEMES.foamico;
  const active = views.find((v) => v.key === viewKey) ?? views[0];

  // The card's texture flies into the plate, and a plate is a plain element -
  // there is no canvas to wait for a first frame from, so the reveal is
  // released as soon as the flight lands. Arriving any other way (direct link,
  // refresh, back-nav) there is no flight, and this reads true from the start.
  const shown = useElementEntranceTarget(transitionId, plateRef);

  const reduced = prefersReducedMotion();

  return (
    <div
      className="mv-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        fontFamily: "'Poppins', -apple-system, sans-serif",
        background: t.surface,
        color: t.text,
        '--mv-btn-bg': t.btnBg,
        '--mv-btn-color': t.btnColor,
        '--mv-btn-active-bg': t.btnActiveBg,
        '--mv-btn-active-color': t.btnActiveColor,
        // The plate's edge is the same hairline the layer cards wear, so the
        // photo stage sits in the chrome the same way a card does.
        '--mv-menu-border': t.cardBorder,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        overflow: 'hidden',
      }}
    >
      <Link
        to={backTo}
        className="mv-back"
        style={{
          zIndex: 10,
          fontWeight: 500,
          letterSpacing: '0.03em',
          color: t.muted,
          textDecoration: 'none',
          background: brand === 'foamico' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
          ...enterStyle(shown, 235),
        }}
      >
        &larr; Catalog
      </Link>

      <div className="mv-head">
        <img
          src={publicUrl(t.logo)}
          alt={t.logoAlt}
          style={{ height: t.logoHeight, width: 'auto', ...enterStyle(shown, 0) }}
        />
        <div
          className="mv-title"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            lineHeight: 1,
            textTransform: 'uppercase',
            ...enterStyle(shown, 0),
          }}
        >
          {product.name}
        </div>
      </div>

      {/* The plate is given room on all four sides rather than filling the
          stage: butted up against the title above it and the buttons below it,
          a full-width white panel reads as the page's background rather than as
          one thing being shown on it. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Centred as a flex child rather than as an absolutely positioned one:
          // an absolute box is laid out against the padding box, so `inset: 0`
          // would ignore this padding and the plate would go back to touching
          // the title and the buttons.
          padding: '30px 20px 26px',
        }}
      >
        {/* Every shot was taken on a white sweep, so the picture's own ground
            becomes the plate and the product floats on Key Black with no
            cut-out edge to go wrong. */}
        <div
          ref={plateRef}
          className="mv-photo-plate"
          style={{
            position: 'relative',
            width: 'min(980px, 100%)',
            maxHeight: '100%',
            aspectRatio: '3 / 2',
            opacity: shown ? 1 : 0,
            transition: reduced ? 'none' : `opacity ${MOTION.enter}ms ${EASE.enter}`,
          }}
        >
          {views.map((v) => (
            // All three are mounted and cross-faded rather than swapped through
            // one src: swapping blanks the plate for a frame on a cold cache,
            // and the product jumps rather than changing position.
            <img
              key={v.key}
              src={publicUrl(v.src)}
              alt={v.alt}
              aria-hidden={v.key !== active?.key}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: v.key === active?.key ? 1 : 0,
                transition: reduced ? 'none' : `opacity ${MOTION.fast}ms ease`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mv-controls" style={{ ...enterStyle(shown, 130) }}>
        <div className="mv-btnrow">
          {views.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setViewKey(v.key)}
              className="mv-view-btn"
              data-active={v.key === active?.key}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="mv-hint" style={{ color: t.faint }}>Folds from a seat to a single bed</div>
      </div>
    </div>
  );
}
