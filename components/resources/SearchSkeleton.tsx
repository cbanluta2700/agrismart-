import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SearchSkeletonProps {
  premium?: boolean;
}

export const SearchSkeleton: React.FC<SearchSkeletonProps> = ({ premium = false }) => {
  return (
    <div className="space-y-6">
      {[1, 2, 3, 4].map((index) => (
        <Card 
          key={index} 
          className={`overflow-hidden ${premium ? 'card-premium shadow-md hover:shadow-xl transition-all duration-300' : ''} 
            ${premium ? `animate-fade-up animation-delay-${(index % 4) * 100}` : ''}`}
        >
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              {/* Thumbnail skeleton (random for variety) */}
              {index % 2 === 0 && (
                <div className="md:w-1/4 h-48 md:h-auto relative">
                  <Skeleton className={`w-full h-full ${premium ? 'bg-slate-200/50 dark:bg-slate-800/50' : ''}`} />
                </div>
              )}
              
              {/* Content skeleton */}
              <div className={`flex-1 p-6 ${index % 2 === 0 ? 'md:w-3/4' : 'w-full'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className={`h-5 w-16 ${premium ? 'bg-hsl-accent/20 dark:bg-hsl-accent/10' : ''}`} />
                  <Skeleton className={`h-5 w-20 ${premium ? 'bg-slate-200/70 dark:bg-slate-700/50' : ''}`} />
                </div>
                
                <Skeleton className={`h-6 w-3/4 mb-2 ${premium ? 'bg-hsl-primary/20 dark:bg-hsl-primary/10' : ''}`} />
                
                <div className="space-y-2 mb-4">
                  <Skeleton className={`h-4 w-full ${premium ? 'bg-slate-200/70 dark:bg-slate-700/50' : ''}`} />
                  <Skeleton className={`h-4 w-5/6 ${premium ? 'bg-slate-200/70 dark:bg-slate-700/50' : ''}`} />
                </div>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {Array.from({ length: Math.floor(Math.random() * 5) + 1 }).map((_, i) => (
                    <Skeleton key={i} className={`h-5 w-12 ${premium ? 'bg-hsl-secondary/20 dark:bg-hsl-secondary/10' : ''}`} />
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <Skeleton className={`h-4 w-20 ${premium ? 'bg-slate-200/70 dark:bg-slate-700/50' : ''}`} />
                  <Skeleton className={`h-4 w-24 ${premium ? 'bg-slate-200/70 dark:bg-slate-700/50' : ''}`} />
                  <Skeleton className={`h-4 w-16 ${premium ? 'bg-slate-200/70 dark:bg-slate-700/50' : ''}`} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
