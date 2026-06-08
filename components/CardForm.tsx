import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CreditCardPreview } from './CreditCardPreview';

const cardSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  bankName: z.string().min(1, 'Banco obrigatório'),
  brand: z.string().min(1, 'Bandeira obrigatória'),
  level: z.string().min(1, 'Nível obrigatório'),
  lastFourDigits: z.string().length(4, 'Deve conter exatos 4 dígitos').regex(/^\d+$/, 'Apenas números'),
  holderName: z.string().optional(),
  expirationMonth: z.string().optional(),
  expirationYear: z.string().optional(),
  limit: z.number().min(0, 'Limite não pode ser negativo'),
  closingDay: z.number().min(1).max(31, 'Dia Inválido'),
  dueDay: z.number().min(1).max(31, 'Dia Inválido'),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional()
});

type CardFormValues = z.infer<typeof cardSchema>;

export const CardForm: React.FC<{ onClose: () => void, onSuccess: () => void, initialData?: any }> = ({ onClose, onSuccess, initialData }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewValues, setPreviewValues] = useState<any>(initialData || {
      name: '', bankName: '', brand: 'MASTERCARD', level: 'STANDARD', lastFourDigits: '', holderName: '', expirationMonth: '', expirationYear: '', color: ''
  });

  const { register, handleSubmit, watch, formState: { errors, isValid, isSubmitting } } = useForm<CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: initialData ? {
        ...initialData,
        expirationMonth: initialData.expirationMonth || '',
        expirationYear: initialData.expirationYear || '',
        isActive: initialData.isActive ?? true,
        isDefault: initialData.isDefault ?? false,
    } : {
        brand: 'MASTERCARD',
        level: 'STANDARD',
        isActive: true,
        isDefault: false
    },
    mode: 'onChange'
  });

  // Watch for preview changes
  useEffect(() => {
     const subscription = watch((value) => setPreviewValues(value));
     return () => subscription.unsubscribe();
  }, [watch]);

  const onSubmit = async (data: CardFormValues) => {
    try {
      const { apiClient } = await import('../services/apiClient');
      const url = initialData ? `/cards/${initialData.id}` : '/cards';
      const method = initialData ? 'PUT' : 'POST';
      
      await apiClient(url, {
         method,
         body: JSON.stringify(data)
      });
      toast.success(`Cartão ${initialData ? 'atualizado' : 'cadastrado'} com sucesso`);
      onSuccess();
      onClose();
    } catch(e: any) {
      toast.error(e.message || 'Erro ao salvar cartão');
    }
  };

  const handleDelete = async () => {
     if(!confirm('Tem certeza que deseja excluir? Se houver transações vinculadas, o cartão será apenas desativado.')) return;
     try {
       setIsDeleting(true);
       const { apiClient } = await import('../services/apiClient');
       await apiClient(`/cards/${initialData.id}`, { method: 'DELETE' });
       toast.success('Cartão excluído com sucesso');
       onSuccess();
       onClose();
     } catch(e: any) {
       toast.error(e.message || 'Erro ao deletar');
     } finally {
       setIsDeleting(false);
     }
  };

  let validity = undefined;
  if (previewValues.expirationMonth && previewValues.expirationYear) {
      let m = previewValues.expirationMonth.toString();
      if(m.length === 1) m = `0${m}`;
      let y = previewValues.expirationYear.toString();
      if(y.length > 2) y = y.slice(-2);
      validity = `${m}/${y}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto pt-20 pb-20">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden max-h-full">
         
         {/* Live Preview Side */}
         <div className="bg-slate-50 dark:bg-slate-800 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 w-full md:w-2/5">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-8 w-full text-center">Live Preview</h3>
            <CreditCardPreview 
               name={previewValues.name}
               bankName={previewValues.bankName}
               brand={previewValues.brand}
               level={previewValues.level}
               lastFourDigits={previewValues.lastFourDigits}
               holderName={previewValues.holderName}
               validity={validity}
               color={previewValues.color}
               size="md"
            />
         </div>

         {/* Form Side */}
         <div className="p-6 md:p-8 w-full md:w-3/5 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {initialData ? 'Editar Cartão' : 'Novo Cartão'}
                </h2>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg dark:hover:text-slate-300">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
               {/* 1. Nome e Banco */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Apelido do Cartão *</label>
                    <input {...register('name')} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="ex: Nubank Pessoal" />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Banco Emissor *</label>
                    <input {...register('bankName')} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="ex: Nubank, Itaú..." />
                    {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName.message}</p>}
                  </div>
               </div>

               {/* 2. Brand e Level */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bandeira *</label>
                    <select {...register('brand')} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                        <option value="MASTERCARD">Mastercard</option>
                        <option value="VISA">Visa</option>
                        <option value="ELO">Elo</option>
                        <option value="AMEX">American Express</option>
                        <option value="HIPERCARD">Hipercard</option>
                        <option value="DINERS">Diners Club</option>
                        <option value="DISCOVER">Discover</option>
                        <option value="AURA">Aura</option>
                        <option value="OTHER">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nível *</label>
                    <select {...register('level')} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                        <option value="STANDARD">Standard</option>
                        <option value="GOLD">Gold</option>
                        <option value="PLATINUM">Platinum</option>
                        <option value="BLACK">Black</option>
                        <option value="INFINITE">Infinite</option>
                        <option value="SIGNATURE">Signature</option>
                        <option value="NANQUIM">Nanquim</option>
                        <option value="GRAPHITE">Graphite</option>
                        <option value="UNIQUE">Unique</option>
                        <option value="OTHER">Outro</option>
                    </select>
                  </div>
               </div>

               {/* 3. Numbers and Names */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Final 4 Dígitos *</label>
                    <input {...register('lastFourDigits')} maxLength={4} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono" placeholder="1234" />
                    {errors.lastFourDigits && <p className="text-red-500 text-xs mt-1">{errors.lastFourDigits.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome no Cartão</label>
                    <input {...register('holderName')} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white uppercase" placeholder="JOAO S SILVA" />
                  </div>
               </div>

               {/* 4. Validade e Cor */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Validade (MM/AÑO)</label>
                    <div className="flex gap-2">
                       <input {...register('expirationMonth')} maxLength={2} placeholder="MM" className="w-1/2 px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white text-center" />
                       <input {...register('expirationYear')} maxLength={4} placeholder="YYYY" className="w-1/2 px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white text-center" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tema Personalizado (opcional)</label>
                    <input {...register('color')} placeholder="ex: bg-red-500" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                  </div>
               </div>

               {/* 5. Valores financeiros */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Limite Total *</label>
                    <input type="number" step="0.01" {...register('limit', { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    {errors.limit && <p className="text-red-500 text-xs mt-1">{errors.limit.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fechamento *</label>
                    <input type="number" {...register('closingDay', { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    {errors.closingDay && <p className="text-red-500 text-xs mt-1">{errors.closingDay.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vencimento *</label>
                    <input type="number" {...register('dueDay', { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                    {errors.dueDay && <p className="text-red-500 text-xs mt-1">{errors.dueDay.message}</p>}
                  </div>
               </div>

               {/* 6. Status Options */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                 <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <input type="checkbox" {...register('isActive')} className="w-4 h-4 text-indigo-600 rounded" />
                    <div className="flex flex-col">
                       <span className="text-sm font-medium dark:text-white">Cartão Ativo</span>
                       <span className="text-xs text-slate-500">Pode ser usado em novas transações</span>
                    </div>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <input type="checkbox" {...register('isDefault')} className="w-4 h-4 text-indigo-600 rounded" />
                    <div className="flex flex-col">
                       <span className="text-sm font-medium dark:text-white">Tornar Padrão</span>
                       <span className="text-xs text-slate-500">Será pré-selecionado por padrão</span>
                    </div>
                 </label>
               </div>

               <div className="border-t dark:border-slate-700 pt-6 mt-6 flex justify-between">
                  {initialData ? (
                     <button type="button" onClick={handleDelete} disabled={isDeleting} className="text-red-600 hover:bg-red-50 flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors dark:hover:bg-red-900/20">
                       <Trash2 size={18} /> {isDeleting ? 'Excluindo...' : 'Excluir'}
                     </button>
                  ) : <div />}

                  <div className="flex gap-4">
                     <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 hover:bg-slate-100 font-medium rounded-lg transition-colors dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                     <button type="submit" disabled={isSubmitting || !isValid} className="px-6 py-2 bg-indigo-600 font-medium text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50">
                       <Save size={18} /> Salvar Cartão
                     </button>
                  </div>
               </div>
            </form>
         </div>
      </div>
    </div>
  );
};
