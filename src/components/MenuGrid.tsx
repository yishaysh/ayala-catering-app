
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
  'Desserts'
];

const DEFAULT_PLACEHOLDER = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80";

export const MenuGrid: React.FC<MenuGridProps> = ({ items }) => {
  const { addToCart, adultCount, childCount, language, calculationSettings, cart } = useStore();
  const t = translations[language];
  const totalGuests = adultCount + childCount;
  
  const [itemToAdd, setItemToAdd] = useState<MenuItem | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  
  // Feature 1: Zoom State
  const [isZoomed, setIsZoomed] = useState(false);

  // Handle Back Button logic
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
    // Feature 3: Pass 'cart' to apply saturation logic based on existing items
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

        return (
          <section key={cat} id={cat} className="scroll-mt-52">
            <div className="flex items-center gap-4 mb-4 px-2">
                <h3 className="text-xl md:text-3xl font-serif font-bold text-stone-900 relative">
                  {(t.categories as Record<string, string>)[cat]}
                  <span className="absolute -bottom-2 right-0 w-8 md:w-12 h-1 bg-gold-500 rounded-full"></span>
                </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {catItems.map((item) => {
                const suggestedQty = totalGuests > 0 ? getSuggestedQuantity(item, adultCount, childCount, calculationSettings, cart) : 1;
                const localItem = getLocalizedItem(item, language);
                const previewUrl = item.image_url || DEFAULT_PLACEHOLDER;

                return (
                  <div 
                      key={item.id} 
                      id={`item-${item.id}`}
                      className={`
                          scroll-mt-48 group relative bg-white rounded-xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-xl hover:border-gold-500/30 transition-all duration-300 flex flex-col justify-between
                          ${!item.availability_status ? 'opacity-60 grayscale' : ''}
                      `}
                  >
                    <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden cursor-pointer" onClick={() => openAddModal(item)}>
                        <img 
                            src={previewUrl} 
                            alt={localItem.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>

                        {item.is_premium && (
                          <div className="absolute top-0 right-0 bg-stone-900 text-gold-500 text-[10px] md:text-xs px-2 py-1 rounded-bl-lg font-bold tracking-wider z-10 flex items-center gap-1 shadow-md">
                            <Star size={10} fill="currentColor" /> {t.premium}
                          </div>
                        )}
                    </div>

                    <div className="p-2.5 md:p-5 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-1 gap-1">
                          <h4 className="text-sm md:text-lg font-bold text-stone-900 leading-tight line-clamp-2 min-h-[2.5em]">{localItem.name}</h4>
                      </div>
                      
                      <div className="flex items-baseline gap-1 mb-2">
                           <span className="text-base md:text-xl font-bold text-stone-800">₪{item.price}</span>
                           <span className="text-[10px] md:text-xs text-stone-400 font-normal">/ {getUnitName(item.unit_type)}</span>
                      </div>
                      
                      <p className="hidden md:block text-stone-500 text-xs md:text-sm mb-3 leading-relaxed line-clamp-2">
                          {localItem.description}
                      </p>

                      <div className="mt-auto pt-1">
                        <button
                            onClick={() => openAddModal(item)}
                            disabled={!item.availability_status}
                            className={`
                                w-full py-2 md:py-3 rounded-lg flex items-center justify-center gap-1.5 font-bold text-xs md:text-sm tracking-wide transition-all duration-200
                                ${!item.availability_status 
                                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                    : 'bg-stone-900 text-white shadow-md hover:bg-gold-500 hover:text-stone-900 active:scale-[0.98]'
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

    {/* Feature 1: Full Screen Image Overlay */}
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
                src={itemToAdd.image_url || DEFAULT_PLACEHOLDER}
                alt="zoomed"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-zoom-in"
                onClick={(e) => e.stopPropagation()} 
            />
        </div>
    )}

    {/* Add to Cart Customization Modal */}
    {itemToAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 font-sans">
             <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm transition-opacity" 
                onClick={() => setItemToAdd(null)}
             ></div>
             
             <div className="relative bg-stone-50 w-full md:max-w-lg max-h-[85vh] rounded-2xl md:rounded-3xl flex flex-col shadow-2xl animate-zoom-in overflow-hidden border border-stone-200">
                
                {/* Header: Fixed image with Zoom trigger */}
                <div className="relative h-28 md:h-48 bg-stone-200 shrink-0 group">
                    <img 
                        src={itemToAdd.image_url || DEFAULT_PLACEHOLDER}
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
                        <div className="flex items-center gap-2">
                             <span className="text-sm font-bold text-gold-400">₪{itemToAdd.price}</span>
                             <span className="text-stone-300 text-[10px]">/ {getUnitName(itemToAdd.unit_type)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
                    <div className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm">
                        <p className="text-stone-600 text-xs md:text-sm leading-relaxed">
                            {getLocalizedItem(itemToAdd, language).description || t.description}
                        </p>
                    </div>

                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-stone-100 shadow-sm">
                        <span className="font-bold text-stone-700 text-sm">{t.customizeTitle}</span>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))}
                                className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 grid place-items-center text-stone-600 active:bg-stone-200 transition-colors"
                            >
                                <Minus size={14} />
                            </button>
                            <span className="text-base font-bold w-6 text-center text-stone-900">{addQuantity}</span>
                            <button 
                                onClick={() => setAddQuantity(addQuantity + 1)}
                                className="w-8 h-8 rounded-full bg-gold-500 text-stone-900 grid place-items-center shadow-md active:bg-gold-600 transition-colors"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>

                    {getLocalizedItem(itemToAdd, language).modifications.length > 0 && (
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest px-1">{t.modifications}</label>
                            <div className="flex flex-wrap gap-2">
                                {getLocalizedItem(itemToAdd, language).modifications.map(mod => (
                                    <button
                                        key={mod}
                                        onClick={() => toggleMod(mod)}
                                        className={`
                                            px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5
                                            ${selectedMods.includes(mod) 
                                                ? 'bg-stone-900 text-white border-stone-900' 
                                                : 'bg-white text-stone-600 border-stone-200'
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
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest px-1">{t.notesPlaceholder}</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={language === 'he' ? "דגשים מיוחדים, אלרגיות..." : "Special requests, allergies..."}
                            className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-gold-500 min-h-[80px] text-xs resize-none shadow-sm"
                        ></textarea>
                    </div>
                </div>

                <div className="bg-white border-t border-stone-200 p-4 flex gap-3 shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col justify-center">
                        <div className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">{t.total}</div>
                        <div className="text-xl font-bold font-serif text-stone-900 leading-none">₪{itemToAdd.price * addQuantity}</div>
                    </div>
                    <button 
                        onClick={handleConfirmAdd}
                        className="flex-1 bg-gold-500 text-stone-900 font-bold py-3 rounded-xl hover:bg-gold-400 active:scale-95 transition-all shadow-md flex items-center justify-center text-base"
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
