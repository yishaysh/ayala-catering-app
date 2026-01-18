import React from 'react';
import { useStore, translations } from '../store';
import { Users, Sparkles, Minus, Plus } from 'lucide-react';

export const HostHelper: React.FC = () => {
  const { guestCount, setGuestCount, language } = useStore();
  const t = translations[language];

  return (
    <div className="relative overflow-hidden bg-stone-900 text-stone-50 rounded-2xl shadow-2xl mb-8 border border-stone-800 w-full max-w-full">
      {/* Background Effect */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      
      <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center md:justify-between gap-6">
        {/* Left Side: Icon & Text */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-start w-full md:w-auto">
            <div className="p-3 md:p-4 bg-gradient-to-br from-gold-500 to-gold-600 rounded-2xl text-stone-900 shadow-lg shadow-gold-500/20 shrink-0">
                <Users size={24} className="md:w-7 md:h-7" strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-xl md:text-2xl font-serif font-bold text-white mb-1 md:mb-2">{t.guestsQuestion}</h2>
                <p className="text-stone-400 text-sm md:text-base leading-snug">{t.guestsSub}</p>
            </div>
        </div>
        
        {/* Right Side: Input Controls */}
        <div className="w-full md:w-auto flex justify-center">
            <div className="flex items-center gap-2 bg-stone-800/50 p-2 rounded-xl border border-stone-700/50 backdrop-blur-sm w-full md:w-auto justify-between md:justify-start max-w-xs">
                <button 
                    onClick={() => setGuestCount(Math.max(0, guestCount - 5))}
                    className="w-12 h-12 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 grid place-items-center transition-all active:scale-95"
                >
                    <Minus size={20} />
                </button>
                <div className="flex-1 min-w-[3rem] text-center">
                    <input
                        type="number"
                        value={guestCount || ''}
                        onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-transparent text-center text-3xl font-bold focus:outline-none text-white placeholder-stone-600 font-serif"
                    />
                </div>
                <button 
                    onClick={() => setGuestCount(guestCount + 5)}
                    className="w-12 h-12 rounded-lg bg-gold-500 hover:bg-gold-400 text-stone-900 grid place-items-center transition-all active:scale-95 shadow-lg shadow-gold-500/20"
                >
                    <Plus size={20} />
                </button>
            </div>
        </div>
      </div>
      
      {/* Suggestions Section */}
      {guestCount > 0 && (
        <div className="bg-stone-800/30 border-t border-stone-800 p-4 md:p-6 flex flex-col md:flex-row items-center justify-center md:justify-start gap-3 md:gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 text-gold-500 font-bold text-sm md:text-base">
                <Sparkles size={16} />
                <span>{t.autoRecommend}</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs md:text-sm text-stone-300">
                <span className="bg-stone-800 px-3 py-1.5 rounded-full border border-stone-700 whitespace-nowrap">
                    <strong>{Math.ceil(guestCount * 1.5)}</strong> {t.sandwiches}
                </span>
                <span className="bg-stone-800 px-3 py-1.5 rounded-full border border-stone-700 whitespace-nowrap">
                    <strong>{Math.ceil(guestCount / 10)}</strong> {t.trays} ({t.perCategory})
                </span>
            </div>
        </div>
      )}
    </div>
  );
};