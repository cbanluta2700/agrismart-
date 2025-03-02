import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { withAnalytics } from '@/lib/vercel/analytics-api';
import { verifyCredential } from '@/lib/reputation/reputation-service';

/**
 * API handler for managing user credentials
 * GET: Get all credentials for a user
 * POST: Add a new credential (self only)
 * PATCH: Verify a credential (admin only)
 * DELETE: Remove a credential (self or admin only)
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
  
  const isOwnProfile = session.user.id === userId;
  const isAdmin = session.user.role === 'ADMIN';
  
  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // GET: Retrieve credentials
  if (req.method === 'GET') {
    try {
      const credentials = await prisma.userCredential.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      res.status(200).json(credentials);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      res.status(500).json({ error: 'Failed to fetch credentials' });
    }
  }
  
  // POST: Add a new credential (self only)
  else if (req.method === 'POST') {
    // Only allow users to add credentials to their own profile
    if (!isOwnProfile) {
      return res.status(403).json({ error: 'You can only add credentials to your own profile' });
    }
    
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Credential is required' });
    }
    
    try {
      // Check if this credential already exists
      const existingCredential = await prisma.userCredential.findFirst({
        where: {
          userId,
          credential
        }
      });
      
      if (existingCredential) {
        return res.status(400).json({ error: 'This credential already exists' });
      }
      
      // Create the credential (unverified by default)
      const userCredential = await prisma.userCredential.create({
        data: {
          userId,
          credential,
          verified: false
        }
      });
      
      res.status(200).json({
        success: true,
        credential: userCredential
      });
    } catch (error) {
      console.error('Error adding credential:', error);
      res.status(500).json({ error: 'Failed to add credential' });
    }
  }
  
  // PATCH: Verify a credential (admin only)
  else if (req.method === 'PATCH') {
    // Only allow admins to verify credentials
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can verify credentials' });
    }
    
    const { credentialId } = req.body;
    
    if (!credentialId) {
      return res.status(400).json({ error: 'Credential ID is required' });
    }
    
    try {
      // Check if credential exists
      const credential = await prisma.userCredential.findUnique({
        where: { id: credentialId }
      });
      
      if (!credential) {
        return res.status(404).json({ error: 'Credential not found' });
      }
      
      // Update credential to verified and award points
      const verifiedCredential = await verifyCredential(
        userId,
        credential.credential
      );
      
      res.status(200).json({
        success: true,
        credential: verifiedCredential
      });
    } catch (error) {
      console.error('Error verifying credential:', error);
      res.status(500).json({ error: 'Failed to verify credential' });
    }
  }
  
  // DELETE: Remove a credential
  else if (req.method === 'DELETE') {
    // Only allow self or admin to delete credentials
    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this credential' });
    }
    
    const { credentialId } = req.body;
    
    if (!credentialId) {
      return res.status(400).json({ error: 'Credential ID is required' });
    }
    
    try {
      // Check if credential exists and belongs to the user
      const credential = await prisma.userCredential.findFirst({
        where: {
          id: credentialId,
          userId
        }
      });
      
      if (!credential) {
        return res.status(404).json({ error: 'Credential not found' });
      }
      
      // Delete the credential
      await prisma.userCredential.delete({
        where: { id: credentialId }
      });
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting credential:', error);
      res.status(500).json({ error: 'Failed to delete credential' });
    }
  }
  
  // Method not allowed
  else {
    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

export default withAnalytics(handler);
