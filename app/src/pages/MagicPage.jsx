import ProductPage from './ProductPage';
import { getProductBySlug } from '../data/products';

export default function MagicPage() {
  return <ProductPage product={getProductBySlug('magic')} backTo="/vedasleep" transitionId="product-vedasleep-magic" />;
}
