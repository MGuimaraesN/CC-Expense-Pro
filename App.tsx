import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Receipt, CreditCard, Settings, Plus, Sun, Moon, LogOut, X, Newspaper, PieChart, Upload, Menu, Search, Activity, RefreshCw, CheckCircle2, HelpCircle } from 'lucide-react';

import { Dashboard } from './components/Dashboard';
import { TransactionTable } from './components/TransactionTable';
import { TransactionForm } from './components/TransactionForm';
import { CardsView } from './components/CardsView';
import { SettingsView } from './components/SettingsView';
import { TransactionsView } from './components/TransactionsView';
import { NewsView } from './components/NewsView';
import { BudgetView } from './components/BudgetView';
import { ImportView } from './components/ImportView';
import { LoginView } from './components/LoginView';
import { UserManagementView } from './components/UserManagementView';
import { MonthlyReportsView } from './components/MonthlyReportsView';
import { SystemLogsView } from './components/SystemLogsView';
import { RecurringBillsView } from './components/RecurringBillsView';
import { useTransactions, useCards, useDashboardStats, useCreateTransaction, useDeleteTransaction } from './hooks/useTransactions';
import { isAuthenticated, logout, getUserProfile, updateUserProfile } from './services/userService';
import { Toaster, toast } from 'sonner';
import { monkeyPatchFetch } from './utils/apiLogger';
import { useIsMutating } from '@tanstack/react-query';

monkeyPatchFetch();

