"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationControl } from "@/components/ui/pagination-control";
import { Spinner } from "@/components/ui/spinner";
import { useReviewModeration, ReviewStatus } from "@/hooks/use-review-moderation";
import { ReviewModerationCard } from "./review-moderation-card";
import { AlertTriangle } from "lucide-react";

export function ReviewModerationList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const [reviews, setReviews] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    currentPage: 1,
    pageSize: 10
  });
  
  const { getReviewsForModeration, loading, error } = useReviewModeration();
  
  const fetchReviews = async () => {
    try {
      const skip = (currentPage - 1) * pageSize;
      const result = await getReviewsForModeration(status, pageSize, skip);
      
      setReviews(result.reviews);
      setPagination(result.pagination);
    } catch (error) {
      console.error("Error fetching reviews for moderation:", error);
    }
  };
  
  // Fetch reviews when status or page changes
  useEffect(() => {
    fetchReviews();
  }, [status, currentPage, pageSize]);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus as ReviewStatus);
    setCurrentPage(1); // Reset to first page on status change
  };
  
  const handleModerationComplete = () => {
    fetchReviews();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Review Moderation</h2>
        
        <Select
          value={status}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All Reviews</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {loading && (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">Error loading reviews: {error}</p>
          </div>
        </div>
      )}
      
      {!loading && reviews.length === 0 && (
        <div className="bg-gray-50 border rounded-lg p-6 text-center">
          <p className="text-lg text-gray-500">No reviews found matching the selected filter</p>
          {status !== "all" && (
            <Button 
              variant="link" 
              onClick={() => handleStatusChange("all")}
              className="mt-2"
            >
              View all reviews
            </Button>
          )}
        </div>
      )}
      
      {!loading && reviews.length > 0 && (
        <>
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewModerationCard
                key={review.id}
                review={review}
                onModerationComplete={handleModerationComplete}
              />
            ))}
          </div>
          
          {pagination.pages > 1 && (
            <div className="flex justify-center mt-6">
              <PaginationControl
                currentPage={currentPage}
                totalPages={pagination.pages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
