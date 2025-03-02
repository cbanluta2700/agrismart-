import React, { useState, useEffect, useCallback } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useOptimizedResourceSearch } from '@/hooks/useOptimizedResourceSearch';
import { Search, Sparkles, FileText, BookOpen, Video, BookmarkIcon } from 'lucide-react';
import { Layout } from '@/components/layouts/Layout';
import { SearchBar } from '@/components/resources/SearchBar';
import { SearchFilters } from '@/components/resources/SearchFilters';
import { SearchResults } from '@/components/resources/SearchResults';
import { SearchSkeleton } from '@/components/resources/SearchSkeleton';
import { CustomPagination } from '@/components/ui/custom-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ResourcesSearchPage: NextPage = () => {
  const router = useRouter();
  const initialSearchParams = {
    query: router.query.q as string || '',
    type: router.query.type as string,
    category: router.query.category as string,
    tags: router.query.tags ? (Array.isArray(router.query.tags) ? router.query.tags : [router.query.tags]) as string[] : undefined,
    page: router.query.page ? parseInt(router.query.page as string) : 1,
    limit: 12,
  };

  const { data, isLoading, setSearch } = useOptimizedResourceSearch(initialSearchParams);

  // Local state for search input (controlled component)
  const [searchInput, setSearchInput] = useState<string>((router.query.q as string) || '');
  const [debouncedSearchInput] = useDebounce(searchInput, 300);

  // Selected filters state
  const [selectedContentType, setSelectedContentType] = useState<string>((router.query.type as string) || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>((router.query.category as string) || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    Array.isArray(router.query.tags) ? router.query.tags as string[] : router.query.tags ? [router.query.tags as string] : []
  );
  const [selectedSortBy, setSelectedSortBy] = useState<string>((router.query.sortBy as string) || 'relevance');
  const [selectedSortOrder, setSelectedSortOrder] = useState<string>((router.query.sortOrder as string) || 'desc');

  // Handle search input change
  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  };

  // Handle search submission
  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch({ query: searchInput });
  };

  // Handle content type change
  const handleContentTypeChange = (value: string) => {
    setSelectedContentType(value);
    setSearch({ type: value === 'all' ? undefined : value, page: 1 });
  };

  // Handle category change
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSearch({ category: value || undefined, page: 1 });
  };

  // Handle tags change
  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
    setSearch({ tags: tags.length > 0 ? tags : undefined, page: 1 });
  };

  // Handle sort change
  const handleSortChange = (sort: { by: string; order: string }) => {
    setSelectedSortBy(sort.by);
    setSelectedSortOrder(sort.order);
    setSearch({ sortBy: sort.by, sortOrder: sort.order });
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setSearch({ page: newPage });
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput('');
    setSelectedContentType('all');
    setSelectedCategory('');
    setSelectedTags([]);
    setSelectedSortBy('relevance');
    setSelectedSortOrder('desc');
    router.push('/resources/search');
  };

  // Update search input when URL query changes
  useEffect(() => {
    if (typeof router.query.q === 'string') {
      setSearchInput(router.query.q);
    }
  }, [router.query.q]);

  // Page title and meta description
  const pageTitle = searchInput
    ? `Search results for "${searchInput}" - AgriSmart Resources`
    : 'Search Resources - AgriSmart';

  const metaDescription = searchInput
    ? `AgriSmart resources search results for "${searchInput}"`
    : 'Search articles, guides, videos, and glossary terms in the AgriSmart Resources section';

  return (
    <Layout>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
      </Head>

      <div className="bg-gradient-to-b from-hsl-primary-light/50 to-white dark:from-hsl-primary-dark/20 dark:to-slate-950">
        <div className="container mx-auto px-4 py-12 animate-fade-in">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-hsl-accent animate-glow" />
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Search AgriSmart Resources
              </h1>
              <Sparkles className="h-6 w-6 text-hsl-accent animate-glow" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
              Discover premium articles, guides, videos, and glossary terms to enhance your agricultural knowledge
            </p>

            <div className="max-w-3xl mx-auto shadow-lg rounded-lg overflow-hidden card-premium">
              <SearchBar
                value={searchInput}
                onChange={handleSearchInputChange}
                onSubmit={handleSearchSubmit}
                placeholder="Search articles, guides, videos and glossary terms..."
                premium={true}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters sidebar */}
          <div className="w-full lg:w-1/4">
            <div className="sticky top-6">
              <SearchFilters
                contentType={selectedContentType}
                category={selectedCategory}
                tags={selectedTags}
                sortBy={selectedSortBy}
                sortOrder={selectedSortOrder}
                facets={data?.facets}
                contentTypeCounts={data?.contentTypeCounts}
                onContentTypeChange={handleContentTypeChange}
                onCategoryChange={handleCategoryChange}
                onTagsChange={handleTagsChange}
                onSortChange={handleSortChange}
                onClearFilters={handleClearFilters}
                premium={true}
              />
            </div>
          </div>

          {/* Main content */}
          <div className="w-full lg:w-3/4">
            {isLoading ? (
              <SearchSkeleton premium={true} />
            ) : !data ? (
              <div className="py-12 text-center card-premium backdrop-blur-sm bg-white/50 dark:bg-slate-900/50 p-8">
                <Search className="h-12 w-12 text-hsl-primary mx-auto mb-4 animate-float" />
                <h3 className="text-xl font-medium mb-2">
                  Discover AgriSmart Resources
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto">
                  Enter keywords, select categories, or apply filters to find the perfect resources for your agricultural needs.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                  <Link
                    href="/resources/articles"
                    className="card-premium p-6 flex flex-col items-center transition-all duration-300"
                  >
                    <FileText className="h-8 w-8 text-hsl-accent mb-3" />
                    <h4 className="font-semibold mb-1">Articles</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center">In-depth agricultural insights</p>
                  </Link>
                  <Link
                    href="/resources/guides"
                    className="card-premium p-6 flex flex-col items-center transition-all duration-300"
                  >
                    <BookOpen className="h-8 w-8 text-hsl-primary mb-3" />
                    <h4 className="font-semibold mb-1">Guides</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center">Step-by-step farming instructions</p>
                  </Link>
                  <Link
                    href="/resources/videos"
                    className="card-premium p-6 flex flex-col items-center transition-all duration-300"
                  >
                    <Video className="h-8 w-8 text-red-500 mb-3" />
                    <h4 className="font-semibold mb-1">Videos</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center">Visual farming demonstrations</p>
                  </Link>
                  <Link
                    href="/resources/glossary"
                    className="card-premium p-6 flex flex-col items-center transition-all duration-300"
                  >
                    <BookmarkIcon className="h-8 w-8 text-purple-500 mb-3" />
                    <h4 className="font-semibold mb-1">Glossary</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center">Agricultural terminology explained</p>
                  </Link>
                </div>

                <div className="mt-8">
                  <Badge className="badge-premium bg-hsl-primary/10 text-hsl-primary border-hsl-primary/30 px-4 py-2">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Premium resources available
                  </Badge>
                </div>
              </div>
            ) : (
              <>
                <div className="card-premium p-5 mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center">
                    {data.totalCount > 0 ? (
                      <span className="badge-primary mr-3 px-3 py-1">{data.totalCount}</span>
                    ) : null}
                    {data.totalCount > 0
                      ? `Result${data.totalCount === 1 ? '' : 's'} Found`
                      : 'No Results Found'}
                  </h2>

                  {(selectedContentType !== 'all' || selectedCategory || selectedTags.length > 0) && (
                    <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs">
                      Clear filters
                    </Button>
                  )}
                </div>

                {data.totalCount === 0 && (
                  <div className="mb-8 card-premium p-6 text-center">
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                      Try broadening your search or using different keywords.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Badge className="px-3 py-1">Try different keywords</Badge>
                      <Badge className="px-3 py-1">Remove some filters</Badge>
                      <Badge className="px-3 py-1">Check spelling</Badge>
                    </div>
                  </div>
                )}

                <SearchResults results={data.results} query={searchInput} premium={true} />

                {data.totalPages > 1 && (
                  <div className="mt-8 card-premium p-4 flex justify-center">
                    <CustomPagination
                      currentPage={data.page}
                      totalPages={data.totalPages}
                      onPageChange={handlePageChange}
                      premium={true}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ResourcesSearchPage;
