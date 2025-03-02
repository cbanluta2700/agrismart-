'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { ReportModal } from './report-modal';
import { useSession } from 'next-auth/react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReportButtonProps {
  commentId: string;
  commentContent: string;
  authorName: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onReportSuccess?: () => void;
}

export function ReportButton({
  commentId,
  commentContent,
  authorName,
  variant = 'ghost',
  size = 'icon',
  className,
  onReportSuccess
}: ReportButtonProps) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const { data: session } = useSession();

  const handleReportClick = () => {
    if (!session) {
      // Redirect to login if not authenticated
      window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`;
      return;
    }
    
    setIsReportModalOpen(true);
  };

  const handleModalClose = () => {
    setIsReportModalOpen(false);
  };

  const handleReportSuccess = () => {
    if (onReportSuccess) onReportSuccess();
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              className={className}
              onClick={handleReportClick}
              aria-label="Report comment"
            >
              <Icons.flag className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Report inappropriate content</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ReportModal
        commentId={commentId}
        commentContent={commentContent}
        authorName={authorName}
        isOpen={isReportModalOpen}
        onClose={handleModalClose}
        onSuccess={handleReportSuccess}
      />
    </>
  );
}
