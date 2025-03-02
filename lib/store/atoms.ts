import { atom, atomFamily, selectorFamily } from 'recoil'
import { User, Product, CartItem } from '@/types'

// Authentication state
export const userState = atom<User | null>({
  key: 'userState',
  default: null,
})

export const authLoadingState = atom<boolean>({
  key: 'authLoadingState',
  default: false,
})

// Marketplace state
export const productsState = atom<Product[]>({
  key: 'productsState',
  default: [],
})

export const productState = atomFamily<Product | null, string>({
  key: 'productState',
  default: null,
})

// Shopping cart state
export const cartItemsState = atom<CartItem[]>({
  key: 'cartItemsState',
  default: [],
})

export const cartTotalSelector = selectorFamily({
  key: 'cartTotalSelector',
  get: (currency: string) => ({ get }) => {
    const items = get(cartItemsState)
    return {
      total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      currency,
    }
  },
})

// Notifications state
export const notificationsState = atom<any[]>({
  key: 'notificationsState',
  default: [],
})

// Search and filter state
export const searchQueryState = atom<string>({
  key: 'searchQueryState',
  default: '',
})

export const filterOptionsState = atom<Record<string, any>>({
  key: 'filterOptionsState',
  default: {},
})