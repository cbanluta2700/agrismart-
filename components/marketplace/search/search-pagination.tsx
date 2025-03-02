"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function SearchPagination({
  currentPage,
  totalPages,
  onPageChange,
}: SearchPaginationProps) {
  // Generate page numbers to display with ellipsis for large number of pages
  const getPageNumbers = () => {
    const pageNumbers = [];
    
    // Always include first page
    pageNumbers.push(1);
    
    // Calculate start and end of the displayed range around current page
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);
    
    // Handle special cases to always show 3 pages if possible
    if (currentPage <= 3) {
      endPage = Math.min(4, totalPages - 1);
    } else if (currentPage >= totalPages - 2) {
      startPage = Math.max(2, totalPages - 3);
    }
    
    // Add ellipsis before the range if needed
    if (startPage > 2) {
      pageNumbers.push(-1); // -1 represents an ellipsis
    }
    
    // Add the range of pages
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    // Add ellipsis after the range if needed
    if (endPage < totalPages - 1) {
      pageNumbers.push(-2); // -2 represents an ellipsis (different key from the first one)
    }
    
    // Always include last page if there's more than one page
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };
  
  const pageNumbers = getPageNumbers();
  
  return (
    <nav className="flex justify-center items-center space-x-1">
      {/* Previous button */}
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="hidden sm:flex"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous page</span>
      </Button>
      
      {/* Page numbers */}
      {pageNumbers.map((pageNumber, index) => {
        // Render ellipsis
        if (pageNumber < 0) {
          return (
            <span 
              key={`ellipsis-${index}`} 
              className="flex items-center justify-center h-9 w-9"
            >
              <MoreHorizontal className="h-4 w-4 text-gray-400" />
            </span>
          );
        }
        
        // Render page number
        return (
          <Button
            key={`page-${pageNumber}`}
            variant={pageNumber === currentPage ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(pageNumber)}
            className={cn(
              "h-9 w-9",
              pageNumber === currentPage 
                ? "pointer-events-none" 
                : "hover:bg-primary/10"
            )}
          >
            {pageNumber}
          </Button>
        );
      })}
      
      {/* Next button */}
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="hidden sm:flex"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next page</span>
      </Button>
      
      {/* Mobile Previous/Next buttons */}
      <div className="sm:hidden flex space-x-1">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Prev
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </nav>
  );
}
