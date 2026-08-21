import ProductPage from '../ProductPage';
import { getFoamicoProductBySlug } from '../../data/foamicoProducts';

export default function LumaPage() {
  return <ProductPage product={getFoamicoProductBySlug('luma')} backTo="/foamico" brand="foamico" transitionId="product-foamico-luma" />;
}
