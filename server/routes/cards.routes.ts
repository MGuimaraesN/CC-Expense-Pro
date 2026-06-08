import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/requireAuth';
import { validateBody } from '../middlewares/validate';
import { z } from 'zod';
import { prisma } from '../services/prisma';

const router = Router();

const cardSchema = z.object({
  name: z.string().min(1),
  bankName: z.string().min(1),
  brand: z.string().min(1),
  level: z.string().min(1),
  lastFourDigits: z.string().length(4),
  holderName: z.string().optional(),
  expirationMonth: z.string().optional(),
  expirationYear: z.string().optional(),
  limit: z.number().min(0),
  closingDay: z.number().min(1).max(31),
  dueDay: z.number().min(1).max(31),
  color: z.string().optional(),
  status: z.enum(['ACTIVE', 'BLOCKED', 'CANCELLED']).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional()
});

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  const cards = await prisma.creditCard.findMany({
    where: { tenantId: req.user!.tenantId, deletedAt: null }
  });
  
  // Calculate usage limit in real time based on pending expenses (or total expenses based on logic)
  const cardsWithUsage = await Promise.all(cards.map(async (card) => {
    // Basic calculation for now: Total of EXPENSE transactions linked to this card
    const result = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { cardId: card.id, tenantId: req.user!.tenantId, type: 'EXPENSE', deletedAt: null }
    });
    
    const usedLimit = result._sum.amount || 0;
    
    return {
      ...card,
      usedLimit,
      availableLimit: card.limit - usedLimit,
      usagePercentage: card.limit > 0 ? (usedLimit / card.limit) * 100 : 0
    };
  }));

  res.json(cardsWithUsage);
});

router.post('/', validateBody(cardSchema), async (req: AuthRequest, res: Response) => {
  try {
     const card = await prisma.creditCard.create({
       data: {
         ...req.body,
         tenantId: req.user!.tenantId
       }
     });
     
     res.json({ ...card, usedLimit: 0, availableLimit: card.limit, usagePercentage: 0 });
  } catch(e: any) {
     if (e.code === 'P2002') return res.status(400).json({ error: 'Card already exists for this tenant' });
     res.status(500).json({ error: e.message });
  }
});

router.put('/:id', validateBody(cardSchema.partial()), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.creditCard.findFirst({
        where: { id: String(req.params.id), tenantId: req.user!.tenantId }
    });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const updated = await prisma.creditCard.update({
      where: { id: String(req.params.id) },
      data: req.body
    });
    res.json(updated);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
    const card = await prisma.creditCard.findFirst({
        where: { id: String(req.params.id), tenantId: req.user!.tenantId }
    });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    
    const txCount = await prisma.transaction.count({ where: { cardId: card.id } });
    if (txCount > 0) {
       // Soft delete if there are transactions
       await prisma.creditCard.update({
           where: { id: String(req.params.id) },
           data: { deletedAt: new Date(), isActive: false }
       });
    } else {
       await prisma.creditCard.delete({ where: { id: String(req.params.id) } });
    }
    
    res.json({ success: true });
});

export default router;
