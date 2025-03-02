import React from 'react';
import { formatDistance } from 'date-fns';
import { ResourceType, ResourceStatus } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface FlaggedResource {
  id: string;
  title: string;
  type: ResourceType;
  status: ResourceStatus;
  flagReason: string;
  createdAt: string;
  updatedAt: string;
  author: {
    name: string;
    email: string;
  };
  contentQualityAssessments: Array<{
    qualityScore: number;
    flags: Array<{
      type: string;
      confidence: number;
      details: string;
    }>;
  }>;
}

interface FlaggedContentListProps {
  resources: FlaggedResource[];
  selectedId: string | null;
  onSelect: (resource: FlaggedResource) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  loading?: boolean;
}

// Map resource types to user-friendly labels and colors
const resourceTypeMap: Record<ResourceType, { label: string; color: string }> = {
  ARTICLE: { label: 'Article', color: 'bg-blue-100 text-blue-800' },
  GUIDE: { label: 'Guide', color: 'bg-green-100 text-green-800' },
  VIDEO: { label: 'Video', color: 'bg-purple-100 text-purple-800' },
  GLOSSARY: { label: 'Glossary', color: 'bg-yellow-100 text-yellow-800' },
};

export default function FlaggedContentList({
  resources,
  selectedId,
  onSelect,
  onLoadMore,
  hasMore,
  loading = false,
}: FlaggedContentListProps) {
  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No flagged content found</p>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-gray-200 max-h-[70vh] overflow-y-auto pr-2">
        {resources.map((resource) => {
          const typeInfo = resourceTypeMap[resource.type] || { label: 'Other', color: 'bg-gray-100 text-gray-800' };
          const latestAssessment = resource.contentQualityAssessments[0];
          const qualityScore = latestAssessment?.qualityScore || 0;
          
          // Determine score color based on value
          let scoreColor = 'text-red-500';
          if (qualityScore >= 80) {
            scoreColor = 'text-green-500';
          } else if (qualityScore >= 50) {
            scoreColor = 'text-yellow-500';
          }
          
          return (
            <li 
              key={resource.id}
              className={`py-3 px-2 cursor-pointer rounded-md hover:bg-gray-50 ${
                selectedId === resource.id ? 'bg-gray-100' : ''
              }`}
              onClick={() => onSelect(resource)}
            >
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <div className="font-medium truncate max-w-[200px]">{resource.title}</div>
                  <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">{resource.author.name}</span>
                  <span className={`font-bold ${scoreColor}`}>{qualityScore}/100</span>
                </div>
                
                <div className="text-xs text-gray-500">
                  {formatDistance(new Date(resource.updatedAt), new Date(), { addSuffix: true })}
                </div>
                
                {resource.flagReason && (
                  <div className="mt-1 text-xs text-red-500 truncate">
                    {resource.flagReason}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      
      {hasMore && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={onLoadMore}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
