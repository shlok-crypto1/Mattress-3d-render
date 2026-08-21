import MattressViewer from '../components/MattressViewer';

export default function ProductPage({ product, backTo = '/', brand = 'vedasleep', transitionId = null }) {
  return (
    <MattressViewer product={product} brand={brand} transitionId={transitionId} backTo={backTo} />
  );
}
