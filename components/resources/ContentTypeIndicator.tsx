import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText, BookOpen, Video, BookmarkIcon } from 'lucide-react';
import { ResourceContentType } from '@/types/resources';

interface ContentTypeIndicatorProps {
  type: ResourceContentType;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ContentTypeIndicator: React.FC<ContentTypeIndicatorProps> = ({
  type,
  showLabel = true,
  size = 'md',
}) => {
  // Define styling and icons based on content type
  const getTypeConfig = () => {
    switch (type) {
      case 'article':
        return {
          icon: <FileText className="h-4 w-4" />,
          label: 'Article',
          styles: 'border-blue-200 bg-blue-50 text-blue-700'
        };
      case 'guide':
        return {
          icon: <BookOpen className="h-4 w-4" />,
          label: 'Guide',
          styles: 'border-green-200 bg-green-50 text-green-700'
        };
      case 'video':
        return {
          icon: <Video className="h-4 w-4" />,
          label: 'Video',
          styles: 'border-red-200 bg-red-50 text-red-700'
        };
      case 'glossary':
        return {
          icon: <BookmarkIcon className="h-4 w-4" />,
          label: 'Glossary',
          styles: 'border-purple-200 bg-purple-50 text-purple-700'
        };
      default:
        return {
          icon: <FileText className="h-4 w-4" />,
          label: 'Unknown',
          styles: 'border-gray-200 bg-gray-50 text-gray-700'
        };
    }
  };

  const { icon, label, styles } = getTypeConfig();

  // Determine size classes
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: '',
  }[size];

  return (
    <Badge 
      variant="outline" 
      className={`${styles} ${sizeClasses} flex items-center gap-1`}
    >
      {icon}
      {showLabel && <span>{label}</span>}
    </Badge>
  );
};
