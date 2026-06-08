import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/requireAuth';
import { requirePermission } from '../middlewares/permissions';
import { validateBody } from '../middlewares/validate';
import { z } from 'zod';
import { prisma } from '../services/prisma';

const router = Router();

router.use(requireAuth);

const budgetSchema = z.object({
  category: z.string().min(1),
  amount: z.number().min(0),
  tags: z.array(z.string()).optional(),
  period: z.string().optional()
});

router.get('/', requirePermission('budgets.view'), async (req: AuthRequest, res: Response) => {
  const budgets = await prisma.budget.findMany({
    where: { tenantId: req.user!.tenantId }
  });
  
  const referenceDate = new Date();
  const currentMonth = referenceDate.getMonth();
  const currentYear = referenceDate.getFullYear();
  
  const formatted = await Promise.all(budgets.map(async (b) => {
    // Basic spent computation
    let startDate = new Date(currentYear, currentMonth, 1);
    let endDate = new Date(currentYear, currentMonth + 1, 0);

    const result = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { 
        tenantId: req.user!.tenantId, 
        category: b.category, 
        type: 'EXPENSE',
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'FAILED'] },
        date: { gte: startDate, lte: endDate }
      }
    });

    const spent = result._sum.amount || 0;
    const remaining = Math.max(b.amount - spent, 0);
    const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    let status = 'good';
    if (percentage > 90) status = 'danger';
    else if (percentage > 75) status = 'warning';

    return {
      ...b,
      tags: b.tags ? JSON.parse(b.tags) : undefined,
      spent,
      remaining,
      percentage,
      status
    };
  }));
  res.json(formatted);
});

router.post('/', requirePermission('budgets.create'), validateBody(budgetSchema), async (req: AuthRequest, res: Response) => {
  const data = req.body;
  const budget = await prisma.budget.create({
    data: {
      tenantId: req.user!.tenantId,
      category: data.category,
      amount: data.amount,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      period: data.period || 'MONTHLY'
    }
  });
  
  await prisma.auditLog.create({
     data: { tenantId: req.user!.tenantId, userId: req.user!.id, action: 'CREATE', entity: 'Budget', entityId: budget.id }
  });

  res.json({ ...budget, tags: budget.tags ? JSON.parse(budget.tags) : undefined, spent: 0, remaining: budget.amount, percentage: 0, status: 'good' });
});

router.put('/:id', requirePermission('budgets.update'), validateBody(budgetSchema.partial()), async (req: AuthRequest, res: Response) => {
   const data = req.body;
   const budget = await prisma.budget.findFirst({ where: { id: String(req.params.id), tenantId: req.user!.tenantId } });
   if (!budget) return res.status(404).json({ error: 'Budget not found' });

   const updated = await prisma.budget.update({
     where: { id: String(req.params.id) },
     data: {
       category: data.category ?? budget.category,
       amount: data.amount ?? budget.amount,
       tags: data.tags !== undefined ? JSON.stringify(data.tags) : budget.tags,
       period: data.period ?? budget.period
     }
   });
   
   await prisma.auditLog.create({
     data: { tenantId: req.user!.tenantId, userId: req.user!.id, action: 'UPDATE', entity: 'Budget', entityId: budget.id }
   });

   res.json({ ...updated, tags: updated.tags ? JSON.parse(updated.tags) : undefined });
});


router.delete('/:id', requirePermission('budgets.delete'), async (req: AuthRequest, res: Response) => {
  const budget = await prisma.budget.findFirst({ where: { id: String(req.params.id), tenantId: req.user!.tenantId } });
  if (!budget) return res.status(404).json({ error: 'Budget not found' });

  await prisma.budget.delete({ where: { id: String(req.params.id) } });

  await prisma.auditLog.create({
     data: { tenantId: req.user!.tenantId, userId: req.user!.id, action: 'DELETE', entity: 'Budget', entityId: budget.id }
  });

  res.json({ success: true });
});

export default router;
