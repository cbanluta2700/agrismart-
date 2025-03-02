'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTaskTracking } from '@/hooks/use-task-tracking'

const paymentSchema = z.object({
  paymentMethod: z.enum(['card', 'paypal', 'bank']),
  cardNumber: z.string().regex(/^\d{16}$/, 'Invalid card number').optional(),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, 'Invalid expiry date').optional(),
  cvv: z.string().regex(/^\d{3,4}$/, 'Invalid CVV').optional(),
  nameOnCard: z.string().min(2, 'Name is required').optional(),
  savePaymentMethod: z.boolean().optional()
})

type PaymentFormData = z.infer<typeof paymentSchema>

interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => void
  isProcessing?: boolean
  error?: string
}

const PAYMENT_METHODS = [
  {
    id: 'card',
    title: 'Credit/Debit Card',
    description: 'Pay with Visa, Mastercard, or other cards',
    icon: '💳'
  },
  {
    id: 'paypal',
    title: 'PayPal',
    description: 'Pay with your PayPal account',
    icon: 'P'
  },
  {
    id: 'bank',
    title: 'Bank Transfer',
    description: 'Direct bank transfer (may take 1-2 business days)',
    icon: '🏦'
  }
]

export default function PaymentForm({ onSubmit, isProcessing, error }: PaymentFormProps) {
  // Initialize task tracking
  useTaskTracking({
    componentName: 'PaymentForm',
    type: 'component',
    dependencies: []
  })

  const [selectedMethod, setSelectedMethod] = useState<string>('card')

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: 'card'
    }
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Payment Methods */}
      <div>
        <h3 className="text-lg font-medium mb-4">Payment Method</h3>
        <div className="space-y-4">
          {PAYMENT_METHODS.map(method => (
            <label
              key={method.id}
              className={`
                block p-4 border rounded-lg cursor-pointer
                ${selectedMethod === method.id 
                  ? 'border-primary bg-primary-50' 
                  : 'border-gray-300'
                }
              `}
            >
              <input
                type="radio"
                value={method.id}
                {...register('paymentMethod')}
                className="sr-only"
                onChange={() => setSelectedMethod(method.id)}
              />
              <div className="flex items-center space-x-4">
                <div className="text-2xl">{method.icon}</div>
                <div>
                  <p className="font-medium text-gray-900">{method.title}</p>
                  <p className="text-sm text-gray-500">{method.description}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Card Details (shown only when card is selected) */}
      {selectedMethod === 'card' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Card Number
            </label>
            <input
              type="text"
              maxLength={16}
              placeholder="1234 5678 9012 3456"
              {...register('cardNumber')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
            {errors.cardNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.cardNumber.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Expiry Date
              </label>
              <input
                type="text"
                placeholder="MM/YY"
                maxLength={5}
                {...register('expiryDate')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
              {errors.expiryDate && (
                <p className="mt-1 text-sm text-red-600">{errors.expiryDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                CVV
              </label>
              <input
                type="password"
                maxLength={4}
                placeholder="123"
                {...register('cvv')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
              {errors.cvv && (
                <p className="mt-1 text-sm text-red-600">{errors.cvv.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name on Card
            </label>
            <input
              type="text"
              {...register('nameOnCard')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
            {errors.nameOnCard && (
              <p className="mt-1 text-sm text-red-600">{errors.nameOnCard.message}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="savePaymentMethod"
              {...register('savePaymentMethod')}
              className="h-4 w-4 text-primary border-gray-300 rounded"
            />
            <label
              htmlFor="savePaymentMethod"
              className="ml-2 block text-sm text-gray-700"
            >
              Save this card for future purchases
            </label>
          </div>
        </div>
      )}

      {/* Security Badge */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-3">
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">Secure Payment</p>
            <p>Your payment information is encrypted and secure.</p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isProcessing}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <span className="flex items-center">
            Processing...
            <svg
              className="animate-spin ml-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        ) : (
          'Complete Purchase'
        )}
      </button>
    </form>
  )
}