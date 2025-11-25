export enum Currency {
  BRL = 'BRL',
  USD = 'USD',
}

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
}

export enum RecurrenceFrequency {
  MONTHLY = 'MONTHLY',
  WEEKLY = 'WEEKLY',
  YEARLY = 'YEARLY',
}

export interface CreditCard {
  id: string;
  name: string;
  last4Digits: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency: Currency;
  date: string; // ISO String
  type: TransactionType;
  cardId?: string;
  category: string;
  tags: string[]; // Tag IDs
  
  // Installment Logic
  isInstallment: boolean;
  installmentId?: string; // Group ID for all parts
  installmentNumber?: number; // Current part (e.g., 2)
  totalInstallments?: number; // Total parts (e.g., 10)
  
  // Recurrence
  isRecurring: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
}

export interface Budget {
  id: string;
  category: string; // Matches transaction category
  amount: number;
  tags?: string[]; // Optional: Budget specific to tags
  period: 'MONTHLY'; // Simplified for now
}

export interface BudgetUsage extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
}

export interface DashboardStats {
  openInvoice: number;
  closedInvoice: number;
  totalLimit: number;
  usedLimit: number;
  monthlyTrend: { month: string; amount: number }[];
}

export interface NewsArticle {
  title: string;
  url: string;
  source?: string;
}