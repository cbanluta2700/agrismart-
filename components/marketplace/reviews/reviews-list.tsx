"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMarketplaceReviews, Review } from "@/hooks/use-marketplace-reviews";
import { ReviewCard } from "./review-card";
import { StarRating } from "./star-rating";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";

interface ReviewsListProps {
  productId: string;
  sellerId: string;
}

type SortOption = "newest" | "highest" | "lowest" | "most-helpful";

export function ReviewsList({ productId, sellerId }: ReviewsListProps) {
  const { loading, error, data, fetchReviews } = useMarketplaceReviews();
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  
  // Fetch reviews on component mount
  useEffect(() => {
    if (productId) {
      fetchReviews(productId);
    }
  }, [fetchReviews, productId]);
  
  // Sort and filter reviews when reviews or sort option changes
  useEffect(() => {
    if (!data || !data.reviews || !data.reviews.length) return;
    
    let sorted = [...data.reviews];
    
    switch (sortOption) {
      case "newest":
        sorted = sorted.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "highest":
        sorted = sorted.sort((a, b) => b.rating - a.rating);
        break;
      case "lowest":
        sorted = sorted.sort((a, b) => a.rating - b.rating);
        break;
      case "most-helpful":
        sorted = sorted.sort(
          (a, b) => 
            b.helpfulVotes.filter(vote => vote.isHelpful).length - 
            a.helpfulVotes.filter(vote => vote.isHelpful).length
        );
        break;
    }
    
    setFilteredReviews(sorted);
  }, [data, sortOption]);
  
  const getPercentage = (count: number) => {
    if (!data || !data.ratingStats || data.ratingStats.total === 0) return 0;
    return (count / data.ratingStats.total) * 100;
  };
  
  if (loading && (!data || !data.reviews)) {
    return (
      <div className="flex justify-center items-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-10 border rounded-lg bg-red-50">
        <p className="text-lg text-red-500">Failed to load reviews</p>
        <p className="text-sm text-red-400 mt-2">{error}</p>
      </div>
    );
  }
  
  const reviews = data?.reviews || [];
  const ratingStats = data?.ratingStats || { average: 0, total: 0, distribution: {} };
  
  return (
    <div className="mt-6">
      <h2 className="text-2xl font-semibold mb-4">Customer Reviews</h2>
      
      {reviews.length === 0 ? (
        <div className="text-center py-10 border rounded-lg bg-gray-50">
          <p className="text-lg text-gray-500">No reviews yet</p>
          <p className="text-sm text-gray-400 mt-2">Be the first to review this product</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
              <div className="text-4xl font-bold text-center">
                {ratingStats.average.toFixed(1)}
              </div>
              <StarRating rating={ratingStats.average} size="lg" />
              <p className="text-sm text-gray-500 mt-2">
                Based on {ratingStats.total} {ratingStats.total === 1 ? "review" : "reviews"}
              </p>
            </div>
            
            <div className="md:col-span-2">
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2">
                    <div className="w-10 text-sm text-right">{star} star</div>
                    <Progress value={getPercentage(ratingStats.distribution[star] || 0)} className="h-2" />
                    <div className="w-10 text-sm">
                      {ratingStats.distribution[star] || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mb-4">
            <Select
              value={sortOption}
              onValueChange={(value) => setSortOption(value as SortOption)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="highest">Highest rated</SelectItem>
                <SelectItem value="lowest">Lowest rated</SelectItem>
                <SelectItem value="most-helpful">Most helpful</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <ReviewCard 
                key={review.id} 
                review={review} 
                isProductOwner={sellerId === review.userId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
