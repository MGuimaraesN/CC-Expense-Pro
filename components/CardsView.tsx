import React from 'react';
import { CreditCard } from '../types';
import { Skeleton } from './ui/Skeleton';
import { Plus, Wifi } from 'lucide-react';

interface CardsViewProps {
  cards: CreditCard[];
  loading: boolean;
}

export const CardsView: React.FC<CardsViewProps> = ({ cards, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-end">
        <button className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
          <Plus size={16} /> Add New Card
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div 
            key={card.id} 
            className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-xl transition-transform hover:-translate-y-1 ${card.color || 'bg-slate-800'}`}
          >
            {/* Background Decor */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black opacity-10 rounded-full blur-2xl" />

            <div className="relative z-10 flex flex-col h-48 justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg tracking-wide">{card.name}</h3>
                  <p className="text-xs opacity-75">Credit Card</p>
                </div>
                <Wifi size={24} className="opacity-75" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-4 text-lg tracking-widest font-mono opacity-90">
                  <span>••••</span>
                  <span>••••</span>
                  <span>••••</span>
                  <span>{card.last4Digits}</span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs opacity-75 mb-1">Total Limit</p>
                  <p className="font-semibold">{formatCurrency(card.limit)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-75 mb-1">Closing Day</p>
                  <p className="font-semibold">{card.closingDay}</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add Card Placeholder */}
        <button className="h-full min-h-[14rem] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-900/50">
          <Plus size={32} className="mb-2" />
          <span className="font-medium">Link new card</span>
        </button>
      </div>

      {/* Card Details / Analysis Section */}
      <div className="mt-10 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Limit Utilization</h3>
        <div className="space-y-4">
          {cards.map(card => {
             // Mock utilization for visualization
             const randomUtil = Math.floor(Math.random() * 80) + 10;
             return (
               <div key={card.id}>
                 <div className="flex justify-between text-sm mb-1">
                   <span className="text-slate-700 dark:text-slate-300">{card.name}</span>
                   <span className="text-slate-500">{randomUtil}%</span>
                 </div>
                 <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                   <div 
                      className={`h-2.5 rounded-full ${randomUtil > 75 ? 'bg-red-500' : 'bg-indigo-600'}`} 
                      style={{ width: `${randomUtil}%` }}
                    ></div>
                 </div>
               </div>
             )
          })}
        </div>
      </div>
    </div>
  );
};