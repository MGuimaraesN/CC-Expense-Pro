import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, tenantContext } from '../services/prisma';

export function getJwtSecret() {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return process.env.JWT_SECRET || 'dev-only-secret';
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const JWT_SECRET = getJwtSecret();
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Quick user check (useful to avoid processing with deleted users)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      tenantId: decoded.tenantId, // Picked up from login context
      role: decoded.role || 'USER',
    };
    
    // Wrap next() in tenantContext
    tenantContext.run({ tenantId: decoded.tenantId }, () => {
      next();
    });
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
       return res.status(401).json({ error: 'Unauthorized: Token expired' });
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
