import ProductPage from './ProductPage';
import { getProductBySlug } from '../data/products';

export default function MaxaPage() {
  return <ProductPage product={getProductBySlug('maxa')} backTo="/vedasleep" transitionId="product-vedasleep-maxa" />;
}
