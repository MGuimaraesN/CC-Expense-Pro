import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/requireAuth';
import { requirePermission } from '../middlewares/permissions';
import { validateBody } from '../middlewares/validate';
import { z } from 'zod';
import { logAuditAction } from '../services/auditService';
import { prisma } from '../services/prisma';

const router = Router();

router.use(requireAuth);

const txSchema = z.object({
  description: z.string().min(1),
  amount: z.number().min(0),
  currency: z.string().optional().default('BRL'),
  date: z.string().or(z.date()),
  targetId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']),
  status: z.enum(['PAID', 'PENDING']),
  cardId: z.string().optional().nullable(),
  category: z.string(),
  tags: z.array(z.string()).optional(),
  isInstallment: z.boolean().optional(),
  installmentId: z.string().optional(),
  installmentNumber: z.number().optional().nullable(),
  totalInstallments: z.number().optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurrenceFrequency: z.string().optional(),
  isPinned: z.boolean().optional()
});

router.get('/', requirePermission('transactions.view'), async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 100;
  
  const txs = await prisma.transaction.findMany({
    where: { tenantId: req.user!.tenantId, deletedAt: null },
    include: { comments: true, card: true },
    orderBy: { date: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  });
  
  const formatted = txs.map(t => ({
      ...t,
      date: t.date.toISOString(),
      tags: t.tags ? JSON.parse(t.tags) : [],
      comments: t.comments.map(c => ({
        ...c,
        timestamp: c.timestamp.toISOString()
      }))
  }));
  res.json(formatted);
});

router.post('/', requirePermission('transactions.create'), validateBody(txSchema), async (req: AuthRequest, res: Response) => {
   const data = req.body;
   try {
     const tx = await prisma.transaction.create({
       data: {
         tenantId: req.user!.tenantId,
         description: data.description,
         amount: data.amount,
         currency: data.currency,
         date: new Date(data.date),
         type: data.type,
         status: data.status,
         cardId: data.cardId,
         category: data.category,
         tags: data.tags ? JSON.stringify(data.tags) : JSON.stringify([]),
         isInstallment: data.isInstallment ?? false,
         installmentId: data.installmentId,
         installmentNumber: data.installmentNumber,
         totalInstallments: data.totalInstallments,
         isPinned: data.isPinned ?? false
       },
       include: { comments: true, card: true }
     });
     
     // create audit log
     await logAuditAction({
        tenantId: req.user!.tenantId,
        userId: req.user!.id,
        action: 'CREATE',
        entity: 'Transaction',
        entityId: tx.id,
        ip: req.ip,
        userAgent: req.headers['user-agent']
     });

     res.json({ ...tx, tags: tx.tags ? JSON.parse(tx.tags) : [] });
   } catch (e: any) {
     res.status(500).json({ error: e.message });
   }
});

router.put('/:id', requirePermission('transactions.update'), validateBody(txSchema.partial()), async (req: AuthRequest, res: Response) => {
   const data = req.body;
   try {
     const txInfo = await prisma.transaction.findFirst({ where: { id: String(req.params.id), tenantId: req.user!.tenantId }});
     if (!txInfo) return res.status(404).json({ error: 'Transaction not found' });

     const updateData: any = {};
     if (data.description !== undefined) updateData.description = data.description;
     if (data.amount !== undefined) updateData.amount = data.amount;
     if (data.date !== undefined) updateData.date = new Date(data.date);
     if (data.type !== undefined) updateData.type = data.type;
     if (data.status !== undefined) updateData.status = data.status;
     if (data.cardId !== undefined) updateData.cardId = data.cardId;
     if (data.category !== undefined) updateData.category = data.category;
     if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
     if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;

     const tx = await prisma.transaction.update({
       where: { id: String(req.params.id) },
       data: updateData,
       include: { comments: true, card: true }
     });

     await logAuditAction({
        tenantId: req.user!.tenantId, userId: req.user!.id, action: 'UPDATE', entity: 'Transaction', entityId: tx.id,
        ip: req.ip, userAgent: req.headers['user-agent']
     });

     res.json({ ...tx, tags: tx.tags ? JSON.parse(tx.tags) : [] });
   } catch(e: any) {
     res.status(500).json({ error: e.message });
   }
});

router.delete('/:id', requirePermission('transactions.delete'), async (req: AuthRequest, res: Response) => {
   const txInfo = await prisma.transaction.findFirst({ where: { id: String(req.params.id), tenantId: req.user!.tenantId }});
   if (!txInfo) return res.status(404).json({ error: 'Transaction not found' });

   await prisma.transaction.update({
       where: { id: String(req.params.id) },
       data: { deletedAt: new Date() }
   });

   await logAuditAction({
      tenantId: req.user!.tenantId, userId: req.user!.id, action: 'DELETE', entity: 'Transaction', entityId: String(req.params.id),
      ip: req.ip, userAgent: req.headers['user-agent'] as string
   });

   res.json({ success: true });
});

export default router;
