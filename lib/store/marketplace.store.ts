import { atom, selector, selectorFamily } from 'recoil'
import { Product, ProductFilter, Cart, CartItem } from '@/types/marketplace.types'

// Product State
export const productsState = atom<Product[]>({
  key: 'productsState',
  default: []
})

export const productFilterState = atom<ProductFilter>({
  key: 'productFilterState',
  default: {
    sortBy: 'newest',
    sortOrder: 'desc'
  }
})

export const filteredProductsSelector = selector({
  key: 'filteredProductsSelector',
  get: ({ get }) => {
    const products = get(productsState)
    const filter = get(productFilterState)
    
    let filtered = [...products]

    // Apply category filter
    if (filter.categories?.length) {
      filtered = filtered.filter(p => filter.categories?.includes(p.category))
    }

    // Apply price filter
    if (filter.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= filter.minPrice!)
    }
    if (filter.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= filter.maxPrice!)
    }

    // Apply rating filter
    if (filter.minRating !== undefined) {
      filtered = filtered.filter(p => p.rating >= filter.minRating!)
    }

    // Apply stock filter
    if (filter.inStock) {
      filtered = filtered.filter(p => p.stock > 0)
    }

    // Apply vendor filter
    if (filter.vendorId) {
      filtered = filtered.filter(p => p.vendor.id === filter.vendorId)
    }

    // Apply sorting
    if (filter.sortBy) {
      filtered.sort((a, b) => {
        switch (filter.sortBy) {
          case 'price':
            return filter.sortOrder === 'asc' ? a.price - b.price : b.price - a.price
          case 'rating':
            return filter.sortOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating
          case 'newest':
            return filter.sortOrder === 'asc' 
              ? a.createdAt.getTime() - b.createdAt.getTime()
              : b.createdAt.getTime() - a.createdAt.getTime()
          default:
            return 0
        }
      })
    }

    return filtered
  }
})

export const productByIdSelector = selectorFamily<Product | undefined, string>({
  key: 'productByIdSelector',
  get: (productId: string) => ({ get }) => {
    const products = get(productsState)
    return products.find(p => p.id === productId)
  }
})

// Cart State
export const cartState = atom<Cart>({
  key: 'cartState',
  default: {
    items: [],
    totalItems: 0,
    subtotal: 0,
    shipping: 0,
    tax: 0,
    total: 0
  }
})

export const cartItemsSelector = selector({
  key: 'cartItemsSelector',
  get: ({ get }) => {
    const cart = get(cartState)
    return cart.items
  }
})

export const cartTotalsSelector = selector({
  key: 'cartTotalsSelector',
  get: ({ get }) => {
    const cart = get(cartState)
    const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const shipping = subtotal > 0 ? 10 : 0 // Example shipping calculation
    const tax = subtotal * 0.1 // Example tax calculation
    
    return {
      subtotal,
      shipping,
      tax,
      total: subtotal + shipping + tax
    }
  }
})

// Cart Operations
export const addToCart = (cart: Cart, product: Product, quantity: number = 1): Cart => {
  const existingItem = cart.items.find(item => item.productId === product.id)
  
  let updatedItems: CartItem[]
  if (existingItem) {
    updatedItems = cart.items.map(item => 
      item.productId === product.id
        ? { ...item, quantity: item.quantity + quantity }
        : item
    )
  } else {
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      quantity,
      price: product.price,
      name: product.name,
      image: product.images[0],
      vendor: product.vendor
    }
    updatedItems = [...cart.items, newItem]
  }

  const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const shipping = subtotal > 0 ? 10 : 0
  const tax = subtotal * 0.1

  return {
    items: updatedItems,
    totalItems,
    subtotal,
    shipping,
    tax,
    total: subtotal + shipping + tax
  }
}