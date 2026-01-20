
import React, { useMemo, useState } from 'react';
import { MenuItem, Category } from '../types';
import { useStore, getSuggestedQuantity, translations, getLocalizedItem } from '../store';
import { Info, Star, Eye, X, Check, Minus, Plus, Sparkle } from 'lucide-react';

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
  const { addToCart, guestCount, language, calculationSettings } = useStore();
  const t = translations[language] || translations['he'];
  
  const [selectedImage, setSelectedImage] = useState<{name: string, url: string} | null>(null);
  const [itemToAdd, setItemToAdd] = useState<MenuItem | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  
  const [sparkleItems, setSparkleItems] = useState<Record<string, boolean>>({});

  const groupedItems = useMemo(() => {
    const groups: Partial<Record<Category, MenuItem[]>> = {};
    items.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]?.push(item);
    });
    return groups;
  }, [items]);

  const openAddModal = (item: MenuItem) => {
    const suggested = guestCount > 0 ? getSuggestedQuantity(item, guestCount, calculationSettings) : 1;
    setAddQuantity(suggested);
    setNotes('');
    setSelectedMods([]);
    setItemToAdd(item);
  };

  const handleConfirmAdd = () => {
      if (itemToAdd) {
          addToCart(itemToAdd, addQuantity, notes, selectedMods);
          setSparkleItems(prev => ({ ...prev, [itemToAdd.id]: true }));
          setTimeout(() => {
              setSparkleItems(prev => ({ ...prev, [itemToAdd.id]: false }));
          }, 1000);
          setItemToAdd(null);
      }
  };

  const toggleMod = (mod: string) => {
      setSelectedMods(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  // Fix: Explicit string mapping to avoid ReactNode type errors
  const getUnitName = (type: string): string => {
    const units: Record<string, string> = {
      tray: t.tray as string,
      liter: t.liter as string,
      unit: t.unit as string,
      weight: t.weight as string
    };
    return units[type] || type;
  };

  return (
    <>
    <div className="space-y-16 pb-32">
      {CATEGORY_ORDER.map((cat) => {
        const catItems = groupedItems[cat];
        if (!catItems || catItems.length === 0) return null;

        return (
          <section key={cat} id={cat} className="scroll-mt-48">
            <h3 className="text-3xl font-serif font-bold text-stone-900 mb-8 relative inline-block text-start w-full">
                {(t.categories as Record<string, string>)[cat]}
                <span className="absolute -bottom-2 right-0 w-24 h-1 bg-gold-500 rounded-full"></span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {catItems.map((item) => {
                const suggestedQty = guestCount > 0 ? getSuggestedQuantity(item, guestCount, calculationSettings) : 1;
                const localItem = getLocalizedItem(item, language);
                const previewUrl = item.image_url || `https://placehold.co/600x400/1c1917/d4af37?text=${encodeURIComponent(localItem.name)}`;

                return (
                  <div key={item.id} className={`group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 transition-all duration-300 flex flex-col ${!item.availability_status ? 'opacity-50 grayscale' : 'hover:shadow-2xl hover:-translate-y-1 hover:border-gold-500/20'}`}>
                    {item.is_premium && (
                      <div className="absolute top-0 right-0 bg-stone-900 text-gold-500 text-[10px] px-3 py-1 rounded-bl-lg font-bold tracking-widest z-10 flex items-center gap-1 shadow-md uppercase">{t.premium}</div>
                    )}

                    <button onClick={() => setSelectedImage({ name: localItem.name, url: previewUrl })} className="absolute top-4 left-4 z-10 bg-white/90 px-3 py-1.5 rounded-full shadow-md text-stone-600 hover:text-gold-600 backdrop-blur-sm border border-stone-100 flex items-center gap-1.5 transition-all active:scale-90">
                        <Eye size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{language === 'he' ? 'צפה' : 'View'}</span>
                    </button>

                    <div className="p-6 pt-16 flex-1 text-start">
                      <div className="flex justify-between items-start mb-2">
                          <h4 className="text-xl font-bold text-stone-900">{localItem.name}</h4>
                          <span className="text-xl font-bold text-stone-900 ml-2">₪{item.price}</span>
                      </div>
                      <p className="text-stone-500 text-sm mb-4 leading-relaxed line-clamp-2">{localItem.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4 text-[10px] font-bold uppercase tracking-wide text-stone-400">
                          {item.serves_min > 1 && <span className="bg-stone-50 px-2 py-1 rounded border border-stone-100">{t.serves} {item.serves_min}-{item.serves_max}</span>}
                          <span className="bg-stone-50 px-2 py-1 rounded border border-stone-100">{getUnitName(item.unit_type)}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-stone-50 border-t border-stone-100 relative">
                        {sparkleItems[item.id] && (
                            <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                                <Sparkle className="text-gold-500 animate-zoom-in fill-gold-500" size={32} />
                            </div>
                        )}
                        <button
                            onClick={() => openAddModal(item)}
                            disabled={!item.availability_status}
                            className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm tracking-wide transition-all ${!item.availability_status ? 'bg-stone-200 text-stone-400' : 'bg-stone-900 text-white shadow-xl hover:bg-gold-500 hover:text-stone-900 active:scale-95'}`}
                        >
                            {!item.availability_status ? t.outOfStock : <><Plus size={18} /> <span>{guestCount > 0 ? `${t.add} (${suggestedQty})` : t.addToCart}</span></>}
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

    {selectedImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/90 backdrop-blur-sm" onClick={() => setSelectedImage(null)}></div>
            <div className="relative bg-white rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full animate-zoom-in">
                <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white text-stone-900 p-2 rounded-full transition-all"><X size={24} /></button>
                <img src={selectedImage.url} alt={selectedImage.name} className="w-full h-auto aspect-video object-cover" />
                <div className="p-6 bg-white"><h3 className="text-2xl font-serif font-bold text-stone-900">{selectedImage.name}</h3></div>
            </div>
        </div>
    )}

    {itemToAdd && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={() => setItemToAdd(null)}></div>
             <div className="relative bg-white w-full max-h-[85vh] h-auto md:max-w-lg rounded-3xl flex flex-col shadow-2xl animate-zoom-in overflow-hidden">
                <div className="bg-stone-900 p-6 text-white flex justify-between items-start shrink-0 rounded-t-3xl">
                    <div className="text-start"> 
                        <h3 className="text-2xl font-serif font-bold mb-1">{getLocalizedItem(itemToAdd, language).name}</h3>
                        <p className="text-gold-500 text-sm font-bold">₪{itemToAdd.price} / {getUnitName(itemToAdd.unit_type)}</p>
                    </div>
                    <button onClick={() => setItemToAdd(null)} className="text-stone-400 hover:text-white bg-white/10 p-2 rounded-full transition-colors"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="flex items-center justify-between bg-stone-50 p-6 rounded-2xl border border-stone-100">
                        <span className="font-bold text-stone-500 uppercase text-xs tracking-widest">{t.customizeTitle}</span>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))} className="w-12 h-12 rounded-xl bg-white border border-stone-200 grid place-items-center text-stone-900 shadow-sm hover:bg-stone-100"><Minus size={20} /></button>
                            <span className="text-2xl font-bold w-10 text-center">{addQuantity}</span>
                            <button onClick={() => setAddQuantity(addQuantity + 1)} className="w-12 h-12 rounded-xl bg-gold-500 text-stone-900 grid place-items-center shadow-lg hover:bg-gold-400"><Plus size={20} /></button>
                        </div>
                    </div>

                    {getLocalizedItem(itemToAdd, language).modifications.length > 0 && (
                        <div className="text-start">
                            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">{t.modifications}</label>
                            <div className="flex flex-wrap gap-2">
                                {getLocalizedItem(itemToAdd, language).modifications.map(mod => (
                                    <button
                                        key={mod}
                                        onClick={() => toggleMod(mod)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${selectedMods.includes(mod) ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'}`}
                                    >
                                        {mod}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="text-start">
                        <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">{t.notesPlaceholder}</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={language === 'he' ? "דגשים מיוחדים, בקשות..." : "Special requests..."}
                            className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl focus:outline-none focus:border-gold-500 min-h-[100px] text-sm"
                        ></textarea>
                    </div>
                </div>

                <div className="p-6 border-t border-stone-100 bg-white flex gap-6 shrink-0 items-center">
                    <div className="flex-1 text-start">
                        <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{t.total}</div>
                        <div className="text-3xl font-bold font-serif text-stone-900 leading-none">₪{itemToAdd.price * addQuantity}</div>
                    </div>
                    <button onClick={handleConfirmAdd} className="flex-[2] bg-gold-500 text-stone-900 font-bold py-4 rounded-2xl hover:bg-gold-400 transition-all shadow-lg active:scale-95 text-lg">
                        {t.confirmAdd}
                    </button>
                </div>
             </div>
        </div>
    )}
    </>
  );
};
