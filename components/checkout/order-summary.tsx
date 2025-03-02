'use client'

import { useRecoilValue } from 'recoil'
import { cartState, cartTotalsSelector } from '@/lib/store/marketplace.store'
import { useTaskTracking } from '@/hooks/use-task-tracking'
import Image from 'next/image'

interface OrderSummaryProps {
  showEditButton?: boolean
  onEdit?: () => void
}

export default function OrderSummary({ showEditButton, onEdit }: OrderSummaryProps) {
  // Initialize task tracking
  useTaskTracking({
    componentName: 'OrderSummary',
    type: 'component',
    dependencies: ['marketplace.store']
  })

  const cart = useRecoilValue(cartState)
  const totals = useRecoilValue(cartTotalsSelector)

  return (
    <div className="space-y-6">
      {/* Items List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Order Items</h3>
          {showEditButton && (
            <button
              onClick={onEdit}
              className="text-sm text-primary hover:text-primary-dark"
            >
              Edit Cart
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-200">
          {cart.items.map(item => (
            <div key={item.id} className="py-4 flex space-x-4">
              {/* Product Image */}
              <div className="relative w-16 h-16 flex-shrink-0">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover rounded"
                />
              </div>

              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {item.name}
                </h4>
                <p className="text-sm text-gray-500">
                  Qty: {item.quantity}
                </p>
                <p className="text-sm text-gray-500">
                  Seller: {item.vendor.name}
                </p>
              </div>

              {/* Price */}
              <div className="flex-shrink-0 text-sm font-medium text-gray-900">
                ${(item.price * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>${totals.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Shipping</span>
          <span>${totals.shipping.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Tax</span>
          <span>${totals.tax.toFixed(2)}</span>
        </div>
        <div className="pt-4 flex justify-between font-medium text-lg border-t border-gray-200">
          <span>Total</span>
          <span>${totals.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Secure Transaction Notice */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <svg
            className="w-5 h-5 text-green-500 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">Secure Transaction</p>
            <p>Your payment information is encrypted and secure.</p>
          </div>
        </div>
      </div>
    </div>
  )
}