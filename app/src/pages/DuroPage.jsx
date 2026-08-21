import ProductPage from './ProductPage';
import { getProductBySlug } from '../data/products';

export default function DuroPage() {
  return <ProductPage product={getProductBySlug('duro')} backTo="/vedasleep" transitionId="product-vedasleep-duro" />;
}
