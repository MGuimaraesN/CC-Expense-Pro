import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MerchantAnalyticsModalProps {
  merchant: string;
  transactions: Transaction[];
  onClose: () => void;
}

export const MerchantAnalyticsModal: React.FC<MerchantAnalyticsModalProps> = ({ merchant, transactions, onClose }) => {
  const data = useMemo(() => {
    const last6Months = new Date();
    last6Months.setMonth(last6Months.getMonth() - 6);

    const relevantTx = transactions.filter(t => t.description === merchant && new Date(t.date) >= last6Months);
    
    const monthlyTotal: Record<string, number> = {};
    relevantTx.forEach(t => {
       const date = new Date(t.date);
       const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
       monthlyTotal[monthKey] = (monthlyTotal[monthKey] || 0) + (t.type === 'EXPENSE' ? t.amount : -t.amount);
    });

    return Object.entries(monthlyTotal)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({ month, total }));
  }, [merchant, transactions]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 scale-100 animate-in zoom-in-95 duration-200 relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={20} />
        </button>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Merchant Analytics</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium text-sm">6-Month Spending Trend: <span className="text-indigo-600 dark:text-indigo-400">{merchant}</span></p>
        
        {data.length === 0 ? (
           <div className="text-center text-slate-500 py-10">No recent data for this merchant.</div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(val) => `R$${val}`} />
                <Tooltip 
                   cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Total']}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
