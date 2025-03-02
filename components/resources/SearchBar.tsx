import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceTime?: number;
  loading?: boolean;
  premium?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  className = '',
  debounceTime = 300,
  loading = false,
  premium = false,
}) => {
  const [inputValue, setInputValue] = useState<string>(value);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Set local input value when external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    debounceTimeout.current = setTimeout(() => {
      onChange(newValue);
    }, debounceTime);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(inputValue);
  };

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`relative group ${className}`}
    >
      <div className={`relative ${premium ? 'animate-float-slow' : ''}`}>
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full pl-12 pr-20 py-3 rounded-md shadow-md transition-all duration-300
            ${premium ? 'border-hsl-accent/30 hover:border-hsl-accent/60 focus:border-hsl-accent' : ''}
            focus:shadow-lg focus:ring-hsl-accent/50`}
          disabled={loading}
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Search className={`h-5 w-5 transition-colors duration-300 
            ${loading ? 'animate-pulse text-hsl-accent' : 'text-slate-400'}`} />
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <Button 
            type="submit" 
            size="sm"
            className={`h-9 px-4 font-medium ${premium ? 'btn-premium' : ''}`}
            disabled={loading || !inputValue.trim()}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching
              </span>
            ) : (
              'Search'
            )}
          </Button>
        </div>
      </div>
      
      {/* Premium glow effect on focus */}
      {premium && (
        <div className="
          absolute -inset-0.5 rounded-lg bg-gradient-to-r from-hsl-accent via-hsl-primary to-hsl-accent 
          opacity-0 blur transition-all duration-300 group-focus-within:opacity-30
        "></div>
      )}
    </form>
  );
};
