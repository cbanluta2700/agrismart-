import { useState } from "react";
import axios from "axios";

export type ModerationAction = "approve" | "reject" | "hide";
export type ReviewStatus = "pending" | "approved" | "rejected" | "flagged" | "all";

interface ModerateReviewParams {
  reviewId: string;
  action: ModerationAction;
  reason?: string;
  updateReports?: boolean;
}

interface ReportReviewParams {
  reviewId: string;
  reason: "spam" | "offensive" | "irrelevant" | "misleading" | "other";
  description?: string;
}

interface FilterContentParams {
  title?: string;
  content: string;
}

interface FilterResult {
  passed: boolean;
  foundWords?: string[];
  message: string;
}

export const useReviewModeration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Admin - Moderate a review
  const moderateReview = async (params: ModerateReviewParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post("/api/marketplace/reviews/moderate", params);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to moderate review");
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Admin - Get reviews for moderation
  const getReviewsForModeration = async (status: ReviewStatus = "pending", take = 10, skip = 0) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append("status", status);
      params.append("take", take.toString());
      params.append("skip", skip.toString());
      
      const response = await axios.get(`/api/marketplace/reviews/moderation?${params.toString()}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch reviews for moderation");
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // User - Report a review
  const reportReview = async (params: ReportReviewParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post("/api/marketplace/reviews/report", params);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to report review");
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Admin - Get reports for a review
  const getReviewReports = async (reviewId: string, take = 10, skip = 0) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append("reviewId", reviewId);
      params.append("take", take.toString());
      params.append("skip", skip.toString());
      
      const response = await axios.get(`/api/marketplace/reviews/reports?${params.toString()}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch review reports");
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Content filtering for review content
  const filterReviewContent = async (params: FilterContentParams): Promise<FilterResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post("/api/marketplace/reviews/filter", params);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to filter review content");
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    loading,
    error,
    moderateReview,
    getReviewsForModeration,
    reportReview,
    getReviewReports,
    filterReviewContent
  };
};
