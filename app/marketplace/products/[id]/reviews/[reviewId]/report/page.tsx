"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useReviewModeration } from "@/hooks/use-review-moderation";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { MarketplaceLayout } from "@/components/layouts/marketplace-layout";
import { toast } from "react-hot-toast";

const REPORT_REASONS = [
  { value: "spam", label: "Spam or advertisement" },
  { value: "offensive", label: "Offensive or inappropriate content" },
  { value: "irrelevant", label: "Irrelevant to the product" },
  { value: "misleading", label: "Misleading or false information" },
  { value: "other", label: "Other reason" },
];

export default function ReportReviewPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { reportReview } = useReviewModeration();
  
  const reviewId = params.reviewId as string;
  const productId = params.id as string;
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/marketplace/products/${productId}/reviews/${reviewId}/report`);
    }
  }, [session, status, router, productId, reviewId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason) {
      setError("Please select a reason for reporting this review");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await reportReview({
        reviewId,
        reason: reason as any,
        description: description.trim() || undefined,
      });
      
      setSubmitSuccess(true);
      toast.success("Review reported successfully");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to report review");
      toast.error("Failed to report review");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleBackToProduct = () => {
    router.push(`/marketplace/products/${productId}`);
  };
  
  // Show loading state
  if (status === "loading") {
    return (
      <MarketplaceLayout>
        <div className="container mx-auto py-10">
          <p className="text-center">Loading...</p>
        </div>
      </MarketplaceLayout>
    );
  }
  
  // Show success message
  if (submitSuccess) {
    return (
      <MarketplaceLayout>
        <div className="container mx-auto py-10 max-w-lg">
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-2">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-center">Report Submitted</CardTitle>
              <CardDescription className="text-center">
                Thank you for helping us maintain a high-quality marketplace. Our moderation team will review this report.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button onClick={handleBackToProduct}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Product
              </Button>
            </CardFooter>
          </Card>
        </div>
      </MarketplaceLayout>
    );
  }
  
  return (
    <MarketplaceLayout>
      <div className="container mx-auto py-10 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Report Review</CardTitle>
            <CardDescription>
              Help us maintain a high-quality marketplace by reporting reviews that violate our community guidelines.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-3">Reason for reporting</h3>
                  <RadioGroup value={reason} onValueChange={setReason}>
                    {REPORT_REASONS.map((reportReason) => (
                      <div className="flex items-center space-x-2" key={reportReason.value}>
                        <RadioGroupItem value={reportReason.value} id={reportReason.value} />
                        <Label htmlFor={reportReason.value}>{reportReason.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Additional details (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Please provide any additional details to help our moderation team."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleBackToProduct}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !reason}
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </MarketplaceLayout>
  );
}
