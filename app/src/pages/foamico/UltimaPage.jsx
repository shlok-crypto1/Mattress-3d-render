import ProductPage from '../ProductPage';
import { getFoamicoProductBySlug } from '../../data/foamicoProducts';

export default function UltimaPage() {
  return <ProductPage product={getFoamicoProductBySlug('ultima')} backTo="/foamico" brand="foamico" transitionId="foamico-ultima" />;
}
