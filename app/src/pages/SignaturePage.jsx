import ProductPage from './ProductPage';
import { getProductBySlug } from '../data/products';

export default function SignaturePage() {
  return <ProductPage product={getProductBySlug('signature')} backTo="/vedasleep" transitionId="vedasleep-signature" />;
}
