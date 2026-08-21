import ProductPage from '../ProductPage';
import { getFoamicoProductBySlug } from '../../data/foamicoProducts';

export default function RivaPage() {
  return <ProductPage product={getFoamicoProductBySlug('riva')} backTo="/foamico" brand="foamico" transitionId="foamico-riva" />;
}
