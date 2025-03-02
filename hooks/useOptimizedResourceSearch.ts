import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchParams {
  query?: string;
  type?: string;
  category?: string;
  tags?: string[];
  author?: string;
  sort?: string;
  page?: number;
  limit?: number;
  premium?: boolean;
}

interface UseResourceSearchResult {
  data: any;
  isLoading: boolean;
  isError: any;
  mutate: () => void;
  setSearch: (params: SearchParams) => void;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }
  return response.json();
};

export function useOptimizedResourceSearch(initialParams: SearchParams = {}): UseResourceSearchResult {
  // Store the current search parameters
  const [searchParams, setSearchParams] = useState<SearchParams>(initialParams);
  
  // Debounce the search query to avoid too many requests
  const debouncedQuery = useDebounce(searchParams.query || '', 300);
  
  // Build the query string for the API request
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    
    // Only add parameters that are defined
    if (debouncedQuery) params.append('query', debouncedQuery);
    if (searchParams.type) params.append('type', searchParams.type);
    if (searchParams.category) params.append('category', searchParams.category);
    if (searchParams.author) params.append('author', searchParams.author);
    if (searchParams.sort) params.append('sort', searchParams.sort);
    if (searchParams.page) params.append('page', searchParams.page.toString());
    if (searchParams.limit) params.append('limit', searchParams.limit.toString());
    if (searchParams.premium !== undefined) params.append('premium', searchParams.premium.toString());
    
    // Handle tags array
    if (searchParams.tags && searchParams.tags.length > 0) {
      searchParams.tags.forEach(tag => params.append('tags', tag));
    }
    
    return params.toString();
  }, [debouncedQuery, searchParams]);
  
  // Create the API URL with query string
  const apiUrl = `/api/resources/optimized-search?${buildQueryString()}`;
  
  // Fetch the search results using SWR
  const { data, error, mutate } = useSWR(apiUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000, // 5 seconds
  });
  
  // Function to update search parameters
  const setSearch = useCallback((newParams: SearchParams) => {
    setSearchParams(prev => ({
      ...prev,
      ...newParams,
      // Reset to page 1 if search criteria changes (except for page itself)
      page: newParams.page || (newParams.query !== undefined && newParams.query !== prev.query ? 1 : prev.page)
    }));
  }, []);
  
  return {
    data,
    isLoading: !error && !data,
    isError: error,
    mutate,
    setSearch
  };
}
