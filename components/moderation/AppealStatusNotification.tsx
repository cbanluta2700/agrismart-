'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AppealStatus } from '@/lib/moderation/appeals';

export interface AppealNotification {
  id: string;
  appealId: string;
  commentId: string;
  commentPreview: string;
  status: AppealStatus;
  createdAt: Date;
  moderatorNotes?: string | null;
  read: boolean;
}

interface AppealStatusNotificationProps {
  notification: AppealNotification;
  onMarkAsRead: (notificationId: string) => Promise<void>;
  onViewAppeal: (appealId: string) => void;
}

export function AppealStatusNotification({ 
  notification, 
  onMarkAsRead, 
  onViewAppeal 
}: AppealStatusNotificationProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleMarkAsRead = async () => {
    try {
      setIsSubmitting(true);
      await onMarkAsRead(notification.id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getStatusContent = () => {
    switch (notification.status) {
      case 'APPROVED':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          title: 'Appeal Approved',
          description: 'Your appeal has been approved and your comment has been restored.',
          badgeClass: 'bg-green-100 text-green-800 border-green-300',
          badgeText: 'Approved'
        };
      case 'REJECTED':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          title: 'Appeal Rejected',
          description: 'Your appeal has been rejected and your comment remains moderated.',
          badgeClass: 'bg-red-100 text-red-800 border-red-300',
          badgeText: 'Rejected'
        };
      case 'PENDING':
      default:
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          title: 'Appeal Pending',
          description: 'Your appeal is being reviewed by our moderation team.',
          badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          badgeText: 'Pending'
        };
    }
  };
  
  const statusContent = getStatusContent();
  
  return (
    <Card className={`w-full ${!notification.read ? 'border-primary/50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {statusContent.icon}
            <div>
              <CardTitle className="text-base">{statusContent.title}</CardTitle>
              <CardDescription className="text-sm">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={statusContent.badgeClass}>
            {statusContent.badgeText}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground mb-2">
          {statusContent.description}
        </p>
        
        <div className="bg-muted p-2 rounded-md text-sm mb-2">
          <p className="line-clamp-2">{notification.commentPreview}</p>
        </div>
        
        {notification.moderatorNotes && (
          <div className="mt-2">
            <p className="text-xs font-medium mb-1">Moderator Notes:</p>
            <p className="text-sm italic text-muted-foreground">
              "{notification.moderatorNotes}"
            </p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleMarkAsRead}
          disabled={notification.read || isSubmitting}
        >
          {notification.read ? 'Read' : 'Mark as read'}
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onViewAppeal(notification.appealId)}
        >
          View Appeal
        </Button>
      </CardFooter>
    </Card>
  );
}
