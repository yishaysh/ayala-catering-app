import React, { useMemo } from 'react';
import { useStore, translations } from '../store';
import { Minus, Plus, UtensilsCrossed, Wine, Sun, PartyPopper, Sparkles } from 'lucide-react';
import { EventType, HungerLevel } from '../types';

export const HostHelper: React.FC = () => {
  const { 
    guestCount, setGuestCount, 
    language, 
    eventType, setEventType, 
    hungerLevel, setHungerLevel,
    advancedSettings
  } = useStore();
  
  const t = translations[language];

  // Logic: Calculate recommendations based on inputs and ADVANCED STORE SETTINGS
  const recommendations = useMemo(() => {
    if (guestCount === 0) return null;

    // Hunger Multiplier from Store
    const hungerMult = advancedSettings.hungerMultipliers[hungerLevel];
    
    // Ratios from Store
    const ratios = advancedSettings.eventRatios[eventType];

    // Calculation (Rounded up)
    const TRAY_CAPACITY = 10;
    const PLATTER_CAPACITY = 12;
    const DESSERT_CAPACITY = 15;

    return {
        sandwiches: Math.ceil(guestCount * ratios.sandwiches * hungerMult),
        pastries: Math.ceil(guestCount * ratios.pastries * hungerMult),
        salads: Math.ceil((guestCount * ratios.saladsCoverage * hungerMult) / TRAY_CAPACITY * 10),
        mains: Math.ceil((guestCount * ratios.mainsCoverage * hungerMult) / TRAY_CAPACITY * 10),
        platters: Math.ceil((guestCount * ratios.plattersCoverage * hungerMult) / PLATTER_CAPACITY * 12),
        desserts: Math.ceil((guestCount * ratios.dessertsCoverage * hungerMult) / DESSERT_CAPACITY * 15),
    };
  }, [guestCount, eventType, hungerLevel, advancedSettings]);

  // Helper to map slider value 0-2 to hunger level
  const sliderValue = hungerLevel === 'light' ? 0 : hungerLevel === 'medium' ? 1 : 2;
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      if (val === 0) setHungerLevel('light');
      if (val === 1) setHungerLevel('medium');
      if (val === 2) setHungerLevel('heavy');
  };

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
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-8 block">{t.hungerLevel}</label>
                  <div className="space-y-6 relative px-2">
                      {/* Native Range Input for Robust Interaction */}
                      <input 
                          type="range" 
                          min="0" 
                          max="2" 
                          step="1"
                          value={sliderValue}
                          onChange={handleSliderChange}
                          // Note: The visual styling is handled in index.css
                          className="w-full appearance-none bg-transparent cursor-pointer z-20 relative focus:outline-none"
                      />
                      
                      {/* Visual Labels */}
                      <div className="flex justify-between text-sm font-medium text-stone-400 mt-2 relative z-10">
                          {(['light', 'medium', 'heavy'] as HungerLevel[]).map((level, idx) => (
                              <button 
                                key={level}
                                onClick={() => {
                                    if(idx === 0) setHungerLevel('light');
                                    if(idx === 1) setHungerLevel('medium');
                                    if(idx === 2) setHungerLevel('heavy');
                                }}
                                className={`transition-all duration-300 transform text-center w-20 ${hungerLevel === level ? 'text-gold-400 font-bold scale-110' : 'hover:text-stone-300'}`}
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
            <div className="bg-stone-950/50 p-6 md:p-8 animate-slide-in-from-top-4">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gold-500/20 rounded-full text-gold-500">
                        <Sparkles size={20} />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-white">{t.calcResults}</h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {/* Sandwiches */}
                    {recommendations.sandwiches > 0 && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/30 transition-colors animate-in zoom-in-95 duration-300 delay-0">
                            <span className="block text-3xl font-bold text-gold-500 mb-1">{recommendations.sandwiches}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{t.sandwiches}</span>
                        </div>
                    )}
                    {/* Pastries */}
                    {recommendations.pastries > 0 && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/30 transition-colors animate-in zoom-in-95 duration-300 delay-75">
                            <span className="block text-3xl font-bold text-white mb-1">{recommendations.pastries}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{(t.categories as any)['Pastries']}</span>
                        </div>
                    )}
                     {/* Salads */}
                     {recommendations.salads > 0 && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/30 transition-colors animate-in zoom-in-95 duration-300 delay-100">
                            <span className="block text-3xl font-bold text-white mb-1">{recommendations.salads}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{t.trays} {(t.categories as any)['Salads']}</span>
                        </div>
                    )}
                     {/* Mains */}
                     {recommendations.mains > 0 && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/30 transition-colors animate-in zoom-in-95 duration-300 delay-150">
                            <span className="block text-3xl font-bold text-white mb-1">{recommendations.mains}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{t.trays} {(t.categories as any)['Main Courses']}</span>
                        </div>
                    )}
                     {/* Platters */}
                     {recommendations.platters > 0 && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/30 transition-colors animate-in zoom-in-95 duration-300 delay-200">
                            <span className="block text-3xl font-bold text-white mb-1">{recommendations.platters}</span>
                            <span className="text-xs text-stone-400 uppercase tracking-wider">{(t.categories as any)['Cold Platters']}</span>
                        </div>
                    )}
                     {/* Desserts */}
                     {recommendations.desserts > 0 && (
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-800 text-center group hover:border-gold-500/30 transition-colors animate-in zoom-in-95 duration-300 delay-300">
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