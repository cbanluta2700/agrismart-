"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useReviewModeration } from "@/hooks/use-review-moderation";
import { AlertCircle, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

interface ReviewReportsDialogProps {
  reviewId: string;
  reportCount: number;
}

export function ReviewReportsDialog({ reviewId, reportCount }: ReviewReportsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { getReviewReports } = useReviewModeration();
  
  const fetchReports = async () => {
    if (!isOpen) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getReviewReports(reviewId);
      setReports(result.reports);
    } catch (error: any) {
      console.error("Error fetching review reports:", error);
      setError(error.message || "Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch reports when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen]);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Flag className="h-4 w-4" />
          {reportCount} {reportCount === 1 ? "Report" : "Reports"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Reports</DialogTitle>
          <DialogDescription>
            {reportCount} {reportCount === 1 ? "report" : "reports"} submitted for this review
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
          
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-md">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}
          
          {!isLoading && !error && reports.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No reports found for this review.</p>
            </div>
          )}
          
          {!isLoading && reports.length > 0 && (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {report.reportedBy.image ? (
                        <Image
                          src={report.reportedBy.image}
                          alt={report.reportedBy.name || "User"}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300" />
                      )}
                      <span className="font-medium">{report.reportedBy.name || "Anonymous User"}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="mb-2">
                    <Badge variant="outline" className="capitalize">
                      {report.reason}
                    </Badge>
                  </div>
                  
                  {report.description && (
                    <div className="text-sm bg-white p-3 rounded border">
                      {report.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