type ViewState = 'dashboard' | 'transactions' | 'cards' | 'budgets' | 'recurring' | 'news' | 'import' | 'settings' | 'user' | 'reports' | 'logs';

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
  const [isAuth, setIsAuth] = useState(false);
  const [darkMode, setDarkMode] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const [showModal, setShowModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>({ name: 'Loading', email: '' });
  const [globalSearchText, setGlobalSearchText] = useState('');

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      
      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        setShowModal(true);
      } else if (key === '?') {
        e.preventDefault();
        setShowHelpModal(true);
      } else if (key === 's') {
        e.preventDefault();
        setCurrentView('settings');
      } else if (key === 'd') {
        e.preventDefault();
        setCurrentView('dashboard');
      } else if (key === 't') {
        e.preventDefault();
        setCurrentView('transactions');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check Auth on Mount & Fix F5 Refresh Logic
  useEffect(() => {
    const authStatus = isAuthenticated();
    setIsAuth(authStatus);
    if (!authStatus && window.location.pathname !== '/' && window.location.pathname !== '/login') {
       // Simple hash routing protection or state reset
       setCurrentView('dashboard');
    }
  }, []);

  // Update Profile when view changes (simple sync)
  useEffect(() => {
    if(currentView === 'dashboard' || currentView === 'user') {
        getUserProfile().then(profile => {
          setUserProfile(profile);
          if (profile.darkMode !== undefined && profile.darkMode !== null) {
            setDarkMode(profile.darkMode);
          }
        }).catch(console.error);
    }
  }, [currentView, isAuth]);

  // Toggle Dark Mode
  const toggleDarkMode = async () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    if (userProfile && userProfile.id) {
       try {
         await updateUserProfile({ ...userProfile, darkMode: newVal });
       } catch (e) {
         console.error('Failed to save profile theme preference');
       }
    }
  };

  // Data State via React Query Hooks (only enabled if auth)
  const isMutating = useIsMutating();
  const deleteMutation = useDeleteTransaction({
    onSuccess: () => toast.success('Transaction deleted successfully'),
    onError: () => toast.error('Failed to delete transaction'),
  });

  const { data: transactions = [], isLoading: loadingTransactions, isError, error } = useTransactions();
  const { data: stats = null, isLoading: loadingStats } = useDashboardStats();
  const { data: cards = [], isLoading: loadingCards } = useCards();
  
  const isLoading = loadingTransactions || loadingStats || loadingCards;

  // Calculate unique tags for autocomplete
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    transactions.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [transactions]);

  // Global Error Handler for Query
  useEffect(() => {
    if (isError && error && isAuth) {
      toast.error(error.message || 'Failed to fetch data');
    }
  }, [isError, error, isAuth]);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleCreateSuccess = () => {
    toast.success('Transaction saved successfully');
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleNavClick = (view: ViewState) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsAuth(false);
    toast.info('Logged out successfully');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <Dashboard stats={stats} isLoading={isLoading} transactions={transactions} />
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
            showToast={(msg, type) => type === 'success' ? toast.success(msg) : toast.error(msg)}
            globalSearchText={globalSearchText}
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
      case 'recurring':
        return (
          <RecurringBillsView 
            transactions={transactions} 
            onUpdate={async (id, updates) => {
              // we can re-use update logic
              await fetch(`/api/transactions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
              });
              // We'd ideally invalidate query but re-fetching can take a second, 
              // for now let's just trigger a toast in the component. The user needs to refresh or we can mutate local state.
              // Actually since we use react-query we shouldn't mutate here directly, but the instructions only need partial update.
              // Let's implement full invalidation.
              const { queryClient } = await import('./index'); // Need query client to invalidate
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
            }}
          />
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
      case 'reports':
        return (
          <MonthlyReportsView transactions={transactions} />
        );
      case 'logs':
        return (
          <SystemLogsView />
        );
      case 'user':
        return (
          <UserManagementView />
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
      case 'recurring': return 'Recurring Bills';
      case 'news': return 'Market News';
      case 'reports': return 'Monthly Reports';
      case 'import': return 'Import Data';
      case 'settings': return 'System Settings';
      case 'logs': return 'System Logs';
      case 'user': return 'User Profile';
    }
  };

  // Login View Wrapper
  if (!isAuth) {
    return (
        <div className="text-slate-900 dark:text-slate-100 dark:bg-slate-950 transition-colors duration-200">
             <LoginView onLoginSuccess={() => setIsAuth(true)} />
             <div className="absolute top-4 right-4 z-50">
               <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-slate-500 dark:text-slate-300 transition-colors"
               >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
             </div>
        </div>
    );
  }

  const NavigationContent = () => (
    <>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">C</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">CC-Expense</h1>
        </div>
        
        <nav className="space-y-2">
          <NavItem 
            onClick={() => handleNavClick('dashboard')} 
            active={currentView === 'dashboard'} 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
          />
          <NavItem 
            onClick={() => handleNavClick('transactions')} 
            active={currentView === 'transactions'} 
            icon={<Receipt size={20} />} 
            label="Transactions" 
          />
          <NavItem 
            onClick={() => handleNavClick('cards')} 
            active={currentView === 'cards'} 
            icon={<CreditCard size={20} />} 
            label="Cards" 
          />
          <NavItem 
            onClick={() => handleNavClick('budgets')} 
            active={currentView === 'budgets'} 
            icon={<PieChart size={20} />} 
            label="Budgets" 
          />
          <NavItem 
            onClick={() => handleNavClick('recurring')} 
            active={currentView === 'recurring'} 
            icon={<RefreshCw size={20} />} 
            label="Recurring Bills" 
          />
          <NavItem 
            onClick={() => handleNavClick('reports')} 
            active={currentView === 'reports'} 
            icon={<PieChart size={20} />} 
            label="Monthly Reports" 
          />
          <NavItem 
            onClick={() => handleNavClick('news')} 
            active={currentView === 'news'} 
            icon={<Newspaper size={20} />} 
            label="News & AI" 
          />
          <NavItem 
            onClick={() => handleNavClick('import')} 
            active={currentView === 'import'} 
            icon={<Upload size={20} />} 
            label="Import Data" 
          />
          <NavItem 
            onClick={() => handleNavClick('logs')} 
            active={currentView === 'logs'} 
            icon={<Activity size={20} />} 
            label="System Logs" 
          />
          <NavItem 
            onClick={() => handleNavClick('settings')} 
            active={currentView === 'settings'} 
            icon={<Settings size={20} />} 
            label="Settings" 
          />
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group" onClick={() => handleNavClick('user')}>
           <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden">
             {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
             ) : (
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{userProfile.name.charAt(0)}</span>
             )}
           </div>
           <div className="flex-1 min-w-0">
             <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{userProfile.name}</p>
             <p className="text-xs text-slate-500 truncate">{userProfile.email}</p>
           </div>
           <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="text-slate-400 hover:text-red-500 transition-colors">
             <LogOut size={16} />
           </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden font-sans">
        
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col">
           <NavigationContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
             <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
                 <div className="absolute right-4 top-4">
                   <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                     <X size={24} />
                   </button>
                 </div>
                 <NavigationContent />
             </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          {/* Header */}
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => setMobileMenuOpen(true)}
                 className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400"
               >
                 <Menu size={24} />
               </button>
               <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate lg:w-48 xl:w-auto">{getHeaderTitle()}</h2>
            </div>
            
            <div className="hidden md:block flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Global Search (Merchant, Notes)..." 
                  value={globalSearchText}
                  onChange={(e) => {
                    setGlobalSearchText(e.target.value);
                    if (e.target.value && currentView !== 'transactions') {
                      setCurrentView('transactions');
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <div title={isMutating ? 'Syncing with database' : 'All changes saved to database'} className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${isMutating ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                {isMutating ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                {isMutating ? 'Syncing...' : 'Synced'}
              </div>

              <button 
                onClick={toggleDarkMode}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Toggle Theme"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              <button 
                onClick={() => setShowHelpModal(true)}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Keyboard Shortcuts (?)"
              >
                <HelpCircle size={20} />
              </button>
              
              <button 
                onClick={() => setShowModal(true)}
                title="Add Expense (Shortcut: n)"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Expense</span>
              </button>
            </div>
          </header>

          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {renderContent()}
            </div>
          </div>

        </main>

        {/* Modals */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
              <button onClick={() => setShowHelpModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Keyboard Shortcuts</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">New Transaction</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded-md text-sm font-mono text-slate-700 dark:text-slate-300">n</kbd></div>
                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Go to Dashboard</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded-md text-sm font-mono text-slate-700 dark:text-slate-300">d</kbd></div>
                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Go to Transactions</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded-md text-sm font-mono text-slate-700 dark:text-slate-300">t</kbd></div>
                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Go to Settings</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded-md text-sm font-mono text-slate-700 dark:text-slate-300">s</kbd></div>
                <div className="flex justify-between items-center"><span className="text-slate-600 dark:text-slate-300">Show Shortcuts</span><kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded-md text-sm font-mono text-slate-700 dark:text-slate-300">?</kbd></div>
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <TransactionForm 
            onClose={() => setShowModal(false)} 
            onSuccess={handleCreateSuccess}
            cards={cards}
            availableTags={availableTags}
          />
        )}
      </div>
    </>
  );
};

export default App;