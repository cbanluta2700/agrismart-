import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, BookOpen, Video, BookmarkIcon, Calendar, User, Eye, Star } from 'lucide-react';
import { ResourceSearchResult } from '@/lib/search/resources-search';

interface SearchResultsProps {
  results: ResourceSearchResult[];
  query: string;
  loading?: boolean;
  premium?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ 
  results, 
  query, 
  loading = false,
  premium = false 
}) => {
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`animate-pulse ${premium ? 'card-premium' : 'border rounded-lg'} p-6`}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-1/4 h-48 md:h-auto bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="flex-1 space-y-4">
                <div className="flex gap-2">
                  <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3].map((tag) => (
                    <div key={tag} className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  ))}
                </div>
                <div className="flex gap-4">
                  {[1, 2, 3].map((meta) => (
                    <div key={meta} className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className={`text-center py-12 ${premium ? 'card-premium' : 'border rounded-lg'} p-6`}>
        <div className="flex flex-col items-center justify-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${premium ? 'bg-hsl-primary/10 text-hsl-primary' : 'bg-slate-100 text-slate-500'}`}>
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-medium mb-2">No results found</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
            We couldn't find any resources matching "{query}". Try adjusting your search terms or filters.
          </p>
          <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
            <div>
              <strong>Tips:</strong>
            </div>
            <ul className="list-disc text-left space-y-1">
              <li>Check your spelling</li>
              <li>Try more general keywords</li>
              <li>Try different filters</li>
              <li>Browse categories instead of searching</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Function to get the content URL based on content type
  const getContentUrl = (result: ResourceSearchResult) => {
    const basePath = `/resources/${result.contentType}s`;
    return `${basePath}/${result.slug || result.id}`;
  };

  // Function to get the content icon based on content type
  const getContentIcon = (type: string) => {
    switch (type) {
      case 'article':
        return <FileText className={`h-4 w-4 ${premium ? 'text-hsl-accent' : 'text-blue-500'}`} />;
      case 'guide':
        return <BookOpen className={`h-4 w-4 ${premium ? 'text-hsl-secondary' : 'text-green-500'}`} />;
      case 'video':
        return <Video className={`h-4 w-4 ${premium ? 'text-hsl-accent-alt' : 'text-red-500'}`} />;
      case 'glossary':
        return <BookmarkIcon className={`h-4 w-4 ${premium ? 'text-hsl-tertiary' : 'text-purple-500'}`} />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Function to get content type label with appropriate styling
  const getContentTypeLabel = (type: string) => {
    if (premium) {
      switch (type) {
        case 'article':
          return <Badge className="badge-premium bg-hsl-accent/10 text-hsl-accent border-hsl-accent/30">Article</Badge>;
        case 'guide':
          return <Badge className="badge-premium bg-hsl-secondary/10 text-hsl-secondary border-hsl-secondary/30">Guide</Badge>;
        case 'video':
          return <Badge className="badge-premium bg-hsl-accent-alt/10 text-hsl-accent-alt border-hsl-accent-alt/30">Video</Badge>;
        case 'glossary':
          return <Badge className="badge-premium bg-hsl-tertiary/10 text-hsl-tertiary border-hsl-tertiary/30">Glossary</Badge>;
        default:
          return <Badge className="badge-premium">Unknown</Badge>;
      }
    } else {
      switch (type) {
        case 'article':
          return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Article</Badge>;
        case 'guide':
          return <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Guide</Badge>;
        case 'video':
          return <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Video</Badge>;
        case 'glossary':
          return <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">Glossary</Badge>;
        default:
          return <Badge variant="outline">Unknown</Badge>;
      }
    }
  };

  return (
    <div className="space-y-6">
      {results.map((result, index) => (
        <Card 
          key={`${result.contentType}-${result.id}`} 
          className={`overflow-hidden ${premium ? 'card-premium shadow-md hover:shadow-xl transition-all duration-300' : 'hover:shadow-md'} 
            ${premium ? `animate-fade-up animation-delay-${(index % 5) * 100}` : ''}`}
        >
          <CardContent className="p-0">
            <Link href={getContentUrl(result)} className={`block transition-colors ${premium ? 'hover:bg-hsl-primary/5' : 'hover:bg-secondary/20'}`}>
              <div className="flex flex-col md:flex-row">
                {/* Thumbnail (if available) */}
                {result.thumbnailUrl && (
                  <div className="md:w-1/4 h-48 md:h-auto relative overflow-hidden">
                    <Image
                      src={result.thumbnailUrl}
                      alt={result.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 25vw"
                      className={`object-cover transition-transform duration-500 ${premium ? 'hover:scale-105' : ''}`}
                    />
                    {result.premium && premium && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="badge-premium flex items-center gap-1 bg-hsl-accent/80 backdrop-blur-sm text-white">
                          <Star className="h-3 w-3" />
                          Premium
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Content */}
                <div className={`flex-1 p-6 ${result.thumbnailUrl ? 'md:w-3/4' : 'w-full'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getContentTypeLabel(result.contentType)}
                    
                    {result.category && (
                      <Badge 
                        variant="outline" 
                        className={premium ? 'badge-outline bg-slate-50 dark:bg-slate-800/50' : 'bg-gray-50'}
                      >
                        {result.category}
                      </Badge>
                    )}
                    
                    {!result.thumbnailUrl && result.premium && premium && (
                      <Badge className="badge-premium flex items-center gap-1 bg-hsl-accent/80 text-white ml-auto">
                        <Star className="h-3 w-3" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className={`text-lg font-semibold mb-2 ${premium ? 'text-hsl-primary' : ''}`}>
                    {/* If there's a highlighted title, use it; otherwise use regular title */}
                    {result.highlighted.find(h => h.field === 'title') ? (
                      <span dangerouslySetInnerHTML={{ 
                        __html: result.highlighted.find(h => h.field === 'title')!.text 
                      }} />
                    ) : (
                      result.title
                    )}
                  </h3>
                  
                  {/* Excerpt */}
                  {(result.excerpt || result.highlighted.find(h => h.field === 'excerpt')) && (
                    <div className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
                      {result.highlighted.find(h => h.field === 'excerpt') ? (
                        <span dangerouslySetInnerHTML={{ 
                          __html: result.highlighted.find(h => h.field === 'excerpt')!.text 
                        }} />
                      ) : (
                        result.excerpt
                      )}
                    </div>
                  )}
                  
                  {/* Tags */}
                  {result.tags && result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {result.tags.slice(0, 5).map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className={`text-xs ${premium ? 'badge-secondary' : ''}`}
                        >
                          {tag}
                        </Badge>
                      ))}
                      {result.tags.length > 5 && (
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${premium ? 'badge-secondary' : ''}`}
                        >
                          +{result.tags.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                    {result.publishedAt && (
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(result.publishedAt), 'MMM d, yyyy')}
                      </div>
                    )}
                    
                    {result.authorName && (
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {result.authorName}
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      {result.viewCount} views
                    </div>
                    
                    <div className="flex items-center">
                      {getContentIcon(result.contentType)}
                      <span className="ml-1 capitalize">{result.contentType}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
