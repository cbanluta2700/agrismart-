import { ProductRecommendations } from './ProductRecommendations';

interface SimilarProductsProps {
  productId: string;
  limit?: number;
  showViewAll?: boolean;
}

export const SimilarProducts = ({
  productId,
  limit = 4,
  showViewAll = false,
}: SimilarProductsProps) => {
  if (!productId) return null;
  
  return (
    <ProductRecommendations
      title="Similar Products"
      endpoint="similar-products"
      params={{ productId }}
      limit={limit}
      showViewAll={showViewAll}
      viewAllLink={`/marketplace?similarTo=${productId}`}
    />
  );
};
