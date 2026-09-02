import { useState } from 'react';
import { Link } from 'react-router-dom';
import { publicUrl } from '../lib/publicUrl';
import { useSharedSource, useElementEntranceTarget, prefersReducedMotion } from '../transition/ProductTransition';
import { MOTION, EASE } from '../lib/motion';
import { preloadRoute } from '../routePreload';

// The light card. Both grids now pass their own theme - VedaSleep's went dark
// with its stage on 2026-09-01 - so this is the fallback for a caller that
// names none, not a live brand's styling. Keep it: it is also the only card
// defined against Paper, which is what the brand selector still stands on.
export const LIGHT_CARD = {
  background: '#fff',
  border: '#e4e0d4',
  name: 'inherit',
  tagline: '#6B6B6B',
  badge: '#c77d11',
  badgeBg: 'rgba(199,125,17,0.12)',
};

/**
 * `hovered` / `onHover` are lifted to the parent grid because the dim-the-others
 * effect is inherently cross-sibling - a card can't know it should dim from its
 * own state alone. `accent` is the brand hover edge (Veda Gold / Kiwi Green).
 */
export default function ProductCard({
  product,
  basePath = '',
  theme = LIGHT_CARD,
  accent = '#c77d11',
  hovered = null,
  onHover = () => {},
}) {
  const toPath = `${basePath}/${product.slug}`;
  const brand = basePath.replace(/^\//, '');
  const transitionId = `product-${brand}-${product.slug}`;
  const { ref, onClick } = useSharedSource({ id: transitionId, toPath, variant: 'card' });
  // The very same texture node is the landing target when returning from the
  // product page. It stays measurable while its grid wrapper is hidden.
  useElementEntranceTarget(transitionId, ref);
  const [pressed, setPressed] = useState(false);

  const reduced = prefersReducedMotion();
  const lifted = !reduced && (hovered === product.slug || pressed);
  const dimmed = !reduced && hovered !== null && hovered !== product.slug;

  return (
    <Link
      to={toPath}
      onClick={onClick}
      onPointerEnter={(e) => {
        preloadRoute(basePath, product.slug);
        if (e.pointerType !== 'touch') onHover(product.slug);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch') onHover(null);
      }}
      // Touch has no hover, so a tap gets the lifted state as direct feedback;
      // the transition's own pre-navigate hold keeps it visible long enough to read.
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => {
        preloadRoute(basePath, product.slug);
        onHover(product.slug);
      }}
      onBlur={() => onHover(null)}
      className="product-card"
      style={{
        textDecoration: 'none',
        color: 'inherit',
        opacity: dimmed ? 0.88 : 1,
        transform: lifted ? 'translateY(-4px)' : 'none',
        transition: reduced
          ? 'none'
          : `transform ${MOTION.fast}ms ${EASE.enter}, opacity ${MOTION.fast}ms ease`,
        willChange: lifted ? 'transform' : 'auto',
      }}
    >
      {/* The plate. The card used to be one bordered box with the picture at
          the top of it; the picture is now the object and the words stand on
          the page underneath, which is what makes a row of these read as a
          lineup rather than as a table of tiles.

          It stays the shared element: this node, and the crop it wears, is what
          flies into the 3D page - see the ref below - so the plate's ratio is
          also the shape that transition starts from. */}
      <div
        ref={ref}
        className="product-card__plate"
        style={{
          // The fill shows wherever the picture does not - a product shot with
          // its own ground rather than a full-bleed ticking crop.
          backgroundColor: theme.background,
          // Two layers, picture underneath: a soft wash that deepens toward the
          // foot of the plate, so the crop settles into the page instead of
          // stopping at a hard edge above the name.
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(0,0,0,0.30) 100%), url(${publicUrl(product.cardImage ?? product.textures.top)})`,
          border: `1px solid ${lifted ? accent : theme.border}`,
          // The lift is the plate's, not the whole card's: growing the words
          // along with the picture reads as a zoom rather than as an object
          // coming forward.
          transform: lifted ? 'scale(1.02)' : 'none',
          boxShadow: lifted
            ? `0 18px 38px rgba(0,0,0,0.18), 0 0 0 1px ${accent}55`
            : '0 0 0 0 rgba(0,0,0,0)',
          transition: reduced
            ? 'none'
            : `transform ${MOTION.fast}ms ${EASE.enter}, box-shadow ${MOTION.fast}ms ease, border-color ${MOTION.fast}ms ease`,
        }}
      >
        {product.placeholder && (
          <span
            className="product-card__badge"
            style={{
              color: theme.badge,
              background: theme.badgeBg,
            }}
          >
            Coming soon
          </span>
        )}
      </div>

      <div className="product-card__name" style={{ color: theme.name }}>
        {product.name}
      </div>

      {/* Product-owner copy, verbatim, and only where a product has it - a
          missing tagline is a product nobody has written one for yet, not a
          reason to write one here. See docs/PRODUCT_CATALOG.md, which records
          each line beside the construction it describes. */}
      {product.tagline && (
        <p className="product-card__tagline" style={{ color: theme.tagline }}>
          {product.tagline}
        </p>
      )}
    </Link>
  );
}
