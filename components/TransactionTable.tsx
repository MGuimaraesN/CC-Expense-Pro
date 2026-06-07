import React, { useState } from 'react';
import { Transaction, Currency, CreditCard, TransactionType, TransactionStatus } from '../types';
import { Skeleton } from './ui/Skeleton';
import { Repeat, Layers, Trash2, AlertTriangle, PlusCircle, Edit2, ArrowUpDown, ArrowUp, ArrowDown, ArrowUpCircle, ArrowDownCircle, CheckCircle, Clock, Globe, Pin, MessageSquare } from 'lucide-react';
import { getColorForCategory } from '../utils/colors';
import { MerchantAnalyticsModal } from './MerchantAnalyticsModal';

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
  cards: CreditCard[];
  onDelete?: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
  onStatusToggle?: (transaction: Transaction) => void;
  onPinToggle?: (transaction: Transaction) => void;
  onBulkTagUpdate?: (ids: string[], action: 'add' | 'remove', tag: string) => void;
  onComment?: (transaction: Transaction) => void;
  isDeleting?: boolean;
}

type SortKey = 'date' | 'amount' | 'description';
type SortDirection = 'asc' | 'desc';

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, loading, cards, onDelete, onEdit, onStatusToggle, onPinToggle, onBulkTagUpdate, onComment, isDeleting }) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [merchantAnalytics, setMerchantAnalytics] = useState<string | null>(null);

  const applySmartTags = () => {
    if (!onBulkTagUpdate) return;
    
    // For each selected transaction, find its most common tag based on historical same-description transactions
    const selectedTx = transactions.filter(t => selectedIds.has(t.id));
    
    // simple logic: just collect all historical tags for these descriptions
    // and apply to the selected items
    const descriptionToTags: Record<string, string[]> = {};
    transactions.forEach(t => {
      if (t.tags && t.tags.length > 0) {
         if(!descriptionToTags[t.description]) descriptionToTags[t.description] = [];
         descriptionToTags[t.description].push(...t.tags);
      }
    });

    const updates = new Map<string, string>(); // transactionId -> tag to add
    selectedTx.forEach(t => {
       const historicalTags = descriptionToTags[t.description] || [];
       if (historicalTags.length > 0) {
         // most frequent tag
         const counts = {} as Record<string, number>;
         historicalTags.forEach(tag => {
            counts[tag] = (counts[tag] || 0) + 1;
         });
         const mostFrequent = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
         updates.set(t.id, mostFrequent);
       }
    });

    // We have different tags for different transactions, but our bulk update only supports one tag for an array of IDs.
    // So we group IDs by the tag we want to add
    const tagToIds: Record<string, string[]> = {};
    updates.forEach((tag, id) => {
       if(!tagToIds[tag]) tagToIds[tag] = [];
       tagToIds[tag].push(id);
    });

    Object.entries(tagToIds).forEach(([tag, ids]) => {
      onBulkTagUpdate(ids, 'add', tag);
    });
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const getCardName = (id?: string) => cards.find(c => c.id === id)?.name || '-';
  
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  const handleDeleteClick = (id: string) => setDeleteConfirmId(id);
  
  const handleConfirmDelete = () => {
    if (deleteConfirmId && onDelete) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedTransactions = () => {
    let sorted = [...transactions];

    if (sortConfig) {
      sorted.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle Date Sorting
        if (sortConfig.key === 'date') {
          return sortConfig.direction === 'asc' 
            ? new Date(aVal as string).getTime() - new Date(bVal as string).getTime()
            : new Date(bVal as string).getTime() - new Date(aVal as string).getTime();
        }

        // Handle String Sorting
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }

        // Handle Number Sorting
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }

    // Always bubble pinned transactions to the top
    sorted.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

    return sorted;
  };

  const renderSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-indigo-600" /> : <ArrowDown size={14} className="ml-1 text-indigo-600" />;
  };

  const sortedTransactions = getSortedTransactions();

  if (loading && transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
           <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6 space-y-4">
           {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    )
  }

  const toggleAll = () => {
    if (selectedIds.size === transactions.length && transactions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  if (!loading && transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-12 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
          <PlusCircle size={32} className="text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No transactions found</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
          Try adjusting your filters or add a new expense to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden relative">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Transactions</h3>
            <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300">
              {transactions.length} records
            </span>
          </div>

          {/* Bulk Actions Banner */}
          {selectedIds.size > 0 && onBulkTagUpdate && (
            <div className="flex flex-wrap items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800 animate-in fade-in zoom-in-95">
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">{selectedIds.size} selected</span>
              <div className="w-px h-4 bg-indigo-200 dark:bg-indigo-800" />
              <input 
                type="text" 
                value={bulkTagInput}
                onChange={e => setBulkTagInput(e.target.value)}
                placeholder="Tag name..."
                className="text-sm px-3 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 w-32"
              />
              <button 
                onClick={() => {
                  if (bulkTagInput.trim()) onBulkTagUpdate(Array.from(selectedIds), 'add', bulkTagInput.trim());
                }}
                className="text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition-colors"
              >
                Add Tag
              </button>
              <button 
                onClick={() => {
                  if (bulkTagInput.trim()) onBulkTagUpdate(Array.from(selectedIds), 'remove', bulkTagInput.trim());
                }}
                className="text-xs font-medium bg-white text-slate-700 px-3 py-1.5 rounded border hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
              >
                Remove Tag
              </button>
              <button 
                onClick={applySmartTags}
                className="text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 transition-colors flex items-center gap-1"
                title="Auto-tag based on past usage"
              >
                Smart Tag
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size === transactions.length && transactions.length > 0} 
                    onChange={toggleAll}
                    className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-600"
                  />
                </th>
                <th className="px-6 py-4 w-12 text-center">Type</th>
                <th className="px-6 py-4 w-24">Status</th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">Date {renderSortIcon('date')}</div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  onClick={() => handleSort('description')}
                >
                  <div className="flex items-center">Description {renderSortIcon('description')}</div>
                </th>
                <th className="px-6 py-4">Card / Method</th>
                <th className="px-6 py-4">Tags</th>
                <th 
                  className="px-6 py-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end">Amount {renderSortIcon('amount')}</div>
                </th>
                {(onDelete || onEdit) && <th className="px-6 py-4 text-center w-24">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {sortedTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(t.id)} 
                      onChange={() => toggleSelection(t.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-600"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                     {t.type === TransactionType.INCOME ? (
                       <div className="inline-flex p-1.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                         <ArrowUpCircle size={16} />
                       </div>
                     ) : (
                       <div className="inline-flex p-1.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                         <ArrowDownCircle size={16} />
                       </div>
                     )}
                  </td>
                  <td className="px-6 py-4">
                     <button
                        onClick={() => onStatusToggle && onStatusToggle(t)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                          t.status === TransactionStatus.PAID
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                            : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                        }`}
                        title="Click to toggle status"
                     >
                       {t.status === TransactionStatus.PAID ? (
                         <>
                           <CheckCircle size={12} /> Paid
                         </>
                       ) : (
                         <>
                           <Clock size={12} /> Pending
                         </>
                       )}
                     </button>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                        {formatDate(t.date)}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {t.isPinned && <Pin size={12} className="text-indigo-600 fill-indigo-600 dark:text-indigo-400 dark:fill-indigo-400" />}
                        <span 
                           className="text-slate-900 dark:text-white font-medium text-sm cursor-pointer hover:underline decoration-indigo-300 dark:decoration-indigo-700 underline-offset-4"
                           onClick={() => setMerchantAnalytics(t.description)}
                        >
                           {t.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColorForCategory(t.category) }} />
                          {t.category}
                        </span>
                        {t.isInstallment && (
                          <span className="flex items-center gap-1 text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                            <Layers size={10} /> {t.installmentNumber}/{t.totalInstallments}
                          </span>
                        )}
                        {t.isRecurring && (
                           <span className="flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900">
                            <Repeat size={10} /> Monthly
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${t.cardId ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'}`}>
                      {getCardName(t.cardId)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {t.tags && t.tags.length > 0 ? t.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                             {tag}
                          </span>
                        )) : <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`font-semibold text-sm ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                        {t.type === TransactionType.INCOME ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: t.currency }).format(t.amount)}
                      </span>
                      {/* Foreign Currency Indicator */}
                      {t.originalAmount && t.originalCurrency && t.originalCurrency !== Currency.BRL && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Globe size={10} /> {new Intl.NumberFormat('en-US', { style: 'currency', currency: t.originalCurrency }).format(t.originalAmount)}
                        </span>
                      )}
                    </div>
                  </td>
                  {(onDelete || onEdit || onPinToggle || onComment) && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                         {onComment && (
                          <button 
                            onClick={() => onComment(t)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors relative"
                            title="Notes / Comments"
                          >
                            <MessageSquare size={16} />
                            {(t.comments && t.comments.length > 0) && (
                              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-slate-800" />
                            )}
                          </button>
                        )}
                         {onPinToggle && (
                          <button 
                            onClick={() => onPinToggle(t)}
                            className={`p-2 rounded-lg transition-colors ${t.isPinned ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                            title={t.isPinned ? "Unpin transaction" : "Pin transaction"}
                          >
                            <Pin size={16} />
                          </button>
                        )}
                         {onEdit && (
                          <button 
                            onClick={() => onEdit(t)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit transaction"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {onDelete && (
                          <button 
                            onClick={() => handleDeleteClick(t.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete Transaction?</h3>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              Are you sure you want to delete this transaction? This action cannot be undone and will affect your dashboard statistics.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-lg shadow-red-500/20 transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {merchantAnalytics && (
         <MerchantAnalyticsModal 
            merchant={merchantAnalytics}
            transactions={transactions}
            onClose={() => setMerchantAnalytics(null)}
         />
      )}
    </>
  );
};