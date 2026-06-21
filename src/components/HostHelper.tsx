
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
    const sectionId = `cat-${cat.replace(/\s+/g, '-')}`;
    const element = document.getElementById(sectionId);
    if (element) {
        const headerHeight = 135; 
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
            top: elementPosition - headerHeight,
            behavior: 'smooth'
        });
    }
  };

  return (
    <div className="relative bg-themeCardBg text-themeText rounded-3xl shadow-2xl mb-12 border border-themeText/10 w-full overflow-hidden transition-all duration-500">
      
      <div className="absolute top-0 right-0 w-96 h-96 bg-themePrimary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      
      <div className="relative z-10">
          
          <div className="p-6 md:p-8 border-b border-themeText/10">
             <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-themePrimary mb-2">{t.planEvent}</h2>
                    <p className="text-themeText/70 text-sm md:text-base">{t.guestsSub}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between bg-themeBg/80 p-3 rounded-2xl border border-themeText/10 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-themeBg rounded-lg text-themeText/80"><Users size={20} /></div>
                            <span className="text-sm font-bold text-themeText/80">{t.adults}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setAdultCount(Math.max(0, adultCount - 5))} className="w-10 h-10 rounded-lg bg-themeBg hover:opacity-80 grid place-items-center transition-all active:scale-95 text-themeText"><Minus size={16} /></button>
                            <input type="number" value={adultCount || ''} onChange={(e) => setAdultCount(parseInt(e.target.value) || 0)} className="w-12 bg-transparent text-center text-xl font-bold text-themeText" />
                            <button onClick={() => setAdultCount(adultCount + 5)} className="w-10 h-10 rounded-lg bg-themePrimary hover:opacity-90 text-themeCardBg grid place-items-center shadow-lg"><Plus size={16} /></button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-themeBg/80 p-3 rounded-2xl border border-themeText/10 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-themeBg rounded-lg text-themeText/80"><Baby size={20} /></div>
                            <span className="text-sm font-bold text-themeText/80">{t.children}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setChildCount(Math.max(0, childCount - 5))} className="w-10 h-10 rounded-lg bg-themeBg hover:opacity-80 grid place-items-center transition-all active:scale-95 text-themeText"><Minus size={16} /></button>
                            <input type="number" value={childCount || ''} onChange={(e) => setChildCount(parseInt(e.target.value) || 0)} className="w-12 bg-transparent text-center text-xl font-bold text-themeText" />
                            <button onClick={() => setChildCount(childCount + 5)} className="w-10 h-10 rounded-lg bg-themePrimary hover:opacity-90 text-themeCardBg grid place-items-center shadow-lg"><Plus size={16} /></button>
                        </div>
                    </div>
                </div>
             </div>
          </div>

          <div className="bg-themeCardBg p-6 md:p-8">
              <label className="text-xs font-bold text-themeText/50 uppercase tracking-widest mb-4 block">{t.eventType}</label>
              <div className="grid grid-cols-3 gap-3">
                  {(['brunch', 'dinner', 'snack'] as EventType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setEventType(type)}
                        className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${eventType === type ? 'bg-themePrimary/15 border-themePrimary text-themePrimary' : 'bg-themeBg/50 border-transparent text-themeText/60 hover:text-themeText'}`}
                      >
                          {type === 'brunch' && <Sun size={24} />}
                          {type === 'dinner' && <UtensilsCrossed size={24} />}
                          {type === 'snack' && <Wine size={24} />}
                          <span className="text-sm font-bold">{(t as any)[type]}</span>
                      </button>
                  ))}
              </div>
          </div>

          {totalGuests > 0 && recommendations && (
            <div className="bg-themeBg/30 p-6 md:p-8 animate-slide-in-top">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-themePrimary/20 rounded-full text-themePrimary"><Sparkles size={20} /></div>
                    <h3 className="text-xl font-serif font-bold text-themeText">{t.calcResults}</h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {recommendations.sandwiches > 0 && (
                        <button onClick={() => scrollToSection('Sandwiches')} className="bg-themeBg/50 rounded-xl p-4 border border-themeText/10 group hover:border-themePrimary/50 transition-all active:scale-95">
                            <span className="block text-3xl font-bold text-themePrimary mb-1">{recommendations.sandwiches}</span>
                            <span className="text-[11px] text-themeText/70 uppercase tracking-wider">{t.sandwiches}</span>
                        </button>
                    )}
                    {recommendations.pastries > 0 && (
                        <button onClick={() => scrollToSection('Pastries')} className="bg-themeBg/50 rounded-xl p-4 border border-themeText/10 group hover:border-themePrimary/50 transition-all active:scale-95">
                            <span className="block text-3xl font-bold text-themeText mb-1">{recommendations.pastries}</span>
                            <span className="text-[11px] text-themeText/70 uppercase tracking-wider">{(t.categories as any)['Pastries']}</span>
                        </button>
                    )}
                     {recommendations.salads > 0 && (
                        <button onClick={() => scrollToSection('Salads')} className="bg-themeBg/50 rounded-xl p-4 border border-themeText/10 group hover:border-themePrimary/50 transition-all active:scale-95">
                            <span className="block text-3xl font-bold text-themeText mb-1">{recommendations.salads}</span>
                            <span className="text-[11px] text-themeText/70 uppercase tracking-wider">{language === 'he' ? 'סלטים' : 'Salads'}</span>
                        </button>
                    )}
                     {recommendations.mains > 0 && (
                        <button onClick={() => scrollToSection('Main Courses')} className="bg-themeBg/50 rounded-xl p-4 border border-themeText/10 group hover:border-themePrimary/50 transition-all active:scale-95">
                            <span className="block text-3xl font-bold text-themeText mb-1">{recommendations.mains}</span>
                            <span className="text-[11px] text-themeText/70 uppercase tracking-wider">{(t.categories as any)['Main Courses']}</span>
                        </button>
                    )}
                     {recommendations.platters > 0 && (
                        <button onClick={() => scrollToSection('Cold Platters')} className="bg-themeBg/50 rounded-xl p-4 border border-themeText/10 group hover:border-themePrimary/50 transition-all active:scale-95">
                            <span className="block text-3xl font-bold text-themeText mb-1">{recommendations.platters}</span>
                            <span className="text-[11px] text-themeText/70 uppercase tracking-wider">{(t.categories as any)['Cold Platters']}</span>
                        </button>
                    )}
                     {recommendations.desserts > 0 && (
                        <button onClick={() => scrollToSection('Desserts')} className="bg-themeBg/50 rounded-xl p-4 border border-themeText/10 group hover:border-themePrimary/50 transition-all active:scale-95">
                            <span className="block text-3xl font-bold text-themePrimary mb-1">{recommendations.desserts}</span>
                            <span className="text-[11px] text-themeText/70 uppercase tracking-wider">{(t.categories as any)['Desserts']}</span>
                        </button>
                    )}
                </div>
            </div>
          )}
      </div>
    </div>
  );
};
