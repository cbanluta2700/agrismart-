import { ReactNode } from 'react'
import { Metadata } from 'next'
import { useTaskTracking } from '@/hooks/use-task-tracking'

export const metadata: Metadata = {
  title: 'Checkout - AgriSmart Platform',
  description: 'Complete your purchase on AgriSmart Platform'
}

interface CheckoutLayoutProps {
  children: ReactNode
}

export default function CheckoutLayout({ children }: CheckoutLayoutProps) {
  // Initialize task tracking
  useTaskTracking({
    componentName: 'CheckoutLayout',
    type: 'layout',
    dependencies: ['marketplace.store']
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Checkout Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a href="/" className="text-2xl font-bold text-primary">
                AgriSmart
              </a>
              <span className="text-gray-500">|</span>
              <span className="text-gray-700">Checkout</span>
            </div>

            {/* Checkout Steps Indicator */}
            <div className="hidden sm:flex items-center space-x-8">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                  1
                </div>
                <span className="ml-2 text-sm font-medium">Shipping</span>
              </div>
              <div className="h-px w-12 bg-gray-300" />
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Payment</span>
              </div>
              <div className="h-px w-12 bg-gray-300" />
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Confirmation</span>
              </div>
            </div>

            {/* Security Badge */}
            <div className="hidden lg:flex items-center text-sm text-gray-500">
              <svg
                className="w-5 h-5 text-green-500 mr-2"
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
              Secure Checkout
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Flow */}
          <div className="lg:col-span-2">
            {children}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6 sticky top-8">
              <h2 className="text-lg font-medium mb-4">Order Summary</h2>
              {/* Order summary will be rendered here */}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>© 2025 AgriSmart</span>
              <a href="/privacy" className="hover:text-gray-700">Privacy Policy</a>
              <a href="/terms" className="hover:text-gray-700">Terms of Service</a>
            </div>
            <div className="flex items-center space-x-2">
              <span>Secure Payment by</span>
              {/* Payment provider logos will go here */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}