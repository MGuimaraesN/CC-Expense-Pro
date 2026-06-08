import React, { useSyncExternalStore } from 'react';
import { apiLogger } from '../utils/apiLogger';

export const SystemLogsView: React.FC = () => {
  const logs = useSyncExternalStore(
    apiLogger.subscribe.bind(apiLogger),
    () => apiLogger.logs
  );

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Logs</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Recent API connection activity to the Prisma backend.</p>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {logs.length === 0 && <li className="p-6 text-center text-slate-500">No recent logs.</li>}
          {logs.map(log => (
            <li key={log.id} className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50">
               <div className="flex items-center gap-3">
                 <span className={`px-2 py-1 text-xs font-bold rounded ${Number(log.status) >= 400 || log.status === 'Error' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {log.status}
                 </span>
                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                   <span className="text-indigo-500 font-mono mr-2">{log.method}</span>
                   {log.url}
                 </span>
               </div>
               <div className="flex items-baseline gap-4 text-xs text-slate-500 dark:text-slate-400">
                 <span>{log.duration}ms</span>
                 <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
               </div>
               {log.error && (
                 <div className="w-full text-xs text-red-500 mt-1">Error: {log.error}</div>
               )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
