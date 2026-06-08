import { Response, NextFunction } from 'express';
import { AuthRequest } from './requireAuth';
import { prisma } from '../services/prisma';

export const requirePermission = (requiredPermission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // SuperAdmin bypass
    if (req.user.role === 'SUPERADMIN') return next();

    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: req.user.id,
          tenantId: req.user.tenantId
        }
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!membership) return res.status(403).json({ error: 'Forbidden' });

    const hasPerm = membership.role.permissions.some(p => p.permission.key === requiredPermission);
    if (!hasPerm) return res.status(403).json({ error: `Forbidden: requires ${requiredPermission}` });

    next();
  };
};
