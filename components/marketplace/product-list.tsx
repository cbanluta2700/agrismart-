'use client'

import { useRecoilValue } from 'recoil'
import { filteredProductsSelector, productFilterState } from '@/lib/store/marketplace.store'
import { ProductFilter } from '@/types/marketplace.types'
import { useCallback } from 'react'
import ProductCard from './product-card'
import ProductFilters from './product-filters'
import { useAuth } from '@/lib/hooks/use-auth'
import { useTaskTracking } from '@/hooks/use-task-tracking'

export default function ProductList() {
  // Initialize task tracking
  useTaskTracking({
    componentName: 'ProductList',
    type: 'component',
    dependencies: ['marketplace.store', 'auth']
  })

  const { user } = useAuth()
  const products = useRecoilValue(filteredProductsSelector)
  const filter = useRecoilValue(productFilterState)

  const handleFilterChange = useCallback((newFilter: Partial<ProductFilter>) => {
    // Filter update logic will be implemented
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <ProductFilters
            currentFilter={filter}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Product grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.length > 0 ? (
              products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  userRole={user?.role}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <h3 className="text-lg font-medium text-gray-900">
                  No products found
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Try adjusting your filters or search criteria
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}