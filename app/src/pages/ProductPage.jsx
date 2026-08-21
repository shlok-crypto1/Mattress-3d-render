import { Link } from 'react-router-dom';
import MattressViewer from '../components/MattressViewer';
import { useEntranceRevealed, enterStyle } from '../transition/ProductTransition';

export default function ProductPage({ product, backTo = '/', brand = 'vedasleep', transitionId = null }) {
  const dark = brand === 'foamico';
  const revealed = useEntranceRevealed(transitionId);
  const animated = !!transitionId;
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
          ...(animated ? enterStyle(revealed, 190) : null),
        }}
      >
        &larr; Catalog
      </Link>
      <MattressViewer product={product} brand={brand} transitionId={transitionId} />
    </div>
  );
}
