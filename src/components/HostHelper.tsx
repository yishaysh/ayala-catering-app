import React, { useMemo } from 'react';
import { useStore, translations } from '../store';
import { Users, Minus, Plus, UtensilsCrossed, Wine, Sun, PartyPopper, ChevronDown, Sparkles } from 'lucide-react';
import { EventType, HungerLevel } from '../types';

export const HostHelper: React.FC = () => {
  const { 
    guestCount, setGuestCount, 
    language, 
    eventType, setEventType, 
    hungerLevel, setHungerLevel 
  } = useStore();
  
  const t = translations[language];

  // Logic: Calculate recommendations based on inputs
  const recommendations = useMemo(() => {
    if (guestCount === 0) return null;

    // Hunger Multiplier
    const hungerMult = hungerLevel === 'light' ? 0.8 : hungerLevel === 'heavy' ? 1.3 : 1.0;
    
    // Base Ratios per Event Type (Units per person or Coverage %)
    // Sandwiches: units/person
    // Salads: coverage (1 salad tray covers X people)
    // Mains: coverage
    let ratios = {
        sandwiches: 0,
        pastries: 0,
        saladsCoverage: 0, 
        mainsCoverage: 0, 
        plattersCoverage: 0,
        dessertsCoverage: 0
    };

    switch (eventType) {
        case 'brunch':
            ratios = { sandwiches: 1.0, pastries: 1.5, saladsCoverage: 0.8, mainsCoverage: 0.5, plattersCoverage: 0.6, dessertsCoverage: 0.4 };
            break;
        case 'dinner':
            ratios = { sandwiches: 0.5, pastries: 0.5, saladsCoverage: 1.0, mainsCoverage: 1.0, plattersCoverage: 0.4, dessertsCoverage: 0.5 };
            break;
        case 'snack': // Cocktail
            ratios = { sandwiches: 2.0, pastries: 0.5, saladsCoverage: 0.3, mainsCoverage: 0.0, plattersCoverage: 0.8, dessertsCoverage: 0.3 };
            break;
        case 'party':
            ratios = { sandwiches: 2.5, pastries: 1.0, saladsCoverage: 0.2, mainsCoverage: 0.2, plattersCoverage: 0.5, dessertsCoverage: 0.5 };
            break;
    }

    // Calculation (Rounded up)
    // Assuming: 1 Salad Tray serves 10, 1 Main Tray serves 10, 1 Platter serves 12, 1 Dessert Tray serves 15
    return {
        sandwiches: Math.ceil(guestCount * ratios.sandwiches * hungerMult),
        pastries: Math.ceil(guestCount * ratios.pastries * hungerMult),
        salads: Math.ceil((guestCount * ratios.saladsCoverage * hungerMult) / 10),
        mains: Math.ceil((guestCount * ratios.mainsCoverage * hungerMult) / 10),
        platters: Math.ceil((guestCount * ratios.plattersCoverage * hungerMult) / 12),
        desserts: Math.ceil((guestCount * ratios.dessertsCoverage * hungerMult) / 15),
    };
  }, [guestCount, eventType, hungerLevel]);

  const EventIcon = {
      'brunch': Sun,
      'dinner': UtensilsCrossed,
      'snack': Wine,
      'party': PartyPopper
  }[eventType];

  return (
    <div className="relative bg-stone-900 text-stone-50 rounded-3xl shadow-2xl mb-12 border border-stone-800 w-full overflow-hidden transition-all duration-500">
      
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      
      <div className="relative z-10">
          
          {/* Header Section */}
          <div className="p-6 md:p-8 border-b border-stone-800">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">{t.planEvent}</h2>
                    <p className="text-stone-400 text-sm md:text-base">{t.guestsSub}</p>
                </div>

                {/* Main Guest Input */}
                <div className="flex items-center gap-3 bg-stone-800/80 p-2 rounded-2xl border border-stone-700/50 backdrop-blur-sm self-start md:self-center">
                    <button 
                        onClick={() => setGuestCount(Math.max(0, guestCount - 5))}
                        className="w-12 h-12 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 grid place-items-center transition-all active:scale-95"
                    >
                        <Minus size={20} />
                    </button>
                    <div className="min-w-[4rem] text-center">
                        <span className="block text-xs text-stone-500 font-bold uppercase tracking-wider">{t.people}</span>
                        <input
                            type="number"
                            value={guestCount || ''}
                            onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full bg-transparent text-center text-3xl font-bold focus:outline-none text-white placeholder-stone-600 font-serif leading-none mt-1"
                        />
                    </div>
                    <button 
                        onClick={() => setGuestCount(guestCount + 5)}
                        className="w-12 h-12 rounded-xl bg-gold-500 hover:bg-gold-400 text-stone-900 grid place-items-center transition-all active:scale-95 shadow-lg shadow-gold-500/20"
                    >
                        <Plus size={20} />
                    </button>
                </div>
             </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-stone-800">
              {/* Event Type Selector */}
              <div className="bg-stone-900 p-6 md:p-8">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4 block">{t.eventType}</label>
                  <div className="grid grid-cols-2 gap-3">
                      {(['brunch', 'dinner', 'snack', 'party'] as EventType[]).map((type) => (
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
                              {type === 'party' && <PartyPopper size={24} />}
                              <span className="text-sm font-bold">{(t as any)[type]}</span>
                          </button>
                      ))}
                  </div>
              </div>

              {/* Hunger Level Selector */}
              <div className="bg-stone-900 p-6 md:p-8 flex flex-col justify-center">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-6 block">{t.hungerLevel}</label>
                  <div className="space-y-6">
                      <div className="relative h-2 bg-stone-800 rounded-full">
                          <div 
                            className="absolute h-full bg-gold-500 rounded-full transition-all duration-300"
                            style={{ 
                                width: hungerLevel === 'light' ? '33%' : hungerLevel === 'medium' ? '66%' : '100%' 
                            }}
                          ></div>
                          {/* Slider Thumbs (Visual Only) */}
                          <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-300`}
                               style={{ left: hungerLevel === 'light' ? '33%' : hungerLevel === 'medium' ? '66%' : '100%', transform: 'translate(-50%, -50%)' }}
                          ></div>
                      </div>
                      <div className="flex justify-between text-sm font-medium text-stone-400">
                          {(['light', 'medium', 'heavy'] as HungerLevel[]).map((level) => (
                              <button 
                                key={level}
                                onClick={() => setHungerLevel(level)}
                                className={`transition-colors ${hungerLevel === level ? 'text-white font-bold' : 'hover:text-stone-300'}`}
                              >
                                  {(t as any)[level]}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>

          {/* Results Section */}
          {guestCount > 0 && recommendations && (
            <div className="bg-stone-950/50 p-6 md:p-8 animate-in slide-in-from-top-4 fade-in duration-500">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gold-500/20 rounded-full text-gold-500">
                        <Sparkles size={20} />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-white">{t.calcResults}</h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {/* Sandwiches */}
                    {recommendations.sandwiches > 0 && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/30 transition-colors">
                            <span className="block text-3xl font-bold text-gold-500 mb-1">{recommendations.sandwiches}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{t.sandwiches}</span>
                        </div>
                    )}
                    {/* Pastries */}
                    {recommendations.pastries > 0 && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/30 transition-colors">
                            <span className="block text-3xl font-bold text-white mb-1">{recommendations.pastries}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{(t.categories as any)['Pastries']}</span>
                        </div>
                    )}
                     {/* Salads */}
                     {recommendations.salads > 0 && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/30 transition-colors">
                            <span className="block text-3xl font-bold text-white mb-1">{recommendations.salads}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{t.trays} {(t.categories as any)['Salads']}</span>
                        </div>
                    )}
                     {/* Mains */}
                     {recommendations.mains > 0 && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/30 transition-colors">
                            <span className="block text-3xl font-bold text-white mb-1">{recommendations.mains}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{t.trays} {(t.categories as any)['Main Courses']}</span>
                        </div>
                    )}
                     {/* Platters */}
                     {recommendations.platters > 0 && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/30 transition-colors">
                            <span className="block text-3xl font-bold text-white mb-1">{recommendations.platters}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{(t.categories as any)['Cold Platters']}</span>
                        </div>
                    )}
                     {/* Desserts */}
                     {recommendations.desserts > 0 && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/30 transition-colors">
                            <span className="block text-3xl font-bold text-gold-500 mb-1">{recommendations.desserts}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{(t.categories as any)['Desserts']}</span>
                        </div>
                    )}
                </div>
            </div>
          )}
      </div>
    </div>
  );
};