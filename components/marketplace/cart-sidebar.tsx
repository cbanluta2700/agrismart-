'use client'

import { useEffect, useRef } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { cartState, cartTotalsSelector } from '@/lib/store/marketplace.store'
import { useTaskTracking } from '@/hooks/use-task-tracking'
import Image from 'next/image'
import Link from 'next/link'

interface CartSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  // Initialize task tracking
  useTaskTracking({
    componentName: 'CartSidebar',
    type: 'component',
    dependencies: ['marketplace.store']
  })

  const [cart, setCart] = useRecoilState(cartState)
  const totals = useRecoilValue(cartTotalsSelector)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 0) return

    setCart(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      ).filter(item => item.quantity > 0)
    }))
  }

  return (
    <div className={`
      fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity duration-300
      ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
    `}>
      <div
        ref={sidebarRef}
        className={`
          fixed right-0 top-0 h-full w-96 max-w-full bg-white shadow-xl
          transform transition-transform duration-300
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Shopping Cart</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <span className="sr-only">Close</span>
              ✕
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto h-[calc(100vh-220px)]">
          {cart.items.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Your cart is empty
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {cart.items.map(item => (
                <li key={item.id} className="p-4">
                  <div className="flex space-x-4">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium">{item.name}</h3>
                      <p className="text-sm text-gray-500">
                        Sold by {item.vendor.name}
                      </p>
                      <div className="mt-2 flex items-center space-x-4">
                        <div className="flex items-center border rounded-md">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="px-2 py-1 hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="px-2 py-1 min-w-[40px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="px-2 py-1 hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-medium">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 space-y-4">
          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>${totals.shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>${totals.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium text-lg pt-2 border-t">
              <span>Total</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <Link
            href="/checkout"
            className={`
              w-full py-2 px-4 rounded-md text-center font-medium
              ${cart.items.length > 0
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
            onClick={e => {
              if (cart.items.length === 0) {
                e.preventDefault()
              } else {
                onClose()
              }
            }}
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  )
}