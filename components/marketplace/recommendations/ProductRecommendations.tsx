import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/marketplace/ProductCard';

interface Seller {
  id: string;
  name: string;
  avatar?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: Category;
  seller: Seller;
  condition: string;
}

interface ProductRecommendationsProps {
  title: string;
  endpoint: string;
  params?: Record<string, string>;
  limit?: number;
  showViewAll?: boolean;
  viewAllLink?: string;
}

export const ProductRecommendations = ({
  title,
  endpoint,
  params = {},
  limit = 4,
  showViewAll = false,
  viewAllLink = '/marketplace'
}: ProductRecommendationsProps) => {
  const { data: session } = useSession();
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        // Build query parameters
        const queryParams = new URLSearchParams({
          ...params,
          limit: limit.toString()
        });

        const response = await fetch(`/api/marketplace/recommendations/${endpoint}?${queryParams}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }

        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchRecommendations();
    } else {
      setLoading(false);
    }
  }, [session, endpoint, JSON.stringify(params), limit]);

  if (!session?.user) {
    return null;
  }

  if (loading) {
    return (
      <div className="w-full p-8">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(limit)].map((_, i) => (
            <div 
              key={i} 
              className="h-80 rounded-md border border-gray-200 animate-pulse bg-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="w-full p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        {showViewAll && (
          <Button variant="outline" size="sm" asChild>
            <a href={viewAllLink}>View All</a>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {recommendations.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};
