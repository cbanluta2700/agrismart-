import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

interface CustomPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  premium?: boolean;
}

export const CustomPagination: React.FC<CustomPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  premium = false,
}) => {
  if (totalPages <= 1) return null;

  // Calculate the range of page numbers to show
  const createRange = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  // Determine which page numbers to show
  const getPageNumbers = () => {
    // Always show first and last page
    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    // Calculate range around current page to show
    const leftSiblingIndex = Math.max(currentPage - siblingCount, firstPageIndex);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, lastPageIndex);

    // Determine if we need ellipses at left and right
    const shouldShowLeftEllipsis = leftSiblingIndex > firstPageIndex + 1;
    const shouldShowRightEllipsis = rightSiblingIndex < lastPageIndex - 1;

    // Handle simple case: few enough pages to show all
    if (totalPages <= 5) {
      return createRange(1, totalPages);
    }

    // Handle different cases of what to show
    if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      // Show more pages at the beginning
      const leftRange = createRange(1, 3);
      return [...leftRange, -1, totalPages];
    }

    if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
      // Show more pages at the end
      const rightRange = createRange(totalPages - 2, totalPages);
      return [1, -1, ...rightRange];
    }

    if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      // Show pages around current page with ellipses on both sides
      const middleRange = createRange(leftSiblingIndex, rightSiblingIndex);
      return [1, -1, ...middleRange, -1, totalPages];
    }
  };

  const pageNumbers = getPageNumbers();

  // Premium styles for pagination
  const premiumItemClass = premium 
    ? 'transition-all duration-300 hover:scale-105' 
    : '';
    
  const premiumLinkClass = premium 
    ? 'font-medium border-hsl-accent/30 hover:border-hsl-accent hover:text-hsl-accent hover:bg-hsl-accent/10' 
    : '';
    
  const premiumActiveClass = premium 
    ? 'bg-gradient-to-br from-hsl-accent to-hsl-primary text-white border-transparent shadow-md hover:shadow-lg hover:scale-110' 
    : '';
    
  const premiumNavClass = premium 
    ? 'hover:bg-gradient-to-r hover:from-hsl-primary-light hover:to-hsl-accent/20 hover:text-hsl-primary border-hsl-primary/20' 
    : '';

  return (
    <Pagination className={premium ? 'animate-fade-in' : ''}>
      <PaginationContent>
        {/* Previous page button */}
        <PaginationItem className={premiumItemClass}>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) {
                onPageChange(currentPage - 1);
              }
            }}
            className={`${currentPage === 1 ? 'pointer-events-none opacity-50' : ''} ${premiumNavClass}`}
          />
        </PaginationItem>

        {/* Page numbers */}
        {pageNumbers?.map((pageNumber, idx) =>
          pageNumber === -1 ? (
            // Ellipsis
            <PaginationItem key={`ellipsis-${idx}`} className={premiumItemClass}>
              <PaginationEllipsis className={premium ? 'text-hsl-primary' : ''} />
            </PaginationItem>
          ) : (
            // Page number
            <PaginationItem key={pageNumber} className={premiumItemClass}>
              <PaginationLink
                href="#"
                isActive={pageNumber === currentPage}
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(pageNumber);
                }}
                className={`${pageNumber === currentPage && premium ? premiumActiveClass : premiumLinkClass}`}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        {/* Next page button */}
        <PaginationItem className={premiumItemClass}>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages) {
                onPageChange(currentPage + 1);
              }
            }}
            className={`${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} ${premiumNavClass}`}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
