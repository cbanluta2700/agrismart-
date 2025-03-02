'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  autoFocus?: boolean;
}

export default function SearchBar({
  placeholder = 'Search...',
  className = '',
  size = 'default',
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync query with URL search params
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  // Auto-focus the input if enabled
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Determine if we're on the search page or elsewhere
    if (pathname === '/search') {
      // If already on search page, update the URL with the new query
      const params = new URLSearchParams(searchParams);
      params.set('q', query);
      router.push(`/search?${params.toString()}`);
    } else {
      // Navigate to search page with query
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const inputSizeClass = 
    size === 'sm' ? 'h-8 text-sm' :
    size === 'lg' ? 'h-12 text-lg' :
    'h-10';

  return (
    <form 
      onSubmit={handleSearch} 
      className={`relative flex items-center ${className}`}
    >
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`pl-10 pr-10 ${inputSizeClass} w-full`}
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
      <Button 
        type="submit" 
        variant="ghost" 
        size="sm" 
        className="ml-2 hidden sm:flex"
      >
        Search
      </Button>
    </form>
  );
}
