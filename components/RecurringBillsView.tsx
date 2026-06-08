import React, { useState, useEffect } from 'react';
import { Transaction, TransactionStatus } from '../types';
import { Repeat, CheckCircle, SkipForward, Edit2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface RecurringBillsViewProps {
  transactions: Transaction[];
  onUpdate: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

export const RecurringBillsView: React.FC<RecurringBillsViewProps> = ({ transactions, onUpdate }) => {
  const recurring = transactions.filter(t => t.isRecurring);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFreq, setEditFreq] = useState('');
  const [editDate, setEditDate] = useState('');

  const startEditing = (t: Transaction) => {
    setEditingId(t.id);
    setEditFreq(t.recurrenceFrequency || 'MONTHLY');
    setEditDate(new Date(t.date).toISOString().split('T')[0]);
  };

  const saveEdit = async (t: Transaction) => {
    try {
      await onUpdate(t.id, { 
        recurrenceFrequency: editFreq as any, 
        date: new Date(editDate).toISOString() 
      });
      setEditingId(null);
      toast.success('Recurring bill updated');
    } catch {
      toast.error('Failed to update bill');
    }
  };

  const markAsPaid = async (t: Transaction) => {
    try {
      // Create a duplicate paid transaction and update the recur date, or simply mark paid.
      // Usually marking as paid on a recurring template creates a new actual transaction and shifts the template date.
      // For simplicity, we just mark this instance as PAID.
      await onUpdate(t.id, { status: TransactionStatus.PAID });
      toast.success('Marked as paid');
    } catch {
      toast.error('Failed to mark as paid');
    }
  };

  const skipNext = async (t: Transaction) => {
    try {
      // Shift date by recurrence frequency
      const nextDate = new Date(t.date);
      if (t.recurrenceFrequency === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + 1);
      else if (t.recurrenceFrequency === 'WEEKLY') nextDate.setDate(nextDate.getDate() + 7);
      else nextDate.setMonth(nextDate.getMonth() + 1); // default Monthly

      await onUpdate(t.id, { date: nextDate.toISOString() });
      toast.success('Skipped until next instance');
    } catch {
      toast.error('Failed to skip bill');
    }
  };

  if (recurring.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-12 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
          <Repeat size={32} className="text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No active recurring bills</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">When you create a transaction and flag it as recurring, it will appear here for easy management.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recurring Bills Management</h3>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {recurring.map(t => (
          <div key={t.id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 group">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                 <h4 className="font-semibold text-slate-900 dark:text-white">{t.description}</h4>
                 <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${t.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {t.status}
                 </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1 font-medium"><Repeat size={14} /> {t.recurrenceFrequency?.toUpperCase() || 'MONTHLY'}</span>
                <span className="flex items-center gap-1 text-slate-400"><Clock size={14} /> Next: {new Date(t.date).toLocaleDateString()}</span>
                <strong className="text-slate-900 dark:text-white">R$ {t.amount}</strong>
              </div>
            </div>
            
            {editingId === t.id ? (
               <div className="flex items-center gap-2">
                 <select 
                   value={editFreq} 
                   onChange={e => setEditFreq(e.target.value)}
                   className="text-sm px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white"
                 >
                   <option value="WEEKLY">Weekly</option>
                   <option value="MONTHLY">Monthly</option>
                   <option value="YEARLY">Yearly</option>
                 </select>
                 <input 
                   type="date" 
                   value={editDate}
                   onChange={e => setEditDate(e.target.value)}
                   className="text-sm px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white"
                 />
                 <button onClick={() => saveEdit(t)} className="px-3 py-1.5 bg-indigo-600 text-white font-medium text-sm rounded hover:bg-indigo-700">Save</button>
                 <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium rounded">Cancel</button>
               </div>
            ) : (
               <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditing(t)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="Edit Schedule">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => skipNext(t)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg" title="Skip this instance">
                    <SkipForward size={18} />
                  </button>
                  {t.status !== 'PAID' && (
                    <button onClick={() => markAsPaid(t)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg" title="Mark Paid">
                      <CheckCircle size={18} />
                    </button>
                  )}
               </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
