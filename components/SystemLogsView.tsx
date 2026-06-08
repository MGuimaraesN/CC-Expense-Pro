import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export const SystemLogsView: React.FC = () => {
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => apiClient('/audit-logs')
  });

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Audit Logs</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Recent system and user activity.</p>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {isLoading && <div className="p-6 text-center text-slate-500">Loading logs...</div>}
        {isError && <div className="p-6 text-center text-red-500">Failed to load logs.</div>}
        {!isLoading && !isError && (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {(!logs || logs.length === 0) && <li className="p-6 text-center text-slate-500">No recent logs.</li>}
            {logs?.map((log: any) => (
              <li key={log.id} className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${log.action.includes('DELETE') ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {log.action}
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500 mr-2">{log.entity}</span>
                    {log.entityId}
                  </span>
                </div>
                <div className="flex items-baseline gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
