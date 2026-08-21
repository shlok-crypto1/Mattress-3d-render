import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { products } from '../data/products';
import ProductCard from '../components/ProductCard';
import { publicUrl } from '../lib/publicUrl';
import {
  useSourceRecede,
  useElementEntranceTarget,
  enterStyle,
  REVEAL,
} from '../transition/ProductTransition';
import { preloadAllIn } from '../routePreload';

const ACCENT = '#c77d11'; // Veda Gold

export default function CatalogPage() {
  // Source when a card is clicked; destination when arriving from the brand
  // selector, where the lotus mark is the shared element landing in the header.
  const recede = useSourceRecede();
  const logoRef = useRef(null);
  const revealed = useElementEntranceTarget('logo-vedasleep', logoRef);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    preloadAllIn('/vedasleep');
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        background:
          'radial-gradient(ellipse 70% 50% at 50% 20%, rgba(199,125,17,0.06) 0%, rgba(199,125,17,0) 60%), #F6F8F1',
        padding: '48px 24px 64px',
        ...recede,
      }}
    >
      <Link
        to="/"
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          zIndex: 10,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.03em',
          color: '#8a8a8e',
          textDecoration: 'none',
          background: 'rgba(255,255,255,0.7)',
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
            src={publicUrl('/brand/vedasleep-logo.png')}
            alt="Veda Sleep"
            style={{ height: 40, width: 'auto', ...enterStyle(revealed, REVEAL.mark) }}
          />
          <div
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              ...enterStyle(revealed, REVEAL.title),
            }}
          >
            VedaSleep
          </div>
          <div
            style={{
              fontSize: 13,
              color: '#8a8a8e',
              letterSpacing: '0.03em',
              ...enterStyle(revealed, REVEAL.meta),
            }}
          >
            The VedaSleep mattress collection &middot; tap a product to explore it in 3D
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
          }}
        >
          {products.map((product, i) => (
            <div key={product.slug} style={enterStyle(revealed, REVEAL.controls + i * 45)}>
              <ProductCard
                product={product}
                basePath="/vedasleep"
                accent={ACCENT}
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
