import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  discount?: number;
  averageRating: number;
  totalReviews: number;
  images: string[];
  seller: {
    id: string;
    name: string;
    image?: string;
  };
  category: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface Facet {
  id: string;
  name: string;
  count: number;
}

interface PriceRange {
  min: number;
  max: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalResults: number;
}

interface SearchInfo {
  originalQuery: string;
  enhancedQuery?: string;
  synonymsExpanded?: string;
  typoMatches?: number;
}

interface SearchResponse {
  products: SearchProduct[];
  facets: {
    categories: Facet[];
    priceRange: PriceRange;
  };
  pagination: Pagination;
  searchInfo?: SearchInfo;
}

interface SearchParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  attributes?: Record<string, string[]>;
  page?: number;
  pageSize?: number;
  sort?: string;
}

interface UseSearchResult {
  isLoading: boolean;
  error: string | null;
  products: SearchProduct[];
  facets: {
    categories: Facet[];
    priceRange: PriceRange;
  };
  pagination: Pagination;
  searchInfo?: SearchInfo;
  searchParams: SearchParams;
  setSearchParams: (params: Partial<SearchParams>) => void;
  executeSearch: () => Promise<void>;
  resetSearch: () => void;
  recordProductClick: (productId: string, position: number) => Promise<void>;
}

