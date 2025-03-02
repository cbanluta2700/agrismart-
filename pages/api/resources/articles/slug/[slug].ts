import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug } = req.query;
  const isTrackView = req.query.track === 'true';

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid article slug' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const article = await prisma.article.findUnique({
          where: { slug },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        });

        if (!article) {
          return res.status(404).json({ error: 'Article not found' });
        }

        // Increment view count if tracking is enabled
        if (isTrackView) {
          await prisma.article.update({
            where: { id: article.id },
            data: { viewCount: { increment: 1 } },
          });
        }

        return res.status(200).json({ article });
      } catch (error) {
        console.error('Error getting article by slug:', error);
        return res.status(500).json({ error: 'Failed to get article' });
      }
    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
