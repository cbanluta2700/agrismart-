export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'admin' | 'vendor'
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  currency: string
  stock: number
  images: string[]
  category: string
  vendor: {
    id: string
    name: string
  }
  rating: number
  reviews: number
  createdAt: Date
  updatedAt: Date
}

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  currency: string
  image: string
}

export interface NotificationType {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  title?: string
  read: boolean
  createdAt: Date
}

export interface FilterOptions {
  category?: string[]
  priceRange?: {
    min: number
    max: number
  }
  rating?: number
  sortBy?: 'price' | 'rating' | 'newest'
  sortOrder?: 'asc' | 'desc'
}