import useSWR, { SWRConfiguration } from 'swr';
import { useRouter } from 'next/router';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error('Failed to fetch data');
    throw error;
  }
  return response.json();
};

// Hook for fetching articles
export const useArticles = (
  filters?: {
    status?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
    search?: string;
    tag?: string;
  },
  config?: SWRConfiguration
) => {
  const { status, categoryId, page = 1, limit = 10, search, tag } = filters || {};
  
  const queryParams = new URLSearchParams();
  if (status) queryParams.append('status', status);
  if (categoryId) queryParams.append('categoryId', categoryId);
  if (page) queryParams.append('page', page.toString());
  if (limit) queryParams.append('limit', limit.toString());
  if (search) queryParams.append('search', search);
  if (tag) queryParams.append('tag', tag);
  
  const queryString = queryParams.toString();
  const url = `/api/resources/articles${queryString ? `?${queryString}` : ''}`;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, config);
  
  return {
    articles: data?.articles || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  };
};

// Hook for fetching a single article
export const useArticle = (id?: string, trackView: boolean = false, config?: SWRConfiguration) => {
  const url = id ? `/api/resources/articles/${id}${trackView ? '?track=true' : ''}` : null;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, config);
  
  return {
    article: data?.article,
    isLoading,
    isError: error,
    mutate,
  };
};

// Hook for fetching article by slug
export const useArticleBySlug = (slug?: string, trackView: boolean = false, config?: SWRConfiguration) => {
  const url = slug ? `/api/resources/articles/slug/${slug}${trackView ? '?track=true' : ''}` : null;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, config);
  
  return {
    article: data?.article,
    isLoading,
    isError: error,
    mutate,
  };
};

// Hook for fetching guides
export const useGuides = (
  filters?: {
    status?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
    search?: string;
    tag?: string;
    difficulty?: string;
  },
  config?: SWRConfiguration
) => {
  const { status, categoryId, page = 1, limit = 10, search, tag, difficulty } = filters || {};
  
  const queryParams = new URLSearchParams();
  if (status) queryParams.append('status', status);
  if (categoryId) queryParams.append('categoryId', categoryId);
  if (page) queryParams.append('page', page.toString());
  if (limit) queryParams.append('limit', limit.toString());
  if (search) queryParams.append('search', search);
  if (tag) queryParams.append('tag', tag);
  if (difficulty) queryParams.append('difficulty', difficulty);
  
  const queryString = queryParams.toString();
  const url = `/api/resources/guides${queryString ? `?${queryString}` : ''}`;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, config);
  
  return {
    guides: data?.guides || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  };
};

// Hook for fetching a single guide
export const useGuide = (id?: string, trackView: boolean = false, config?: SWRConfiguration) => {
  const url = id ? `/api/resources/guides/${id}${trackView ? '?track=true' : ''}` : null;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, config);
  
  return {
    guide: data?.guide,
    isLoading,
    isError: error,
    mutate,
  };
};

// Hook for fetching guide by slug
export const useGuideBySlug = (slug?: string, trackView: boolean = false, config?: SWRConfiguration) => {
  const url = slug ? `/api/resources/guides/slug/${slug}${trackView ? '?track=true' : ''}` : null;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, config);
  
  return {
    guide: data?.guide,
    isLoading,
    isError: error,
    mutate,
  };
};

// Hook for fetching content categories
export const useContentCategories = (
  filters?: {
    parentId?: string | null;
    includeChildren?: boolean;
  },
  config?: SWRConfiguration
) => {
  const { parentId, includeChildren } = filters || {};
  
  const queryParams = new URLSearchParams();
  if (parentId !== undefined) queryParams.append('parentId', parentId === null ? 'null' : parentId);
  if (includeChildren) queryParams.append('includeChildren', 'true');
  
  const queryString = queryParams.toString();
  const url = `/api/resources/content-categories${queryString ? `?${queryString}` : ''}`;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, config);
  
  return {
    categories: data?.categories || [],
    isLoading,
    isError: error,
    mutate,
  };
};

// Hook for fetching glossary terms
export const useGlossaryTerms = (
  filters?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
    tag?: string;
    startsWith?: string;
  },
  config?: SWRConfiguration
) => {
  const { status, page = 1, limit = 50, search, tag, startsWith } = filters || {};
  
  const queryParams = new URLSearchParams();
  if (status) queryParams.append('status', status);
  if (page) queryParams.append('page', page.toString());
  if (limit) queryParams.append('limit', limit.toString());
  if (search) queryParams.append('search', search);
  if (tag) queryParams.append('tag', tag);
  if (startsWith) queryParams.append('startsWith', startsWith);
  
  const queryString = queryParams.toString();
  const url = `/api/resources/glossary${queryString ? `?${queryString}` : ''}`;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, config);
  
  return {
    terms: data?.terms || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  };
};

// Hook for a pagination utility
export function usePagination(
  totalItems: number,
  currentPage: number = 1,
  itemsPerPage: number = 10
) {
  const router = useRouter();
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const nextPage = () => {
    if (currentPage < totalPages) {
      router.push({
        query: { ...router.query, page: currentPage + 1 },
      });
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      router.push({
        query: { ...router.query, page: currentPage - 1 },
      });
    }
  };
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      router.push({
        query: { ...router.query, page },
      });
    }
  };
  
  // Generate array of page numbers to display
  const generatePagination = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max to show
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always include first page
      pageNumbers.push(1);
      
      // Calculate start and end of middle pages to show
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if at edges
      if (currentPage <= 2) {
        endPage = 4;
      } else if (currentPage >= totalPages - 1) {
        startPage = totalPages - 3;
      }
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pageNumbers.push('...');
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      // Always include last page
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };
  
  return {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    pageNumbers: generatePagination(),
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}
