import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { sofaCumBed } from '../../data/foamicoProducts';
import { publicUrl } from '../../lib/publicUrl';
import { MOTION, EASE } from '../../lib/motion';
import {
  useSourceRecede,
  useSharedBackSource,
  useElementEntranceTarget,
  useRouteEntranceRevealed,
  enterStyle,
  prefersReducedMotion,
  REVEAL,
  REVEAL_STEP,
} from '../../transition/ProductTransition';

// The one FOAMICO product that is photographed rather than rendered.
//
// A Sofa cum Bed is three hinged foam panels that fold from a seat into a flat
// bed. MattressViewer builds one rounded slab from a width/height/length and a
// set of face textures, so there is no honest way to put this product through
// it - a box wearing the sofa's fabric would misrepresent the shape, and
// Asset integrity in docs/3D_RENDER_GUIDELINES.md rules out standing a
// placeholder in for a product model. So it gets its own page: the same
// FOAMICO chrome and the same staged entrance as every other product page,
// with the supplied photography in place of the canvas.
//
// The set is ordered as a fold sequence - seat, unfolding, flat - so scrolling
// the page performs the one thing the product actually does. That is the
// closest this can get to the construction story the 3D pages tell.

const TRANSITION_ID = 'product-foamico-sofa-cum-bed';

// Key Black chrome, matched to BRAND_THEMES.foamico in MattressViewer so the
// two kinds of product page are visibly the same place.
const T = {
  surface:
    'radial-gradient(ellipse 70% 60% at 50% 24%, rgba(149,193,43,0.10) 0%, rgba(149,193,43,0) 62%), #1A1A1A',
  text: '#FEFEFE',
  muted: '#8f8f8f',
  faint: '#6e6e6e',
  accent: '#95C12B',
  plate: '#FEFEFE',
  plateBorder: '#2c2c2c',
};

export default function SofaCumBedPage() {
  const recede = useSourceRecede();
  const heroRef = useRef(null);
  const revealed = useRouteEntranceRevealed();
  const reduced = prefersReducedMotion();
  const [lit, setLit] = useState(null);

  // The card's texture flies into the hero plate. No canvas to wait on, so the
  // plain element target releases the reveal as soon as the flight lands.
  useElementEntranceTarget(TRANSITION_ID, heroRef);
  const back = useSharedBackSource({
    id: TRANSITION_ID,
    toPath: '/foamico',
    variant: 'card',
    elRef: heroRef,
  });

  const [hero, ...rest] = sofaCumBed.gallery;

  return (
    <div className="scb" style={{ background: T.surface, color: T.text, ...recede }}>
      <style>{`
        .scb {
          min-height: 100dvh;
          font-family: 'Poppins', -apple-system, sans-serif;
          padding: calc(28px + env(safe-area-inset-top)) 20px calc(64px + env(safe-area-inset-bottom));
          -webkit-tap-highlight-color: transparent;
        }
        .scb-back {
          position: absolute;
          top: calc(18px + env(safe-area-inset-top));
          left: calc(18px + env(safe-area-inset-left));
          z-index: 10;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.03em;
          text-decoration: none;
          background: rgba(255,255,255,0.08);
          padding: 6px 12px;
          border-radius: 100px;
        }
        .scb-head {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
        }
        .scb-title {
          font-family: 'Montserrat', sans-serif;
          font-weight: 800;
          font-size: 34px;
          line-height: 1;
          letter-spacing: 0.22em;
          text-indent: 0.22em;
          text-transform: uppercase;
        }
        /* Every photo was shot on a white sweep, so each one sits on a white
           plate and the background of the picture becomes the plate itself -
           no cut-out edge to go wrong, and the product floats on Key Black. */
        .scb-plate {
          border-radius: 18px;
          overflow: hidden;
          background: ${T.plate};
          border: 1px solid ${T.plateBorder};
          line-height: 0;
        }
        .scb-plate img { width: 100%; height: auto; display: block; }
        /* The hero is capped rather than left to its natural size: at full
           width it filled the viewport on its own, so the fold sequence
           underneath - the part that shows what the product does - sat
           entirely below the scroll with nothing to suggest it was there.
           Letterboxing is invisible here because the plate is the same white
           the photo was shot on. */
        .scb-hero img { max-height: 56dvh; object-fit: contain; }
        .scb-stage { max-width: 1080px; margin: 34px auto 0; }
        .scb-grid {
          margin-top: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
        }
        .scb-cap {
          margin-top: 10px;
          font-size: 11.5px;
          letter-spacing: 0.03em;
          line-height: 1.45;
        }
        .scb-hint {
          margin-top: 26px;
          text-align: center;
          font-size: 11.5px;
          letter-spacing: 0.03em;
        }
        @media (max-width: 560px) {
          .scb-title { font-size: 26px; letter-spacing: 0.16em; text-indent: 0.16em; }
          .scb-stage { margin-top: 26px; }
          .scb-grid { gap: 14px; }
        }
      `}</style>

      <Link
        to="/foamico"
        onClick={back.onClick}
        className="scb-back"
        style={{ color: T.muted, ...enterStyle(revealed, REVEAL.back) }}
      >
        &larr; Catalog
      </Link>

      <div className="scb-head">
        <img
          src={publicUrl('/brand/foamico-logo-light.png')}
          alt="Foamico"
          style={{ height: 54, width: 'auto', ...enterStyle(revealed, REVEAL.mark) }}
        />
        <div className="scb-title" style={enterStyle(revealed, REVEAL.title)}>
          {sofaCumBed.name}
        </div>
      </div>

      <div className="scb-stage">
        {/* Hero doubles as the shared element's landing pad, so it is not lazy
            and carries no entrance offset of its own - the flight is the
            entrance. */}
        <div ref={heroRef} className="scb-plate scb-hero">
          <img src={publicUrl(hero.src)} alt={hero.alt} />
        </div>
        <div className="scb-cap" style={{ color: T.muted, ...enterStyle(revealed, REVEAL.meta) }}>
          {hero.alt}
        </div>

        <div className="scb-grid">
          {rest.map((shot, i) => (
            <figure
              key={shot.src}
              style={{ margin: 0, ...enterStyle(revealed, REVEAL.controls + i * REVEAL_STEP) }}
              onPointerEnter={(e) => e.pointerType !== 'touch' && setLit(shot.src)}
              onPointerLeave={(e) => e.pointerType !== 'touch' && setLit(null)}
            >
              <div
                className="scb-plate"
                style={{
                  borderColor: lit === shot.src ? T.accent : T.plateBorder,
                  transform: !reduced && lit === shot.src ? 'translateY(-3px)' : 'none',
                  transition: reduced
                    ? 'none'
                    : `transform ${MOTION.fast}ms ${EASE.enter}, border-color ${MOTION.fast}ms ease`,
                }}
              >
                <img src={publicUrl(shot.src)} alt={shot.alt} loading="lazy" />
              </div>
              <figcaption className="scb-cap" style={{ color: T.muted }}>
                {shot.alt}
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="scb-hint" style={{ color: T.faint, ...enterStyle(revealed, REVEAL.back) }}>
          Shown folded, part-opened and flat &middot; specifications to follow
        </div>
      </div>
    </div>
  );
}
