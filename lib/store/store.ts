import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Define interface for UI state
interface UIState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleTheme: () => void
}

// Create UI store with Zustand
