import React, { useState, useRef, useEffect } from "react";
import { X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Option = {
  label: string;
  value: string;
  backgroundColor?: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const MultiSelect = ({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  className,
  disabled = false,
}: MultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      // Focus the input when the popover opens
      inputRef.current.focus();
    }
  }, [open]);

  // Filter options based on query
  const filteredOptions = query === ""
    ? options
    : options.filter((option) =>
        option.label
          .toLowerCase()
          .includes(query.toLowerCase())
      );

  // Handle option selection/deselection
  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    
    onChange(newSelected);
  };

  // Remove a selected item
  const handleRemove = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  // Clear all selected items
  const handleClear = () => {
    onChange([]);
  };

  // Find the label for a value
  const getOptionByValue = (value: string) => {
    return options.find((option) => option.value === value);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          className={cn(
            "min-h-10 flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            className
          )}
          onClick={() => !disabled && setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            
            {selected.map((value) => {
              const option = getOptionByValue(value);
              if (!option) return null;
              
              return (
                <Badge
                  key={value}
                  variant="secondary"
                  style={option.backgroundColor ? {
                    backgroundColor: option.backgroundColor,
                    color: '#ffffff'
                  } : undefined}
                  className="flex items-center gap-1 px-2 py-0"
                >
                  {option.label}
                  {!disabled && (
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(value);
                      }}
                    />
                  )}
                </Badge>
              );
            })}
          </div>
        </div>
      </PopoverTrigger>
      
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search..." 
            onValueChange={setQuery}
            ref={inputRef}
          />
          
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className={cn(
                        "flex-1",
                        isSelected ? "font-medium" : ""
                      )}>
                        {option.label}
                      </div>
                      
                      {isSelected && <Check className="h-4 w-4" />}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
