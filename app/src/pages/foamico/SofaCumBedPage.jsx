import SofaViewer from '../../components/SofaViewer';
import { getFoamicoProductBySlug } from '../../data/foamicoProducts';

export default function SofaCumBedPage() {
  return (
    <SofaViewer
      product={getFoamicoProductBySlug('sofa-cum-bed')}
      brand="foamico"
      backTo="/foamico"
      transitionId="product-foamico-sofa-cum-bed"
    />
  );
}
