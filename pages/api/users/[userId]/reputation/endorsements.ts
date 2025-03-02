import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { withAnalytics } from '@/lib/vercel/analytics-api';
import { createEndorsement } from '@/lib/reputation/reputation-service';

/**
 * API handler for managing user endorsements
 * GET: Get all endorsements for a user
 * POST: Create a new endorsement
 * DELETE: Remove an endorsement
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // GET: Retrieve endorsements
  if (req.method === 'GET') {
    try {
      // Get endorsements received by user
      const endorsements = await prisma.userEndorsement.findMany({
        where: { receiverId: userId },
        include: {
          giver: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // Group by skill
      const endorsementsBySkill = endorsements.reduce((acc, endorsement) => {
        const skill = endorsement.skill;
        if (!acc[skill]) {
          acc[skill] = [];
        }
        acc[skill].push({
          id: endorsement.id,
          giver: endorsement.giver,
          createdAt: endorsement.createdAt
        });
        return acc;
      }, {} as Record<string, Array<{id: string, giver: any, createdAt: Date}>>);
      
      // Format response
      const result = Object.entries(endorsementsBySkill).map(([skill, endorsers]) => ({
        skill,
        endorsers,
        count: endorsers.length
      }));
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching endorsements:', error);
      res.status(500).json({ error: 'Failed to fetch endorsements' });
    }
  }
  
  // POST: Create a new endorsement
  else if (req.method === 'POST') {
    const giverId = session.user.id;
    const { skill } = req.body;
    
    if (!skill) {
      return res.status(400).json({ error: 'Skill is required' });
    }
    
    try {
      const endorsement = await createEndorsement(giverId, userId, skill);
      
      res.status(200).json({
        success: true,
        endorsement: {
          id: endorsement.id,
          skill: endorsement.skill,
          createdAt: endorsement.createdAt
        }
      });
    } catch (error: any) {
      console.error('Error creating endorsement:', error);
      res.status(error.message.includes('already exists') ? 400 : 500)
        .json({ error: error.message || 'Failed to create endorsement' });
    }
  }
  
  // DELETE: Remove an endorsement
  else if (req.method === 'DELETE') {
    const { endorsementId } = req.body;
    
    if (!endorsementId) {
      return res.status(400).json({ error: 'Endorsement ID is required' });
    }
    
    try {
      // Get the endorsement
      const endorsement = await prisma.userEndorsement.findUnique({
        where: { id: endorsementId }
      });
      
      if (!endorsement) {
        return res.status(404).json({ error: 'Endorsement not found' });
      }
      
      // Check if user is authorized to delete (either the giver or admin)
      if (endorsement.giverId !== session.user.id && session.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized to delete this endorsement' });
      }
      
      // Delete the endorsement
      await prisma.userEndorsement.delete({
        where: { id: endorsementId }
      });
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting endorsement:', error);
      res.status(500).json({ error: 'Failed to delete endorsement' });
    }
  }
  
  // Method not allowed
  else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

export default withAnalytics(handler);
