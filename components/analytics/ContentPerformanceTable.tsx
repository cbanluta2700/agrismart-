import React from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileText, Video, BookmarkIcon } from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  type: 'article' | 'guide' | 'video' | 'glossary';
  views: number;
  avgTimeOnPage: number;
}

interface ContentPerformanceTableProps {
  data: ContentItem[];
  contentType: string;
  showAll?: boolean;
}

export const ContentPerformanceTable: React.FC<ContentPerformanceTableProps> = ({ 
  data,
  contentType,
  showAll = false
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No content performance data available
      </div>
    );
  }

  // Function to get URL for content item
  const getContentUrl = (item: ContentItem) => {
    switch (item.type) {
      case 'article':
        return `/resources/articles/${item.id}`;
      case 'guide':
        return `/resources/guides/${item.id}`;
      case 'video':
        return `/resources/videos/${item.id}`;
      case 'glossary':
        return `/resources/glossary/${item.id}`;
      default:
        return '#';
    }
  };

  // Function to get icon for content type
  const getContentIcon = (type: string) => {
    switch (type) {
      case 'article':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'guide':
        return <BookOpen className="h-4 w-4 text-green-500" />;
      case 'video':
        return <Video className="h-4 w-4 text-red-500" />;
      case 'glossary':
        return <BookmarkIcon className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Function to format time (in seconds) to readable format
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          {contentType === 'all' && <TableHead>Type</TableHead>}
          <TableHead className="text-right">Views</TableHead>
          <TableHead className="text-right">Avg. Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={`${item.type}-${item.id}`}>
            <TableCell className="font-medium">
              <Link href={getContentUrl(item)} className="flex items-center hover:text-primary transition-colors">
                {getContentIcon(item.type)}
                <span className="ml-2 line-clamp-1">{item.title}</span>
              </Link>
            </TableCell>
            {contentType === 'all' && (
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={`
                    ${item.type === 'article' ? 'border-blue-200 bg-blue-50 text-blue-700' : ''}
                    ${item.type === 'guide' ? 'border-green-200 bg-green-50 text-green-700' : ''}
                    ${item.type === 'video' ? 'border-red-200 bg-red-50 text-red-700' : ''}
                    ${item.type === 'glossary' ? 'border-purple-200 bg-purple-50 text-purple-700' : ''}
                  `}
                >
                  {item.type}
                </Badge>
              </TableCell>
            )}
            <TableCell className="text-right">{item.views.toLocaleString()}</TableCell>
            <TableCell className="text-right">{formatTime(item.avgTimeOnPage)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
