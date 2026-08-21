import { useState } from 'react';
import { Link } from 'react-router-dom';
import { publicUrl } from '../lib/publicUrl';
import { useSharedSource, useElementEntranceTarget, prefersReducedMotion } from '../transition/ProductTransition';
import { preloadRoute } from '../routePreload';

// Defaults reproduce the VedaSleep card exactly; FOAMICO passes its own theme.
export const LIGHT_CARD = {
  background: '#fff',
  border: '#e4e0d4',
  name: 'inherit',
  spec: '#8a8a8e',
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
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flex: 1,
        textDecoration: 'none',
        color: 'inherit',
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${lifted ? accent : theme.border}`,
        background: theme.background,
        opacity: dimmed ? 0.88 : 1,
        transform: lifted ? 'translateY(-4px) scale(1.035)' : 'none',
        boxShadow: lifted
          ? `0 18px 38px rgba(0,0,0,0.18), 0 0 0 1px ${accent}55`
          : '0 0 0 0 rgba(0,0,0,0)',
        transition: reduced
          ? 'none'
          : 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms ease, opacity 200ms ease, border-color 200ms ease',
        willChange: lifted ? 'transform' : 'auto',
      }}
    >
      <div
        ref={ref}
        style={{
          aspectRatio: '4 / 3',
          backgroundImage: `url(${publicUrl(product.textures.top)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        {product.placeholder && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: theme.badge,
              background: theme.badgeBg,
              padding: '4px 8px',
              borderRadius: 100,
            }}
          >
            Coming soon
          </span>
        )}
      </div>
      <div style={{ padding: '16px 18px 20px', minHeight: 92, boxSizing: 'border-box' }}>
        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: theme.name,
          }}
        >
          {product.name}
        </div>
        {product.specLine && (
          <div
            style={{
              fontSize: 11.5,
              color: theme.spec,
              marginTop: 6,
              letterSpacing: '0.02em',
              lineHeight: 1.4,
              minHeight: '2.8em',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
            }}
          >
            {product.specLine.variant} &middot; {product.specLine.thickness}
          </div>
        )}
      </div>
    </Link>
  );
}
