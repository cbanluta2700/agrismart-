import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export interface Review {
  id: string;
  userId: string;
  productId: string;
  orderId?: string;
  rating: number;
  title: string;
  content: string;
  images: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  helpfulVotes: {
    id: string;
    userId: string;
    isHelpful: boolean;
  }[];
  responses: {
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
  }[];
}

export interface RatingStats {
  average: number;
  total: number;
  distribution: {
    [key: number]: number;
  };
}

export interface ReviewsData {
  reviews: Review[];
  ratingStats?: RatingStats;
}

interface SubmitReviewParams {
  productId?: string;
  orderId?: string;
  rating: number;
  title: string;
  content: string;
  images?: string[];
}

interface SubmitResponseParams {
  reviewId: string;
  content: string;
}

interface SubmitVoteParams {
  reviewId: string;
  isHelpful: boolean;
}

export function useMarketplaceReviews() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReviewsData | null>(null);

  const fetchReviews = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/marketplace/reviews?productId=${productId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch reviews");
      }

      const responseData = await response.json();
      setData(responseData);
      return responseData;
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderReviews = async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/marketplace/reviews?orderId=${orderId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch reviews");
      }

      const responseData = await response.json();
      setData(responseData);
      return responseData;
    } catch (error) {
      console.error("Error fetching order reviews:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (params: SubmitReviewParams) => {
    if (!session?.user) {
      toast.error("You must be logged in to submit a review");
      throw new Error("Unauthorized");
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/marketplace/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit review");
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error("Error submitting review:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async ({ reviewId, content }: SubmitResponseParams) => {
    if (!session?.user) {
      toast.error("You must be logged in to submit a response");
      throw new Error("Unauthorized");
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/marketplace/reviews/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewId, content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit response");
      }

      const responseData = await response.json();

      // Update local data with the new response if we have data already
      if (data && data.reviews) {
        const updatedReviews = data.reviews.map((review) => {
          if (review.id === reviewId) {
            return {
              ...review,
              responses: [
                ...review.responses,
                {
                  id: responseData.id,
                  content: responseData.content,
                  createdAt: responseData.createdAt,
                  user: {
                    id: session.user.id,
                    name: session.user.name || "Unknown",
                    avatar: session.user.image || undefined,
                  },
                },
              ],
            };
          }
          return review;
        });

        setData({ ...data, reviews: updatedReviews });
      }

      return responseData;
    } catch (error) {
      console.error("Error submitting response:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const submitVote = async ({ reviewId, isHelpful }: SubmitVoteParams) => {
    if (!session?.user) {
      toast.error("You must be logged in to vote on a review");
      throw new Error("Unauthorized");
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/marketplace/reviews/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewId, isHelpful }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit vote");
      }

      const responseData = await response.json();

      // Update local data with the new vote if we have data already
      if (data && data.reviews) {
        const updatedReviews = data.reviews.map((review) => {
          if (review.id === reviewId) {
            // Remove existing vote from this user if it exists
            const filteredVotes = review.helpfulVotes.filter(
              (vote) => vote.userId !== session.user.id
            );

            // Add the new vote
            return {
              ...review,
              helpfulVotes: [
                ...filteredVotes,
                {
                  id: responseData.id,
                  userId: session.user.id,
                  isHelpful,
                },
              ],
            };
          }
          return review;
        });

        setData({ ...data, reviews: updatedReviews });
      }

      return responseData;
    } catch (error) {
      console.error("Error submitting vote:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    data,
    fetchReviews,
    fetchOrderReviews,
    submitReview,
    submitResponse,
    submitVote,
  };
}
