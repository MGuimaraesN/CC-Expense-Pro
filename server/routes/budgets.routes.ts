import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/requireAuth';
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

router.get('/', async (req: AuthRequest, res: Response) => {
  const budgets = await prisma.budget.findMany({
    where: { tenantId: req.user!.tenantId }
  });
  const formatted = budgets.map(b => ({
    ...b,
    tags: b.tags ? JSON.parse(b.tags) : undefined
  }));
  res.json(formatted);
});

router.post('/', validateBody(budgetSchema), async (req: AuthRequest, res: Response) => {
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
  res.json({ ...budget, tags: budget.tags ? JSON.parse(budget.tags) : undefined });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.budget.delete({ where: { id: String(req.params.id) } });
  res.json({ success: true });
});

export default router;
