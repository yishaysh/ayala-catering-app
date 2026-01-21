
import React, { useMemo } from 'react';
import { useStore, translations } from '../store';
import { Minus, Plus, UtensilsCrossed, Wine, Sun, Sparkles, Coffee, Pizza, Utensils, Sandwich, Croissant, Leaf, Cake, Droplets, Layers } from 'lucide-react';
import { EventType } from '../types';

export const HostHelper: React.FC = () => {
  const { 
    guestAdults, setGuestAdults,
    guestChildren, setGuestChildren,
    language, 
    eventType, setEventType, 
    advancedSettings
  } = useStore();
  
  const t = translations[language];

  // Logic: Child (4-11) is worth 0.6 of an adult serving
  const effectiveGuests = useMemo(() => {
    return guestAdults + (guestChildren * 0.6);
  }, [guestAdults, guestChildren]);

  const recommendations = useMemo(() => {
    if (effectiveGuests <= 0) return null;

    const ratios = advancedSettings.eventRatios[eventType];

    const TRAY_CAPACITY = 10;
    const PLATTER_CAPACITY = 12;
    const DESSERT_CAPACITY = 15;

    return {
        sandwiches: Math.ceil(effectiveGuests * ratios.sandwiches),
        pastries: Math.ceil(effectiveGuests * ratios.pastries),
        salads: Math.ceil((effectiveGuests * ratios.saladsCoverage) / TRAY_CAPACITY * 10),
        mains: Math.ceil((effectiveGuests * ratios.mainsCoverage) / TRAY_CAPACITY * 10),
        platters: Math.ceil((effectiveGuests * ratios.plattersCoverage) / PLATTER_CAPACITY * 12),
        desserts: Math.ceil((effectiveGuests * ratios.dessertsCoverage) / DESSERT_CAPACITY * 15),
    };
  }, [effectiveGuests, eventType, advancedSettings]);

  return (
    <div className="relative bg-stone-900 text-stone-50 rounded-3xl shadow-2xl mb-12 border border-stone-800 w-full overflow-hidden transition-all duration-500">
      
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      
      <div className="relative z-10">
          
          <div className="p-6 md:p-8 border-b border-stone-800">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">{t.planEvent}</h2>
                    <p className="text-stone-400 text-sm md:text-base">{t.guestsSub}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Adults 12+ */}
                    <div className="flex items-center gap-3 bg-stone-800/80 p-2 rounded-2xl border border-stone-700/50 backdrop-blur-sm">
                        <button 
                            onClick={() => setGuestAdults(Math.max(0, guestAdults - 1))}
                            className="w-10 h-10 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 grid place-items-center transition-all active:scale-95"
                        >
                            <Minus size={18} />
                        </button>
                        <div className="min-w-[4rem] text-center">
                            <span className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider">{t.ageAdults}</span>
                            <input
                                type="number"
                                value={guestAdults || ''}
                                onChange={(e) => setGuestAdults(parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-transparent text-center text-2xl font-bold focus:outline-none text-white placeholder-stone-600 font-serif leading-none mt-1"
                            />
                        </div>
                        <button 
                            onClick={() => setGuestAdults(guestAdults + 1)}
                            className="w-10 h-10 rounded-xl bg-gold-500 hover:bg-gold-400 text-stone-900 grid place-items-center transition-all active:scale-95 shadow-lg shadow-gold-500/20"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    {/* Children 4-11 */}
                    <div className="flex items-center gap-3 bg-stone-800/80 p-2 rounded-2xl border border-stone-700/50 backdrop-blur-sm">
                        <button 
                            onClick={() => setGuestChildren(Math.max(0, guestChildren - 1))}
                            className="w-10 h-10 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 grid place-items-center transition-all active:scale-95"
                        >
                            <Minus size={18} />
                        </button>
                        <div className="min-w-[4rem] text-center">
                            <span className="block text-[10px] text-stone-500 font-bold uppercase tracking-wider">{t.ageChildren}</span>
                            <input
                                type="number"
                                value={guestChildren || ''}
                                onChange={(e) => setGuestChildren(parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full bg-transparent text-center text-2xl font-bold focus:outline-none text-white placeholder-stone-600 font-serif leading-none mt-1"
                            />
                        </div>
                        <button 
                            onClick={() => setGuestChildren(guestChildren + 1)}
                            className="w-10 h-10 rounded-xl bg-stone-400 hover:bg-stone-300 text-stone-900 grid place-items-center transition-all active:scale-95 shadow-lg"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>
             </div>
          </div>

          <div className="bg-stone-900 p-6 md:p-8 border-b border-stone-800">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-6 block text-center md:text-start">{t.eventType}</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                  {(['brunch', 'dinner', 'snack'] as EventType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setEventType(type)}
                        className={`
                            relative p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3
                            ${eventType === type 
                                ? 'bg-gold-500/10 border-gold-500 text-gold-400 shadow-[0_0_20px_rgba(212,175,55,0.1)]' 
                                : 'bg-stone-800/50 border-stone-800 text-stone-500 hover:bg-stone-800'
                            }
                        `}
                      >
                          {type === 'brunch' && <Sun size={32} />}
                          {type === 'dinner' && <UtensilsCrossed size={32} />}
                          {type === 'snack' && <Wine size={32} />}
                          <span className="text-base font-bold">{(t as any)[type]}</span>
                          {eventType === type && (
                              <div className="absolute -top-2 -right-2 bg-gold-500 text-stone-900 rounded-full p-1 animate-zoom-in">
                                  <Sparkles size={12} fill="currentColor" />
                              </div>
                          )}
                      </button>
                  ))}
              </div>
          </div>

          {effectiveGuests > 0 && recommendations && (
            <div className="bg-stone-950/50 p-6 md:p-8 animate-slide-in-top">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-gold-500/20 rounded-full text-gold-500">
                        <Sparkles size={20} />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-white">{t.calcResults}</h3>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {/* Sandwiches Square */}
                    <div className="aspect-square bg-stone-900 rounded-2xl p-4 border border-stone-800 flex flex-col items-center justify-center text-center group hover:border-gold-500/50 transition-all duration-300 animate-zoom-in shadow-xl">
                        <Sandwich size={32} className="text-gold-500 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-3xl font-bold text-white mb-1">{recommendations.sandwiches}</span>
                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{t.sandwiches}</span>
                    </div>

                    {/* Pastries Square */}
                    <div className="aspect-square bg-stone-900 rounded-2xl p-4 border border-stone-800 flex flex-col items-center justify-center text-center group hover:border-gold-500/50 transition-all duration-300 animate-zoom-in shadow-xl" style={{animationDelay: '100ms'}}>
                        <Croissant size={32} className="text-stone-300 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-3xl font-bold text-white mb-1">{recommendations.pastries}</span>
                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{(t.categories as any)['Pastries']}</span>
                    </div>

                    {/* Salads Square */}
                    <div className="aspect-square bg-stone-900 rounded-2xl p-4 border border-stone-800 flex flex-col items-center justify-center text-center group hover:border-gold-500/50 transition-all duration-300 animate-zoom-in shadow-xl" style={{animationDelay: '200ms'}}>
                        <Leaf size={32} className="text-green-500 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-3xl font-bold text-white mb-1">{recommendations.salads}</span>
                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{(t.categories as any)['Salads']}</span>
                    </div>

                    {/* Main Courses Square */}
                    <div className="aspect-square bg-stone-900 rounded-2xl p-4 border border-stone-800 flex flex-col items-center justify-center text-center group hover:border-gold-500/50 transition-all duration-300 animate-zoom-in shadow-xl" style={{animationDelay: '300ms'}}>
                        <UtensilsCrossed size={32} className="text-stone-300 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-3xl font-bold text-white mb-1">{recommendations.mains}</span>
                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{(t.categories as any)['Main Courses']}</span>
                    </div>

                    {/* Platters Square */}
                    <div className="aspect-square bg-stone-900 rounded-2xl p-4 border border-stone-800 flex flex-col items-center justify-center text-center group hover:border-gold-500/50 transition-all duration-300 animate-zoom-in shadow-xl" style={{animationDelay: '400ms'}}>
                        <Layers size={32} className="text-gold-500 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-3xl font-bold text-white mb-1">{recommendations.platters}</span>
                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{(t.categories as any)['Cold Platters']}</span>
                    </div>

                    {/* Desserts Square */}
                    <div className="aspect-square bg-stone-900 rounded-2xl p-4 border border-stone-800 flex flex-col items-center justify-center text-center group hover:border-gold-500/50 transition-all duration-300 animate-zoom-in shadow-xl" style={{animationDelay: '500ms'}}>
                        <Cake size={32} className="text-stone-300 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-3xl font-bold text-white mb-1">{recommendations.desserts}</span>
                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{(t.categories as any)['Desserts']}</span>
                    </div>
                </div>
            </div>
          )}
      </div>
    </div>
  );
};
