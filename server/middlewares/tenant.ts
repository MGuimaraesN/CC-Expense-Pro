import { Response, NextFunction } from 'express';
import { AuthRequest } from './requireAuth';
import { tenantContext } from '../services/prisma';

export const tenantMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.tenantId) {
    return next(); // or res.status(401) but usually requireAuth handles this
  }

  tenantContext.run({ tenantId: req.user.tenantId }, () => {
    next();
  });
};

