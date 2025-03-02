import { ProductRecommendations } from './ProductRecommendations';

interface AlsoBoughtProductsProps {
  productId: string;
  limit?: number;
  showViewAll?: boolean;
}

export const AlsoBoughtProducts = ({
  productId,
  limit = 4,
  showViewAll = false,
}: AlsoBoughtProductsProps) => {
  if (!productId) return null;
  
  return (
    <ProductRecommendations
      title="Customers Also Bought"
      endpoint="also-bought"
      params={{ productId }}
      limit={limit}
      showViewAll={showViewAll}
      viewAllLink={`/marketplace?relatedTo=${productId}`}
    />
  );
};
