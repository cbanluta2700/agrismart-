'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import SearchBar from '@/components/search/search-bar';
import SearchResults from './search-results';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const initialTab = searchParams.get('type') || 'all';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setResults(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&type=${activeTab}&page=1&limit=10`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch search results');
        }

        const data = await response.json();
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to load search results. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query, activeTab]);

  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Search AgriSmart</CardTitle>
          <div className="mt-4 max-w-3xl">
            <SearchBar
              placeholder="Search for posts, groups, or users..."
              size="lg"
              autoFocus
              className="w-full"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {query ? (
            <>
              <h2 className="text-xl font-semibold mb-6">
                Search results for "{query}"
              </h2>
              <Tabs
                defaultValue={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="mb-6">
                  <TabsTrigger value="all">All Results</TabsTrigger>
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                  <TabsTrigger value="groups">Groups</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-6">
                  {isLoading ? (
                    <div className="space-y-6">
                      <Skeleton className="h-36 w-full" />
                      <Skeleton className="h-36 w-full" />
                    </div>
                  ) : (
                    <SearchResults results={results} type="all" query={query} />
                  )}
                </TabsContent>

                <TabsContent value="posts" className="space-y-6">
                  {isLoading ? (
                    <div className="space-y-6">
                      <Skeleton className="h-36 w-full" />
                      <Skeleton className="h-36 w-full" />
                    </div>
                  ) : (
                    <SearchResults results={results} type="posts" query={query} />
                  )}
                </TabsContent>

                <TabsContent value="groups" className="space-y-6">
                  {isLoading ? (
                    <div className="space-y-6">
                      <Skeleton className="h-36 w-full" />
                      <Skeleton className="h-36 w-full" />
                    </div>
                  ) : (
                    <SearchResults results={results} type="groups" query={query} />
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-muted-foreground">
                Enter a search term to find posts, groups, and more
              </h2>
              <p className="mt-2 text-muted-foreground">
                Try searching for topics, keywords, or specific group names
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
