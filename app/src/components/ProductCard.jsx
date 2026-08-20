import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  return (
    <Link
      to={`/${product.slug}`}
      className="product-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid #e4e0d4',
        background: '#fff',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <div
        style={{
          aspectRatio: '4 / 3',
          backgroundImage: `url(${product.textures.top})`,
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
              color: '#c77d11',
              background: 'rgba(199,125,17,0.12)',
              padding: '4px 8px',
              borderRadius: 100,
            }}
          >
            Coming soon
          </span>
        )}
      </div>
      <div style={{ padding: '16px 18px 20px' }}>
        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {product.name}
        </div>
        {product.specLine && (
          <div style={{ fontSize: 11.5, color: '#8a8a8e', marginTop: 6, letterSpacing: '0.02em' }}>
            {product.specLine.variant} &middot; {product.specLine.thickness}
          </div>
        )}
      </div>
    </Link>
  );
}
