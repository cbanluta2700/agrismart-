"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { useWishlist } from "@/hooks/use-wishlist";
import { useSearch } from "@/hooks/use-search";
import { useRouter } from "next/navigation";

interface SearchResultsProps {
  className?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ className = "" }) => {
  const router = useRouter();
  const { 
    products, 
    isLoading, 
    error, 
    pagination, 
    searchInfo,
    searchParams,
    recordProductClick 
  } = useSearch();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  
  if (isLoading) {
    return (
      <div className={`flex justify-center items-center ${className}`}>
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`p-4 bg-red-50 text-red-700 rounded-md ${className}`}>
        <p>{error}</p>
      </div>
    );
  }
  
  if (products.length === 0) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <h3 className="text-xl font-semibold mb-2">No products found</h3>
        <p className="text-gray-500 mb-4">
          We couldn't find any products matching your search.
        </p>
        <Button asChild variant="outline">
          <Link href="/marketplace">View all products</Link>
        </Button>
      </div>
    );
  }
  
  // Generate enhanced search info message
  const getSearchInfoMessage = () => {
    if (!searchInfo || !searchParams.query) return null;
    
    const messages = [];
    
    // Show synonym expansion message
    if (searchInfo.synonymsExpanded) {
      messages.push(`Including results for similar terms: "${searchInfo.synonymsExpanded}"`);
    }
    
    // Show typo correction message
    if (searchInfo.typoMatches) {
      messages.push(`Found ${searchInfo.typoMatches} results with similar spelling`);
    }
    
    // Show stopwords removal message
    if (searchInfo.enhancedQuery && searchInfo.enhancedQuery !== searchInfo.originalQuery) {
      messages.push(`Searching for important terms: "${searchInfo.enhancedQuery}"`);
    }
    
    return messages.length > 0 ? messages : null;
  };
  
  const searchInfoMessages = getSearchInfoMessage();
  
  // Handle product click with analytics tracking
  const handleProductClick = (productId: string, position: number) => {
    if (recordProductClick) {
      recordProductClick(productId, position);
    }
  };
  
  return (
    <div className={className}>
      {/* Search results count */}
      <div className="mb-4 flex flex-col">
        <div className="text-gray-600">
          Found {pagination.totalResults} product{pagination.totalResults !== 1 ? 's' : ''}
          {searchParams.query ? ` for "${searchParams.query}"` : ''}
        </div>
        
        {/* Enhanced search information */}
        {searchInfoMessages && searchInfoMessages.map((message, index) => (
          <div key={index} className="text-sm text-blue-600 mt-1">
            {message}
          </div>
        ))}
      </div>
      
      {/* Products grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product, index) => {
          const isWishlisted = isInWishlist(product.id);
          const position = index + 1 + (searchParams.page && searchParams.pageSize 
            ? (searchParams.page - 1) * searchParams.pageSize 
            : 0);
          
          return (
            <div key={product.id} className="border rounded-lg overflow-hidden group hover:shadow-md transition-shadow">
              <Link 
                href={`/marketplace/products/${product.id}`} 
                className="block"
                onClick={() => handleProductClick(product.id, position)}
              >
                <div className="relative h-48 bg-gray-100">
                  {product.images && product.images.length > 0 ? (
                    <Image
                      src={product.images[0]}
                      alt={product.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                  
                  {/* Wishlist button */}
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      isWishlisted
                        ? removeFromWishlist(product.id)
                        : addToWishlist(product.id);
                    }}
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        isWishlisted ? "fill-red-500 text-red-500" : "text-gray-600"
                      }`}
                    />
                  </Button>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{product.category?.name}</span>
                    {product.averageRating > 0 && (
                      <div className="flex items-center">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                        <span className="text-xs font-medium">
                          {product.averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 h-12">{product.title}</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-semibold text-primary">
                        {formatPrice(product.price)}
                      </span>
                      {product.discount && product.discount > 0 && (
                        <span className="text-xs text-gray-500 line-through">
                          {formatPrice(product.price / (1 - product.discount / 100))}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 flex items-center">
                      <span>
                        {product.seller?.name || "Unknown seller"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};
