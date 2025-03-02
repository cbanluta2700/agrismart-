import { ProductRecommendations } from './ProductRecommendations';

export const PersonalizedRecommendations = ({
  limit = 4,
  showViewAll = true
}) => {
  return (
    <ProductRecommendations
      title="Recommended For You"
      endpoint="personalized"
      limit={limit}
      showViewAll={showViewAll}
      viewAllLink="/marketplace?tab=recommended"
    />
  );
};
