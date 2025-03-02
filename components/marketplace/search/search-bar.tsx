"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchSuggestion {
  text: string;
  type: "product" | "category" | "seller" | "completion";
}

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  suggestions: SearchSuggestion[];
  isLoading: boolean;
  onSuggestionClick: (suggestion: SearchSuggestion) => void;
}

export default function SearchBar({
  query,
  onQueryChange,
  onSearch,
  suggestions,
  isLoading,
  onSuggestionClick,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Handle outside clicks to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
    setIsFocused(false);
  };
  
  // Handle clear button click
  const handleClear = () => {
    onQueryChange("");
    inputRef.current?.focus();
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onSuggestionClick(suggestion);
    setIsFocused(false);
  };
  
  // Get icon based on suggestion type
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "product":
        return <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">Product</span>;
      case "category":
        return <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800">Category</span>;
      case "seller":
        return <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">Seller</span>;
      case "completion":
        return <Search className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };
  
  return (
    <div className="relative">
      {/* Search form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search for products, categories, or sellers..."
            className="pl-10 pr-10 py-6 w-full"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          {query && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleClear}
                >
                  <X className="h-5 w-5 text-gray-400" />
                </Button>
              )}
            </div>
          )}
        </div>
      </form>
      
      {/* Suggestions dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 max-h-80 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.text}-${index}`}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <span className="text-sm">{suggestion.text}</span>
              <div className="ml-2">
                {getSuggestionIcon(suggestion.type)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
