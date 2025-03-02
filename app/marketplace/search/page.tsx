"use client";

import { useEffect } from "react";
import { useSearch } from "@/hooks/use-search";
import SearchBar from "@/components/marketplace/search/search-bar";
import SearchFilters from "@/components/marketplace/search/search-filters";
import SearchResults from "@/components/marketplace/search/search-results";
import SearchPagination from "@/components/marketplace/search/search-pagination";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { 
  SortAsc, 
  SortDesc,
  List,
  Grid,
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export default function SearchPage() {
  const { 
    params,
    updateParams,
    results,
    isLoading,
    error,
    suggestionsQuery,
    setSuggestionsQuery,
    suggestions,
    isSuggestionsLoading,
    handleSuggestionClick,
    handleProductClick,
  } = useSearch();
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Search the AgriSmart Marketplace</h1>
        <SearchBar 
          query={suggestionsQuery}
          onQueryChange={setSuggestionsQuery}
          onSearch={(query) => updateParams({ query })}
          suggestions={suggestions}
          isLoading={isSuggestionsLoading}
          onSuggestionClick={handleSuggestionClick}
        />
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters sidebar */}
        <div className="w-full md:w-1/4">
          <SearchFilters 
            facets={results?.facets}
            selectedCategory={params.category}
            selectedPriceRange={{ min: params.minPrice, max: params.maxPrice }}
            onCategoryChange={(category) => updateParams({ category })}
            onPriceRangeChange={(min, max) => updateParams({ minPrice: min, maxPrice: max })}
          />
        </div>
        
        {/* Results */}
        <div className="w-full md:w-3/4">
          {/* Results header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div>
              {results && (
                <p className="text-sm text-gray-600">
                  Showing {results.pagination.totalResults} results
                  {params.query ? ` for "${params.query}"` : ""}
                </p>
              )}
            </div>
            
            <div className="flex gap-4 items-center">
              {/* View mode toggle */}
              <div className="flex items-center border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-none"
                >
                  <Grid size={16} />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-none"
                >
                  <List size={16} />
                </Button>
              </div>
              
              {/* Sort by */}
              <Select
                value={params.sort || "relevance"}
                onValueChange={(value) => updateParams({ sort: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="date_desc">Newest First</SelectItem>
                  <SelectItem value="rating_desc">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {/* Error state */}
          {error && !isLoading && (
            <div className="rounded-md bg-red-50 p-4 my-4">
              <div className="flex">
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* No results */}
          {results?.products.length === 0 && !isLoading && !error && (
            <div className="text-center py-12 bg-gray-50 rounded-md">
              <h3 className="mt-2 text-lg font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
              <div className="mt-6">
                <Button
                  onClick={() => {
                    updateParams({
                      query: "",
                      category: undefined,
                      minPrice: undefined,
                      maxPrice: undefined,
                    });
                    setSuggestionsQuery("");
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            </div>
          )}
          
          {/* Results grid */}
          {results?.products.length > 0 && !isLoading && (
            <>
              <SearchResults 
                products={results.products}
                viewMode={viewMode}
                onProductClick={(product, position) => handleProductClick(product, position)}
              />
              
              {/* Pagination */}
              {results.pagination.totalPages > 1 && (
                <div className="mt-8">
                  <SearchPagination 
                    currentPage={results.pagination.page}
                    totalPages={results.pagination.totalPages}
                    onPageChange={(page) => updateParams({ page })}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
