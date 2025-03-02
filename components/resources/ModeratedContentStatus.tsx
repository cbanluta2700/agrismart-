import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ResourceStatus } from '@/types/resources';

interface ModeratedContentStatusProps {
  status: ResourceStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const ModeratedContentStatus: React.FC<ModeratedContentStatusProps> = ({
  status,
  size = 'md',
}) => {
  // Determine badge style based on status
  const getBadgeStyles = () => {
    switch (status) {
      case 'APPROVED':
        return 'border-green-200 bg-green-50 text-green-700';
      case 'PENDING':
        return 'border-orange-200 bg-orange-50 text-orange-700';
      case 'REJECTED':
        return 'border-red-200 bg-red-50 text-red-700';
      case 'DRAFT':
        return 'border-gray-200 bg-gray-50 text-gray-700';
      case 'ARCHIVED':
        return 'border-purple-200 bg-purple-50 text-purple-700';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-700';
    }
  };

  // Determine size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'px-3 py-1',
  }[size];

  return (
    <Badge 
      variant="outline" 
      className={`${getBadgeStyles()} ${sizeClasses} font-medium`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
};
