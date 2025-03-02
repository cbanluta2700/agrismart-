import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { submitAIFeedback } from '@/lib/moderation/feedback/ai-feedback-loop';
import { z } from 'zod';
import { AISystemComponent, FeedbackResult } from '@prisma/client';

// Input validation schema
const feedbackSchema = z.object({
  systemComponent: z.nativeEnum(AISystemComponent),
  originalQuery: z.string().min(1),
  originalResponse: z.string().min(1),
  userFeedback: z.string().optional(),
  feedbackResult: z.nativeEnum(FeedbackResult),
  metadata: z.record(z.any()).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if user is authenticated
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if it's a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate the request body
    const validationResult = feedbackSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid request data', details: validationResult.error });
    }

    // Submit the feedback
    const feedbackData = validationResult.data;
    const userId = session.user.id;

    const feedback = await submitAIFeedback({
      userId,
      ...feedbackData,
    });

    // Return the created feedback
    return res.status(200).json({ success: true, feedback });
  } catch (error) {
    console.error('Error submitting AI feedback:', error);
    return res.status(500).json({ error: 'Failed to submit AI feedback' });
  }
}