export function useSearch(initialParams: SearchParams = {}): UseSearchResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [facets, setFacets] = useState<{ categories: Facet[]; priceRange: PriceRange }>({
    categories: [],
    priceRange: { min: 0, max: 0 },
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    totalPages: 0,
    totalResults: 0,
  });
  const [searchInfo, setSearchInfo] = useState<SearchInfo | undefined>(undefined);
  
  // Initialize search params from URL or provided initial params
  const [params, setParams] = useState<SearchParams>(() => {
    const urlParams: SearchParams = {};
    
    // Parse URL parameters
    if (searchParams) {
      urlParams.query = searchParams.get("query") || undefined;
      urlParams.category = searchParams.get("category") || undefined;
      urlParams.minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
      urlParams.maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;
      urlParams.page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : undefined;
      urlParams.pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!) : undefined;
      urlParams.sort = searchParams.get("sort") || undefined;
      
      // Parse attributes from URL (format: attr1:value1,attr2:value2)
      const attributesParam = searchParams.get("attributes");
      if (attributesParam) {
        const attributeFilters: Record<string, string[]> = {};
        const attributePairs = attributesParam.split(",");
        
        attributePairs.forEach(pair => {
          const [key, value] = pair.split(":");
          if (key && value) {
            if (!attributeFilters[key]) {
              attributeFilters[key] = [];
            }
            attributeFilters[key].push(value);
          }
        });
        
        urlParams.attributes = attributeFilters;
      }
    }
    
    // Merge URL params with initial params, prioritizing URL params
    return { ...initialParams, ...urlParams };
  });
  
  // Debounce the search query to avoid too many API calls
  const debouncedQuery = useDebounce(params.query || "", 300);
  
  // Update URL with current search parameters
  const updateUrl = useCallback(() => {
    const url = new URL(window.location.href);
    
    // Clear existing search params
    url.searchParams.delete("query");
    url.searchParams.delete("category");
    url.searchParams.delete("minPrice");
    url.searchParams.delete("maxPrice");
    url.searchParams.delete("page");
    url.searchParams.delete("pageSize");
    url.searchParams.delete("sort");
    url.searchParams.delete("attributes");
    
    // Add current search params
    if (params.query) url.searchParams.set("query", params.query);
    if (params.category) url.searchParams.set("category", params.category);
    if (params.minPrice !== undefined) url.searchParams.set("minPrice", params.minPrice.toString());
    if (params.maxPrice !== undefined) url.searchParams.set("maxPrice", params.maxPrice.toString());
    if (params.page !== undefined && params.page > 1) url.searchParams.set("page", params.page.toString());
    if (params.pageSize !== undefined && params.pageSize !== 20) url.searchParams.set("pageSize", params.pageSize.toString());
    if (params.sort) url.searchParams.set("sort", params.sort);
    
    // Add attributes to URL
    if (params.attributes && Object.keys(params.attributes).length > 0) {
      const attributePairs: string[] = [];
      
      Object.entries(params.attributes).forEach(([key, values]) => {
        values.forEach(value => {
          attributePairs.push(`${key}:${value}`);
        });
      });
      
      if (attributePairs.length > 0) {
        url.searchParams.set("attributes", attributePairs.join(","));
      }
    }
    
    // Update URL without reloading the page
    router.push(url.pathname + url.search);
  }, [params, router]);
  
  // Execute the search query
  const executeSearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (params.query) queryParams.set("query", params.query);
      if (params.category) queryParams.set("category", params.category);
      if (params.minPrice !== undefined) queryParams.set("minPrice", params.minPrice.toString());
      if (params.maxPrice !== undefined) queryParams.set("maxPrice", params.maxPrice.toString());
      if (params.page !== undefined) queryParams.set("page", params.page.toString());
      if (params.pageSize !== undefined) queryParams.set("pageSize", params.pageSize.toString());
      if (params.sort) queryParams.set("sort", params.sort);
      
      // Add attributes to query params
      if (params.attributes && Object.keys(params.attributes).length > 0) {
        const attributePairs: string[] = [];
        
        Object.entries(params.attributes).forEach(([key, values]) => {
          values.forEach(value => {
            attributePairs.push(`${key}:${value}`);
          });
        });
        
        if (attributePairs.length > 0) {
          queryParams.set("attributes", attributePairs.join(","));
        }
      }
      
      // Execute the API request
      const response = await axios.get<SearchResponse>(`/api/marketplace/search?${queryParams.toString()}`);
      
      // Update state with results
      setProducts(response.data.products);
      setFacets(response.data.facets);
      setPagination(response.data.pagination);
      setSearchInfo(response.data.searchInfo);
      
      // Update URL
      updateUrl();
      
      // Log search analytics
      if (params.query) {
        try {
          await axios.post("/api/marketplace/search/analytics", {
            query: params.query,
            action: "search",
            resultsCount: response.data.pagination.totalResults,
            filters: {
              category: params.category,
              minPrice: params.minPrice,
              maxPrice: params.maxPrice,
              attributes: params.attributes,
              sort: params.sort,
            },
          });
        } catch (analyticsError) {
          console.error("Failed to log search analytics:", analyticsError);
          // Don't fail the search if analytics logging fails
        }
      }
    } catch (error) {
      console.error("Failed to perform search:", error);
      setError("Failed to perform search. Please try again.");
      setProducts([]);
      setFacets({
        categories: [],
        priceRange: { min: 0, max: 0 },
      });
      setPagination({
        page: 1,
        pageSize: 20,
        totalPages: 0,
        totalResults: 0,
      });
      setSearchInfo(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [params, updateUrl]);
  
  // Reset search to default state
  const resetSearch = useCallback(() => {
    setParams({
      page: 1,
      pageSize: 20,
    });
  }, []);
  
  // Update search parameters
  const setSearchParams = useCallback((newParams: Partial<SearchParams>) => {
    setParams(prev => {
      // When changing anything other than page, reset to page 1
      if (Object.keys(newParams).some(key => key !== "page")) {
        return { ...prev, ...newParams, page: 1 };
      }
      return { ...prev, ...newParams };
    });
  }, []);
  
  // Execute search when debounced query changes
  useEffect(() => {
    if (debouncedQuery !== params.query) {
      setParams(prev => ({ ...prev, query: debouncedQuery, page: 1 }));
    }
  }, [debouncedQuery]);
  
  // Execute search when params change
  useEffect(() => {
    executeSearch();
  }, [
    params.query,
    params.category,
    params.minPrice,
    params.maxPrice,
    params.page,
    params.pageSize,
    params.sort,
    // We can't directly watch attributes object, so we rely on other param changes
    executeSearch,
  ]);
  
  // Record product clicks for analytics
  const recordProductClick = useCallback(async (productId: string, position: number) => {
    if (params.query) {
      try {
        await axios.post("/api/marketplace/search/analytics", {
          query: params.query,
          action: "product_click",
          productId,
          position,
          filters: {
            category: params.category,
            minPrice: params.minPrice,
            maxPrice: params.maxPrice,
            attributes: params.attributes,
            sort: params.sort,
          },
        });
      } catch (error) {
        console.error("Failed to log product click:", error);
      }
    }
  }, [params]);
  
  return {
    isLoading,
    error,
    products,
    facets,
    pagination,
    searchInfo,
    searchParams: params,
    setSearchParams,
    executeSearch,
    resetSearch,
    recordProductClick,
  };
}
