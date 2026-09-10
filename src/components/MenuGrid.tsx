
import React, { useMemo, useState } from 'react';
import { MenuItem, Category } from '../types';
import { useStore, getSuggestedQuantity, translations, getLocalizedItem } from '../store';
import { Info, Star, Eye, X, Check, Minus, Plus, Maximize2 } from 'lucide-react';
import { useBackButton } from '../hooks/useBackButton';

interface MenuGridProps {
  items: MenuItem[];
}

const CATEGORY_ORDER: Category[] = [
  'Salads',
  'Cold Platters',
  'Sandwiches',
  'Dips',
  'Main Courses',
  'Pastries',
  'Desserts',
  'Picnic Baskets',
  'Extras'
];

const DEFAULT_PLACEHOLDER = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80";

const getValidImageUrl = (url?: string): string => {
  if (!url) return DEFAULT_PLACEHOLDER;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return DEFAULT_PLACEHOLDER;
};

export const MenuGrid: React.FC<MenuGridProps> = ({ items }) => {
  const { addToCart, adultCount, childCount, language, calculationSettings, cart, appConfig } = useStore();
  const t = translations[language];
  const totalGuests = adultCount + childCount;
  
  const [itemToAdd, setItemToAdd] = useState<MenuItem | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  
  const [isZoomed, setIsZoomed] = useState(false);

  useBackButton(!!itemToAdd, () => {
      if (isZoomed) {
          setIsZoomed(false);
      } else {
          setItemToAdd(null);
      }
  });

  const groupedItems = useMemo(() => {
    const groups: Partial<Record<Category, MenuItem[]>> = {};
    items.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]?.push(item);
    });
    return groups;
  }, [items]);

  const openAddModal = (item: MenuItem) => {
    const suggested = totalGuests > 0 ? getSuggestedQuantity(item, adultCount, childCount, calculationSettings, cart) : 1;
    setAddQuantity(suggested);
    setNotes('');
    setSelectedMods([]);
    setItemToAdd(item);
    setIsZoomed(false);
  };

  const handleConfirmAdd = () => {
      if (itemToAdd) {
          addToCart(itemToAdd, addQuantity, notes, selectedMods);
          setItemToAdd(null);
      }
  };

  const toggleMod = (mod: string) => {
      if (selectedMods.includes(mod)) {
          setSelectedMods(selectedMods.filter(m => m !== mod));
      } else {
          setSelectedMods([...selectedMods, mod]);
      }
  };

  const getUnitName = (type: string) => {
      if (type === 'tray') return t.tray;
      if (type === 'liter') return t.liter;
      if (type === 'unit') return t.unit;
      return type;
  };

  return (
    <>
    <div className="space-y-8 pb-32">
      {CATEGORY_ORDER.map((cat) => {
        const catItems = groupedItems[cat];
        if (!catItems || catItems.length === 0) return null;

        // Create a URL-safe ID
        const sectionId = `cat-${cat.replace(/\s+/g, '-')}`;

        return (
          <section key={cat} id={sectionId} className="scroll-mt-48 md:scroll-mt-52">
            <div className="flex items-center gap-4 mb-4 px-2">
                <h3 className="text-xl md:text-3xl font-serif font-bold text-themeText relative">
                  {(t.categories as Record<string, string>)[cat]}
                  <span className="absolute -bottom-2 right-0 w-8 md:w-12 h-1 bg-themePrimary rounded-full"></span>
                </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {catItems.map((item) => {
                const suggestedQty = totalGuests > 0 ? getSuggestedQuantity(item, adultCount, childCount, calculationSettings, cart) : 1;
                const localItem = getLocalizedItem(item, language);
                const previewUrl = getValidImageUrl(item.image_url);

                return (
                  <div 
                      key={item.id} 
                      id={`item-${item.id}`}
                      className="group relative bg-themeCardBg rounded-xl overflow-hidden shadow-sm border border-themeText/5 hover:shadow-xl hover:border-themePrimary/40 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="relative aspect-[4/3] bg-themeBg/40 overflow-hidden cursor-pointer" onClick={() => openAddModal(item)}>
                        <img 
                            src={previewUrl} 
                            alt={localItem.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>

                        {item.is_premium && (
                          <div className="absolute top-0 right-0 bg-themeHeaderBg text-themePrimary text-[10px] md:text-xs px-2 py-1 rounded-bl-lg font-bold tracking-wider z-10 flex items-center gap-1 shadow-md">
                            <Star size={10} fill="currentColor" /> {t.premium}
                          </div>
                        )}
                    </div>

                    <div className="p-2.5 md:p-5 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-1 gap-1">
                          <h4 className="text-sm md:text-lg font-bold text-themeText leading-tight line-clamp-2 min-h-[2.5em]">{localItem.name}</h4>
                      </div>
                      
                      {appConfig.ecommerce_mode ? (
                        <div className="flex items-baseline gap-1 mb-1">
                             <span className="text-base md:text-xl font-bold text-themeText">₪{item.price}</span>
                             <span className="text-[10px] md:text-xs text-themeText/50 font-normal">/ {getUnitName(item.unit_type)}</span>
                             {item.is_tray && item.units_per_tray && (
                                 <span className="text-[10px] md:text-xs text-themePrimary font-bold">({item.units_per_tray} {language === 'he' ? 'יח\'' : 'pcs'})</span>
                             )}
                        </div>
                      ) : (
                        item.is_tray && item.units_per_tray && (
                          <div className="mb-1">
                              <span className="text-[10px] md:text-xs text-themePrimary font-bold font-sans">({item.units_per_tray} {language === 'he' ? 'יחידות במגש' : 'units per tray'})</span>
                          </div>
                        )
                      )}
                      
                      <div className="text-[10px] md:text-xs text-themeText/60 mb-2 flex items-center gap-1">
                           <Info size={12} className="text-themePrimary shrink-0" />
                           <span>
                               {item.serves_min === item.serves_max 
                                   ? `${t.serves}${item.serves_min} ${t.people}`
                                   : `${t.serves}${item.serves_min}-${item.serves_max} ${t.people}`
                               }
                           </span>
                      </div>
                      
                      <p className="hidden md:block text-themeText/70 text-xs md:text-sm mb-3 leading-relaxed line-clamp-2">
                          {localItem.description}
                      </p>

                      <div className="mt-auto pt-1">
                        <button
                            onClick={() => openAddModal(item)}
                            disabled={!item.availability_status}
                            className={`
                                w-full py-2 md:py-3 rounded-lg flex items-center justify-center gap-1.5 font-bold text-xs md:text-sm tracking-wide transition-all duration-200
                                ${!item.availability_status 
                                    ? 'bg-themeText/10 text-themeText/45 cursor-not-allowed'
                                    : 'bg-themeHeaderBg text-themeHeaderTxt shadow-md hover:bg-themePrimary hover:text-themeHeaderBg active:scale-[0.98]'
                                }
                            `}
                        >
                            {!item.availability_status ? t.outOfStock : (
                                <>
                                    <Plus size={14} className="md:w-4 md:h-4" />
                                    <span>{totalGuests > 0 ? `${t.add} (${suggestedQty})` : t.addToCart}</span>
                                </>
                            )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>

    {isZoomed && itemToAdd && (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/95 backdrop-blur-md animate-fade-in p-2 md:p-8"
            onClick={() => setIsZoomed(false)}
        >
            <button 
                onClick={() => setIsZoomed(false)}
                className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors z-[210]"
            >
                <X size={32} />
            </button>
            <img 
                src={getValidImageUrl(itemToAdd.image_url)}
                alt="zoomed"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-zoom-in"
                onClick={(e) => e.stopPropagation()} 
            />
        </div>
    )}

    {itemToAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 font-sans">
             <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm transition-opacity" 
                onClick={() => setItemToAdd(null)}
             ></div>
             
             <div className="relative bg-themeBg w-full md:max-w-lg max-h-[85vh] rounded-2xl md:rounded-3xl flex flex-col shadow-2xl animate-zoom-in overflow-hidden border border-themeText/10">
                <div className="relative h-28 md:h-48 bg-themeBg/40 shrink-0 group">
                    <img 
                        src={getValidImageUrl(itemToAdd.image_url)}
                        alt={getLocalizedItem(itemToAdd, language).name}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setIsZoomed(true)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none"></div>
                    
                    <button 
                        onClick={() => setIsZoomed(true)}
                        className="absolute bottom-3 right-3 text-white bg-black/40 backdrop-blur-md p-2 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20 hover:bg-black/60"
                        title="Zoom"
                    >
                        <Maximize2 size={16} />
                    </button>

                    <button 
                        onClick={() => setItemToAdd(null)} 
                        className="absolute top-2 right-2 text-white bg-black/30 backdrop-blur-md p-1.5 rounded-full transition-all z-20 hover:bg-black/50"
                    >
                        <X size={18} />
                    </button>

                    <div className="absolute bottom-0 left-0 right-0 p-3 z-10 pointer-events-none">
                        <h3 className="text-lg md:text-2xl font-serif font-bold text-white mb-0.5 leading-tight drop-shadow-md">
                            {getLocalizedItem(itemToAdd, language).name}
                        </h3>
                        {appConfig.ecommerce_mode && (
                            <div className="flex items-center gap-2">
                                 <span className="text-sm font-bold text-themePrimary">₪{itemToAdd.price}</span>
                                 <span className="text-stone-300 text-[10px]">/ {getUnitName(itemToAdd.unit_type)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-themeBg text-themeText">
                    <div className="bg-themeCardBg p-3 rounded-xl border border-themeText/5 shadow-sm">
                        <p className="text-themeText/80 text-xs md:text-sm leading-relaxed">
                            {getLocalizedItem(itemToAdd, language).description || t.description}
                        </p>
                    </div>

                    <div className="flex items-center justify-between bg-themeCardBg p-3 rounded-xl border border-themeText/5 shadow-sm text-xs md:text-sm text-themeText/80">
                        <span className="font-bold flex items-center gap-1.5"><Info size={16} className="text-themePrimary" /> {language === 'he' ? 'כמות / סועדים' : 'Servings / Quantity'}</span>
                        <span className="font-semibold">
                            {itemToAdd.serves_min === itemToAdd.serves_max 
                                ? `${t.serves}${itemToAdd.serves_min} ${t.people}`
                                : `${t.serves}${itemToAdd.serves_min}-${itemToAdd.serves_max} ${t.people}`
                            }
                            {itemToAdd.is_tray && itemToAdd.units_per_tray && (
                                ` (${itemToAdd.units_per_tray} ${language === 'he' ? 'יחידות במגש' : 'units per tray'})`
                            )}
                        </span>
                    </div>

                    <div className="flex items-center justify-between bg-themeCardBg p-3 rounded-xl border border-themeText/5 shadow-sm">
                        <span className="font-bold text-themeText/90 text-sm">{t.customizeTitle}</span>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))}
                                className="w-8 h-8 rounded-full bg-themeBg border border-themeText/10 grid place-items-center text-themeText active:bg-themeText/20 transition-colors"
                            >
                                <Minus size={14} />
                            </button>
                            <span className="text-base font-bold w-6 text-center text-themeText">{addQuantity}</span>
                            <button 
                                onClick={() => setAddQuantity(addQuantity + 1)}
                                className="w-8 h-8 rounded-full bg-themePrimary text-themeHeaderBg grid place-items-center shadow-md active:opacity-90 transition-colors"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>

                    {getLocalizedItem(itemToAdd, language).modifications.length > 0 && (
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-themeText/50 uppercase tracking-widest px-1">{t.modifications}</label>
                            <div className="flex flex-wrap gap-2">
                                {getLocalizedItem(itemToAdd, language).modifications.map(mod => (
                                    <button
                                        key={mod}
                                        onClick={() => toggleMod(mod)}
                                        className={`
                                            px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5
                                            ${selectedMods.includes(mod) 
                                                ? 'bg-themeHeaderBg text-themePrimary border-themeHeaderBg' 
                                                : 'bg-themeCardBg text-themeText/70 border-themeText/10'
                                            }
                                        `}
                                    >
                                        {selectedMods.includes(mod) && <Check size={10} />}
                                        {mod}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-themeText/50 uppercase tracking-widest px-1">{t.notesPlaceholder}</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={language === 'he' ? "דגשים מיוחדים, אלרגיות..." : "Special requests, allergies..."}
                            className="w-full p-3 bg-themeCardBg border border-themeText/10 rounded-xl focus:outline-none focus:border-themePrimary min-h-[80px] text-xs resize-none shadow-sm text-themeText"
                        ></textarea>
                    </div>
                </div>

                <div className="bg-themeCardBg border-t border-themeText/10 p-4 flex gap-3 shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
                    {appConfig.ecommerce_mode && (
                        <div className="flex flex-col justify-center">
                            <div className="text-[10px] text-themeText/50 font-bold uppercase tracking-tighter">{t.total}</div>
                            <div className="text-xl font-bold font-serif text-themeText leading-none">₪{itemToAdd.price * addQuantity}</div>
                        </div>
                    )}
                    <button 
                        onClick={handleConfirmAdd}
                        className="flex-1 bg-themePrimary text-themeHeaderBg font-bold py-3 rounded-xl hover:bg-themeSecondary active:scale-95 transition-all shadow-md flex items-center justify-center text-base"
                    >
                        {t.confirmAdd}
                    </button>
                </div>
             </div>
        </div>
    )}
    </>
  );
};
