import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validateBody } from '../middlewares/validate';
import { loginSchema, changePasswordSchema } from '../schemas/auth.schema';
import { requireAuth, AuthRequest } from '../middlewares/requireAuth';
import { logAuditAction } from '../services/auditService';
import { prisma } from '../services/prisma';

const router = Router();
function getJwtSecret() {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return process.env.JWT_SECRET || 'dev-only-secret';
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, password, tenantSlug } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { tenant: true, role: true } } }
  });

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.memberships.length === 0) {
    return res.status(403).json({ error: 'User does not belong to any tenant' });
  }

  // Determine active tenant
  let activeMembership = user.memberships[0];
  if (tenantSlug) {
    const found = user.memberships.find(m => m.tenant.slug === tenantSlug);
    if (found) {
      activeMembership = found;
    } else {
      return res.status(403).json({ error: 'You do not have access to this tenant' });
    }
  }

  const token = jwt.sign(
    { 
      userId: user.id, 
      tenantId: activeMembership.tenantId,
      role: activeMembership.role.name 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as any }
  );

  // Exclude password from response
  const { passwordHash, ...userWithoutPassword } = user;

  await logAuditAction({
    tenantId: activeMembership.tenantId,
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json({
    user: {
      ...userWithoutPassword,
      tenantId: activeMembership.tenantId,
      role: activeMembership.role.name
    },
    token
  });
});

router.post('/logout', requireAuth, async (req: AuthRequest, res: Response) => {
  // In a real stateless JWT setup, logout is mainly done client-side by destroying the token.
  // Unless we maintain a token blacklist or use cookies. We'll return success.
  res.json({ success: true });
});

router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, avatarUrl: true, darkMode: true, dashboardLayout: true, autoBackupEnabled: true, highValueThreshold: true }
  });

  if (!user) return res.status(404).json({ error: 'User not found' });

  // Get tenant info
  const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });

  res.json({
    ...user,
    tenantId: req.user.tenantId,
    tenantName: tenant?.name,
    role: req.user.role
  });
});

router.post('/change-password', requireAuth, validateBody(changePasswordSchema), async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !user.passwordHash) return res.status(404).json({ error: 'User not found' });

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) return res.status(400).json({ error: 'Incorrect current password' });

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash }
  });

  await logAuditAction({
    tenantId: req.user.tenantId,
    userId: user.id,
    action: 'CHANGE_PASSWORD',
    entity: 'User',
    entityId: user.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json({ success: true });
});

router.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, avatarUrl, darkMode, dashboardLayout, autoBackupEnabled, highValueThreshold } = req.body;
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name, avatarUrl, darkMode, dashboardLayout, autoBackupEnabled, highValueThreshold }
  });

  await logAuditAction({
    tenantId: req.user.tenantId,
    userId: user.id,
    action: 'UPDATE_PROFILE',
    entity: 'User',
    entityId: user.id,
    metadata: { name, darkMode },
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json({ success: true });
});

export default router;
