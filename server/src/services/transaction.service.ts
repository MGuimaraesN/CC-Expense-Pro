import { PrismaClient, Transaction, TransactionType, TransactionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

interface CreateTransactionData extends Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  // totalInstallments is received from the frontend
  totalInstallments?: number;
}


export const createTransaction = async (data: CreateTransactionData, userId: string): Promise<Transaction[]> => {
  const transactionsToCreate: Omit<Transaction, 'id' | 'userId'>[] = [];
  const baseDate = new Date(data.date || new Date());
  const groupId = generateId();

  // Default status logic
  const defaultStatus = data.status || (data.type === TransactionType.INCOME ? TransactionStatus.PAID : TransactionStatus.PENDING);

  // --- INSTALLMENT LOGIC ---
  if (data.isInstallment && data.totalInstallments && data.totalInstallments > 1 && data.type === TransactionType.EXPENSE) {
    const totalAmount = data.amount;
    const partAmount = Number((totalAmount / data.totalInstallments).toFixed(2));
    const remainder = Number((totalAmount - (partAmount * data.totalInstallments)).toFixed(2));

    for (let i = 0; i < data.totalInstallments; i++) {
      const installmentDate = new Date(baseDate);
      installmentDate.setMonth(baseDate.getMonth() + i);

      transactionsToCreate.push({
        ...data,
        amount: i === 0 ? partAmount + remainder : partAmount,
        date: installmentDate,
        installmentId: groupId,
        installmentNumber: i + 1,
        totalInstallments: data.totalInstallments,
        status: i === 0 ? defaultStatus : TransactionStatus.PENDING,
      });
    }
  }
  // --- RECURRING LOGIC (Simplified for now) ---
  else if (data.isRecurring) {
    // For now, we only create the first occurrence. A cron job would handle future ones.
    transactionsToCreate.push({
      ...data,
      status: defaultStatus,
    });
  }
  // --- SINGLE TRANSACTION ---
  else {
    transactionsToCreate.push({
      ...data,
      status: defaultStatus,
    });
  }

  // Save all transactions in a single database transaction
  const createdTransactions = await prisma.$transaction(
    transactionsToCreate.map(tx =>
      prisma.transaction.create({
        data: {
          ...tx,
          userId: userId,
        },
      })
    )
  );

  return createdTransactions;
};

export const getTransactions = async (userId: string, filters: { startDate?: string, endDate?: string, type?: TransactionType }): Promise<Transaction[]> => {
    const whereClause: any = {
        userId: userId
    };

    if (filters.startDate) {
        whereClause.date = { ...whereClause.date, gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
        whereClause.date = { ...whereClause.date, lte: new Date(filters.endDate) };
    }
    if (filters.type) {
        whereClause.type = filters.type;
    }

    return prisma.transaction.findMany({
        where: whereClause,
        orderBy: {
            date: 'desc'
        }
    });
}
