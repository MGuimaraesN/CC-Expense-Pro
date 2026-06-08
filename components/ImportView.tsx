import React, { useState } from 'react';
import { Upload, FileText, Check, AlertCircle, FileCode } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export const ImportView: React.FC = () => {
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<'CSV' | 'OFX'>('CSV');
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'PREVIEW'>('IDLE');
  const [count, setCount] = useState(0);
  const [previewData, setPreviewData] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const queryClient = useQueryClient();

  const handlePreview = async () => {
    if (!content.trim()) return;
    setStatus('PROCESSING');
    
    try {
      const data = await apiClient('/import/preview', {
        method: 'POST',
        body: JSON.stringify({ format, content })
      });
      setPreviewData(data);
      setStatus('PREVIEW');
    } catch (e) {
      console.error(e);
      setStatus('ERROR');
    }
  };

  const handleCommit = async () => {
     if (!previewData || !previewData.data) return;
     setStatus('PROCESSING');

     try {
       const res = await apiClient('/import/commit', {
          method: 'POST',
          body: JSON.stringify({ transactions: previewData.data })
       });
       setImportResult(res);
       setCount(res.imported);
       setStatus('SUCCESS');
       queryClient.invalidateQueries({ queryKey: ['transactions'] });
       queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
       queryClient.invalidateQueries({ queryKey: ['cards'] });
       queryClient.invalidateQueries({ queryKey: ['budgets'] });
       setContent('');
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
        
        {/* Format Selector */}
        <div className="flex justify-center gap-4 mb-6">
           <button 
             onClick={() => setFormat('CSV')}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${format === 'CSV' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-slate-50 border-transparent text-slate-600 dark:bg-slate-900 dark:text-slate-400'}`}
           >
             <FileText size={16} /> CSV
           </button>
           <button 
             onClick={() => setFormat('OFX')}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${format === 'OFX' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-slate-50 border-transparent text-slate-600 dark:bg-slate-900 dark:text-slate-400'}`}
           >
             <FileCode size={16} /> OFX (Bank)
           </button>
        </div>

        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-lg mx-auto text-sm">
          {format === 'CSV' 
            ? "Paste your CSV content below. Format: Date (YYYY-MM-DD), Description, Amount, Category." 
            : "Open your .ofx file in a text editor and paste the content here."}
        </p>

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setStatus('IDLE');
              setPreviewData(null);
            }}
            className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder={format === 'CSV' ? `2023-10-01, Uber Ride, -25.50, Transport` : `<OFX>...<BANKTRANLIST>...`}
          />
        </div>

        {status === 'PREVIEW' && previewData && (
          <div className="mt-6 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-left">
             <h3 className="text-lg font-semibold mb-2">Analysis Preview</h3>
             <ul className="text-sm space-y-1 mb-4">
                <li>Rows read: <strong>{previewData.read}</strong></li>
                <li>Valid transactions: <strong>{previewData.normalized}</strong></li>
                <li>Errors skipped: <strong>{previewData.errors}</strong></li>
             </ul>
             <p className="text-xs text-slate-500 mb-4">You are about to import {previewData.normalized} transactions. Duplicates will be ignored during commit.</p>
             <div className="flex justify-end gap-3">
               <button onClick={() => setStatus('IDLE')} className="px-4 py-2 border rounded-lg hover:bg-slate-50">Cancel</button>
               <button onClick={handleCommit} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-indigo-500/30">Confirm & Import</button>
             </div>
          </div>
        )}

        {status !== 'PREVIEW' && (
          <div className="mt-6 flex justify-center">
            <button 
              onClick={handlePreview}
              disabled={status === 'PROCESSING' || !content}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
               {status === 'PROCESSING' ? 'Processing...' : `Preview ${format}`}
            </button>
          </div>
        )}
      </div>

      {status === 'SUCCESS' && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
          <Check size={20} />
          <span className="font-medium">Successfully imported {count} transactions. 
            {importResult?.ignored > 0 && ` (${importResult.ignored} duplicates ignored).`}
          </span>
        </div>
      )}

      {status === 'ERROR' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle size={20} />
          <span className="font-medium">Failed to process content. Check the format and try again.</span>
        </div>
      )}
    </div>
  );
};