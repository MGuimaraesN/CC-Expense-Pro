import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Bar } from 'recharts';
import { CreditCard, TrendingUp, TrendingDown, AlertCircle, HeartPulse, Clock, Plus, FileText, HelpCircle, AlertTriangle, Mail, GripVertical, Sparkles } from 'lucide-react';
import { DashboardStats, Transaction } from '../types';
import { Skeleton } from './ui/Skeleton';
import { toast } from 'sonner';
import { getUserProfile, updateUserProfile } from '../services/userService';

interface DashboardProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  transactions?: Transaction[];
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; subtext?: string; loading: boolean; colorClass?: string; tooltipContent?: React.ReactNode }> = ({ title, value, icon, subtext, loading, colorClass, tooltipContent }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative group">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        {loading ? (
          <Skeleton className="h-8 w-32 mt-2" />
        ) : (
          <h3 className={`text-2xl font-bold mt-2 ${colorClass || 'text-slate-900 dark:text-white'}`}>{value}</h3>
        )}
      </div>
      <div className="p-3 bg-indigo-50 dark:bg-slate-700 rounded-lg text-indigo-600 dark:text-indigo-400">
        {icon}
      </div>
    </div>
    {subtext && !loading && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
    
    {/* Tooltip Content added dynamically via group-hover */}
    {tooltipContent && !loading && (
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 z-50">
        {tooltipContent}
        {/* Tiny carets could be added here */}
      </div>
    )}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ stats, isLoading, transactions = [] }) => {
  const [layout, setLayout] = useState<string[]>(['stats', 'chartsAndActions', 'anomalies']);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  useEffect(() => {
    getUserProfile().then(p => {
       if (p && p.dashboardLayout) {
         try {
           setLayout(JSON.parse(p.dashboardLayout));
         } catch { }
       }
    });
  }, []);

  const handleDragStart = (e: React.DragEvent, id: string) => {
     setDraggedItem(id);
     e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
     e.preventDefault();
     if (!draggedItem || draggedItem === id) return;
     const newLayout = [...layout];
     const fromIndex = newLayout.indexOf(draggedItem);
     const toIndex = newLayout.indexOf(id);
     newLayout.splice(fromIndex, 1);
     newLayout.splice(toIndex, 0, draggedItem);
     setLayout(newLayout);
  };

  const handleDragEnd = async () => {
     setDraggedItem(null);
     const p = await getUserProfile();
     await updateUserProfile({ ...p, dashboardLayout: JSON.stringify(layout) });
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const topMerchants = React.useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const expenseTotals: Record<string, number> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (t.type === 'EXPENSE' && d >= thirtyDaysAgo) {
         expenseTotals[t.description] = (expenseTotals[t.description] || 0) + t.amount;
      }
    });

    return Object.entries(expenseTotals)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, amount]) => ({name, amount}));
  }, [transactions]);

  const merchantTooltip = topMerchants.length > 0 ? (
    <div>
      <p className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide border-b border-slate-700 pb-1">Top Active Merchants</p>
      <div className="space-y-1.5">
        {topMerchants.map((m, i) => (
          <div key={i} className="flex justify-between items-center text-xs">
            <span className="text-white font-medium truncate max-w-[100px]">{m.name}</span>
            <span className="text-indigo-400">{formatCurrency(m.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  ) : undefined;

  const anomalies = React.useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Group historical transactions by category up to 30 days ago
    const histByCategory: Record<string, {total: number; count: number}> = {};
    const recentTx: Transaction[] = [];

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (t.type === 'EXPENSE') {
        if (d < thirtyDaysAgo) {
          if (!histByCategory[t.category]) histByCategory[t.category] = {total: 0, count: 0};
          histByCategory[t.category].total += t.amount;
          histByCategory[t.category].count += 1;
        } else {
          recentTx.push(t);
        }
      }
    });

    const flagged: Array<{tx: Transaction; avg: number; ratio: number}> = [];

    recentTx.forEach(t => {
       const hist = histByCategory[t.category];
       if (hist && hist.count >= 2) {
          const avg = hist.total / hist.count;
          if (t.amount > avg * 1.5) {
             flagged.push({ tx: t, avg, ratio: t.amount / avg });
          }
       }
    });

    return flagged.sort((a,b) => b.ratio - a.ratio).slice(0, 3);
  }, [transactions]);

  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 animate-pulse" />)}
      </div>
    );
  }

  const renderWidget = (id: string) => {
    switch(id) {
       case 'stats': return (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <StatCard 
             title="Open Invoice (Current)" 
             value={formatCurrency(stats?.openInvoice || 0)} 
             icon={<CreditCard size={20} />} 
             subtext="Hover for top merchants"
             loading={isLoading}
             tooltipContent={merchantTooltip}
           />
           <StatCard 
             title="Upcoming Maturities" 
             value={formatCurrency(stats?.upcomingMaturities || 0)} 
             icon={<Clock size={20} />} 
             subtext="Next 7 Days"
             loading={isLoading}
             colorClass="text-orange-600 dark:text-orange-400"
           />
           <StatCard 
             title="Available Limit" 
             value={formatCurrency((stats?.totalLimit || 0) - (stats?.usedLimit || 0))} 
             icon={<AlertCircle size={20} />} 
             subtext={`${((stats?.usedLimit || 0) / (stats?.totalLimit || 1) * 100).toFixed(0)}% utilized`}
             loading={isLoading}
           />
           <StatCard 
             title="Last 3 Mo. Avg" 
             value={formatCurrency(stats?.financialHealth?.averageLast3Months || 0)} 
             icon={<TrendingDown size={20} />} 
             subtext="Rolling average baseline"
             loading={isLoading}
           />
         </div>
       );
       case 'chartsAndActions': return (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Chart */}
           <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-[400px] flex flex-col relative">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Expense vs Average</h3>
               <div className="flex items-center gap-4 text-xs text-slate-500">
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-500 rounded-full"></div> Monthly Expense</div>
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-400 rounded-full"></div> 3-Mo Average</div>
               </div>
             </div>
             
             {isLoading ? (
               <Skeleton className="w-full h-full" />
             ) : (
               <div className="flex-1 w-full min-h-0 relative">
                 <div className="absolute inset-0">
                   <ResponsiveContainer width="100%" height="100%">
                     <ComposedChart data={stats?.monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                       <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `R$${value/1000}k`} />
                       <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                       <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                       <Line type="monotone" dataKey="average" stroke="#34d399" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                     </ComposedChart>
                   </ResponsiveContainer>
                 </div>
               </div>
             )}
           </div>

           {/* Quick Actions */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 mx-auto w-full h-[400px] flex flex-col justify-between">
             <div>
               <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Quick Actions</h3>
               <div className="space-y-4">
                 <button 
                   className="w-full flex items-center justify-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-900/50 dark:hover:bg-indigo-900/20 group transition-all text-left block"
                   onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }))}
                 >
                   <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Plus size={20} />
                   </div>
                   <div>
                     <h4 className="font-semibold text-slate-800 dark:text-white text-sm group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">Add Income</h4>
                     <p className="text-xs text-slate-500">Record a new payment</p>
                   </div>
                 </button>

                 <button className="w-full flex items-center justify-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-900/50 dark:hover:bg-indigo-900/20 group transition-all text-left block">
                   <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                   </div>
                   <div>
                     <h4 className="font-semibold text-slate-800 dark:text-white text-sm group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">View Statements</h4>
                     <p className="text-xs text-slate-500">Download past invoices</p>
                   </div>
                 </button>

                 <button onClick={async () => {
                     toast.loading('Generating your report...', { id: 'summary-email' });
                     try {
                        const res = await fetch('/api/summary/weekly', { method: 'POST' });
                        const data = await res.json();
                        if(data.success) toast.success(data.message, { id: 'summary-email' });
                        else toast.error(data.error, { id: 'summary-email' });
                     } catch(e) {
                        toast.error('Failed to send summary report.', { id: 'summary-email' });
                     }
                   }}
                   className="w-full flex items-center justify-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-900/50 dark:hover:bg-indigo-900/20 group transition-all text-left block"
                 >
                   <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 flex items-center justify-center shrink-0">
                      <Mail size={20} />
                   </div>
                   <div>
                     <h4 className="font-semibold text-slate-800 dark:text-white text-sm group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">Weekly Summary</h4>
                     <p className="text-xs text-slate-500">Email my spending digest</p>
                   </div>
                 </button>
               </div>
             </div>
           </div>
         </div>
       );
       case 'anomalies': return (
         anomalies.length > 0 ? (
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
             <div className="flex items-center gap-2 mb-4">
               <Sparkles size={20} className="text-indigo-500" />
               <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Expense Anomalies</h3>
             </div>
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">We identified recent transactions that significantly deviate from your historical average for that category.</p>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {anomalies.map((ano, i) => (
                 <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-slate-900 dark:text-white">{ano.tx.description}</p>
                    <p className="text-xs text-slate-500 my-1">Category: {ano.tx.category}</p>
                    <div className="flex items-end justify-between mt-3">
                       <span className="text-red-600 dark:text-red-400 font-bold">{formatCurrency(ano.tx.amount)}</span>
                       <span className="text-xs text-slate-400">Avg: {formatCurrency(ano.avg)}</span>
                    </div>
                 </div>
               ))}
             </div>
           </div>
         ) : null
       );
       default: return null;
    }
  };

  return (
    <div className="space-y-6" onDragOver={e => e.preventDefault()} onDrop={handleDragEnd}>
      
      {/* High Value Warning Banner */}
      {stats?.recentHighValueTransactions && stats.recentHighValueTransactions.length > 0 && (
        <div className="p-4 rounded-xl border flex items-start sm:items-center gap-4 bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800/30 dark:text-orange-300">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-full shrink-0">
            <AlertTriangle size={24} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm uppercase tracking-wide">High-Value Transactions Detected</h4>
            <div className="text-sm font-medium auto-rows-min mt-1 space-y-1">
               {stats.recentHighValueTransactions.slice(0, 2).map((t: Transaction) => (
                 <p key={t.id}>
                    <span className="font-semibold">{t.description}</span> for <span className="font-bold">{formatCurrency(t.amount)}</span> on {new Date(t.date).toLocaleDateString()}
                 </p>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* Financial Health Banner */}
      {stats?.financialHealth && (
        <div className={`p-4 rounded-xl border flex items-center gap-4 ${
          stats.financialHealth.status === 'HEALTHY' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' :
          stats.financialHealth.status === 'WARNING' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300' :
          'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
        }`}>
          <div className="p-2 bg-white/50 rounded-full">
            <HeartPulse size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm uppercase tracking-wide">Financial Health Check</h4>
            <p className="text-sm font-medium mt-1">{stats.financialHealth.message}</p>
          </div>
          <div className="text-right hidden sm:block">
             <p className="text-xs opacity-75">3-Month Avg</p>
             <p className="font-bold">{formatCurrency(stats.financialHealth.averageLast3Months)}</p>
          </div>
        </div>
      )}

      {layout.map(id => (
        <div 
          key={id}
          draggable
          onDragStart={e => handleDragStart(e, id)}
          onDragOver={e => handleDragOver(e, id)}
          className={`relative group transition-opacity ${draggedItem === id ? 'opacity-50' : 'opacity-100'}`}
        >
          <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing z-20 text-slate-400 hover:text-indigo-500">
             <GripVertical size={20} />
          </div>
          {renderWidget(id)}
        </div>
      ))}
    </div>
  );
};