import { Link } from 'react-router-dom';
import MattressViewer from '../components/MattressViewer';

export default function ProductPage({ product, backTo = '/', brand = 'vedasleep' }) {
  const dark = brand === 'foamico';
  return (
    <div style={{ position: 'relative' }}>
      <Link
        to={backTo}
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          zIndex: 10,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.03em',
          color: dark ? '#b5b5b5' : '#8a8a8e',
          textDecoration: 'none',
          background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
          padding: '6px 12px',
          borderRadius: 100,
        }}
      >
        &larr; Catalog
      </Link>
      <MattressViewer product={product} brand={brand} />
    </div>
  );
}
