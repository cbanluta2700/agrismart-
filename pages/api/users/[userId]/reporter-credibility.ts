import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getReporterCredibility } from '@/lib/moderation/feedback/reporter-credibility';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if user is authenticated
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Get the reporter's credibility
    const credibility = await getReporterCredibility(userId);

    // If no credibility record exists, return a default object
    if (!credibility) {
      return res.status(200).json({
        credibility: {
          userId,
          credibilityScore: 50.0,
          totalReports: 0,
          accurateReports: 0,
          falseReports: 0,
          isNew: true,
        }
      });
    }

    // Return the credibility data
    return res.status(200).json({ credibility });
  } catch (error) {
    console.error('Error getting reporter credibility:', error);
    return res.status(500).json({ error: 'Failed to get reporter credibility' });
  }
}
