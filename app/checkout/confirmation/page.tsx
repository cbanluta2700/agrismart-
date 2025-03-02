'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRecoilValue, useResetRecoilState } from 'recoil'
import { cartState, cartTotalsSelector } from '@/lib/store/marketplace.store'
import { useTaskTracking } from '@/hooks/use-task-tracking'
import Link from 'next/link'

export default function OrderConfirmationPage() {
  // Initialize task tracking
  useTaskTracking({
    componentName: 'OrderConfirmationPage',
    type: 'page',
    dependencies: ['marketplace.store']
  })

  const router = useRouter()
  const cart = useRecoilValue(cartState)
  const totals = useRecoilValue(cartTotalsSelector)
  const resetCart = useResetRecoilState(cartState)

  // Clear cart on successful order
  useEffect(() => {
    resetCart()
  }, [resetCart])

  // Redirect if no order details
  useEffect(() => {
    if (!cart.items.length) {
      router.push('/marketplace')
    }
  }, [cart.items.length, router])

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Success Message */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Order Confirmed!
        </h1>
        <p className="text-lg text-gray-600">
          Thank you for your purchase. Your order has been received.
        </p>
      </div>

      {/* Order Details */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Order Summary
          </h2>

          {/* Items List */}
          <div className="divide-y divide-gray-200">
            {cart.items.map(item => (
              <div key={item.id} className="py-4 flex space-x-4">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {item.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Quantity: {item.quantity}
                  </p>
                  <p className="text-sm text-gray-500">
                    Seller: {item.vendor.name}
                  </p>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 space-y-2">
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
        </div>

        {/* Delivery Information */}
        <div className="bg-gray-50 p-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Delivery Information
          </h3>
          <p className="text-sm text-gray-600">
            You will receive a shipping confirmation email with tracking details
            when your order ships.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Estimated delivery: 3-5 business days
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 space-y-4">
        <Link
          href="/marketplace"
          className="block w-full text-center py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Continue Shopping
        </Link>
        <Link
          href="/account/orders"
          className="block w-full text-center py-3 px-4 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          View Order History
        </Link>
      </div>

      {/* Support Information */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>
          Need help?{' '}
          <Link 
            href="/support"
            className="text-primary hover:text-primary-dark"
          >
            Contact our support team
          </Link>
        </p>
      </div>
    </div>
  )
}