import React, { useState } from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import { importTransactionsFromCSV } from '../services/transactionService';
import { useQueryClient } from '@tanstack/react-query';

export const ImportView: React.FC = () => {
  const [csvContent, setCsvContent] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [count, setCount] = useState(0);
  const queryClient = useQueryClient();

  const handleImport = async () => {
    if (!csvContent.trim()) return;
    setStatus('PROCESSING');
    
    try {
      const importedCount = await importTransactionsFromCSV(csvContent);
      setCount(importedCount);
      setStatus('SUCCESS');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setCsvContent('');
    } catch (e) {
      console.error(e);
      setStatus('ERROR');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
        <div className="inline-flex p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400 mb-4">
           <Upload size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Import Transactions</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-lg mx-auto">
          Paste your CSV content below. Format: Date (YYYY-MM-DD), Description, Amount, Category.
        </p>

        <div className="relative">
          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder={`2023-10-01, Uber Ride, -25.50, Transport\n2023-10-02, Salary, 5000.00, Income`}
          />
        </div>

        <div className="mt-6 flex justify-center">
          <button 
            onClick={handleImport}
            disabled={status === 'PROCESSING' || !csvContent}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
             {status === 'PROCESSING' ? 'Processing...' : 'Import CSV'}
          </button>
        </div>
      </div>

      {status === 'SUCCESS' && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
          <Check size={20} />
          <span className="font-medium">Successfully imported {count} transactions.</span>
        </div>
      )}

      {status === 'ERROR' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle size={20} />
          <span className="font-medium">Failed to process CSV. Check the format and try again.</span>
        </div>
      )}
    </div>
  );
};