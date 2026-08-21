import ProductPage from '../ProductPage';
import { getFoamicoProductBySlug } from '../../data/foamicoProducts';

export default function RestoPage() {
  return <ProductPage product={getFoamicoProductBySlug('resto')} backTo="/foamico" brand="foamico" />;
}
