import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/requireAuth';
import { prisma } from '../services/prisma';

const router = Router();

router.use(requireAuth);

router.get('/summary', async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId;

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Total Income and Expense for current month
  const incomeAggr = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { tenantId, type: 'INCOME', date: { gte: firstDayOfMonth }, deletedAt: null }
  });

  const expenseAggr = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { tenantId, type: 'EXPENSE', date: { gte: firstDayOfMonth }, deletedAt: null }
  });

  const totalIncome = incomeAggr._sum.amount || 0;
  const totalExpense = expenseAggr._sum.amount || 0;
  
  // Get all cards to calculate limit usage
  const cards = await prisma.creditCard.findMany({ where: { tenantId, deletedAt: null } });
  let totalLimit = 0;
  let usedLimit = 0;
  
  for (const card of cards) {
      totalLimit += card.limit;
      const cardExpense = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { tenantId, cardId: card.id, type: 'EXPENSE', deletedAt: null } // simplified logic
      });
      usedLimit += (cardExpense._sum.amount || 0);
  }

  // Monthly Trend (Last 6 months)
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
     const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
     const monthStr = monthDate.toLocaleString('default', { month: 'short' });
     const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
     
     const moExp = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { tenantId, type: 'EXPENSE', date: { gte: monthDate, lt: nextMonth }, deletedAt: null }
     });
     monthlyTrend.push({ month: monthStr, amount: moExp._sum.amount || 0, average: 0 }); // We can calculate real average if needed
  }

  // Calculate moving average
  const histAvgObj = await prisma.transaction.aggregate({
     _sum: { amount: true },
     _count: { id: true },
     where: { tenantId, type: 'EXPENSE', deletedAt: null },
  });
  // a simplistic average
  const avg = histAvgObj._count.id > 0 ? (histAvgObj._sum.amount || 0) / 6 : 0; 

  monthlyTrend.forEach(t => t.average = avg);

  // Limit per category
  const expensesByCategoryRaw = await prisma.transaction.groupBy({
     by: ['category'],
     _sum: { amount: true },
     where: { tenantId, type: 'EXPENSE', date: { gte: firstDayOfMonth }, deletedAt: null },
  });

  const expensesByCategory = expensesByCategoryRaw.map(e => ({ name: e.category, value: e._sum.amount || 0 }));
  
  // High value transactions
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }});
  const recentHighValueTransactions = await prisma.transaction.findMany({
     where: { tenantId, type: 'EXPENSE', amount: { gte: user?.highValueThreshold || 5000 }, deletedAt: null },
     orderBy: { date: 'desc' },
     take: 5
  });

  res.json({
    monthlyTrend,
    expensesByCategory,
    openInvoice: totalExpense,
    upcomingMaturities: 0, // Mock
    totalLimit,
    usedLimit,
    financialHealth: { averageLast3Months: avg },
    recentHighValueTransactions
  });
});

export default router;
