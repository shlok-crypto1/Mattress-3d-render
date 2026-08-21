import ProductPage from '../ProductPage';
import { getFoamicoProductBySlug } from '../../data/foamicoProducts';

export default function SovaPage() {
  return <ProductPage product={getFoamicoProductBySlug('sova')} backTo="/foamico" brand="foamico" transitionId="product-foamico-sova" />;
}
