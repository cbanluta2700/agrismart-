import { ReactNode } from 'react'
import { RecoilRoot } from 'recoil'
import { ThemeProvider } from 'next-themes'
import { useUIStore } from '@/lib/store/ui.store'

interface StoreProviderProps {
  children: ReactNode
}

const ThemeWrapper = ({ children }: { children: ReactNode }) => {
  const theme = useUIStore((state) => state.theme)
  
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={theme}
      enableSystem={true}
    >
      {children}
    </ThemeProvider>
  )
}

export function StoreProvider({ children }: StoreProviderProps) {
  return (
    <RecoilRoot>
      <ThemeWrapper>
        {children}
      </ThemeWrapper>
    </RecoilRoot>
  )
}

// Custom hook for initialization
export function useInitializeStore() {
  return {
    initialized: true
  }
}