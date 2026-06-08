import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/requireAuth';
import { requirePermission } from '../middlewares/permissions';
import { prisma } from '../services/prisma';

const router = Router();

router.use(requireAuth);

router.get('/summary', requirePermission('dashboard.view'), async (req: AuthRequest, res: Response) => {
  const tenantId = req.user!.tenantId;

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Total Income and Expense for current month
  const incomeAggr = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { tenantId, type: 'INCOME', date: { gte: firstDayOfMonth }, deletedAt: null, status: { notIn: ['CANCELLED', 'FAILED'] } }
  });

  const expenseAggr = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { tenantId, type: 'EXPENSE', date: { gte: firstDayOfMonth }, deletedAt: null, status: { notIn: ['CANCELLED', 'FAILED'] } }
  });

  const totalIncome = incomeAggr._sum.amount || 0;
  const totalExpense = expenseAggr._sum.amount || 0;
  
  // Get all cards to calculate limit usage
  const cards = await prisma.creditCard.findMany({ where: { tenantId, deletedAt: null } });
  let totalLimit = 0;
  let usedLimit = 0;
  
  for (const card of cards) {
      totalLimit += card.limit;
      // Should calculate based on invoice period here, simplistic approach for now
      const cardExpense = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { tenantId, cardId: card.id, type: 'EXPENSE', deletedAt: null, status: { notIn: ['CANCELLED', 'FAILED'] } }
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
        where: { tenantId, type: 'EXPENSE', date: { gte: monthDate, lt: nextMonth }, deletedAt: null, status: { notIn: ['CANCELLED', 'FAILED'] } }
     });
     monthlyTrend.push({ month: monthStr, amount: moExp._sum.amount || 0, average: 0 }); 
  }

  // Calculate 3-month average for financial health
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const avgAggr = await prisma.transaction.aggregate({
     _sum: { amount: true },
     where: { tenantId, type: 'EXPENSE', date: { gte: threeMonthsAgo, lt: firstDayOfMonth }, deletedAt: null, status: { notIn: ['CANCELLED', 'FAILED'] } }
  });
  
  const averageLast3Months = (avgAggr._sum.amount || 0) / 3;

  monthlyTrend.forEach(t => t.average = averageLast3Months);

  let healthStatus: 'HEALTHY' | 'WARNING' | 'DANGER' = 'HEALTHY';
  let percentageDiff = 0;
  let healthMessage = 'Spending is aligned with your average.';

  if (averageLast3Months > 0) {
      percentageDiff = ((totalExpense - averageLast3Months) / averageLast3Months) * 100;
      if (percentageDiff > 20) {
          healthStatus = 'DANGER';
          healthMessage = `Warning: Spending is ${percentageDiff.toFixed(0)}% above your recent average.`;
      } else if (percentageDiff > 5) {
          healthStatus = 'WARNING';
          healthMessage = `Careful: Spending is ${percentageDiff.toFixed(0)}% higher than normal.`;
      } else if (percentageDiff < -5) {
          healthMessage = `Great! Spending is ${Math.abs(percentageDiff).toFixed(0)}% below your recent average.`;
      }
  }

  // Limit per category
  const expensesByCategoryRaw = await prisma.transaction.groupBy({
     by: ['category'],
     _sum: { amount: true },
     where: { tenantId, type: 'EXPENSE', date: { gte: firstDayOfMonth }, deletedAt: null, status: { notIn: ['CANCELLED', 'FAILED'] } },
  });

  const expensesByCategory = expensesByCategoryRaw.map(e => ({ name: e.category, value: e._sum.amount || 0 }));
  
  // High value transactions
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }});
  const recentHighValueTransactions = await prisma.transaction.findMany({
     where: { tenantId, type: 'EXPENSE', amount: { gte: user?.highValueThreshold || 5000 }, deletedAt: null, status: { notIn: ['CANCELLED', 'FAILED'] } },
     orderBy: { date: 'desc' },
     take: 5
  });

  // Upcoming Maturities
  // We compute maturities dynamically taking RecurringRules or actual due bills.
  const upcomingMaturities = await prisma.recurringRule.count({
    where: { tenantId, isActive: true, nextDate: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } }
  });

  res.json({
    openInvoice: totalExpense,
    closedInvoice: 0,
    upcomingMaturities,
    totalLimit,
    usedLimit,
    monthlyTrend,
    financialHealth: {
       status: healthStatus,
       currentMonthTotal: totalExpense,
       averageLast3Months,
       percentageDiff,
       message: healthMessage
    },
    recentHighValueTransactions,
    expensesByCategory
  });
});

export default router;
