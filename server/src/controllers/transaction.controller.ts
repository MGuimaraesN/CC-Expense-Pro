import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import * as transactionService from '../services/transaction.service';
import { TransactionType } from '@prisma/client';

export const createNewTransaction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const transactions = await transactionService.createTransaction(req.body, req.user.userId);
    res.status(201).json(transactions);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'An unexpected error occurred' });
  }
};

export const listTransactions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Extract query params for filtering
    const { startDate, endDate, type } = req.query;

    const filters = {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      type: type as TransactionType | undefined,
    }

    const transactions = await transactionService.getTransactions(req.user.userId, filters);
    res.status(200).json(transactions);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'An unexpected error occurred' });
  }
};
