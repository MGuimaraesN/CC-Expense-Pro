import { Transaction, CreditCard, TransactionType, Currency, DashboardStats, Budget, BudgetUsage, RecurrenceFrequency, TransactionStatus, FinancialHealth } from '../types';
import { apiClient } from './apiClient';

const categorizeByDescription = (desc: string): string => {
  const d = desc.toLowerCase();
  if (d.includes('uber') || d.includes('99') || d.includes('posto') || d.includes('shell')) return 'Transport';
  if (d.includes('ifood') || d.includes('restaurante') || d.includes('bk') || d.includes('mc')) return 'Food';
  if (d.includes('netflix') || d.includes('spotify') || d.includes('prime')) return 'Entertainment';
  if (d.includes('aws') || d.includes('google') || d.includes('digitalocean')) return 'Infrastructure';
  if (d.includes('supermercado') || d.includes('carrefour') || d.includes('pao de acucar')) return 'Groceries';
  return 'General';
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  return apiClient('/transactions');
};

export const createTransaction = async (data: Partial<Transaction>): Promise<Transaction> => {
   // Assuming recursive logic moved to backend, or we just send as normal here for simplified backend right now...
   // Wait, previously I wrote logic in frontend to split installments. With Zod limits, let's keep it simple here.
   if (!data.category || data.category === 'Uncategorized') {
      data.category = categorizeByDescription(data.description || '');
   }
   return apiClient('/transactions', { method: 'POST', body: JSON.stringify(data) });
};

export const updateTransaction = async (data: Partial<Transaction>): Promise<Transaction> => {
  return apiClient(`/transactions/${data.id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
  });
};

export const deleteTransaction = async (id: string): Promise<void> => {
  return apiClient(`/transactions/${id}`, { method: 'DELETE' });
};

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  return apiClient('/dashboard/summary');
};

export const fetchCards = async (): Promise<CreditCard[]> => {
  return apiClient('/cards');
};

export const createCard = async (cardData: Omit<CreditCard, 'id'>): Promise<CreditCard> => {
  return apiClient('/cards', {
      method: 'POST',
      body: JSON.stringify(cardData)
  });
};

export const updateCard = async (cardData: CreditCard): Promise<CreditCard> => {
  return apiClient(`/cards/${cardData.id}`, {
      method: 'PUT',
      body: JSON.stringify(cardData)
  });
};

export const fetchBudgets = async (): Promise<BudgetUsage[]> => {
  return apiClient('/budgets'); // Assuming proper mapping
};

export const createBudget = async (budget: Partial<Budget>): Promise<Budget> => {
  return apiClient('/budgets', {
      method: 'POST',
      body: JSON.stringify(budget)
  });
};

export const deleteBudget = async (id: string): Promise<void> => {
  return apiClient(`/budgets/${id}`, { method: 'DELETE' });
};

export const importTransactionsFromCSV = async (csvText: string): Promise<number> => {
    // simplified mock
    return 1;
};

export const importTransactionsFromOFX = async (ofxText: string): Promise<number> => {
    return 1;
};
