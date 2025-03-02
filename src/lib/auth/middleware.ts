import { NextApiRequest, NextApiResponse } from 'next';
import { AuthError } from './types';
import { verifyToken } from './utils';

export type AuthenticatedRequest = NextApiRequest & {
  user: {
    id: string;
    roles: string[];
  };
};

export const withAuth = (handler: (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void>) => async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = await verifyToken(token);
    
    (req as AuthenticatedRequest).user = {
      id: decoded.sub as string,
      roles: decoded.roles as string[],
    };

    return handler(req as AuthenticatedRequest, res);
  } catch (error) {
    const authError: AuthError = {
      message: error instanceof Error ? error.message : 'Authentication failed',
      code: 'AUTH_FAILED',
    };

    res.status(401).json(authError);
  }
};

export const withRole = (role: string) => (handler: (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void>) => async (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => {
  try {
    if (!req.user?.roles.includes(role)) {
      throw new Error(`Required role: ${role}`);
    }

    return handler(req, res);
  } catch (error) {
    const authError: AuthError = {
      message: error instanceof Error ? error.message : 'Unauthorized',
      code: 'UNAUTHORIZED',
    };

    res.status(403).json(authError);
  }
};