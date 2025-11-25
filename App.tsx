import React, { useState, useEffect, createContext, useContext } from 'react';
import { LayoutDashboard, Receipt, CreditCard, Settings, Plus, Sun, Moon, LogOut, X, CheckCircle, AlertCircle, Newspaper, PieChart, Upload } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { TransactionTable } from './components/TransactionTable';
import { TransactionForm } from './components/TransactionForm';
import { CardsView } from './components/CardsView';
import { SettingsView } from './components/SettingsView';
import { TransactionsView } from './components/TransactionsView';
import { NewsView } from './components/NewsView';
import { BudgetView } from './components/BudgetView';
import { ImportView } from './components/ImportView';
import { useTransactions, useCards, useDashboardStats, useCreateTransaction, useDeleteTransaction } from './hooks/useTransactions';

// Toast System
type ToastType = 'success' | 'error';
interface Toast {
  id: string;
  message: string;
  type: ToastType;
}
const ToastContext = createContext<{ showToast: (msg: string, type: ToastType) => void }>({ showToast: () => {} });

type ViewState = 'dashboard' | 'transactions' | 'cards' | 'budgets' | 'news' | 'import' | 'settings';

// Sidebar Item Component
const NavItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast Logic
  const showToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  // Data State via React Query Hooks
  const deleteMutation = useDeleteTransaction({
    onSuccess: () => showToast('Transaction deleted successfully', 'success'),
    onError: () => showToast('Failed to delete transaction', 'error'),
  });

  const { data: transactions = [], isLoading: loadingTransactions, isError, error } = useTransactions();
  const { data: stats = null, isLoading: loadingStats } = useDashboardStats();
  const { data: cards = [], isLoading: loadingCards } = useCards();
  
  const isLoading = loadingTransactions || loadingStats || loadingCards;

  // Global Error Handler for Query
  useEffect(() => {
    if (isError && error) {
      showToast(error.message || 'Failed to fetch data', 'error');
    }
  }, [isError, error]);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleCreateSuccess = () => {
    showToast('Transaction saved successfully', 'success');
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <Dashboard stats={stats} isLoading={isLoading} />
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                <button 
                  onClick={() => setCurrentView('transactions')}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View All
                </button>
              </div>
              <TransactionTable 
                transactions={transactions.slice(0, 5)} 
                loading={isLoading} 
                cards={cards} 
              />
            </div>
          </div>
        );
      case 'transactions':
        return (
          <TransactionsView 
            transactions={transactions} 
            loading={isLoading} 
            cards={cards} 
            onDelete={handleDelete}
            isDeleting={deleteMutation.isPending}
            error={isError ? error : null}
            showToast={showToast}
          />
        );
      case 'cards':
        return (
          <CardsView cards={cards} loading={isLoading} />
        );
      case 'budgets':
        return (
          <BudgetView />
        );
      case 'news':
        return (
          <NewsView />
        );
      case 'import':
        return (
          <ImportView />
        );
      case 'settings':
        return (
          <SettingsView darkMode={darkMode} setDarkMode={setDarkMode} />
        );
      default:
        return null;
    }
  };

  const getHeaderTitle = () => {
    switch(currentView) {
      case 'dashboard': return 'Financial Overview';
      case 'transactions': return 'All Transactions';
      case 'cards': return 'My Cards';
      case 'budgets': return 'Budget Management';
      case 'news': return 'Market News';
      case 'import': return 'Import Data';
      case 'settings': return 'System Settings';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden font-sans">
        
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">C</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">CC-Expense</h1>
            </div>
            
            <nav className="space-y-2">
              <NavItem 
                onClick={() => setCurrentView('dashboard')} 
                active={currentView === 'dashboard'} 
                icon={<LayoutDashboard size={20} />} 
                label="Dashboard" 
              />
              <NavItem 
                onClick={() => setCurrentView('transactions')} 
                active={currentView === 'transactions'} 
                icon={<Receipt size={20} />} 
                label="Transactions" 
              />
              <NavItem 
                onClick={() => setCurrentView('cards')} 
                active={currentView === 'cards'} 
                icon={<CreditCard size={20} />} 
                label="Cards" 
              />
              <NavItem 
                onClick={() => setCurrentView('budgets')} 
                active={currentView === 'budgets'} 
                icon={<PieChart size={20} />} 
                label="Budgets" 
              />
              <NavItem 
                onClick={() => setCurrentView('news')} 
                active={currentView === 'news'} 
                icon={<Newspaper size={20} />} 
                label="News & AI" 
              />
              <NavItem 
                onClick={() => setCurrentView('import')} 
                active={currentView === 'import'} 
                icon={<Upload size={20} />} 
                label="Import CSV" 
              />
              <NavItem 
                onClick={() => setCurrentView('settings')} 
                active={currentView === 'settings'} 
                icon={<Settings size={20} />} 
                label="Settings" 
              />
            </nav>
          </div>

          <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
               <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">AU</div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-slate-900 dark:text-white truncate">Admin User</p>
                 <p className="text-xs text-slate-500 truncate">admin@corp.com</p>
               </div>
               <button className="text-slate-400 hover:text-slate-600"><LogOut size={16} /></button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          {/* Header */}
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{getHeaderTitle()}</h2>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              <button 
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus size={18} />
                Add Expense
              </button>
            </div>
          </header>

          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto">
              {renderContent()}
            </div>
          </div>

          {/* Toast Container */}
          <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
              <div 
                key={toast.id} 
                className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-right-10 fade-in duration-300 ${
                  toast.type === 'success' 
                    ? 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-white dark:bg-slate-800 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400'
                }`}
              >
                {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <p className="text-sm font-medium pr-4 text-slate-700 dark:text-slate-200">{toast.message}</p>
                <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

        </main>

        {/* Modals */}
        {showModal && (
          <TransactionForm 
            onClose={() => setShowModal(false)} 
            onSuccess={handleCreateSuccess}
            cards={cards}
          />
        )}
      </div>
    </ToastContext.Provider>
  );
};

export default App;