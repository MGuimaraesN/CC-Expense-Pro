import React, { useState } from 'react';
import { Repeat, CheckCircle, SkipForward, Edit2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export const RecurringBillsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFreq, setEditFreq] = useState('');
  const [editDate, setEditDate] = useState('');

  const { data: recurring = [], isLoading } = useQuery({
    queryKey: ['recurring-rules'],
    queryFn: () => apiClient('/recurring-rules')
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, updates: any }) => apiClient(`/recurring-rules/${data.id}`, { method: 'PUT', body: JSON.stringify(data.updates) }),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['recurring-rules'] });
       toast.success('Recurring bill updated');
       setEditingId(null);
    },
    onError: () => toast.error('Failed to update bill')
  });

  const generateMutation = useMutation({
    mutationFn: (id: string) => apiClient(`/recurring-rules/${id}/generate-next`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-rules'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Generated next transaction!');
    },
    onError: () => toast.error('Failed to generate transaction')
  });

  const startEditing = (t: any) => {
    setEditingId(t.id);
    setEditFreq(t.frequency || 'MONTHLY');
    setEditDate(new Date(t.nextDate).toISOString().split('T')[0]);
  };

  const saveEdit = (t: any) => {
    updateMutation.mutate({ id: t.id, updates: {
       frequency: editFreq,
       nextDate: new Date(editDate).toISOString()
    }});
  };

  const skipNext = (t: any) => {
    const nextDate = new Date(t.nextDate);
    if (t.frequency === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + 1);
    else if (t.frequency === 'WEEKLY') nextDate.setDate(nextDate.getDate() + 7);
    else nextDate.setMonth(nextDate.getMonth() + 1);
    updateMutation.mutate({ id: t.id, updates: { nextDate: nextDate.toISOString() }});
    toast.success('Skipped until next instance');
  };

  if (isLoading) return <div className="p-12 text-center text-slate-500">Loading recurring rules...</div>;

  if (recurring.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-12 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
          <Repeat size={32} className="text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No active recurring bills</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">Create a recurring rule to easily manage your subscriptions and regular expenses.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recurring Bills Management</h3>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {recurring.map((t: any) => (
          <div key={t.id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 group">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                 <h4 className="font-semibold text-slate-900 dark:text-white">{t.description}</h4>
                 <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                    {t.isActive ? 'ACTIVE' : 'INACTIVE'}
                 </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1 font-medium"><Repeat size={14} /> {t.frequency}</span>
                <span className="flex items-center gap-1 text-slate-400"><Clock size={14} /> Next: {new Date(t.nextDate).toLocaleDateString()}</span>
                <strong className={t.type === 'EXPENSE' ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}>
                  {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount}
                </strong>
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
                  <button onClick={() => generateMutation.mutate(t.id)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg" title="Generate next transaction">
                     <CheckCircle size={18} />
                  </button>
               </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
