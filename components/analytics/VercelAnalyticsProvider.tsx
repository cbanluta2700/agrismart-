import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import React from 'react';

interface VercelAnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * Vercel Analytics Provider component
 * Wraps the application with Vercel Analytics and Speed Insights
 */
export default function VercelAnalyticsProvider({ children }: VercelAnalyticsProviderProps) {
  return (
    <>
      {children}
      <Analytics />
      <SpeedInsights />
    </>
  );
}
