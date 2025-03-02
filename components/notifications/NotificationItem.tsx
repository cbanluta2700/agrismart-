import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  Users, 
  Bell, 
  AlertCircle, 
  AtSign,
  Shield,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: {
    id: string;
    title: string;
    content: string;
    type: string;
    read: boolean;
    createdAt: string;
  };
  showActions?: boolean;
}

export default function NotificationItem({ 
  notification, 
  showActions = false 
}: NotificationItemProps) {
  const { title, content, type, read, createdAt } = notification;
  
  // Format the date
  const formattedDate = formatDistanceToNow(new Date(createdAt), { 
    addSuffix: true 
  });
  
  // Get icon based on notification type
  const getIcon = () => {
    switch (type) {
      case 'POST_CREATED':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'COMMENT_CREATED':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'GROUP_INVITATION':
      case 'GROUP_JOIN_REQUEST':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'GROUP_ROLE_UPDATED':
        return <Shield className="h-4 w-4 text-amber-500" />;
      case 'POST_MODERATED':
      case 'COMMENT_MODERATED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'MENTION':
        return <AtSign className="h-4 w-4 text-cyan-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={cn(
      "flex items-start gap-3 w-full",
      !read && "font-medium"
    )}>
      <div className="mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex justify-between items-start">
          <p className={cn(
            "text-sm leading-none",
            !read && "font-semibold"
          )}>
            {title}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
            {formattedDate}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {content}
        </p>
        
        {showActions && (
          <div className="flex justify-end gap-2 mt-2">
            {/* Action buttons can be added here if needed */}
          </div>
        )}
      </div>
      
      {!read && (
        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
      )}
    </div>
  );
}
