"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating?: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export function StarRating({
  rating = 0,
  maxRating = 5,
  size = "md",
  interactive = false,
  onRatingChange,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const handleStarClick = (index: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(index);
    }
  };
  
  const handleStarHover = (index: number) => {
    if (interactive) {
      setHoverRating(index);
    }
  };
  
  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };
  
  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "h-3 w-3";
      case "lg":
        return "h-7 w-7";
      case "md":
      default:
        return "h-5 w-5";
    }
  };
  
  const getStarColor = (index: number) => {
    const targetRating = hoverRating > 0 ? hoverRating : rating;
    
    if (index <= targetRating) {
      return "text-yellow-400 fill-yellow-400";
    }
    
    return "text-gray-300";
  };
  
  return (
    <div 
      className="flex items-center"
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: maxRating }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            getSizeClass(),
            getStarColor(index + 1),
            interactive && "cursor-pointer"
          )}
          onClick={() => handleStarClick(index + 1)}
          onMouseEnter={() => handleStarHover(index + 1)}
        />
      ))}
      
      {rating > 0 && (
        <span className="ml-2 text-sm font-medium text-gray-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
