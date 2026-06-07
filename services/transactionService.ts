import { Transaction, CreditCard, TransactionType, Currency, DashboardStats, Budget, BudgetUsage, RecurrenceFrequency, TransactionStatus, FinancialHealth } from '../types';

const API_BASE = '/api';

export const getUSDRate = async (): Promise<number> => {
  const CACHE_DURATION = 12 * 60 * 60 * 1000;
  const stored = localStorage.getItem('cc_expense_rate_cache');
  if (stored) {
    const { rate, timestamp } = JSON.parse(stored);
    if (Date.now() - timestamp < CACHE_DURATION) return rate;
  }
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    const data = await res.json();
    const rate = parseFloat(data.USDBRL.bid);
    localStorage.setItem('cc_expense_rate_cache', JSON.stringify({ rate, timestamp: Date.now() }));
    return rate;
  } catch (e) {
    return 5.5;
  }
};

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
  const res = await fetch(`${API_BASE}/transactions`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
};

export const createTransaction = async (data: Partial<Transaction>): Promise<Transaction[]> => {
  let finalAmount = data.amount || 0;
  let exchangeRate = 1;
  
  if (data.currency === Currency.USD) {
    exchangeRate = await getUSDRate();
    finalAmount = Number((finalAmount * exchangeRate).toFixed(2));
    data.originalAmount = data.amount;
    data.originalCurrency = Currency.USD;
    data.exchangeRate = exchangeRate;
    data.currency = Currency.BRL; 
  }

  if (!data.category || data.category === 'Uncategorized') {
    data.category = categorizeByDescription(data.description || '');
  }

  const baseDate = new Date(data.date || new Date());
  const defaultStatus = data.status || (data.type === TransactionType.INCOME ? TransactionStatus.PAID : TransactionStatus.PENDING);
  const groupId = crypto.randomUUID();

  const toCreate: Partial<Transaction>[] = [];

  if (data.isInstallment && data.totalInstallments && data.totalInstallments > 1 && data.type === TransactionType.EXPENSE) {
    const totalAmount = finalAmount;
    const partAmount = Number((totalAmount / data.totalInstallments).toFixed(2));
    const totalCalculated = partAmount * data.totalInstallments;
    const remainder = Number((totalAmount - totalCalculated).toFixed(2));

    const currentInstallment = data.installmentNumber || 1;
    const countToGenerate = data.totalInstallments - currentInstallment + 1;

    for (let i = 0; i < countToGenerate; i++) {
        const thisNum = currentInstallment + i;
        const dDate = new Date(baseDate);
        dDate.setMonth(baseDate.getMonth() + i);
        const amount = (thisNum === 1) ? partAmount + remainder : partAmount;

        toCreate.push({
            ...data,
            amount,
            date: dDate.toISOString(),
            installmentId: groupId,
            installmentNumber: thisNum,
            totalInstallments: data.totalInstallments,
            tags: data.tags || [],
            status: i === 0 ? defaultStatus : TransactionStatus.PENDING
        });
    }
  } else if (data.isRecurring) {
    const frequency = data.recurrenceFrequency || RecurrenceFrequency.MONTHLY;
    const limit = 6;
    for (let i = 0; i < limit; i++) {
        const dDate = new Date(baseDate);
        if (frequency === RecurrenceFrequency.MONTHLY) dDate.setMonth(baseDate.getMonth() + i);
        else if (frequency === RecurrenceFrequency.WEEKLY) dDate.setDate(baseDate.getDate() + (i * 7));
        else if (frequency === RecurrenceFrequency.QUARTERLY) dDate.setMonth(baseDate.getMonth() + (i * 3));
        else if (frequency === RecurrenceFrequency.YEARLY) dDate.setFullYear(baseDate.getFullYear() + i);

        if (data.recurrenceEndDate && dDate > new Date(data.recurrenceEndDate)) break;

        toCreate.push({
            ...data,
            amount: finalAmount,
            date: dDate.toISOString(),
            tags: data.tags || [],
            status: i === 0 ? defaultStatus : TransactionStatus.PENDING
        });
    }
  } else {
    toCreate.push({ ...data, amount: finalAmount, tags: data.tags || [], status: defaultStatus });
  }

  const createdTxs: Transaction[] = [];
  for (const tData of toCreate) {
      const res = await fetch(`${API_BASE}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tData)
      });
      if (res.ok) createdTxs.push(await res.json());
  }
  return createdTxs;
};

export const updateTransaction = async (data: Partial<Transaction>): Promise<Transaction> => {
  const res = await fetch(`${API_BASE}/transactions/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json();
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete');
};

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const txs = await fetchTransactions();
  const profileRes = await fetch(`${API_BASE}/profile`);
  const profile = profileRes.ok ? await profileRes.json() : {};
  const threshold = profile?.highValueThreshold || 5000;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const openInvoice = txs
    .filter(t => t.type === TransactionType.EXPENSE && t.status === TransactionStatus.PENDING)
    .reduce((sum, t) => sum + t.amount, 0);

  const closedInvoice = txs
    .filter(t => {
      const d = new Date(t.date);
      return t.type === TransactionType.EXPENSE && t.status === TransactionStatus.PAID && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);
  
  const upcomingMaturities = txs
    .filter(t => {
      const d = new Date(t.date);
      return t.type === TransactionType.EXPENSE && t.status === TransactionStatus.PENDING && d >= now && d <= sevenDaysFromNow;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonthTotal = txs
    .filter(t => {
      const d = new Date(t.date);
      return t.type === TransactionType.EXPENSE && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  let sumLast3Months = 0;
  let countMonths = 0;
  
  for (let i = 1; i <= 3; i++) {
    const d = new Date();
    d.setMonth(currentMonth - i);
    const m = d.getMonth();
    const y = d.getFullYear();
    
    const monthTotal = txs
      .filter(t => {
        const td = new Date(t.date);
        return t.type === TransactionType.EXPENSE && td.getMonth() === m && td.getFullYear() === y;
      })
      .reduce((sum, t) => sum + t.amount, 0);
      
    if (monthTotal > 0) {
        sumLast3Months += monthTotal;
        countMonths++;
    }
  }
  
  const avgLast3Months = countMonths > 0 ? sumLast3Months / countMonths : (sumLast3Months || currentMonthTotal);

  const diff = currentMonthTotal - avgLast3Months;
  const percentageDiff = avgLast3Months > 0 ? (diff / avgLast3Months) * 100 : 0;
  
  let healthStatus: FinancialHealth['status'] = 'HEALTHY';
  let healthMessage = "You are spending within your average.";

  if (percentageDiff > 10) {
      healthStatus = 'DANGER';
      healthMessage = `Warning! Spending is ${percentageDiff.toFixed(1)}% above average.`;
  } else if (percentageDiff > 0) {
      healthStatus = 'WARNING';
      healthMessage = `Caution. Spending is ${percentageDiff.toFixed(1)}% above average.`;
  } else {
      healthStatus = 'HEALTHY';
      healthMessage = `Great! You are saving ${Math.abs(percentageDiff).toFixed(1)}% vs average.`;
  }

  const health: FinancialHealth = {
    status: healthStatus,
    currentMonthTotal,
    averageLast3Months: avgLast3Months,
    percentageDiff: Math.abs(percentageDiff),
    message: healthMessage
  };

  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(currentMonth - i);
    const m = d.getMonth();
    const y = d.getFullYear();
    const monthName = d.toLocaleString('default', { month: 'short' });
    
    const total = txs
      .filter(t => {
        const td = new Date(t.date);
        return t.type === TransactionType.EXPENSE && td.getMonth() === m && td.getFullYear() === y;
      })
      .reduce((sum, t) => sum + t.amount, 0);
      
    monthlyTrend.push({
      month: monthName,
      amount: total,
      average: avgLast3Months
    });
  }

  const recentHighValueTransactions = txs.filter(t => {
    const d = new Date(t.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    return t.type === TransactionType.EXPENSE && t.amount >= threshold && d >= thirtyDaysAgo;
  });

  return {
    openInvoice,
    closedInvoice,
    totalLimit: 65000,
    usedLimit: openInvoice + closedInvoice,
    upcomingMaturities,
    monthlyTrend,
    financialHealth: health,
    recentHighValueTransactions
  };
};

export const fetchCards = async (): Promise<CreditCard[]> => {
  const res = await fetch(`${API_BASE}/cards`);
  if (!res.ok) throw new Error('Failed to fetch cards');
  return res.json();
};

export const createCard = async (cardData: Omit<CreditCard, 'id'>): Promise<CreditCard> => {
  const res = await fetch(`${API_BASE}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardData)
  });
  if (!res.ok) throw new Error('Failed to create card');
  return res.json();
};

export const updateCard = async (cardData: CreditCard): Promise<CreditCard> => {
  const res = await fetch(`${API_BASE}/cards/${cardData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardData)
  });
  if (!res.ok) throw new Error('Failed to update card');
  return res.json();
};

export const fetchBudgets = async (): Promise<BudgetUsage[]> => {
  const res = await fetch(`${API_BASE}/budgets`);
  if (!res.ok) return [];
  const budgets: Budget[] = await res.json();
  const txs = await fetchTransactions();
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return budgets.map(budget => {
    const spent = txs
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === TransactionType.EXPENSE && t.category.toLowerCase() === budget.category.toLowerCase();
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
  const res = await fetch(`${API_BASE}/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(budget)
  });
  if (!res.ok) throw new Error('Failed to create budget');
  return res.json();
};

export const deleteBudget = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/budgets/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete');
};

export const parseOFX = (ofxContent: string): any[] => {
  const transactions: any[] = [];
  const bankTranListMatch = ofxContent.match(/<BANKTRANLIST>([\s\S]*?)<\/BANKTRANLIST>/);
  if (!bankTranListMatch) return transactions;
  
  const content = bankTranListMatch[1];
  const entries = content.split('</STMTTRN>');

  entries.forEach(entry => {
     const amountMatch = entry.match(/<TRNAMT>([\d\.\-]+)/);
     const dateMatch = entry.match(/<DTPOSTED>(\d+)/);
     const memoMatch = entry.match(/<MEMO>(.*?)(\r|\n|<)/);

     if (dateMatch && amountMatch) {
       const rawDate = dateMatch[1];
       const dateStr = `${rawDate.substring(0,4)}-${rawDate.substring(4,6)}-${rawDate.substring(6,8)}`;
       const description = memoMatch ? memoMatch[1].trim() : 'OFX Import';
       
       transactions.push({
         date: dateStr,
         amount: parseFloat(amountMatch[1]),
         description: description,
         category: categorizeByDescription(description),
         type: parseFloat(amountMatch[1]) < 0 ? 'EXPENSE' : 'INCOME'
       });
     }
  });

  return transactions;
};

export const importTransactionsFromCSV = async (csvText: string): Promise<number> => {
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
      const category = parts[3]?.trim() || categorizeByDescription(desc);
      
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

export const importTransactionsFromOFX = async (ofxText: string): Promise<number> => {
  const parsed = parseOFX(ofxText);
  let successCount = 0;

  for (const t of parsed) {
    await createTransaction({
      description: t.description,
      amount: Math.abs(t.amount),
      date: new Date(t.date).toISOString(),
      type: t.amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
      status: TransactionStatus.PAID,
      category: t.category,
      currency: Currency.BRL,
      tags: ['OFX Import'],
      isRecurring: false,
      isInstallment: false
    });
    successCount++;
  }
  return successCount;
};