import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/requireAuth';
import { requirePermission } from '../middlewares/permissions';
import { validateBody } from '../middlewares/validate';
import { z } from 'zod';
import { prisma } from '../services/prisma';

const router = Router();

const recurringRuleSchema = z.object({
  description: z.string().min(1),
  amount: z.number(),
  type: z.enum(['EXPENSE', 'INCOME']),
  category: z.string().min(1),
  cardId: z.string().optional(),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']),
  nextDate: z.string(),
  endDate: z.string().optional(),
  isActive: z.boolean().optional()
});

router.use(requireAuth);

router.get('/', requirePermission('transactions.view'), async (req: AuthRequest, res: Response) => {
   try {
     const rules = await prisma.recurringRule.findMany({
        where: { tenantId: req.user!.tenantId },
        orderBy: { nextDate: 'asc' }
     });
     res.json(rules);
   } catch(e: any) {
     res.status(500).json({ error: e.message });
   }
});

router.post('/', requirePermission('transactions.create'), validateBody(recurringRuleSchema), async (req: AuthRequest, res: Response) => {
   try {
     const data = req.body;
     const rule = await prisma.recurringRule.create({
        data: {
           tenantId: req.user!.tenantId,
           description: data.description,
           amount: data.amount,
           type: data.type,
           category: data.category,
           cardId: data.cardId,
           frequency: data.frequency,
           nextDate: new Date(data.nextDate),
           endDate: data.endDate ? new Date(data.endDate) : null,
           isActive: data.isActive !== undefined ? data.isActive : true
        }
     });

     await prisma.auditLog.create({
        data: { tenantId: req.user!.tenantId, userId: req.user!.id, action: 'CREATE', entity: 'RecurringRule', entityId: rule.id }
     });

     res.json(rule);
   } catch(e: any) {
     res.status(500).json({ error: e.message });
   }
});

router.put('/:id', requirePermission('transactions.update'), validateBody(recurringRuleSchema.partial()), async (req: AuthRequest, res: Response) => {
   try {
     const data = req.body;
     const rule = await prisma.recurringRule.findFirst({ where: { id: String(req.params.id), tenantId: req.user!.tenantId } });
     if (!rule) return res.status(404).json({ error: 'Not found' });

     const updated = await prisma.recurringRule.update({
        where: { id: rule.id },
        data: {
           description: data.description ?? rule.description,
           amount: data.amount ?? rule.amount,
           type: data.type ?? rule.type,
           category: data.category ?? rule.category,
           cardId: data.cardId ?? rule.cardId,
           frequency: data.frequency ?? rule.frequency,
           nextDate: data.nextDate ? new Date(data.nextDate) : rule.nextDate,
           endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : rule.endDate,
           isActive: data.isActive ?? rule.isActive
        }
     });

     await prisma.auditLog.create({
        data: { tenantId: req.user!.tenantId, userId: req.user!.id, action: 'UPDATE', entity: 'RecurringRule', entityId: rule.id }
     });

     res.json(updated);
   } catch(e: any) {
     res.status(500).json({ error: e.message });
   }
});

router.delete('/:id', requirePermission('transactions.delete'), async (req: AuthRequest, res: Response) => {
   try {
     const rule = await prisma.recurringRule.findFirst({ where: { id: String(req.params.id), tenantId: req.user!.tenantId } });
     if (!rule) return res.status(404).json({ error: 'Not found' });

     await prisma.recurringRule.delete({ where: { id: rule.id } });

     await prisma.auditLog.create({
        data: { tenantId: req.user!.tenantId, userId: req.user!.id, action: 'DELETE', entity: 'RecurringRule', entityId: rule.id }
     });

     res.json({ success: true });
   } catch(e: any) {
     res.status(500).json({ error: e.message });
   }
});

router.post('/:id/generate-next', requirePermission('transactions.create'), async (req: AuthRequest, res: Response) => {
   try {
     const rule = await prisma.recurringRule.findFirst({ where: { id: String(req.params.id), tenantId: req.user!.tenantId } });
     if (!rule) return res.status(404).json({ error: 'Not found' });

     // create transaction based on rule
     const tx = await prisma.transaction.create({
        data: {
           tenantId: req.user!.tenantId,
           description: rule.description,
           amount: rule.amount,
           currency: 'BRL',
           date: rule.nextDate,
           type: rule.type,
           status: 'PENDING',
           cardId: rule.cardId,
           category: rule.category,
           recurringRuleId: rule.id
        }
     });

     // calculate next date
     const nextDate = new Date(rule.nextDate);
     if (rule.frequency === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + 1);
     else if (rule.frequency === 'WEEKLY') nextDate.setDate(nextDate.getDate() + 7);
     else nextDate.setMonth(nextDate.getMonth() + 1); // MONTHLY

     const updatedRule = await prisma.recurringRule.update({
        where: { id: rule.id },
        data: { nextDate }
     });

     await prisma.auditLog.create({
        data: { tenantId: req.user!.tenantId, userId: req.user!.id, action: 'GENERATE', entity: 'RecurringRule', entityId: rule.id }
     });

     res.json({ success: true, transaction: tx, rule: updatedRule });
   } catch(e: any) {
     res.status(500).json({ error: e.message });
   }
});

export default router;
