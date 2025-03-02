"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { StarRating } from "@/components/marketplace/reviews/star-rating";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Flag, CheckCircle, XCircle, EyeOff, AlertTriangle } from "lucide-react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useReviewModeration } from "@/hooks/use-review-moderation";
import { ReviewReportsDialog } from "./review-reports-dialog";
import { toast } from "react-hot-toast";

interface ReviewModerationCardProps {
  review: any; // Type should be expanded based on the data structure
  onModerationComplete?: () => void;
}

export function ReviewModerationCard({ review, onModerationComplete }: ReviewModerationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { moderateReview } = useReviewModeration();
  
  const handleModerateReview = async (action: "approve" | "reject" | "hide") => {
    if (action === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejecting the review");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await moderateReview({
        reviewId: review.id,
        action,
        reason: action === "reject" ? rejectionReason : undefined,
        updateReports: true // Mark reports as resolved
      });
      
      toast.success(`Review ${action}ed successfully`);
      onModerationComplete?.();
    } catch (error) {
      console.error(`Error ${action}ing review:`, error);
      toast.error(`Failed to ${action} review`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatCount = (count: number): string => {
    return count > 0 ? count.toString() : "0";
  };
  
  const getModerationStatusBadge = () => {
    if (review.moderationStatus === "approved") {
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    } else if (review.moderationStatus === "rejected") {
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
    } else if (review.automaticallyFlagged) {
      return <Badge className="bg-yellow-100 text-yellow-800">Auto-Flagged</Badge>;
    } else if (review.reportCount > 0) {
      return <Badge className="bg-orange-100 text-orange-800">Reported ({review.reportCount})</Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
    }
  };
  
  // Get the total number of reports
  const reportCount = review._count?.reports || review.reportCount || 0;
  
  // Check if review has been flagged by the automated system
  const isAutoFlagged = review.automaticallyFlagged || false;
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>Review by {review.user.name || "Unknown User"}</span>
              {getModerationStatusBadge()}
            </CardTitle>
            <CardDescription>
              For product: <span className="font-medium">{review.product?.name || "Unknown Product"}</span>
            </CardDescription>
            <div className="mt-1 flex items-center gap-1">
              <StarRating rating={review.rating} />
              <span className="text-sm text-muted-foreground ml-2">
                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2">
            {reportCount > 0 && (
              <ReviewReportsDialog 
                reviewId={review.id}
                reportCount={reportCount}
              />
            )}
            
            {isAutoFlagged && (
              <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                <AlertTriangle className="h-3 w-3" />
                Auto-Flagged
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4">
          <h4 className="font-medium mb-1">Review Title</h4>
          <p>{review.title || "No title provided"}</p>
        </div>
        
        <div>
          <h4 className="font-medium mb-1">Review Content</h4>
          <p className="whitespace-pre-line">{review.content}</p>
        </div>
        
        {/* Show flagged words if review was automatically flagged */}
        {isAutoFlagged && review.flaggedContent && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="font-medium text-yellow-800 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Flagged Content
            </h4>
            <p className="text-sm mt-1">
              This review was automatically flagged for the following content:
            </p>
            <div className="mt-2 text-sm">
              <span className="font-medium">Flagged words/phrases: </span>
              {Array.isArray(review.flaggedContent) ? (
                review.flaggedContent.map((word: string, index: number) => (
                  <Badge key={index} variant="outline" className="mr-1 mb-1 bg-yellow-100 border-yellow-300">
                    {word}
                  </Badge>
                ))
              ) : (
                <span>{review.flaggedContent}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      {review.moderationStatus !== "approved" && review.moderationStatus !== "rejected" && (
        <CardFooter className="flex-col items-stretch pt-0">
          {isExpanded && (
            <div className="mb-4">
              <Textarea
                placeholder="Enter reason for rejection (required for reject action)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mb-4"
                rows={3}
              />
            </div>
          )}
          
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Cancel" : "Write Rejection Reason"}
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleModerateReview("approve")}
                disabled={isSubmitting}
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Approve
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleModerateReview("reject")}
                disabled={isSubmitting || (isExpanded && !rejectionReason.trim())}
              >
                <XCircle className="mr-1 h-4 w-4" />
                Reject
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleModerateReview("hide")}
                disabled={isSubmitting}
              >
                <EyeOff className="mr-1 h-4 w-4" />
                Hide
              </Button>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
