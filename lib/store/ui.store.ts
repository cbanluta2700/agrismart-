import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UIState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleTheme: () => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        theme: 'light',
        sidebarOpen: false,
        setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
        toggleTheme: () => set((state) => ({ 
          theme: state.theme === 'light' ? 'dark' : 'light' 
        })),
      }),
      {
        name: 'ui-storage',
      }
    )
  )
)