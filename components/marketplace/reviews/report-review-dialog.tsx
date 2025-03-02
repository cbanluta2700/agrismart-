"use client";

import { useState } from "react";
import { useReviewModeration } from "@/hooks/use-review-moderation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";

interface ReportReviewDialogProps {
  reviewId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam or advertisement" },
  { value: "offensive", label: "Offensive or inappropriate content" },
  { value: "irrelevant", label: "Irrelevant to the product" },
  { value: "misleading", label: "Misleading or false information" },
  { value: "other", label: "Other reason" },
];

export function ReportReviewDialog({
  reviewId,
  isOpen,
  onClose,
  onSuccess
}: ReportReviewDialogProps) {
  const { reportReview, loading, error } = useReviewModeration();
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason for reporting this review");
      return;
    }
    
    setSubmitting(true);
    
    try {
      await reportReview({
        reviewId,
        reason: reason as any,
        description: description.trim() || undefined,
      });
      
      toast.success("Review reported successfully");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(error || "Failed to report review");
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Review</DialogTitle>
          <DialogDescription>
            Please tell us why you think this review should be reported.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Reason
            </label>
            <Select
              value={reason}
              onValueChange={setReason}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Additional details (optional)
            </label>
            <Textarea
              id="description"
              placeholder="Please provide any additional details to help our moderation team."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
