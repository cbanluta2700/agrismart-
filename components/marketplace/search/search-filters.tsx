"use client";

import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFacets {
  categories: {
    id: string;
    name: string;
    count: number;
  }[];
  priceRange: {
    min: number;
    max: number;
  };
}

interface SearchFiltersProps {
  facets?: SearchFacets;
  selectedCategory?: string;
  selectedPriceRange: {
    min?: number;
    max?: number;
  };
  onCategoryChange: (categoryId?: string) => void;
  onPriceRangeChange: (min?: number, max?: number) => void;
}

export default function SearchFilters({
  facets,
  selectedCategory,
  selectedPriceRange,
  onCategoryChange,
  onPriceRangeChange,
}: SearchFiltersProps) {
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([0, 100]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  
  // Update local price range when facets or selected range changes
  useEffect(() => {
    if (facets?.priceRange) {
      setLocalPriceRange([
        selectedPriceRange.min ?? facets.priceRange.min,
        selectedPriceRange.max ?? facets.priceRange.max,
      ]);
    }
  }, [facets, selectedPriceRange]);
  
  // Handle price range slider change
  const handlePriceRangeChange = (values: number[]) => {
    setLocalPriceRange([values[0], values[1]]);
  };
  
  // Handle price range slider final value
  const handlePriceRangeApply = () => {
    onPriceRangeChange(localPriceRange[0], localPriceRange[1]);
  };
  
  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      onCategoryChange(undefined);
    } else {
      onCategoryChange(categoryId);
    }
  };
  
  // Handle clearing all filters
  const handleClearFilters = () => {
    onCategoryChange(undefined);
    onPriceRangeChange(undefined, undefined);
  };
  
  // Check if any filters are applied
  const hasFilters = Boolean(
    selectedCategory || 
    selectedPriceRange.min || 
    selectedPriceRange.max
  );
  
  // Render helper for showing current price range
  const renderPriceRangeDisplay = () => {
    if (!facets?.priceRange) return null;
    
    return (
      <div className="flex items-center justify-between mt-2 text-sm">
        <span>${localPriceRange[0].toFixed(2)}</span>
        <span>${localPriceRange[1].toFixed(2)}</span>
      </div>
    );
  };
  
  const filters = (
    <div className="space-y-6">
      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        {hasFilters && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleClearFilters}
            className="h-8 text-xs"
          >
            <X className="h-3 w-3 mr-1" /> Clear all
          </Button>
        )}
      </div>
      
      {/* Price Range */}
      <div>
        <Accordion type="single" collapsible defaultValue="price">
          <AccordionItem value="price">
            <AccordionTrigger>Price Range</AccordionTrigger>
            <AccordionContent>
              {facets?.priceRange ? (
                <div className="mt-2">
                  <Slider
                    min={facets.priceRange.min}
                    max={facets.priceRange.max}
                    step={1}
                    value={localPriceRange}
                    onValueChange={handlePriceRangeChange}
                    onValueCommit={handlePriceRangeApply}
                  />
                  {renderPriceRangeDisplay()}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Price range not available
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      
      {/* Categories */}
      <div>
        <Accordion type="single" collapsible defaultValue="categories">
          <AccordionItem value="categories">
            <AccordionTrigger>Categories</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 mt-2">
                {facets?.categories ? (
                  facets.categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={selectedCategory === category.id}
                        onCheckedChange={() => handleCategoryChange(category.id)}
                      />
                      <Label
                        htmlFor={`category-${category.id}`}
                        className="text-sm flex justify-between w-full cursor-pointer"
                      >
                        <span>{category.name}</span>
                        <span className="text-gray-500 text-xs">
                          ({category.count})
                        </span>
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    No categories available
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
  
  return (
    <>
      {/* Desktop filters */}
      <div className="hidden md:block">
        {filters}
      </div>
      
      {/* Mobile filters toggle */}
      <div className="md:hidden">
        <Button
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          variant="outline"
          className="w-full flex items-center justify-center"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasFilters && (
            <span className="ml-1 rounded-full bg-primary w-5 h-5 text-[10px] flex items-center justify-center text-white">
              {(selectedCategory ? 1 : 0) + 
               ((selectedPriceRange.min || selectedPriceRange.max) ? 1 : 0)}
            </span>
          )}
        </Button>
        
        {/* Mobile filters dropdown */}
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 transform transition-transform bg-white rounded-t-xl shadow-lg overflow-hidden",
            mobileFilterOpen 
              ? "translate-y-0" 
              : "translate-y-full"
          )}
          style={{ maxHeight: "70vh" }}
        >
          <div className="p-4 overflow-auto max-h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileFilterOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {filters}
            
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="w-full"
              >
                Clear all
              </Button>
              <Button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
