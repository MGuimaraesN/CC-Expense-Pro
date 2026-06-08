import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CreditCardPreview } from './CreditCardPreview';
import { motion } from 'motion/react';

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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full grid grid-cols-1 lg:grid-cols-5 overflow-hidden my-auto border border-slate-200/50 dark:border-slate-700/50"
      >
         
         {/* Live Preview Side */}
         <div className="bg-slate-50/50 dark:bg-slate-800/20 p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 w-full lg:col-span-2 relative">
            <button onClick={onClose} className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-300 lg:hidden transition-colors">
                <X size={20} />
            </button>
            <div className="flex-1 flex flex-col items-center justify-center w-full">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-8 w-full text-center">Live Preview</span>
              <div className="transform scale-90 sm:scale-100 transition-transform origin-center">
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
            </div>
         </div>

         {/* Form Side */}
         <div className="flex flex-col w-full lg:col-span-3 max-h-[85vh]">
            <div className="flex justify-between items-center p-6 lg:p-8 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {initialData ? 'Editar Cartão' : 'Conectar Novo Cartão'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 tracking-tight mt-1">Configure as informações comerciais e características de uso.</p>
                </div>
                <button onClick={onClose} className="hidden lg:flex p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="p-6 lg:p-8 overflow-y-auto custom-scrollbar">
              <form id="card-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Section: Identificação */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2"></span>
                    Identificação
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Apelido do Cartão <span className="text-red-400">*</span></label>
                        <input {...register('name')} className="w-full px-4 py-2.5 outline-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800/50 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400" placeholder="ex: Nubank Pessoal" />
                        {errors.name && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.name.message}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Banco Emissor <span className="text-red-400">*</span></label>
                        <input {...register('bankName')} className="w-full px-4 py-2.5 outline-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800/50 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400" placeholder="ex: Nubank, Itaú..." />
                        {errors.bankName && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.bankName.message}</p>}
                      </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800/80"></div>

                {/* Section: Modalidade */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>
                    Modalidade
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Bandeira <span className="text-red-400">*</span></label>
                        <select {...register('brand')} className="w-full px-4 py-2.5 outline-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800/50 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer">
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
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nível <span className="text-red-400">*</span></label>
                        <select {...register('level')} className="w-full px-4 py-2.5 outline-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800/50 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer">
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
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800/80"></div>

                {/* Section: Dados Práticos */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                    Dados Impressos
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                      <div className="sm:col-span-4">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Final 4 Dígitos <span className="text-red-400">*</span></label>
                        <input {...register('lastFourDigits')} 
                           onChange={(e) => {
                             e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
                             register('lastFourDigits').onChange(e);
                           }}
                           maxLength={4} className="w-full px-4 py-2.5 outline-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800/50 dark:text-white font-mono tracking-widest focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400" placeholder="1234" />
                        {errors.lastFourDigits && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.lastFourDigits.message}</p>}
                      </div>
                      <div className="sm:col-span-8">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Validade (MM/AAAA)</label>
                        <div className="flex gap-2">
                          <input {...register('expirationMonth')} 
                            onChange={(e) => {
                               e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2);
                               register('expirationMonth').onChange(e);
                            }}
                            maxLength={2} placeholder="MM" className="w-20 px-4 py-2.5 outline-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800/50 dark:text-white text-center font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                          <span className="text-slate-400 mt-2.5 text-xl">/</span>
                          <input {...register('expirationYear')} 
                            onChange={(e) => {
                               e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
                               register('expirationYear').onChange(e);
                            }}
                            maxLength={4} placeholder="AAAA" className="w-28 px-4 py-2.5 outline-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800/50 dark:text-white text-center font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                        </div>
                      </div>
                      <div className="sm:col-span-12">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nome Impresso</label>
                        <input {...register('holderName')} className="w-full px-4 py-2.5 outline-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800/50 dark:text-white uppercase font-mono tracking-wider focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400" placeholder="JOAO S SILVA" />
                      </div>
                      <div className="sm:col-span-12">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tema Visual (opcional)</label>
                        <select {...register('color')} className="w-full px-4 py-2.5 outline-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800/50 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                            <option value="">Padrão (Preto/Cinza Escuro)</option>
                            <option value="bg-gradient-to-tr from-purple-800 to-indigo-900">Roxo Premium (Ultravioleta)</option>
                            <option value="bg-gradient-to-br from-orange-400 to-orange-600">Laranja Vibrante</option>
                            <option value="bg-gradient-to-r from-blue-600 to-blue-800">Azul Clássico</option>
                            <option value="bg-gradient-to-r from-emerald-500 to-teal-700">Verde Esmeralda</option>
                            <option value="bg-gradient-to-bl from-slate-900 to-black">Obsidian Black Card</option>
                            <option value="bg-gradient-to-br from-red-500 to-rose-700">Vermelho Intenso</option>
                            <option value="bg-gradient-to-br from-yellow-400 to-yellow-600">Ouro / Gold</option>
                            <option value="bg-gradient-to-br from-slate-300 to-slate-400">Prata / Platinum</option>
                        </select>
                      </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800/80"></div>

                {/* Section: Financeiro */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2"></span>
                    Gestão Financeira
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Limite Total <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <span className="absolute left-4 top-2.5 text-slate-400">R$</span>
                          <input type="number" step="0.01" {...register('limit', { valueAsNumber: true })} className="w-full pl-10 pr-4 py-2.5 outline-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800/50 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="0.00" />
                        </div>
                        {errors.limit && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.limit.message}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Dia de Fechamento <span className="text-red-400">*</span></label>
                        <input type="number" {...register('closingDay', { valueAsNumber: true })} className="w-full px-4 py-2.5 outline-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800/50 dark:text-white text-center focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono" placeholder="Dia" />
                        {errors.closingDay && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.closingDay.message}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Dia de Vencimento <span className="text-red-400">*</span></label>
                        <input type="number" {...register('dueDay', { valueAsNumber: true })} className="w-full px-4 py-2.5 outline-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800/50 dark:text-white text-center focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono" placeholder="Dia" />
                        {errors.dueDay && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.dueDay.message}</p>}
                      </div>
                  </div>
                </div>

                {/* Section: Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 bg-slate-50/50 dark:bg-slate-800/20 p-4 border border-slate-200/50 dark:border-slate-700/50 rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-lg transition-colors">
                    <input type="checkbox" {...register('isActive')} className="w-4 h-4 text-indigo-600 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-indigo-500/20" />
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">Cartão Ativo</span>
                        <span className="text-xs text-slate-500 tracking-tight">Permitir lançamentos.</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-lg transition-colors">
                    <input type="checkbox" {...register('isDefault')} className="w-4 h-4 text-indigo-600 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-indigo-500/20" />
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">Tornar Padrão</span>
                        <span className="text-xs text-slate-500 tracking-tight">Preferência de uso.</span>
                    </div>
                  </label>
                </div>
              </form>
            </div>

            <div className="p-6 lg:p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                {initialData ? (
                  <button type="button" onClick={handleDelete} disabled={isDeleting} className="w-full md:w-auto text-red-600 hover:text-white hover:bg-red-600 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-red-200 dark:border-red-900/50 hover:border-transparent transition-all disabled:opacity-50 dark:text-red-500 dark:hover:bg-red-600 dark:hover:text-white">
                    <Trash2 size={18} /> {isDeleting ? 'Excluindo...' : 'Excluir Cartão'}
                  </button>
                ) : <div />}

                <div className="flex gap-4 w-full md:w-auto">
                    <button type="button" onClick={onClose} className="flex-1 md:flex-none px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors">Cancelar</button>
                    <button form="card-form" type="submit" disabled={isSubmitting || !isValid} className="flex-1 md:flex-none px-6 py-2.5 bg-indigo-600 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:shadow-none hover:shadow-md hover:-translate-y-0.5">
                      <Save size={18} /> Salvar Cartão
                    </button>
                </div>
            </div>
         </div>
      </motion.div>
    </motion.div>
  );
};
