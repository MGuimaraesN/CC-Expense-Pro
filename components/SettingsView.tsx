import React, { useRef, useState, useEffect } from 'react';
import { Moon, Shield, Globe, Monitor, Database, Download, Upload, AlertTriangle, Cpu, RefreshCw, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { generateBackup, restoreBackup, getUserProfile, updateUserProfile } from '../services/userService';
import { toast } from 'sonner';

interface SettingsViewProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ darkMode, setDarkMode }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [cleanupDate, setCleanupDate] = useState('');

  useEffect(() => {
    getUserProfile().then(p => {
      if (p) {
        setAutoBackupEnabled(p.autoBackupEnabled);
      }
    });
  }, []);

  const toggleAutoBackup = async () => {
    const val = !autoBackupEnabled;
    setAutoBackupEnabled(val);
    try {
      const p = await getUserProfile();
      await updateUserProfile({ ...p, autoBackupEnabled: val });
      toast.success(`Automated Weekly Backup ${val ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to change backup setting');
    }
  };

  const handleCleanup = async () => {
    if (!cleanupDate) return toast.error('Select a date first');
    if (!confirm('Are you sure you want to permanently delete these transactions?')) return;
    try {
      const res = await fetch('/api/transactions/cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beforeDate: cleanupDate })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Deleted ${data.count} old transactions.`);
      } else {
        toast.error(data.error);
      }
    } catch (e: any) {
      toast.error(e.message || 'Network error');
    }
  };

  const runDiagnostics = async () => {
    setLoadingDiag(true);
    setDiagnosticInfo(null);
    try {
      const res = await fetch('/api/diagnostics');
      const data = await res.json();
      setDiagnosticInfo(data);
    } catch (e: any) {
      setDiagnosticInfo({ status: 'error', error: e.message || 'Network error' });
    } finally {
      setLoadingDiag(false);
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const promise = new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        try {
          const success = restoreBackup(content);
          if (success) {
            resolve('Data restored!');
            setTimeout(() => window.location.reload(), 1500);
          } else {
            reject(new Error('Invalid backup file structure'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });

    toast.promise(promise, {
      loading: 'Validating and restoring data...',
      success: 'System restored successfully! Reloading...',
      error: (err) => `Restore failed: ${err.message}`
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* System Diagnostics */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu size={20} className="text-indigo-500" /> System Diagnostics
          </h3>
          <button 
            onClick={runDiagnostics}
            disabled={loadingDiag}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loadingDiag ? 'animate-spin' : ''} /> 
            {loadingDiag ? 'Verifying...' : 'Verify Connection'}
          </button>
        </div>
        
        {diagnosticInfo && (
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
             {diagnosticInfo.status === 'ok' ? (
                 <div className="flex flex-col space-y-3">
                   <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 size={18} /> Backend Connection Successful
                   </div>
                   <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
                     <div><span className="font-semibold text-slate-900 dark:text-slate-200">Database Engine:</span> {diagnosticInfo.database}</div>
                     <div><span className="font-semibold text-slate-900 dark:text-slate-200">DB Size on Disk:</span> {(diagnosticInfo.dbSize / 1024).toFixed(2)} KB</div>
                   </div>
                 </div>
             ) : (
                 <div className="flex flex-col space-y-2">
                   <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                      <XCircle size={18} /> Connection Failed
                   </div>
                   <p className="text-sm text-red-500 font-mono">{diagnosticInfo.error}</p>
                 </div>
             )}
          </div>
        )}
      </div>

      {/* Database Management */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Database size={20} className="text-orange-500" /> Database Management
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
             <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
               <Trash2 size={24} />
             </div>
             <div className="flex-1">
               <h4 className="font-semibold text-slate-900 dark:text-white">Clear Old Data</h4>
               <p className="text-sm text-slate-500 dark:text-slate-400">Permanently delete transactions older than the specified date.</p>
             </div>
             <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
               <input 
                 type="date" 
                 value={cleanupDate}
                 onChange={(e) => setCleanupDate(e.target.value)}
                 className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
               />
               <button 
                 onClick={handleCleanup}
                 className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
               >
                 Delete Data
               </button>
             </div>
          </div>
        </div>
      </div>

      {/* Security & Data Safeguard */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield size={20} className="text-emerald-500" /> Data Safeguard
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
             <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
               <Database size={24} />
             </div>
             <div className="flex-1">
               <h4 className="font-semibold text-slate-900 dark:text-white">Full System Backup</h4>
               <p className="text-sm text-slate-500 dark:text-slate-400">Download all your data as an SQLite database file export.</p>
             </div>
             <button 
               onClick={() => {
                 window.open('/api/backup/export', '_blank');
                 toast.success('SQLite Database download started');
               }}
               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
             >
               <Download size={16} /> Export DB
             </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
             <div>
               <h4 className="font-semibold text-slate-900 dark:text-white">Automated Weekly Backups</h4>
               <p className="text-sm text-slate-500 dark:text-slate-400">Automatically generate a secure SQL dump every week.</p>
             </div>
             <button 
               onClick={toggleAutoBackup}
               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoBackupEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
             >
               <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoBackupEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
             </button>
          </div>

           <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
             <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
               <Upload size={24} />
             </div>
             <div className="flex-1">
               <h4 className="font-semibold text-slate-900 dark:text-white">Restore Data</h4>
               <p className="text-sm text-slate-500 dark:text-slate-400">Overwrite current data with a backup file.</p>
               <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                 <AlertTriangle size={10} /> This action cannot be undone.
               </p>
             </div>
             <input 
               type="file" 
               accept=".json" 
               className="hidden" 
               ref={fileInputRef} 
               onChange={handleRestore}
             />
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
             >
               <Upload size={16} /> Import Backup
             </button>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Monitor size={20} className="text-slate-400" /> Appearance
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Dark Mode</p>
              <p className="text-sm text-slate-500">Switch between light and dark themes</p>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe size={20} className="text-slate-400" /> Localization
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Primary Currency</label>
               <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white">
                 <option value="BRL">Real Brasileiro (BRL)</option>
                 <option value="USD">US Dollar (USD)</option>
                 <option value="EUR">Euro (EUR)</option>
               </select>
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Language</label>
               <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white">
                 <option value="en">English</option>
                 <option value="pt">Português</option>
               </select>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
};