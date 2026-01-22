
import React, { useMemo } from 'react';
import { useStore, translations } from '../store';
import { Minus, Plus, UtensilsCrossed, Wine, Sun, Sparkles, Users, Baby } from 'lucide-react';
import { EventType, Category } from '../types';

export const HostHelper: React.FC = () => {
  const { 
    adultCount, setAdultCount,
    childCount, setChildCount,
    language, 
    eventType, setEventType, 
    advancedSettings
  } = useStore();
  
  const t = translations[language];
  const totalGuests = adultCount + childCount;

  const recommendations = useMemo(() => {
    if (totalGuests === 0) return null;

    const ratios = advancedSettings.eventRatios[eventType];

    const TRAY_CAPACITY = 10;
    const PLATTER_CAPACITY = 12;
    const DESSERT_CAPACITY = 15;

    // Weight calculation: Adults = 1.0, Children = 0.66
    const weightedCount = adultCount + (childCount * 0.66);

    return {
        sandwiches: Math.ceil(weightedCount * ratios.sandwiches),
        pastries: Math.ceil(weightedCount * ratios.pastries),
        salads: Math.ceil((weightedCount * ratios.saladsCoverage) / TRAY_CAPACITY * 10),
        mains: Math.ceil((weightedCount * ratios.mainsCoverage) / TRAY_CAPACITY * 10),
        platters: Math.ceil((weightedCount * ratios.plattersCoverage) / PLATTER_CAPACITY * 12),
        desserts: Math.ceil((weightedCount * ratios.dessertsCoverage) / DESSERT_CAPACITY * 15),
    };
  }, [adultCount, childCount, eventType, advancedSettings]);

  const scrollToSection = (cat: Category) => {
    const element = document.getElementById(cat);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative bg-stone-900 text-stone-50 rounded-3xl shadow-2xl mb-12 border border-stone-800 w-full overflow-hidden transition-all duration-500">
      
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      
      <div className="relative z-10">
          
          <div className="p-6 md:p-8 border-b border-stone-800">
             <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">{t.planEvent}</h2>
                    <p className="text-stone-400 text-sm md:text-base">{t.guestsSub}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Adults Input */}
                    <div className="flex items-center justify-between bg-stone-800/80 p-3 rounded-2xl border border-stone-700/50 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-stone-700 rounded-lg text-stone-300"><Users size={20} /></div>
                            <span className="text-sm font-bold text-stone-300">{t.adults}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setAdultCount(Math.max(0, adultCount - 5))}
                                className="w-10 h-10 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 grid place-items-center transition-all active:scale-95"
                            >
                                <Minus size={16} />
                            </button>
                            <input
                                type="number"
                                value={adultCount || ''}
                                onChange={(e) => setAdultCount(parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-12 bg-transparent text-center text-xl font-bold focus:outline-none text-white placeholder-stone-600 font-serif"
                            />
                            <button 
                                onClick={() => setAdultCount(adultCount + 5)}
                                className="w-10 h-10 rounded-lg bg-gold-500 hover:bg-gold-400 text-stone-900 grid place-items-center transition-all active:scale-95 shadow-lg shadow-gold-500/20"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Children Input */}
                    <div className="flex items-center justify-between bg-stone-800/80 p-3 rounded-2xl border border-stone-700/50 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-stone-700 rounded-lg text-stone-300"><Baby size={20} /></div>
                            <span className="text-sm font-bold text-stone-300">{t.children}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setChildCount(Math.max(0, childCount - 5))}
                                className="w-10 h-10 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 grid place-items-center transition-all active:scale-95"
                            >
                                <Minus size={16} />
                            </button>
                            <input
                                type="number"
                                value={childCount || ''}
                                onChange={(e) => setChildCount(parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-12 bg-transparent text-center text-xl font-bold focus:outline-none text-white placeholder-stone-600 font-serif"
                            />
                            <button 
                                onClick={() => setChildCount(childCount + 5)}
                                className="w-10 h-10 rounded-lg bg-gold-500 hover:bg-gold-400 text-stone-900 grid place-items-center transition-all active:scale-95 shadow-lg shadow-gold-500/20"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-px bg-stone-800">
              {/* Event Type Section */}
              <div className="bg-stone-900 p-6 md:p-8">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4 block">{t.eventType}</label>
                  <div className="grid grid-cols-3 gap-3">
                      {(['brunch', 'dinner', 'snack'] as EventType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => setEventType(type)}
                            className={`
                                relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2
                                ${eventType === type 
                                    ? 'bg-gold-500/10 border-gold-500 text-gold-400' 
                                    : 'bg-stone-800/50 border-transparent text-stone-500 hover:bg-stone-800'
                                }
                            `}
                          >
                              {type === 'brunch' && <Sun size={24} />}
                              {type === 'dinner' && <UtensilsCrossed size={24} />}
                              {type === 'snack' && <Wine size={24} />}
                              <span className="text-sm font-bold">{(t as any)[type]}</span>
                          </button>
                      ))}
                  </div>
              </div>
          </div>

          {totalGuests > 0 && recommendations && (
            <div className="bg-stone-950/50 p-6 md:p-8 animate-slide-in-top">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gold-500/20 rounded-full text-gold-500">
                        <Sparkles size={20} />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-white">{t.calcResults}</h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {recommendations.sandwiches > 0 && (
                        <button 
                            onClick={() => scrollToSection('Sandwiches')}
                            className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/50 transition-all animate-zoom-in active:scale-95" 
                            style={{animationDelay: '0ms'}}
                        >
                            <span className="block text-3xl font-bold text-gold-500 mb-1 group-hover:scale-110 transition-transform">{recommendations.sandwiches}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{t.sandwiches}</span>
                        </button>
                    )}
                    {recommendations.pastries > 0 && (
                        <button 
                            onClick={() => scrollToSection('Pastries')}
                            className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/50 transition-all animate-zoom-in active:scale-95" 
                            style={{animationDelay: '100ms'}}
                        >
                            <span className="block text-3xl font-bold text-white mb-1 group-hover:scale-110 transition-transform">{recommendations.pastries}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{(t.categories as any)['Pastries']}</span>
                        </button>
                    )}
                     {recommendations.salads > 0 && (
                        <button 
                            onClick={() => scrollToSection('Salads')}
                            className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/50 transition-all animate-zoom-in active:scale-95" 
                            style={{animationDelay: '200ms'}}
                        >
                            <span className="block text-3xl font-bold text-white mb-1 group-hover:scale-110 transition-transform">{recommendations.salads}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{t.trays} {(t.categories as any)['Salads']}</span>
                        </button>
                    )}
                     {recommendations.mains > 0 && (
                        <button 
                            onClick={() => scrollToSection('Main Courses')}
                            className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/50 transition-all animate-zoom-in active:scale-95" 
                            style={{animationDelay: '300ms'}}
                        >
                            <span className="block text-3xl font-bold text-white mb-1 group-hover:scale-110 transition-transform">{recommendations.mains}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{t.trays} {(t.categories as any)['Main Courses']}</span>
                        </button>
                    )}
                     {recommendations.platters > 0 && (
                        <button 
                            onClick={() => scrollToSection('Cold Platters')}
                            className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/50 transition-all animate-zoom-in active:scale-95" 
                            style={{animationDelay: '400ms'}}
                        >
                            <span className="block text-3xl font-bold text-white mb-1 group-hover:scale-110 transition-transform">{recommendations.platters}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{(t.categories as any)['Cold Platters']}</span>
                        </button>
                    )}
                     {recommendations.desserts > 0 && (
                        <button 
                            onClick={() => scrollToSection('Desserts')}
                            className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/50 transition-all animate-zoom-in active:scale-95" 
                            style={{animationDelay: '500ms'}}
                        >
                            <span className="block text-3xl font-bold text-gold-500 mb-1 group-hover:scale-110 transition-transform">{recommendations.desserts}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{(t.categories as any)['Desserts']}</span>
                        </button>
                    )}
                </div>
            </div>
          )}
      </div>
    </div>
  );
};
