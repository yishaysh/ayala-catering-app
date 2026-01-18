import React from 'react';
import { useStore, translations } from '../store';
import { Users, Calculator, Sparkles } from 'lucide-react';

export const HostHelper: React.FC = () => {
  const { guestCount, setGuestCount, language } = useStore();
  const t = translations[language];

  return (
    <div className="relative overflow-hidden bg-stone-900 text-stone-50 p-8 rounded-2xl shadow-2xl mb-12 border border-stone-800">
      {/* Decorative background element */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-start gap-4 max-w-lg">
            <div className="p-4 bg-gradient-to-br from-gold-500 to-gold-600 rounded-2xl text-stone-900 shadow-lg shadow-gold-500/20 shrink-0">
                <Users size={28} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-2xl font-serif font-bold text-white mb-2">{t.guestsQuestion}</h2>
                <p className="text-stone-400 leading-relaxed">{t.guestsSub}</p>
            </div>
        </div>
        
        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-stone-800/50 p-2 rounded-xl border border-stone-700/50 backdrop-blur-sm">
                <button 
                    onClick={() => setGuestCount(Math.max(0, guestCount - 5))}
                    className="w-12 h-12 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 flex items-center justify-center text-2xl font-bold transition-all active:scale-95"
                >
                    -
                </button>
                <div className="min-w-[5rem] text-center">
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
                    className="w-12 h-12 rounded-lg bg-gold-500 hover:bg-gold-400 text-stone-900 flex items-center justify-center text-2xl font-bold transition-all active:scale-95 shadow-lg shadow-gold-500/20"
                >
                    +
                </button>
            </div>
        </div>
      </div>
      
      {guestCount > 0 && (
        <div className="mt-8 pt-6 border-t border-stone-800/50 flex flex-wrap gap-4 items-center animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-2 text-gold-500 font-bold">
                <Sparkles size={18} />
                <span>{t.autoRecommend}</span>
            </div>
            <div className="flex gap-4 text-sm text-stone-300">
                <span className="bg-stone-800 px-3 py-1 rounded-full border border-stone-700">
                    <strong>{Math.ceil(guestCount * 1.5)}</strong> {t.sandwiches}
                </span>
                <span className="bg-stone-800 px-3 py-1 rounded-full border border-stone-700">
                    <strong>{Math.ceil(guestCount / 10)}</strong> {t.trays} ({t.perCategory})
                </span>
            </div>
        </div>
      )}
    </div>
  );
};