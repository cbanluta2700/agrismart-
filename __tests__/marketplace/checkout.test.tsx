import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RecoilRoot } from 'recoil'
import { cartState } from '@/lib/store/marketplace.store'
import ShippingForm from '@/components/checkout/shipping-form'
import PaymentForm from '@/components/checkout/payment-form'
import OrderSummary from '@/components/checkout/order-summary'

// Mock cart data
const mockCart = {
  items: [
    {
      id: '1',
      productId: 'prod1',
      name: 'Test Product',
      price: 29.99,
      quantity: 2,
      image: '/test.jpg',
      vendor: {
        id: 'v1',
        name: 'Test Vendor'
      }
    }
  ],
  totalItems: 2,
  subtotal: 59.98,
  shipping: 10,
  tax: 6,
  total: 75.98
}

// Mock hooks
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com'
    }
  })
}))

vi.mock('@/hooks/use-task-tracking', () => ({
  useTaskTracking: () => ({})
}))

describe('Checkout Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ShippingForm', () => {
    it('validates required fields', async () => {
      const onSubmit = vi.fn()
      
      render(
        <RecoilRoot>
          <ShippingForm onSubmit={onSubmit} />
        </RecoilRoot>
      )

      // Try to submit empty form
      fireEvent.click(screen.getByText('Continue to Payment'))

      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument()
        expect(screen.getByText('Street address is required')).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('submits valid shipping data', async () => {
      const onSubmit = vi.fn()
      
      render(
        <RecoilRoot>
          <ShippingForm onSubmit={onSubmit} />
        </RecoilRoot>
      )

      // Fill form
      fireEvent.change(screen.getByLabelText('Full Name'), {
        target: { value: 'John Doe' }
      })
      fireEvent.change(screen.getByLabelText('Street Address'), {
        target: { value: '123 Test St' }
      })
      fireEvent.change(screen.getByLabelText('City'), {
        target: { value: 'Test City' }
      })
      fireEvent.change(screen.getByLabelText('State'), {
        target: { value: 'Test State' }
      })
      fireEvent.change(screen.getByLabelText('Postal Code'), {
        target: { value: '12345' }
      })
      fireEvent.change(screen.getByLabelText('Phone Number'), {
        target: { value: '1234567890' }
      })

      // Submit form
      fireEvent.click(screen.getByText('Continue to Payment'))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
          fullName: 'John Doe',
          street: '123 Test St',
          city: 'Test City'
        }))
      })
    })
  })

  describe('PaymentForm', () => {
    it('handles payment method selection', () => {
      render(
        <RecoilRoot>
          <PaymentForm onSubmit={() => {}} />
        </RecoilRoot>
      )

      // Check card fields visibility
      expect(screen.getByText('Card Number')).toBeInTheDocument()

      // Switch to PayPal
      fireEvent.click(screen.getByText('PayPal'))
      expect(screen.queryByText('Card Number')).not.toBeInTheDocument()
    })

    it('validates card information', async () => {
      const onSubmit = vi.fn()
      
      render(
        <RecoilRoot>
          <PaymentForm onSubmit={onSubmit} />
        </RecoilRoot>
      )

      // Submit with invalid card
      fireEvent.click(screen.getByText('Complete Purchase'))

      await waitFor(() => {
        expect(screen.getByText('Invalid card number')).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('OrderSummary', () => {
    it('displays cart items and totals', () => {
      const mockInitialState = {
        [cartState.key]: mockCart
      }

      render(
        <RecoilRoot initializeState={snapshot => {
          for (const [key, value] of Object.entries(mockInitialState)) {
            snapshot.set(cartState, value)
          }
        }}>
          <OrderSummary />
        </RecoilRoot>
      )

      expect(screen.getByText('Test Product')).toBeInTheDocument()
      expect(screen.getByText('Qty: 2')).toBeInTheDocument()
      expect(screen.getByText('$75.98')).toBeInTheDocument()
    })

    it('allows cart editing', () => {
      const onEdit = vi.fn()
      
      render(
        <RecoilRoot initializeState={snapshot => {
          snapshot.set(cartState, mockCart)
        }}>
          <OrderSummary showEditButton onEdit={onEdit} />
        </RecoilRoot>
      )

      fireEvent.click(screen.getByText('Edit Cart'))
      expect(onEdit).toHaveBeenCalled()
    })
  })
})