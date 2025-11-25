import React from 'react';
import { Moon, Sun, Bell, Shield, Globe, Monitor } from 'lucide-react';

interface SettingsViewProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ darkMode, setDarkMode }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      
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

      {/* Notifications */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell size={20} className="text-slate-400" /> Notifications
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="email-notif" className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" defaultChecked />
              <label htmlFor="email-notif" className="text-slate-700 dark:text-slate-300">Email Alerts for Invoice Closing</label>
            </div>
          </div>
           <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="push-notif" className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
              <label htmlFor="push-notif" className="text-slate-700 dark:text-slate-300">Push Notifications for High Expenses</label>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};