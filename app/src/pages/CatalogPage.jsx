import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { products } from '../data/products';
import ProductCard from '../components/ProductCard';
import { publicUrl } from '../lib/publicUrl';
import { useSectionRecede } from '../transition/ProductTransition';
import { preloadAllIn } from '../routePreload';

export default function CatalogPage() {
  const receding = useSectionRecede();
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
            opacity: receding ? 0.5 : 1,
            transform: receding ? 'translateY(-4px)' : 'none',
            transition: 'opacity 0.26s ease, transform 0.26s ease',
          }}
        >
          <img src={publicUrl('/brand/vedasleep-logo.png')} alt="Veda Sleep" style={{ height: 40, width: 'auto' }} />
          <div
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
            }}
          >
            VedaSleep
          </div>
          <div style={{ fontSize: 13, color: '#8a8a8e', letterSpacing: '0.03em' }}>
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
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} basePath="/vedasleep" />
          ))}
        </div>
      </div>
    </div>
  );
}
