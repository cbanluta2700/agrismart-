import { ReactNode } from 'react'

export const metadata = {
  title: 'Authentication - AgriSmart Platform',
  description: 'Secure login and registration for the AgriSmart Platform',
}

export default function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">AgriSmart Platform</h1>
          <p className="text-muted-foreground">Agricultural Management System</p>
        </div>
        {children}
      </div>
    </div>
  )
}