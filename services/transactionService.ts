import { Transaction, CreditCard, TransactionType, Currency, DashboardStats, Budget, BudgetUsage, RecurrenceFrequency, TransactionStatus } from '../types';

// Mock Data Stores
let MOCK_CARDS: CreditCard[] = [
  { id: 'c1', name: 'Nubank Platinum', last4Digits: '4242', limit: 15000, closingDay: 5, dueDay: 12, color: 'bg-purple-600' },
  { id: 'c2', name: 'XP Visa Infinite', last4Digits: '8811', limit: 50000, closingDay: 20, dueDay: 27, color: 'bg-slate-800' },
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    description: 'AWS Infrastructure',
    amount: 120.50,
    currency: Currency.USD,
    date: new Date().toISOString(),
    type: TransactionType.EXPENSE,
    status: TransactionStatus.PAID,
    cardId: 'c2',
    category: 'Infrastructure',
    tags: ['Cloud', 'DevOps'],
    isInstallment: false,
    isRecurring: true,
    recurrenceFrequency: RecurrenceFrequency.MONTHLY,
  },
  {
    id: 't2',
    description: 'MacBook Pro M3',
    amount: 12000, 
    currency: Currency.BRL,
    date: new Date().toISOString(),
    type: TransactionType.EXPENSE,
    status: TransactionStatus.PENDING,
    cardId: 'c1',
    category: 'Equipment',
    tags: ['Office'],
    isInstallment: true,
    installmentId: 'inst_1',
    installmentNumber: 1,
    totalInstallments: 10,
    isRecurring: false,
  },
  {
    id: 't3',
    description: 'Freelance Project X',
    amount: 3500.00,
    currency: Currency.BRL,
    date: new Date().toISOString(),
    type: TransactionType.INCOME,
    status: TransactionStatus.PAID,
    category: 'Services',
    tags: ['Consulting'],
    isInstallment: false,
    isRecurring: false,
  }
];

const STORAGE_KEY_TRANSACTIONS = 'cc_expense_transactions';

const loadTransactions = (): Transaction[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return stored ? JSON.parse(stored) : DEFAULT_TRANSACTIONS;
  } catch (error) {
    console.warn("Failed to load transactions from storage", error);
    return DEFAULT_TRANSACTIONS;
  }
};

let MOCK_TRANSACTIONS: Transaction[] = loadTransactions();

const saveTransactionsToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(MOCK_TRANSACTIONS));
  } catch (error) {
    console.error("Failed to save transactions to storage", error);
  }
};

let MOCK_BUDGETS: Budget[] = [
  { id: 'b1', category: 'Infrastructure', amount: 500, period: 'MONTHLY' },
  { id: 'b2', category: 'Food', amount: 1200, period: 'MONTHLY' },
];

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- CORE BUSINESS LOGIC: Installment & Recurring Engine ---
export const createTransaction = async (data: Partial<Transaction>): Promise<Transaction[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));

  const transactionsToCreate: Transaction[] = [];
  const baseDate = new Date(data.date || new Date());
  const groupId = generateId();

  // Default status logic: Income = PAID, Expense = PENDING (unless specified)
  const defaultStatus = data.status || (data.type === TransactionType.INCOME ? TransactionStatus.PAID : TransactionStatus.PENDING);

  if (data.isInstallment && data.totalInstallments && data.totalInstallments > 1 && data.type === TransactionType.EXPENSE) {
    // Logic: Split total amount into parts and generate future dates
    const totalAmount = data.amount || 0;
    const partAmount = Number((totalAmount / data.totalInstallments).toFixed(2));
    
    // Handle rounding remainder on the first installment
    const totalCalculated = partAmount * data.totalInstallments;
    const remainder = Number((totalAmount - totalCalculated).toFixed(2));

    for (let i = 0; i < data.totalInstallments; i++) {
      const installmentDate = new Date(baseDate);
      installmentDate.setMonth(baseDate.getMonth() + i);

      transactionsToCreate.push({
        ...data,
        id: generateId(),
        amount: i === 0 ? partAmount + remainder : partAmount, // Add pennies to first installment
        date: installmentDate.toISOString(),
        installmentId: groupId,
        installmentNumber: i + 1,
        totalInstallments: data.totalInstallments,
        tags: data.tags || [],
        status: i === 0 ? defaultStatus : TransactionStatus.PENDING, // Future installments are pending
      } as Transaction);
    }
  } else if (data.isRecurring) {
    // Logic: Generate future recurring transactions automatically
    const recurrenceCount = 6; 
    const frequency = data.recurrenceFrequency || RecurrenceFrequency.MONTHLY;
    
    for (let i = 0; i < recurrenceCount; i++) {
      const recurringDate = new Date(baseDate);
      
      if (frequency === RecurrenceFrequency.MONTHLY) {
        recurringDate.setMonth(baseDate.getMonth() + i);
      } else if (frequency === RecurrenceFrequency.WEEKLY) {
        recurringDate.setDate(baseDate.getDate() + (i * 7));
      } else if (frequency === RecurrenceFrequency.YEARLY) {
        recurringDate.setFullYear(baseDate.getFullYear() + i);
      }
      
      // Stop if exceeds end date
      if (data.recurrenceEndDate && recurringDate > new Date(data.recurrenceEndDate)) {
        break;
      }

      transactionsToCreate.push({
        ...data,
        id: generateId(),
        date: recurringDate.toISOString(),
        tags: data.tags || [],
        status: i === 0 ? defaultStatus : TransactionStatus.PENDING, // Future recurring are pending
      } as Transaction);
    }

  } else {
    // Single transaction
    transactionsToCreate.push({
      ...data,
      id: generateId(),
      tags: data.tags || [],
      status: defaultStatus,
    } as Transaction);
  }

  // "Save" to mock DB
  MOCK_TRANSACTIONS = [...transactionsToCreate, ...MOCK_TRANSACTIONS];
  saveTransactionsToStorage();
  
  return transactionsToCreate;
};

