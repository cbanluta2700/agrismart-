'use client'

import Image from 'next/image'
import { useRecoilState } from 'recoil'
import { Product } from '@/types/marketplace.types'
import { cartState, addToCart } from '@/lib/store/marketplace.store'
import { useTaskTracking } from '@/hooks/use-task-tracking'

interface ProductCardProps {
  product: Product
  userRole?: string
}

export default function ProductCard({ product, userRole }: ProductCardProps) {
  // Initialize task tracking
  useTaskTracking({
    componentName: 'ProductCard',
    type: 'component',
    dependencies: ['marketplace.store']
  })

  const [cart, setCart] = useRecoilState(cartState)

  const handleAddToCart = () => {
    const updatedCart = addToCart(cart, product)
    setCart(updatedCart)
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {/* Product Image */}
      <div className="relative h-48 w-full">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-cover"
        />
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-medium">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {product.name}
        </h3>
        
        <div className="mt-1 flex items-center">
          <span className="text-sm text-gray-500">{product.category}</span>
          <span className="mx-2 text-gray-300">•</span>
          <div className="flex items-center">
            <span className="text-sm text-yellow-500">★</span>
            <span className="ml-1 text-sm text-gray-500">
              {product.rating.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </span>
          {userRole === 'vendor' && (
            <span className="text-sm text-gray-500">
              Stock: {product.stock}
            </span>
          )}
        </div>

        {/* Vendor Info */}
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <span>Sold by {product.vendor.name}</span>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className={`w-full py-2 px-4 rounded-md text-sm font-medium text-white 
              ${product.stock > 0 
                ? 'bg-primary hover:bg-primary-dark' 
                : 'bg-gray-300 cursor-not-allowed'
              }`}
          >
            {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
          
          {userRole === 'vendor' && (
            <button className="w-full py-2 px-4 rounded-md text-sm font-medium text-primary border border-primary hover:bg-primary-50">
              Edit Product
            </button>
          )}
        </div>
      </div>
    </div>
  )
}