"use client";

import Image from "next/image";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "next-auth/react";
import { StarRating } from "./star-rating";
import { ThumbsUp, ThumbsDown, MessageSquare, Flag } from "lucide-react";
import { useMarketplaceReviews, Review } from "@/hooks/use-marketplace-reviews";
import { ReportReviewDialog } from "./report-review-dialog";

interface ReviewCardProps {
  review: Review;
  isProductOwner?: boolean;
}

export function ReviewCard({ review, isProductOwner = false }: ReviewCardProps) {
  const { data: session } = useSession();
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseContent, setResponseContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const { submitResponse, submitVote } = useMarketplaceReviews();
  
  const currentUserId = session?.user?.id || "";
  const isReviewer = review.userId === currentUserId;
  const canRespond = isProductOwner || isReviewer;
  const canReport = !!session?.user && !isReviewer && review.status !== "flagged";
  
  // Find the user's vote if it exists
  const userVote = review.helpfulVotes.find(vote => vote.userId === currentUserId);
  
  // Calculate counts
  const helpfulCount = review.helpfulVotes.filter(vote => vote.isHelpful).length;
  const notHelpfulCount = review.helpfulVotes.filter(vote => !vote.isHelpful).length;
  
  const handleHelpfulVote = async (isHelpful: boolean) => {
    if (!session?.user) return;
    
    try {
      await submitVote({ 
        reviewId: review.id, 
        isHelpful 
      });
    } catch (error) {
      console.error("Error submitting vote:", error);
    }
  };
  
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user || !responseContent.trim()) return;
    
    try {
      setIsSubmitting(true);
      await submitResponse({
        reviewId: review.id,
        content: responseContent,
      });
      
      setResponseContent("");
      setShowResponseForm(false);
    } catch (error) {
      console.error("Error submitting response:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="border rounded-lg p-4 mb-4 bg-white">
      {review.status === "flagged" && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3">
          <p className="text-sm text-yellow-700">
            This review has been flagged for moderation.
          </p>
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={review.user.avatar || ""} alt={review.user.name} />
          <AvatarFallback>
            {review.user.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{review.user.name}</h4>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
            </span>
          </div>
          
          <div className="mt-1">
            <StarRating rating={review.rating} />
          </div>
          
          {review.title && (
            <h3 className="text-lg font-semibold mt-2">{review.title}</h3>
          )}
          
          <p className="mt-2 text-gray-700">{review.content}</p>
          
          {review.images && review.images.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {review.images.map((image, index) => (
                <div key={index} className="relative h-20 w-20 flex-shrink-0">
                  <Image
                    src={image}
                    alt={`Review image ${index + 1}`}
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleHelpfulVote(true)}
              className={userVote?.isHelpful ? "text-green-600" : ""}
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              <span>Helpful {helpfulCount > 0 && `(${helpfulCount})`}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleHelpfulVote(false)}
              className={userVote && !userVote.isHelpful ? "text-red-600" : ""}
            >
              <ThumbsDown className="h-4 w-4 mr-1" />
              <span>Not Helpful {notHelpfulCount > 0 && `(${notHelpfulCount})`}</span>
            </Button>
            
            {canRespond && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResponseForm(!showResponseForm)}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                <span>Respond</span>
              </Button>
            )}
            
            {canReport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReportDialog(true)}
                className="text-gray-500 hover:text-red-500"
              >
                <Flag className="h-4 w-4 mr-1" />
                <span>Report</span>
              </Button>
            )}
          </div>
          
          {/* Response form */}
          {showResponseForm && (
            <form onSubmit={handleSubmitResponse} className="mt-3">
              <Textarea
                placeholder="Write your response..."
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
                className="mb-2"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResponseForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!responseContent.trim() || isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Response"}
                </Button>
              </div>
            </form>
          )}
          
          {/* Responses */}
          {review.responses && review.responses.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <h5 className="text-sm font-medium mb-2">Responses</h5>
              {review.responses.map((response) => (
                <div key={response.id} className="bg-gray-50 rounded-md p-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={response.user.avatar || ""} alt={response.user.name} />
                      <AvatarFallback>
                        {response.user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium text-sm">{response.user.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDistanceToNow(new Date(response.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm">{response.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Report Review Dialog */}
      <ReportReviewDialog 
        reviewId={review.id}
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
      />
    </div>
  );
}