export const updateTransaction = async (data: Partial<Transaction>): Promise<Transaction> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const index = MOCK_TRANSACTIONS.findIndex(t => t.id === data.id);
  if (index !== -1) {
    MOCK_TRANSACTIONS[index] = { 
      ...MOCK_TRANSACTIONS[index], 
      ...data,
      tags: data.tags || MOCK_TRANSACTIONS[index].tags 
    };
    saveTransactionsToStorage();
    return MOCK_TRANSACTIONS[index];
  }
  throw new Error("Transaction not found");
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  await new Promise((resolve) => setTimeout(resolve, 600)); 
  return [...MOCK_TRANSACTIONS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const deleteTransaction = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 600)); 
  MOCK_TRANSACTIONS = MOCK_TRANSACTIONS.filter(t => t.id !== id);
  saveTransactionsToStorage();
};

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Fake calculation logic for demo
  return {
    openInvoice: 3450.20,
    closedInvoice: 1200.00,
    totalLimit: 65000,
    usedLimit: 14500,
    monthlyTrend: [
      { month: 'Jan', amount: 4000 },
      { month: 'Feb', amount: 3000 },
      { month: 'Mar', amount: 5000 },
      { month: 'Apr', amount: 2780 },
      { month: 'May', amount: 1890 },
      { month: 'Jun', amount: 2390 },
    ]
  };
};

export const fetchCards = async (): Promise<CreditCard[]> => {
  return MOCK_CARDS;
};

export const createCard = async (cardData: Omit<CreditCard, 'id'>): Promise<CreditCard> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  const newCard = { ...cardData, id: generateId() };
  MOCK_CARDS = [...MOCK_CARDS, newCard];
  return newCard;
};

export const updateCard = async (cardData: CreditCard): Promise<CreditCard> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  const index = MOCK_CARDS.findIndex(c => c.id === cardData.id);
  if (index !== -1) {
    MOCK_CARDS[index] = cardData;
    return cardData;
  }
  throw new Error("Card not found");
};

// --- BUDGET LOGIC ---

export const fetchBudgets = async (): Promise<BudgetUsage[]> => {
  await new Promise(resolve => setTimeout(resolve, 600));

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return MOCK_BUDGETS.map(budget => {
    // Calculate spent for this category in current month
    const spent = MOCK_TRANSACTIONS
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && 
               d.getFullYear() === currentYear && 
               t.type === TransactionType.EXPENSE &&
               t.category.toLowerCase() === budget.category.toLowerCase();
      })
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      ...budget,
      spent,
      remaining: budget.amount - spent,
      percentage: Math.min(100, (spent / budget.amount) * 100)
    };
  });
};

export const createBudget = async (budget: Partial<Budget>): Promise<Budget> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  const newBudget = { ...budget, id: generateId(), period: 'MONTHLY' } as Budget;
  MOCK_BUDGETS.push(newBudget);
  return newBudget;
};

export const deleteBudget = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  MOCK_BUDGETS = MOCK_BUDGETS.filter(b => b.id !== id);
};

// --- IMPORT LOGIC ---
export const importTransactionsFromCSV = async (csvText: string): Promise<number> => {
  // Simple parser: assumes header row + "Date,Description,Amount,Category"
  const lines = csvText.split('\n');
  let successCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length >= 3) {
      const date = parts[0].trim();
      const desc = parts[1].trim();
      const amount = parseFloat(parts[2].trim());
      const category = parts[3]?.trim() || 'Uncategorized';
      
      if (!isNaN(amount) && desc) {
        const type = amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME;
        await createTransaction({
          description: desc,
          amount: Math.abs(amount),
          date: new Date(date).toISOString(),
          type: type,
          status: type === TransactionType.INCOME ? TransactionStatus.PAID : TransactionStatus.PENDING,
          category: category,
          currency: Currency.BRL,
          tags: ['Imported'],
          isRecurring: false,
          isInstallment: false
        });
        successCount++;
      }
    }
  }
  return successCount;
};