import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/requireAuth';
import { requirePermission } from '../middlewares/permissions';
import { validateBody } from '../middlewares/validate';
import { z } from 'zod';
import { prisma } from '../services/prisma';

const router = Router();

// Zod Schma
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

function getCurrentInvoicePeriod(closingDay: number, dueDay: number, referenceDate: Date = new Date()) {
  const currentMonth = referenceDate.getMonth();
  const currentYear = referenceDate.getFullYear();
  let invoiceStartDate = new Date(currentYear, currentMonth - 1, closingDay);
  let invoiceEndDate = new Date(currentYear, currentMonth, closingDay - 1);

  if (referenceDate.getDate() >= closingDay) {
    invoiceStartDate = new Date(currentYear, currentMonth, closingDay);
    invoiceEndDate = new Date(currentYear, currentMonth + 1, closingDay - 1);
  }

  return { invoiceStartDate, invoiceEndDate };
}

router.get('/', requirePermission('cards.view'), async (req: AuthRequest, res: Response) => {
  const cards = await prisma.creditCard.findMany({
    where: { tenantId: req.user!.tenantId, deletedAt: null }
  });
  
  const cardsWithUsage = await Promise.all(cards.map(async (card) => {
    const { invoiceStartDate, invoiceEndDate } = getCurrentInvoicePeriod(card.closingDay, card.dueDay);
    
    const result = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { 
        cardId: card.id, 
        tenantId: req.user!.tenantId, 
        type: 'EXPENSE', 
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'FAILED'] },
        date: { gte: invoiceStartDate, lte: invoiceEndDate }
      }
    });
    
    const usedLimit = result._sum.amount || 0;
    
    return {
      ...card,
      usedLimit,
      availableLimit: card.limit - usedLimit,
      usagePercentage: card.limit > 0 ? (usedLimit / card.limit) * 100 : 0,
      invoiceStartDate,
      invoiceEndDate
    };
  }));

  res.json(cardsWithUsage);
});

router.post('/', requirePermission('cards.create'), validateBody(cardSchema), async (req: AuthRequest, res: Response) => {
  try {
     if (req.body.isDefault) {
       await prisma.creditCard.updateMany({
         where: { tenantId: req.user!.tenantId, isDefault: true },
         data: { isDefault: false }
       });
     }
  
     const card = await prisma.creditCard.create({
       data: {
         ...req.body,
         tenantId: req.user!.tenantId
       }
     });
     
     await prisma.auditLog.create({
       data: { tenantId: req.user!.tenantId, userId: req.user!.id, action: 'CREATE', entity: 'CreditCard', entityId: card.id }
     });
     
     res.json({ ...card, usedLimit: 0, availableLimit: card.limit, usagePercentage: 0 });
  } catch(e: any) {
     if (e.code === 'P2002') return res.status(400).json({ error: 'Card already exists for this tenant' });
     res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requirePermission('cards.update'), validateBody(cardSchema.partial()), async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.creditCard.findFirst({
        where: { id: String(req.params.id), tenantId: req.user!.tenantId }
    });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    if (req.body.isDefault && !card.isDefault) {
       await prisma.creditCard.updateMany({
         where: { tenantId: req.user!.tenantId, isDefault: true },
         data: { isDefault: false }
       });
    }

    const updated = await prisma.creditCard.update({
      where: { id: String(req.params.id) },
      data: req.body
    });
    
    await prisma.auditLog.create({
       data: { tenantId: req.user!.tenantId, userId: req.user!.id, action: 'UPDATE', entity: 'CreditCard', entityId: card.id }
     });
     
    res.json(updated);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requirePermission('cards.delete'), async (req: AuthRequest, res: Response) => {
    const card = await prisma.creditCard.findFirst({
        where: { id: String(req.params.id), tenantId: req.user!.tenantId }
    });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    
    const txCount = await prisma.transaction.count({ where: { cardId: card.id } });
    if (txCount > 0) {
       await prisma.creditCard.update({
           where: { id: String(req.params.id) },
           data: { deletedAt: new Date(), isActive: false, status: 'CANCELLED' }
       });
    } else {
       await prisma.creditCard.delete({ where: { id: String(req.params.id) } });
    }
    
    await prisma.auditLog.create({
       data: { tenantId: req.user!.tenantId, userId: req.user!.id, action: 'DELETE', entity: 'CreditCard', entityId: card.id }
     });
     
    res.json({ success: true });
});

export default router;
