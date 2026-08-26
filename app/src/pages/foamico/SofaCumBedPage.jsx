import SofaPhotoViewer from '../../components/SofaPhotoViewer';
import { getFoamicoProductBySlug } from '../../data/foamicoProducts';

export default function SofaCumBedPage() {
  return (
    <SofaPhotoViewer
      product={getFoamicoProductBySlug('sofa-cum-bed')}
      brand="foamico"
      backTo="/foamico"
      transitionId="product-foamico-sofa-cum-bed"
    />
  );
}
