import React from 'react';
import { CreditCard as CardIcon } from 'lucide-react';

export type CardBrand = 'VISA' | 'MASTERCARD' | 'ELO' | 'AMEX' | 'HIPERCARD' | 'DINERS' | 'DISCOVER' | 'AURA' | 'OTHER';
export type CardLevel = 'STANDARD' | 'GOLD' | 'PLATINUM' | 'BLACK' | 'INFINITE' | 'SIGNATURE' | 'NANQUIM' | 'GRAPHITE' | 'UNIQUE' | 'OTHER';

export interface CreditCardPreviewProps {
  name: string;
  bankName: string;
  brand: string;
  level: string;
  lastFourDigits: string;
  holderName?: string;
  validity?: string; // MM/YY
  color?: string; // Tailwind class
  size?: 'sm' | 'md' | 'lg';
}

const getGradient = (bank: string, customColor: string) => {
  if (customColor && customColor.includes('gradient')) return customColor;
  
  const b = bank.toLowerCase();
  if (b.includes('nubank')) return 'bg-gradient-to-br from-purple-800 to-purple-950';
  if (b.includes('inter')) return 'bg-gradient-to-br from-orange-500 to-orange-700';
  if (b.includes('itaú') || b.includes('itau')) return 'bg-gradient-to-br from-blue-700 to-orange-500';
  if (b.includes('santander')) return 'bg-gradient-to-br from-red-600 to-red-800';
  if (b.includes('bradesco')) return 'bg-gradient-to-br from-red-800 to-red-950';
  if (b.includes('brasil') || b === 'bb') return 'bg-gradient-to-br from-blue-800 to-yellow-500';
  if (b.includes('caixa')) return 'bg-gradient-to-br from-blue-500 to-blue-800';
  if (b.includes('c6') || b.includes('btg') || b.includes('xp')) return 'bg-gradient-to-br from-gray-800 to-black';
  
  return customColor || 'bg-gradient-to-br from-slate-800 to-slate-900';
};

const getBrandIconUrl = (brand: string) => {
  // We can use simple text or SVGs. For simplicity, text/emojis if no SVG available, but we'll try to map common ones gracefully.
  const map: Record<string, string> = {
    VISA: 'Visa',
    MASTERCARD: 'Mastercard',
    AMEX: 'Amex',
    ELO: 'Elo'
  };
  return map[brand?.toUpperCase()] || brand;
};

export const CreditCardPreview: React.FC<CreditCardPreviewProps> = ({
  name, bankName, brand, level, lastFourDigits, holderName, validity, color, size = 'md'
}) => {
  const gradient = getGradient(bankName, color || '');

  const sizeClasses = {
    sm: 'w-[280px] h-[170px] p-4 text-xs rounded-xl',
    md: 'w-[340px] h-[210px] p-5 text-sm rounded-2xl',
    lg: 'w-[400px] h-[250px] p-6 text-base rounded-3xl'
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`${currentSize} ${gradient} text-white shadow-xl relative overflow-hidden flex flex-col justify-between transition-transform duration-300 hover:scale-[1.02] border border-white/10 dark:border-white/5`}>
      {/* Decorative shine */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>

      {/* Top area: Chip and Bank/Brand */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-col gap-2">
            <span className="font-bold tracking-wider opacity-90">{bankName || 'O Seu Banco'}</span>
            <div className="w-10 h-8 rounded bg-yellow-100/80 mt-1 opacity-80" style={{ background: 'linear-gradient(135deg, #e5e7eb, #9ca3af)' }}></div>
        </div>
        <div className="flex flex-col items-end">
            <span className="font-bold italic tracking-widest text-lg opacity-90">{getBrandIconUrl(brand)}</span>
            <span className="text-[0.6em] md:text-xs uppercase tracking-widest mt-1 opacity-75">{level}</span>
        </div>
      </div>

      {/* Middle/Bottom area: Numbers and Names */}
      <div className="relative z-10">
         <div className="font-mono text-lg md:text-xl xl:text-2xl tracking-[0.2em] mb-4 opacity-90 truncate">
            •••• •••• •••• {lastFourDigits || '0000'}
         </div>
         <div className="flex justify-between items-end">
            <div className="flex flex-col">
               <span className="uppercase tracking-widest font-medium text-sm truncate max-w-[200px] opacity-90">
                 {holderName || name || 'NOME DO TITULAR'}
               </span>
            </div>
            {validity && (
              <div className="flex flex-col items-center">
                 <span className="text-[0.65em] uppercase opacity-70 mb-0.5">Val Date</span>
                 <span className="font-mono text-sm tracking-widest opacity-90">{validity}</span>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};
