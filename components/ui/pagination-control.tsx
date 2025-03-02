"use client";

import * as React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationControl({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationControlProps) {
  // Generate page numbers to display
  const generatePagination = () => {
    // If 7 or fewer pages, show all
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Always show first, last, and pages around current page
    const firstPage = 1;
    const lastPage = totalPages;
    
    // Calculate pages around current page
    const leftSiblingIndex = Math.max(currentPage - 1, firstPage);
    const rightSiblingIndex = Math.min(currentPage + 1, lastPage);
    
    // Calculate showing ellipsis
    const showLeftEllipsis = leftSiblingIndex > 2;
    const showRightEllipsis = rightSiblingIndex < lastPage - 1;
    
    // Calculate pages to show
    if (!showLeftEllipsis && showRightEllipsis) {
      // Show first 4 pages and ellipsis for right side
      const leftPageCount = 4;
      const leftPages = Array.from({ length: leftPageCount }, (_, i) => i + 1);
      return [...leftPages, "ellipsis", lastPage];
    }
    
    if (showLeftEllipsis && !showRightEllipsis) {
      // Show ellipsis on left side and last 4 pages
      const rightPageCount = 4;
      const rightPages = Array.from(
        { length: rightPageCount },
        (_, i) => lastPage - (rightPageCount - 1) + i
      );
      return [firstPage, "ellipsis", ...rightPages];
    }
    
    if (showLeftEllipsis && showRightEllipsis) {
      // Show ellipsis on both sides and middle pages
      const middlePages = [leftSiblingIndex, currentPage, rightSiblingIndex].filter(
        (page, index, self) => self.indexOf(page) === index
      );
      return [firstPage, "ellipsis", ...middlePages, "ellipsis", lastPage];
    }
    
    // Fallback
    return [1, 2, 3, "ellipsis", totalPages - 1, totalPages];
  };
  
  const pageNumbers = generatePagination();
  
  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) {
                onPageChange(currentPage - 1);
              }
            }}
            aria-disabled={currentPage <= 1}
            className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
        
        {pageNumbers.map((page, index) => (
          <PaginationItem key={index}>
            {page === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(page as number);
                }}
                isActive={page === currentPage}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages) {
                onPageChange(currentPage + 1);
              }
            }}
            aria-disabled={currentPage >= totalPages}
            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
