import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

interface VercelProvidersProps {
  children: React.ReactNode;
}

/**
 * Vercel global providers component
 * Wraps the application with Vercel Analytics and Speed Insights
 */
export default function VercelProviders({ children }: VercelProvidersProps) {
  return (
    <>
      {children}
      <Analytics />
      <SpeedInsights />
    </>
  );
}
