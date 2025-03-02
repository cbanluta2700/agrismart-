export interface Product {
  id: string
  name: string
  description: string
  price: number
  images: string[]
  category: ProductCategory
  stock: number
  vendor: {
    id: string
    name: string
    rating: number
  }
  rating: number
  reviews: ReviewSummary
  specifications: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

export type ProductCategory = 
  | 'seeds'
  | 'fertilizers'
  | 'tools'
  | 'machinery'
  | 'livestock'
  | 'feed'
  | 'other'

export interface ReviewSummary {
  averageRating: number
  totalReviews: number
  breakdown: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}

export interface ProductFilter {
  categories?: ProductCategory[]
  minPrice?: number
  maxPrice?: number
  minRating?: number
  inStock?: boolean
  vendorId?: string
  sortBy?: 'price' | 'rating' | 'newest'
  sortOrder?: 'asc' | 'desc'
}

export interface CartItem {
  id: string
  productId: string
  quantity: number
  price: number
  name: string
  image: string
  vendor: {
    id: string
    name: string
  }
}

export interface Cart {
  items: CartItem[]
  totalItems: number
  subtotal: number
  shipping: number
  tax: number
  total: number
}

export interface Order {
  id: string
  userId: string
  items: CartItem[]
  status: OrderStatus
  paymentStatus: PaymentStatus
  shippingAddress: Address
  billingAddress: Address
  subtotal: number
  shipping: number
  tax: number
  total: number
  createdAt: Date
  updatedAt: Date
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'

export interface Address {
  fullName: string
  street: string
  city: string
  state: string
  country: string
  postalCode: string
  phone: string
}