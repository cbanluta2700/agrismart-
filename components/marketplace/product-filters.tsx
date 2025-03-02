'use client'

import { useRecoilState } from 'recoil'
import { productFilterState } from '@/lib/store/marketplace.store'
import { ProductFilter, ProductCategory } from '@/types/marketplace.types'
import { useTaskTracking } from '@/hooks/use-task-tracking'

interface ProductFiltersProps {
  currentFilter: ProductFilter
  onFilterChange: (filter: Partial<ProductFilter>) => void
}

const CATEGORIES: ProductCategory[] = [
  'seeds',
  'fertilizers',
  'tools',
  'machinery',
  'livestock',
  'feed',
  'other'
]

export default function ProductFilters({ currentFilter, onFilterChange }: ProductFiltersProps) {
  // Initialize task tracking
  useTaskTracking({
    componentName: 'ProductFilters',
    type: 'component',
    dependencies: ['marketplace.store']
  })

  const [filter, setFilter] = useRecoilState(productFilterState)

  const handleCategoryChange = (category: ProductCategory) => {
    const currentCategories = filter.categories || []
    const updatedCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category]

    const newFilter = { ...filter, categories: updatedCategories }
    setFilter(newFilter)
    onFilterChange(newFilter)
  }

  const handlePriceChange = (min?: number, max?: number) => {
    const newFilter = { ...filter, minPrice: min, maxPrice: max }
    setFilter(newFilter)
    onFilterChange(newFilter)
  }

  const handleRatingChange = (rating: number) => {
    const newFilter = { ...filter, minRating: rating }
    setFilter(newFilter)
    onFilterChange(newFilter)
  }

  const handleSortChange = (sortBy: 'price' | 'rating' | 'newest') => {
    const newFilter = { ...filter, sortBy }
    setFilter(newFilter)
    onFilterChange(newFilter)
  }

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Categories</h3>
        <div className="mt-4 space-y-2">
          {CATEGORIES.map(category => (
            <label
              key={category}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filter.categories?.includes(category)}
                onChange={() => handleCategoryChange(category)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700 capitalize">
                {category}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Price Range</h3>
        <div className="mt-4 space-y-4">
          <div className="flex space-x-4">
            <input
              type="number"
              placeholder="Min"
              value={filter.minPrice || ''}
              onChange={e => handlePriceChange(
                e.target.value ? Number(e.target.value) : undefined,
                filter.maxPrice
              )}
              className="w-24 px-2 py-1 border rounded-md"
            />
            <input
              type="number"
              placeholder="Max"
              value={filter.maxPrice || ''}
              onChange={e => handlePriceChange(
                filter.minPrice,
                e.target.value ? Number(e.target.value) : undefined
              )}
              className="w-24 px-2 py-1 border rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Rating Filter */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Minimum Rating</h3>
        <div className="mt-4">
          <select
            value={filter.minRating || ''}
            onChange={e => handleRatingChange(Number(e.target.value))}
            className="w-full px-2 py-1 border rounded-md"
          >
            <option value="">Any Rating</option>
            <option value="4">4+ Stars</option>
            <option value="3">3+ Stars</option>
            <option value="2">2+ Stars</option>
            <option value="1">1+ Stars</option>
          </select>
        </div>
      </div>

      {/* Sort Options */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Sort By</h3>
        <div className="mt-4">
          <select
            value={filter.sortBy || 'newest'}
            onChange={e => handleSortChange(e.target.value as any)}
            className="w-full px-2 py-1 border rounded-md"
          >
            <option value="newest">Newest</option>
            <option value="price">Price</option>
            <option value="rating">Rating</option>
          </select>
        </div>
      </div>

      {/* Clear Filters */}
      <button
        onClick={() => {
          setFilter({})
          onFilterChange({})
        }}
        className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
      >
        Clear Filters
      </button>
    </div>
  )
}