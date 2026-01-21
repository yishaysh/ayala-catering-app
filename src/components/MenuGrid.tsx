
import React, { useMemo, useState } from 'react';
import { MenuItem, Category } from '../types';
import { useStore, getSuggestedQuantity, translations, getLocalizedItem } from '../store';
import { Info, Star, Eye, X, Check, Minus, Plus } from 'lucide-react';

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

export const MenuGrid: React.FC<MenuGridProps> = ({ items }) => {
  const { addToCart, adultCount, childCount, language, calculationSettings } = useStore();
  const t = translations[language];
  const totalGuests = adultCount + childCount;
  
  const [selectedImage, setSelectedImage] = useState<{name: string, url: string} | null>(null);
  
  const [itemToAdd, setItemToAdd] = useState<MenuItem | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedMods, setSelectedMods] = useState<string[]>([]);

  const groupedItems = useMemo(() => {
    const groups: Partial<Record<Category, MenuItem[]>> = {};
    items.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]?.push(item);
    });
    return groups;
  }, [items]);

  const openAddModal = (item: MenuItem) => {
    const suggested = totalGuests > 0 ? getSuggestedQuantity(item, adultCount, childCount, calculationSettings) : 1;
    setAddQuantity(suggested);
    setNotes('');
    setSelectedMods([]);
    setItemToAdd(item);
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
    <div className="space-y-16 pb-32">
      {CATEGORY_ORDER.map((cat) => {
        const catItems = groupedItems[cat];
        if (!catItems || catItems.length === 0) return null;

        return (
          <section key={cat} id={cat} className="scroll-mt-48">
            <div className="flex items-center gap-4 mb-8">
                <h3 className="text-3xl font-serif font-bold text-stone-900 relative">
                  {(t.categories as Record<string, string>)[cat]}
                  <span className="absolute -bottom-2 right-0 w-12 h-1 bg-gold-500 rounded-full"></span>
                </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {catItems.map((item) => {
                const suggestedQty = totalGuests > 0 ? getSuggestedQuantity(item, adultCount, childCount, calculationSettings) : 1;
                const localItem = getLocalizedItem(item, language);
                
                // Use actual item image or a high quality placeholder
                const previewUrl = item.image_url || `https://placehold.co/600x400/1c1917/d4af37?text=${encodeURIComponent(localItem.name)}`;

                return (
                  <div 
                      key={item.id} 
                      className={`
                          group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-xl hover:border-gold-500/30 transition-all duration-300 flex flex-col justify-between
                          ${!item.availability_status ? 'opacity-60 grayscale' : ''}
                      `}
                  >
                    {item.is_premium && (
                      <div className="absolute top-0 right-0 bg-stone-900 text-gold-500 text-xs px-3 py-1 rounded-bl-lg font-bold tracking-wider z-10 flex items-center gap-1 shadow-md">
                        <Star size={10} fill="currentColor" /> {t.premium}
                      </div>
                    )}

                    <div className="absolute top-4 left-4 z-10">
                        <button 
                            onClick={() => setSelectedImage({ name: localItem.name, url: previewUrl })}
                            className="bg-white/90 px-3 py-1.5 rounded-full shadow-md text-stone-600 hover:text-gold-600 transition-colors backdrop-blur-sm border border-stone-100 flex items-center gap-1.5"
                        >
                            <Eye size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{language === 'he' ? 'הצג' : 'View'}</span>
                        </button>
                    </div>

                    <div className="p-6 pt-16">
                      <div className="flex justify-between items-start mb-3">
                          <h4 className="text-xl font-bold text-stone-900 group-hover:text-gold-600 transition-colors">{localItem.name}</h4>
                          <span className="text-xl font-bold text-stone-900 bg-stone-50 px-2 py-1 rounded-md shrink-0 ml-2">₪{item.price}</span>
                      </div>
                      
                      <p className="text-stone-500 text-sm mb-4 leading-relaxed line-clamp-2 min-h-[40px]">
                          {localItem.description || (language === 'he' ? 'פריט איכותי וטרי מבית איילה פשוט טעים.' : 'Fresh premium item by Ayala Simply Delicious.')}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-2 text-xs text-stone-500 font-medium">
                          {item.serves_min > 1 && (
                              <span className="flex items-center gap-1 bg-stone-50 px-2 py-1 rounded-md border border-stone-200">
                                  <Info size={12} />
                                  {t.serves} {item.serves_min}-{item.serves_max}
                              </span>
                          )}
                          <span className="bg-stone-50 px-2 py-1 rounded-md border border-stone-200">
                              {getUnitName(item.unit_type)}
                          </span>
                      </div>
                    </div>

                    <div className="p-4 bg-stone-50 border-t border-stone-100 mt-auto">
                      <button
                        onClick={() => openAddModal(item)}
                        disabled={!item.availability_status}
                        className={`
                            w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm tracking-wide transition-all duration-200
                            ${!item.availability_status 
                                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                : 'bg-stone-900 text-white shadow-lg shadow-stone-900/10 hover:bg-gold-500 hover:text-stone-900 hover:shadow-gold-500/20 active:scale-[0.98]'
                            }
                        `}
                      >
                        {!item.availability_status ? t.outOfStock : (
                            <>
                                <Plus size={18} strokeWidth={3} />
                                <span>{totalGuests > 0 ? `${t.add} (${suggestedQty})` : t.addToCart}</span>
                            </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>

    {/* Image Preview Modal */}
    {selectedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/90 backdrop-blur-sm transition-opacity" 
                onClick={() => setSelectedImage(null)}
            ></div>
            <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full animate-zoom-in">
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-4 right-4 z-10 bg-white/50 hover:bg-white text-stone-900 p-2 rounded-full transition-all flex items-center justify-center"
                >
                    <X size={24} />
                </button>
                <div className="aspect-video bg-stone-100 relative">
                     <img 
                        src={selectedImage.url} 
                        alt={selectedImage.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://placehold.co/600x400/1c1917/d4af37?text=${encodeURIComponent(selectedImage.name)}`;
                        }}
                     />
                </div>
                <div className="p-6 bg-white">
                    <h3 className="text-2xl font-serif font-bold text-stone-900">{selectedImage.name}</h3>
                </div>
            </div>
        </div>
    )}

    {/* Add to Cart Customization Modal */}
    {itemToAdd && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 font-sans">
             <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm transition-opacity" 
                onClick={() => setItemToAdd(null)}
             ></div>
             
             <div className="relative bg-white w-full max-h-[85vh] h-auto md:max-w-lg rounded-2xl flex flex-col shadow-2xl animate-zoom-in">
                
                <div className="bg-stone-900 p-5 text-white flex justify-between items-start shrink-0 rounded-t-2xl">
                    <div className="pr-4"> 
                        <h3 className="text-xl md:text-2xl font-serif font-bold mb-1 leading-tight">{getLocalizedItem(itemToAdd, language).name}</h3>
                        <p className="text-stone-400 text-sm">₪{itemToAdd.price} / {getUnitName(itemToAdd.unit_type)}</p>
                    </div>
                    <button 
                        onClick={() => setItemToAdd(null)} 
                        className="text-stone-400 hover:text-white bg-stone-800/50 p-2 rounded-full flex items-center justify-center"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    <div className="flex items-center justify-between bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <span className="font-bold text-stone-700">{t.customizeTitle}</span>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))}
                                className="w-12 h-12 rounded-full bg-white border border-stone-300 grid place-items-center text-stone-900 hover:bg-stone-100 transition-colors"
                            >
                                <Minus size={20} />
                            </button>
                            <span className="text-2xl font-bold w-10 text-center">{addQuantity}</span>
                            <button 
                                onClick={() => setAddQuantity(addQuantity + 1)}
                                className="w-12 h-12 rounded-full bg-gold-500 text-stone-900 grid place-items-center shadow-lg hover:bg-gold-400 transition-colors"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    {getLocalizedItem(itemToAdd, language).modifications.length > 0 && (
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">{t.modifications}</label>
                            <div className="flex flex-wrap gap-2">
                                {getLocalizedItem(itemToAdd, language).modifications.map(mod => (
                                    <button
                                        key={mod}
                                        onClick={() => toggleMod(mod)}
                                        className={`
                                            px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2
                                            ${selectedMods.includes(mod) 
                                                ? 'bg-stone-900 text-white border-stone-900' 
                                                : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400'
                                            }
                                        `}
                                    >
                                        {selectedMods.includes(mod) && <Check size={14} />}
                                        {mod}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">{t.notesPlaceholder}</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={language === 'he' ? "דגשים מיוחדים, אלרגיות, בקשות..." : "Special requests, allergies..."}
                            className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-gold-500 min-h-[100px]"
                        ></textarea>
                    </div>
                </div>

                <div className="p-5 border-t border-stone-200 bg-stone-50 flex gap-4 shrink-0 rounded-b-2xl">
                    <div className="flex-1">
                        <div className="text-xs text-stone-500 mb-1">{t.total}</div>
                        <div className="text-2xl font-bold font-serif text-stone-900">₪{itemToAdd.price * addQuantity}</div>
                    </div>
                    <button 
                        onClick={handleConfirmAdd}
                        className="flex-[2] bg-gold-500 text-stone-900 font-bold py-3.5 rounded-xl hover:bg-gold-400 transition-colors shadow-lg active:scale-95 flex items-center justify-center"
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
