import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CreditCard, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { DashboardStats } from '../types';
import { Skeleton } from './ui/Skeleton';

interface DashboardProps {
  stats: DashboardStats | null;
  isLoading: boolean;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; subtext?: string; loading: boolean }> = ({ title, value, icon, subtext, loading }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        {loading ? (
          <Skeleton className="h-8 w-32 mt-2" />
        ) : (
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{value}</h3>
        )}
      </div>
      <div className="p-3 bg-indigo-50 dark:bg-slate-700 rounded-lg text-indigo-600 dark:text-indigo-400">
        {icon}
      </div>
    </div>
    {subtext && !loading && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ stats, isLoading }) => {
  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 animate-pulse" />)}
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Open Invoice (Current)" 
          value={formatCurrency(stats?.openInvoice || 0)} 
          icon={<CreditCard size={20} />} 
          subtext="Due in 12 days"
          loading={isLoading}
        />
        <StatCard 
          title="Closed Invoice (Last)" 
          value={formatCurrency(stats?.closedInvoice || 0)} 
          icon={<TrendingUp size={20} />} 
          subtext="Paid on 10/10"
          loading={isLoading}
        />
        <StatCard 
          title="Available Limit" 
          value={formatCurrency((stats?.totalLimit || 0) - (stats?.usedLimit || 0))} 
          icon={<AlertCircle size={20} />} 
          subtext={`${((stats?.usedLimit || 0) / (stats?.totalLimit || 1) * 100).toFixed(0)}% utilized`}
          loading={isLoading}
        />
        <StatCard 
          title="Total Recurring" 
          value={formatCurrency(850.00)} 
          icon={<TrendingDown size={20} />} 
          subtext="Monthly fixed cost"
          loading={isLoading}
        />
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-[400px] flex flex-col relative">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Expense Trend (6 Months)</h3>
        {isLoading ? (
          <Skeleton className="w-full h-full" />
        ) : (
          /* 
             Fix for Recharts "width (-1)" error: 
             Use an absolute positioned child inside a relative flex-1 container 
             to force strict dimensions.
          */
          <div className="flex-1 w-full min-h-0 relative">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b' }} 
                    tickFormatter={(value) => `R$${value/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};