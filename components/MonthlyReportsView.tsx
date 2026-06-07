import React, { useMemo } from 'react';
import { Transaction, TransactionType, TransactionStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { getColorForCategory } from '../utils/colors';

interface MonthlyReportsViewProps {
  transactions: Transaction[];
}

export const MonthlyReportsView: React.FC<MonthlyReportsViewProps> = ({ transactions }) => {
  const chartData = useMemo(() => {
    const today = new Date();
    const result = [];
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      const yearStr = d.getFullYear().toString().slice(-2);
      
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear();
      });

      let totalsByCategory: Record<string, number> = {};
      let totalExpense = 0;
      let totalIncome = 0;

      monthTransactions.forEach(t => {
        if (t.status === TransactionStatus.PAID || t.status === TransactionStatus.PENDING) {
           if (t.type === TransactionType.EXPENSE) {
             totalExpense += t.amount;
             const cat = t.category || 'Other';
             totalsByCategory[cat] = (totalsByCategory[cat] || 0) + t.amount;
           } else if (t.type === TransactionType.INCOME) {
             totalIncome += t.amount;
           }
        }
      });

      result.push({
        name: `${monthLabel} '${yearStr}`,
        expense: totalExpense,
        income: totalIncome,
        ...totalsByCategory
      });
    }

    return result;
  }, [transactions]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    chartData.forEach(data => {
      Object.keys(data).forEach(key => {
        if (key !== 'name' && key !== 'expense' && key !== 'income') {
          cats.add(key);
        }
      });
    });
    return Array.from(cats);
  }, [chartData]);

  // Generate some vibrant colors for categories
  const colors = [
    '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', 
    '#6366f1', '#ef4444', '#14b8a6', '#f97316', '#84cc16'
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
             <Calendar size={20} />
           </div>
           <div>
             <h3 className="text-xl font-bold text-slate-900 dark:text-white">6-Month Spending Trends</h3>
             <p className="text-sm text-slate-500">Analyze your expenses by category over time</p>
           </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => `R$${val}`} />
              <Tooltip 
                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, undefined]}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {categories.map((cat, i) => (
                 <Bar key={cat} dataKey={cat} stackId="a" fill={getColorForCategory(cat)} radius={i === categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
             <TrendingUp size={20} />
           </div>
           <div>
             <h3 className="text-xl font-bold text-slate-900 dark:text-white">Income vs Expense</h3>
             <p className="text-sm text-slate-500">Compare your cash flow</p>
           </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => `R$${val}`} />
              <Tooltip 
                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, undefined]}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              <Line type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
