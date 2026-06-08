import React, { useState } from 'react';
import { CreditCardPreview } from './CreditCardPreview';
import { CardForm } from './CardForm';
import { Skeleton } from './ui/Skeleton';
import { Plus, Edit2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface CardsViewProps {
  cards: any[];
  loading: boolean;
  onSuccess?: () => void;
}

export const CardsView: React.FC<CardsViewProps> = ({ cards, loading, onSuccess }) => {
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<any | null>(null);

  const handleEdit = (card: any) => {
    setEditingCard(card);
    setShowCardModal(true);
  };

  const handleClose = () => {
    setShowCardModal(false);
    setEditingCard(null);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
         <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
               <ShieldCheck size={20} className="text-indigo-500" /> Secure Cards
            </h2>
            <p className="text-xs text-slate-500">Manage your credit cards securely. We do not store sensitive data like full numbers or CVV.</p>
         </div>
         <button 
          onClick={() => setShowCardModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} /> Novo Cartão
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {cards.map((card) => {
           let validity = undefined;
           if (card.expirationMonth && card.expirationYear) {
               validity = `${card.expirationMonth.toString().padStart(2, '0')}/${card.expirationYear.toString().slice(-2)}`;
           }
           const utilizedPct = card.usagePercentage || 0;
           return (
              <div key={card.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-6 relative group transform transition">
                  <div className="absolute top-4 right-4 z-20">
                    <button onClick={() => handleEdit(card)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                       <Edit2 size={18} />
                    </button>
                  </div>
                  
                  <div className="shrink-0 flex items-center justify-center">
                    <CreditCardPreview 
                      name={card.name}
                      bankName={card.bankName}
                      brand={card.brand}
                      level={card.level}
                      lastFourDigits={card.lastFourDigits}
                      holderName={card.holderName}
                      validity={validity}
                      color={card.color}
                      size="sm"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center space-y-4">
                     <div>
                       <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate max-w-[200px] md:max-w-xs">{card.name}</h3>
                       <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${card.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{card.isActive ? 'Ativo' : 'Inativo'}</span>
                          {card.isDefault && <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Padrão</span>}
                       </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <p className="text-xs text-slate-500 mb-0.5">Fechamento</p>
                           <p className="font-semibold text-slate-900 dark:text-white text-sm">Dia {card.closingDay}</p>
                        </div>
                        <div>
                           <p className="text-xs text-slate-500 mb-0.5">Vencimento</p>
                           <p className="font-semibold text-slate-900 dark:text-white text-sm">Dia {card.dueDay}</p>
                        </div>
                     </div>

                     <div>
                        <div className="flex justify-between text-sm mb-1.5 font-medium">
                           <span className="text-slate-500">Limite Usado</span>
                           <span className={utilizedPct > 80 ? 'text-red-500' : 'text-slate-900 dark:text-white'}>{formatCurrency(card.usedLimit)} / {formatCurrency(card.limit)}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                           <div 
                              className={`h-2 rounded-full ${utilizedPct > 80 ? 'bg-red-500' : 'bg-indigo-600'}`} 
                              style={{ width: `${Math.min(utilizedPct, 100)}%` }}
                           ></div>
                        </div>
                        <div className="flex justify-between text-xs mt-1.5 text-slate-500 font-medium">
                           <span>{utilizedPct.toFixed(1)}% utilizado</span>
                           <span>{formatCurrency(card.availableLimit)} dsps.</span>
                        </div>
                        {utilizedPct > 80 && (
                           <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-50 dark:bg-red-900/10 p-1.5 rounded">
                              <AlertTriangle size={12} /> Limite próximo do total. Cuidado ao comprar.
                           </div>
                        )}
                     </div>
                  </div>
              </div>
           );
        })}
      </div>

      {showCardModal && (
        <CardForm 
          onClose={handleClose} 
          onSuccess={() => onSuccess && onSuccess()}
          initialData={editingCard}
        />
      )}
    </div>
  );
};
