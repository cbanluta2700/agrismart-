'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTaskTracking } from '@/hooks/use-task-tracking'
import { Address } from '@/types/marketplace.types'
import { useAuth } from '@/lib/hooks/use-auth'

const shippingSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  country: z.string().min(2, 'Country is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  deliveryOption: z.enum(['standard', 'express']),
  saveAddress: z.boolean().optional()
})

type ShippingFormData = z.infer<typeof shippingSchema>

interface ShippingFormProps {
  onSubmit: (data: ShippingFormData) => void
  onSaveAddress?: (address: Address) => void
}

const DELIVERY_OPTIONS = [
  {
    id: 'standard',
    title: 'Standard Shipping',
    description: '3-5 business days',
    price: 'Free'
  },
  {
    id: 'express',
    title: 'Express Shipping',
    description: '1-2 business days',
    price: '$15.00'
  }
]

export default function ShippingForm({ onSubmit, onSaveAddress }: ShippingFormProps) {
  // Initialize task tracking
  useTaskTracking({
    componentName: 'ShippingForm',
    type: 'component',
    dependencies: ['auth']
  })

  const { user } = useAuth()
  const [selectedDelivery, setSelectedDelivery] = useState('standard')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      fullName: user?.name || '',
      deliveryOption: 'standard'
    }
  })

  const onFormSubmit = async (data: ShippingFormData) => {
    if (data.saveAddress && onSaveAddress) {
      const address: Address = {
        fullName: data.fullName,
        street: data.street,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
        phone: data.phone
      }
      await onSaveAddress(address)
    }
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
      {/* Shipping Address */}
      <div>
        <h3 className="text-lg font-medium mb-4">Shipping Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              {...register('fullName')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Street Address
            </label>
            <input
              type="text"
              {...register('street')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
            {errors.street && (
              <p className="mt-1 text-sm text-red-600">{errors.street.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              {...register('city')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              State
            </label>
            <input
              type="text"
              {...register('state')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
            {errors.state && (
              <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <input
              type="text"
              {...register('country')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
            {errors.country && (
              <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Postal Code
            </label>
            <input
              type="text"
              {...register('postalCode')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
            {errors.postalCode && (
              <p className="mt-1 text-sm text-red-600">{errors.postalCode.message}</p>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              type="tel"
              {...register('phone')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Delivery Options */}
      <div>
        <h3 className="text-lg font-medium mb-4">Delivery Method</h3>
        <div className="space-y-4">
          {DELIVERY_OPTIONS.map(option => (
            <label
              key={option.id}
              className={`
                block p-4 border rounded-lg cursor-pointer
                ${selectedDelivery === option.id 
                  ? 'border-primary bg-primary-50' 
                  : 'border-gray-300'
                }
              `}
            >
              <input
                type="radio"
                value={option.id}
                {...register('deliveryOption')}
                className="sr-only"
                onChange={() => setSelectedDelivery(option.id)}
              />
              <div className="flex justify-between">
                <div>
                  <p className="font-medium text-gray-900">{option.title}</p>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
                <p className="font-medium text-gray-900">{option.price}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Save Address */}
      {onSaveAddress && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="saveAddress"
            {...register('saveAddress')}
            className="h-4 w-4 text-primary border-gray-300 rounded"
          />
          <label
            htmlFor="saveAddress"
            className="ml-2 block text-sm text-gray-700"
          >
            Save this address for future orders
          </label>
        </div>
      )}

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          {isSubmitting ? 'Processing...' : 'Continue to Payment'}
        </button>
      </div>
    </form>
  )
}