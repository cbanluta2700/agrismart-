import { NextApiRequest, NextApiResponse } from 'next';
import { initializeVercelOptimizations } from '@/lib/init-vercel-optimizations';

/**
 * Admin API endpoint to initialize all Vercel SDK optimizations
 * This should be protected in production with proper authentication
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure only authorized requests can initialize optimizations
  // In production, you should implement proper authentication
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const result = await initializeVercelOptimizations();
    
    if (result.success) {
      return res.status(200).json({ message: 'Vercel optimizations initialized successfully', result });
    } else {
      return res.status(500).json({ message: 'Failed to initialize Vercel optimizations', error: result.error });
    }
  } catch (error) {
    console.error('Error initializing Vercel optimizations:', error);
    return res.status(500).json({ message: 'Error initializing Vercel optimizations', error });
  }
}
