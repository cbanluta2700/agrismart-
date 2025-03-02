import { ProductRecommendations } from './ProductRecommendations';

export const SeasonalRecommendations = ({
  season,
  limit = 4,
  showViewAll = true,
}) => {
  const seasonName = season || 'current'; // If no season provided, use current
  
  const getTitle = () => {
    if (season === 'holiday') return 'Holiday Specials';
    if (season === 'spring') return 'Spring Recommendations';
    if (season === 'summer') return 'Summer Recommendations';
    if (season === 'fall') return 'Fall Recommendations';
    if (season === 'winter') return 'Winter Recommendations';
    return 'Seasonal Recommendations';
  };
  
  return (
    <ProductRecommendations
      title={getTitle()}
      endpoint="seasonal"
      params={{ season: seasonName }}
      limit={limit}
      showViewAll={showViewAll}
      viewAllLink={`/marketplace?season=${seasonName}`}
    />
  );
};
