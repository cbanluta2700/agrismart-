import React from 'react';
import { SessionProvider } from 'next-auth/react';
import VercelProviders from './VercelProviders';

interface AppProvidersProps {
  children: React.ReactNode;
  session?: any;
}

/**
 * Main application providers wrapper
 * Combines all global providers required by the app
 */
export default function AppProviders({ children, session }: AppProvidersProps) {
  return (
    <SessionProvider session={session}>
      <VercelProviders>
        {children}
      </VercelProviders>
    </SessionProvider>
  );
}
