import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { updateReporterCredibility } from '@/lib/moderation/feedback/reporter-credibility';
import { z } from 'zod';

// Input validation schema
const reportOutcomeSchema = z.object({
  userId: z.string().uuid(),
  reportId: z.string().uuid(),
  wasAccurate: z.boolean(),
  moderatorNotes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if user is authenticated and is a moderator
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify user has moderator privileges
  if (!session.user.roles?.includes('ADMIN') && !session.user.roles?.includes('MODERATOR')) {
    return res.status(403).json({ error: 'Forbidden - Requires moderator privileges' });
  }

  // Check if it's a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate the request body
    const validationResult = reportOutcomeSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid request data', details: validationResult.error });
    }

    // Update the reporter's credibility
    const updateResult = await updateReporterCredibility(validationResult.data);

    // Return the updated credibility
    return res.status(200).json({ success: true, result: updateResult });
  } catch (error) {
    console.error('Error updating reporter credibility:', error);
    return res.status(500).json({ error: 'Failed to update reporter credibility' });
  }
}
