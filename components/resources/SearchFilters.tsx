import React, { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, XIcon, FilterIcon, Trash2Icon, ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SearchFiltersProps {
  contentType: string;
  category: string;
  tags: string[];
  sortBy: string;
  sortOrder: string;
  facets?: {
    categories: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    authors: Array<{ id: string; name: string; count: number }>;
  };
  contentTypeCounts?: {
    article: number;
    guide: number;
    video: number;
    glossary: number;
  };
  onContentTypeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTagsChange: (tags: string[]) => void;
  onSortChange: (sort: { by: string; order: string }) => void;
  onClearFilters: () => void;
  premium?: boolean;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  contentType,
  category,
  tags,
  sortBy,
  sortOrder,
  facets,
  contentTypeCounts,
  onContentTypeChange,
  onCategoryChange,
  onTagsChange,
  onSortChange,
  onClearFilters,
  premium = false,
}) => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Handle tag selection
  const handleTagToggle = (tag: string) => {
    if (tags.includes(tag)) {
      onTagsChange(tags.filter((t) => t !== tag));
    } else {
      onTagsChange([...tags, tag]);
    }
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    const [by, order] = value.split('-');
    onSortChange({ by, order });
  };

  // Count active filters
  const activeFilterCount = 
    (contentType !== 'all' ? 1 : 0) + 
    (category ? 1 : 0) + 
    tags.length;

  // Premium class names
  const premiumClasses = premium ? {
    container: "card-premium",
    accordion: "border-hsl-accent/10 hover:border-hsl-accent/20 transition-colors duration-300",
    accordionTrigger: "text-hsl-primary font-medium group hover:text-hsl-accent",
    badge: "badge-secondary animate-pulse-border",
    activeItem: "bg-hsl-primary/10 text-hsl-primary",
    hoverItem: "hover:bg-hsl-primary/5",
    checkIcon: "text-hsl-accent",
    clearButton: "btn-ghost text-slate-500 hover:text-hsl-accent",
    selectTrigger: "border-hsl-accent/20 focus:border-hsl-accent/50",
  } : {
    container: "border rounded-lg",
    accordion: "border",
    accordionTrigger: "font-medium",
    badge: "bg-secondary text-secondary-foreground",
    activeItem: "bg-secondary/50",
    hoverItem: "hover:bg-secondary/20",
    checkIcon: "text-primary",
    clearButton: "text-gray-500",
    selectTrigger: "",
  };

  return (
    <div className="w-full">
      {/* Mobile filters toggle */}
      <div className="lg:hidden mb-4">
        <Button 
          variant="outline" 
          className={`w-full flex justify-between items-center ${premium ? 'btn-premium' : ''}`}
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
        >
          <span className="flex items-center">
            <FilterIcon className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge 
                variant="secondary" 
                className={`ml-2 ${premium ? 'animate-pulse-border' : ''}`}
              >
                {activeFilterCount}
              </Badge>
            )}
          </span>
          {mobileFiltersOpen ? (
            <XIcon className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Filters content */}
      <div className={`space-y-4 ${mobileFiltersOpen ? 'block' : 'hidden'} lg:block ${premium ? 'animate-fade-up' : ''}`}>
        <div className={`p-4 ${premiumClasses.container}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-semibold text-lg ${premium ? 'text-hsl-primary' : ''}`}>
              Filters
            </h3>
            {activeFilterCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClearFilters}
                className={`text-xs flex items-center ${premiumClasses.clearButton}`}
              >
                <Trash2Icon className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>

          <Accordion 
            type="multiple" 
            defaultValue={['contentType', 'category', 'sort']} 
            className="space-y-3"
          >
            {/* Content Type Filter */}
            <AccordionItem 
              value="contentType" 
              className={`rounded-lg px-3 ${premiumClasses.accordion}`}
            >
              <AccordionTrigger className={`text-sm py-3 ${premiumClasses.accordionTrigger}`}>
                Content Type
                {premium && <div className="w-full h-0.5 absolute bottom-0 left-0 bg-gradient-to-r from-transparent via-hsl-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>}
              </AccordionTrigger>
              <AccordionContent className={premium ? 'pt-2' : ''}>
                <RadioGroup 
                  value={contentType} 
                  onValueChange={onContentTypeChange}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="content-all" className={premium ? 'text-hsl-accent border-hsl-accent' : ''} />
                      <Label htmlFor="content-all">All Types</Label>
                    </div>
                    <span className="text-xs text-slate-500">
                      {contentTypeCounts ? (
                        contentTypeCounts.article + 
                        contentTypeCounts.guide + 
                        contentTypeCounts.video + 
                        contentTypeCounts.glossary
                      ) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="article" id="content-article" className={premium ? 'text-hsl-accent border-hsl-accent' : ''} />
                      <Label htmlFor="content-article">Articles</Label>
                    </div>
                    <span className="text-xs text-slate-500">
                      {contentTypeCounts?.article || ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="guide" id="content-guide" className={premium ? 'text-hsl-accent border-hsl-accent' : ''} />
                      <Label htmlFor="content-guide">Guides</Label>
                    </div>
                    <span className="text-xs text-slate-500">
                      {contentTypeCounts?.guide || ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="video" id="content-video" className={premium ? 'text-hsl-accent border-hsl-accent' : ''} />
                      <Label htmlFor="content-video">Videos</Label>
                    </div>
                    <span className="text-xs text-slate-500">
                      {contentTypeCounts?.video || ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="glossary" id="content-glossary" className={premium ? 'text-hsl-accent border-hsl-accent' : ''} />
                      <Label htmlFor="content-glossary">Glossary</Label>
                    </div>
                    <span className="text-xs text-slate-500">
                      {contentTypeCounts?.glossary || ''}
                    </span>
                  </div>
                </RadioGroup>
              </AccordionContent>
            </AccordionItem>

            {/* Category Filter */}
            <AccordionItem 
              value="category" 
              className={`rounded-lg px-3 ${premiumClasses.accordion}`}
            >
              <AccordionTrigger className={`text-sm py-3 ${premiumClasses.accordionTrigger}`}>
                Category
                {premium && <div className="w-full h-0.5 absolute bottom-0 left-0 bg-gradient-to-r from-transparent via-hsl-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>}
              </AccordionTrigger>
              <AccordionContent className={premium ? 'pt-2' : ''}>
                <div className="space-y-2">
                  <div 
                    className={`flex items-center justify-between cursor-pointer px-2 py-1 rounded transition-colors duration-200 ${
                      category === '' ? premiumClasses.activeItem : premiumClasses.hoverItem
                    }`}
                    onClick={() => onCategoryChange('')}
                  >
                    <span className="text-sm">All Categories</span>
                    {category === '' && (
                      <CheckIcon className={`h-4 w-4 ${premiumClasses.checkIcon}`} />
                    )}
                  </div>

                  {facets?.categories && facets.categories.length > 0 ? (
                    facets.categories.map((cat) => (
                      <div 
                        key={cat.name}
                        className={`flex items-center justify-between cursor-pointer px-2 py-1 rounded transition-colors duration-200 ${
                          category === cat.name ? premiumClasses.activeItem : premiumClasses.hoverItem
                        }`}
                        onClick={() => onCategoryChange(cat.name)}
                      >
                        <span className="text-sm">{cat.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-500">{cat.count}</span>
                          {category === cat.name && (
                            <CheckIcon className={`h-4 w-4 ${premiumClasses.checkIcon}`} />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500 py-1">No categories available</div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Tags Filter */}
            <AccordionItem 
              value="tags" 
              className={`rounded-lg px-3 ${premiumClasses.accordion}`}
            >
              <AccordionTrigger className={`text-sm py-3 ${premiumClasses.accordionTrigger}`}>
                Tags
                {tags.length > 0 && (
                  <Badge variant="secondary" className={`ml-2 text-xs ${premium ? 'badge-secondary' : ''}`}>
                    {tags.length}
                  </Badge>
                )}
                {premium && <div className="w-full h-0.5 absolute bottom-0 left-0 bg-gradient-to-r from-transparent via-hsl-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>}
              </AccordionTrigger>
              <AccordionContent className={premium ? 'pt-2' : ''}>
                <div className="space-y-2">
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className={`flex items-center gap-1 ${premium ? 'badge-secondary' : ''}`}
                        >
                          {tag}
                          <XIcon 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleTagToggle(tag)}
                          />
                        </Badge>
                      ))}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`text-xs h-6 ${premiumClasses.clearButton}`}
                        onClick={() => onTagsChange([])}
                      >
                        Clear all
                      </Button>
                    </div>
                  )}

                  <div className="max-h-48 overflow-y-auto pr-1 space-y-1">
                    {facets?.tags && facets.tags.length > 0 ? (
                      facets.tags.map((tag) => (
                        <div 
                          key={tag.name}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={`tag-${tag.name}`}
                              checked={tags.includes(tag.name)}
                              onCheckedChange={() => handleTagToggle(tag.name)}
                              className={premium ? 'border-hsl-accent text-hsl-accent' : ''}
                            />
                            <Label 
                              htmlFor={`tag-${tag.name}`}
                              className="text-sm cursor-pointer"
                            >
                              {tag.name}
                            </Label>
                          </div>
                          <span className="text-xs text-slate-500">{tag.count}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500 py-1">No tags available</div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Sort Options */}
            <AccordionItem 
              value="sort" 
              className={`rounded-lg px-3 ${premiumClasses.accordion}`}
            >
              <AccordionTrigger className={`text-sm py-3 ${premiumClasses.accordionTrigger}`}>
                Sort By
                {premium && <div className="w-full h-0.5 absolute bottom-0 left-0 bg-gradient-to-r from-transparent via-hsl-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>}
              </AccordionTrigger>
              <AccordionContent className={premium ? 'pt-2' : ''}>
                <Select 
                  value={`${sortBy}-${sortOrder}`}
                  onValueChange={handleSortChange}
                >
                  <SelectTrigger className={`w-full ${premiumClasses.selectTrigger}`}>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Sort options</SelectLabel>
                      <SelectItem value="relevance-desc">Most Relevant</SelectItem>
                      <SelectItem value="date-desc">Newest First</SelectItem>
                      <SelectItem value="date-asc">Oldest First</SelectItem>
                      <SelectItem value="views-desc">Most Viewed</SelectItem>
                      <SelectItem value="views-asc">Least Viewed</SelectItem>
                      <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                      <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
};
