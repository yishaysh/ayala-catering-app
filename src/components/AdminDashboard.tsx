
import React, { useState, useEffect } from 'react';
import { MenuItem, Category, UnitType, EventType, HungerLevel } from '../types';
import { useStore, translations, getLocalizedItem } from '../store';
import { Pencil, Save, X, LogOut, Plus, Calculator, Settings, ChevronDown, ChevronUp, ToggleRight, ToggleLeft } from 'lucide-react';

interface AdminDashboardProps {
    onExit: () => void;
}

const CATEGORY_OPTIONS: Category[] = [
  'Salads',
  'Cold Platters',
  'Sandwiches',
  'Dips',
  'Main Courses',
  'Pastries',
  'Desserts'
];

const UNIT_OPTIONS: UnitType[] = ['tray', 'unit', 'liter', 'weight'];
const EVENT_TYPES: EventType[] = ['brunch', 'dinner', 'snack', 'party'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
    const { 
        menuItems, updateMenuItem, addMenuItem, 
        calculationSettings, updateCalculationSettings, 
        advancedSettings, updateAdvancedSettings,
        featureFlags, updateFeatureFlags,
        language 
    } = useStore();
    
    // Ensure the view starts at the top when entering admin mode
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const t = translations[language]?.admin || translations['he'].admin;
    const rootT = translations[language] as any || translations['he'] as any;

    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showAdvancedCalc, setShowAdvancedCalc] = useState(false);

    const [editPrice, setEditPrice] = useState(0);
    const [editStatus, setEditStatus] = useState(true);
    const [editIsPremium, setEditIsPremium] = useState(false);
    const [editMods, setEditMods] = useState('');

    const [newItem, setNewItem] = useState<Partial<MenuItem>>({
        name: '', category: 'Salads', price: 0, unit_type: 'tray', description: '', is_premium: false, serves_min: 10, serves_max: 10, availability_status: true, tags: []
    });
    const [addMods, setAddMods] = useState('');

    const filteredItems = (menuItems || []).filter(i => 
        (i.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (i.name_en?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const handleEditClick = (item: MenuItem) => {
        setEditingItem(item);
        setEditPrice(item.price);
        setEditStatus(item.availability_status);
        setEditIsPremium(item.is_premium);
        const mods = language === 'he' ? item.allowed_modifications : (item.allowed_modifications_en || item.allowed_modifications);
        setEditMods(mods ? mods.join(', ') : '');
    };

    const handleEditSave = () => {
        if (!editingItem) return;
        const modsArray = editMods.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const updateData: Partial<MenuItem> = { 
            price: editPrice, 
            availability_status: editStatus,
            is_premium: editIsPremium
        };
        if (language === 'he') updateData.allowed_modifications = modsArray;
        else updateData.allowed_modifications_en = modsArray;
        updateMenuItem(editingItem.id, updateData);
        setEditingItem(null);
    };

    const handleAddSave = async () => {
        if (!newItem.name || !newItem.price) return;
        const modsArray = addMods.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const itemToSave: Omit<MenuItem, 'id'> = {
            name: newItem.name || '', category: (newItem.category as Category) || 'Salads', price: Number(newItem.price), unit_type: (newItem.unit_type as UnitType) || 'tray', description: newItem.description || '', serves_min: Number(newItem.serves_min) || 1, serves_max: Number(newItem.serves_max) || 1, is_premium: newItem.is_premium || false, availability_status: true, tags: [], allowed_modifications: modsArray, allowed_modifications_en: modsArray
        };
        await addMenuItem(itemToSave);
        setIsAddModalOpen(false);
        setNewItem({ name: '', category: 'Salads', price: 0, unit_type: 'tray', description: '', is_premium: false, serves_min: 10, serves_max: 10, availability_status: true, tags: [] });
    };

    const handleHungerMultChange = (level: HungerLevel, value: string) => {
        const newMults = { ...advancedSettings.hungerMultipliers };
        newMults[level] = parseFloat(value) || 1.0;
        updateAdvancedSettings({ hungerMultipliers: newMults });
    };

    const handleEventRatioChange = (eType: EventType, field: string, value: string) => {
        const newRatios = { ...advancedSettings.eventRatios };
        newRatios[eType] = { ...newRatios[eType], [field]: parseFloat(value) || 0 };
        updateAdvancedSettings({ eventRatios: newRatios });
    };

    return (
        <div className="p-8 bg-stone-100 min-h-screen font-sans animate-fade-in" dir={language === 'he' ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 text-start">
                 <h1 className="text-3xl font-serif font-bold text-stone-900">{t.title}</h1>
                 <div className="flex gap-4">
                     <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-gold-500 text-stone-900 px-4 py-2 rounded-lg hover:bg-gold-400 transition font-bold shadow-md"><Plus size={18} /><span>{t.addItem}</span></button>
                     <button onClick={onExit} className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-stone-800 transition shadow-md"><LogOut size={18} /><span>{t.exit}</span></button>
                 </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 text-start">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-sm font-bold text-stone-400 uppercase mb-2">{t.minOrder}</h3>
                    <input type="number" defaultValue={500} className="w-full border-b border-stone-300 text-2xl font-bold pb-2 focus:outline-none focus:border-gold-500" />
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col justify-between">
                    <h3 className="text-sm font-bold text-stone-400 uppercase mb-4">{t.featureMgmt}</h3>
                    <div className="space-y-3">
                        <button 
                            onClick={() => updateFeatureFlags({ showCalculator: !featureFlags?.showCalculator })}
                            className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all ${featureFlags?.showCalculator ? 'bg-gold-50 border-gold-200 text-gold-900' : 'bg-stone-50 border-stone-200 text-stone-400'}`}
                        >
                            <span className="text-xs font-bold">{t.showCalc}</span>
                            {featureFlags?.showCalculator ? <ToggleRight className="text-gold-500" /> : <ToggleLeft />}
                        </button>
                        <button 
                            onClick={() => updateFeatureFlags({ showAI: !featureFlags?.showAI })}
                            className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all ${featureFlags?.showAI ? 'bg-gold-50 border-gold-200 text-gold-900' : 'bg-stone-50 border-stone-200 text-stone-400'}`}
                        >
                            <span className="text-xs font-bold">{t.showAI}</span>
                            {featureFlags?.showAI ? <ToggleRight className="text-gold-500" /> : <ToggleLeft />}
                        </button>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm md:col-span-2 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-gold-100 rounded text-gold-600"><Calculator size={16} /></div>
                        <h3 className="text-sm font-bold text-stone-900 uppercase">{t.calcSettings}</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3 md:gap-6 items-end">
                        <div className="flex flex-col">
                             <label className="text-[10px] md:text-xs text-stone-500 font-bold block mb-1 min-h-[2.5rem] flex items-end">{t.sandwichesPerPerson}</label>
                             <input type="number" step="0.1" value={calculationSettings?.sandwichesPerPerson || 1.5} onChange={(e) => updateCalculationSettings({ sandwichesPerPerson: parseFloat(e.target.value) })} className="w-full border-b border-stone-300 text-xl font-bold pb-1 focus:outline-none focus:border-gold-500" />
                        </div>
                        <div className="flex flex-col">
                             <label className="text-[10px] md:text-xs text-stone-500 font-bold block mb-1 min-h-[2.5rem] flex items-end">{t.pastriesPerPerson}</label>
                             <input type="number" step="0.1" value={calculationSettings?.pastriesPerPerson || 1.0} onChange={(e) => updateCalculationSettings({ pastriesPerPerson: parseFloat(e.target.value) })} className="w-full border-b border-stone-300 text-xl font-bold pb-1 focus:outline-none focus:border-gold-500" />
                        </div>
                         <div className="flex flex-col">
                             <label className="text-[10px] md:text-xs text-stone-500 font-bold block mb-1 min-h-[2.5rem] flex items-end">{t.trayCapacity}</label>
                             <input type="number" value={calculationSettings?.averageTrayCapacity || 10} onChange={(e) => updateCalculationSettings({ averageTrayCapacity: parseInt(e.target.value) })} className="w-full border-b border-stone-300 text-xl font-bold pb-1 focus:outline-none focus:border-gold-500" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8 text-start">
                <button onClick={() => setShowAdvancedCalc(!showAdvancedCalc)} className="w-full p-6 flex items-center justify-between bg-stone-900 text-white hover:bg-stone-800 transition">
                    <div className="flex items-center gap-3"><Settings size={20} className="text-gold-500" /><span className="font-serif font-bold text-lg">{t.advCalc}</span></div>
                    {showAdvancedCalc ? <ChevronUp /> : <ChevronDown />}
                </button>
                {showAdvancedCalc && (
                    <div className="p-6 bg-stone-50 animate-slide-in-top">
                        <div className="mb-8 border-b border-stone-200 pb-8">
                            <h4 className="text-stone-900 font-bold mb-4 flex items-center gap-2"><span className="w-2 h-6 bg-gold-500 rounded-sm"></span>{t.hungerMult}</h4>
                            <div className="grid grid-cols-3 gap-6 max-w-lg">
                                {(['light', 'medium', 'heavy'] as HungerLevel[]).map(level => (
                                    <div key={level}>
                                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">{rootT[level] || level}</label>
                                        <input type="number" step="0.1" value={advancedSettings?.hungerMultipliers?.[level] || 1} onChange={(e) => handleHungerMultChange(level, e.target.value)} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-stone-900 font-bold mb-2 flex items-center gap-2"><span className="w-2 h-6 bg-gold-500 rounded-sm"></span>{t.eventLogic}</h4>
                            <p className="text-[11px] text-stone-500 italic mb-4 px-2">{t.eventLogicExpl}</p>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-stone-200 text-stone-600 text-[10px] uppercase">
                                            <th className="p-2 text-start">{t.tableEventType}</th>
                                            <th className="p-2 text-start">{t.tableSandwiches}</th>
                                            <th className="p-2 text-start">{t.tablePastries}</th>
                                            <th className="p-2 text-start">{t.tableSalads}</th>
                                            <th className="p-2 text-start">{t.tableMains}</th>
                                            <th className="p-2 text-start">{t.tablePlatters}</th>
                                            <th className="p-2 text-start">{t.tableDesserts}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {EVENT_TYPES.map(eType => (
                                            <tr key={eType} className="border-b border-stone-200 hover:bg-white transition-colors">
                                                <td className="p-2 font-bold text-stone-800 text-sm capitalize">{rootT[eType] || eType}</td>
                                                <td className="p-2"><input type="number" step="0.1" className="w-14 p-1 border rounded text-xs" value={advancedSettings?.eventRatios?.[eType]?.sandwiches || 0} onChange={(e) => handleEventRatioChange(eType, 'sandwiches', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" step="0.1" className="w-14 p-1 border rounded text-xs" value={advancedSettings?.eventRatios?.[eType]?.pastries || 0} onChange={(e) => handleEventRatioChange(eType, 'pastries', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" step="0.1" className="w-14 p-1 border rounded text-xs" value={advancedSettings?.eventRatios?.[eType]?.saladsCoverage || 0} onChange={(e) => handleEventRatioChange(eType, 'saladsCoverage', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" step="0.1" className="w-14 p-1 border rounded text-xs" value={advancedSettings?.eventRatios?.[eType]?.mainsCoverage || 0} onChange={(e) => handleEventRatioChange(eType, 'mainsCoverage', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" step="0.1" className="w-14 p-1 border rounded text-xs" value={advancedSettings?.eventRatios?.[eType]?.plattersCoverage || 0} onChange={(e) => handleEventRatioChange(eType, 'plattersCoverage', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" step="0.1" className="w-14 p-1 border rounded text-xs" value={advancedSettings?.eventRatios?.[eType]?.dessertsCoverage || 0} onChange={(e) => handleEventRatioChange(eType, 'dessertsCoverage', e.target.value)} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden text-start">
                <div className="p-4 border-b border-stone-200">
                    <input type="text" placeholder={t.searchPlaceholder} className="w-full p-2 border border-stone-200 rounded" onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-stone-50 text-stone-500 text-sm">
                            <tr>
                                <th className="p-4 text-start">{t.productName}</th>
                                <th className="p-4 text-start">{t.category}</th>
                                <th className="p-4 text-start">{t.price}</th>
                                <th className="p-4 text-start">{t.status}</th>
                                <th className="p-4 text-start">{t.modifications}</th>
                                <th className="p-4 text-start">{t.edit}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(filteredItems || []).map(item => {
                                const localItem = getLocalizedItem(item, language);
                                return (
                                    <tr key={item.id} className="border-b border-stone-100 hover:bg-stone-50">
                                        <td className="p-4 font-bold text-stone-800">{localItem.name}</td>
                                        <td className="p-4 text-stone-500">{(rootT.categories as Record<string, string>)?.[item.category] || item.category}</td>
                                        <td className="p-4">₪{item.price}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded text-xs font-bold ${item.availability_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {item.availability_status ? t.active : t.outOfStock}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-stone-400 max-w-xs truncate">{localItem.modifications?.join(', ') || '-'}</td>
                                        <td className="p-4">
                                            <button onClick={() => handleEditClick(item)} className="p-2 text-stone-400 hover:text-gold-500 transition-colors">
                                                <Pencil size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={() => setEditingItem(null)}></div>
                    <div className="relative bg-white w-full max-h-[85vh] h-auto md:max-w-lg rounded-2xl p-6 shadow-2xl animate-zoom-in text-start flex flex-col">
                        <div className="flex justify-between items-center mb-6 shrink-0"><h2 className="text-2xl font-serif font-bold text-stone-900">{t.editItemTitle}</h2><button onClick={() => setEditingItem(null)} className="text-stone-400 hover:text-stone-900 bg-stone-100 p-2 rounded-full"><X size={20} /></button></div>
                        <div className="space-y-4 flex-1 overflow-y-auto">
                            <div><label className="block text-sm font-bold text-stone-700 mb-1">{t.price} (₪)</label><input type="number" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none" /></div>
                            <div><label className="block text-sm font-bold text-stone-700 mb-1">{t.status}</label><div className="flex items-center gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={editStatus} onChange={() => setEditStatus(true)} className="w-4 h-4 text-gold-500" /><span>{t.inStock}</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!editStatus} onChange={() => setEditStatus(false)} className="w-4 h-4 text-red-500" /><span>{t.outOfStockLabel}</span></label></div></div>
                             <div>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-stone-50 w-full">
                                    <input type="checkbox" checked={editIsPremium} onChange={(e) => setEditIsPremium(e.target.checked)} className="w-4 h-4 text-gold-500 rounded" />
                                    <span className="font-bold text-sm text-stone-700">{t.premium}</span>
                                </label>
                            </div>
                            <div><label className="block text-sm font-bold text-stone-700 mb-1">{t.modifications}</label><textarea value={editMods} onChange={(e) => setEditMods(e.target.value)} placeholder={t.modsPlaceholder} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none h-24" /></div>
                        </div>
                        <div className="mt-8 flex gap-3 shrink-0"><button onClick={handleEditSave} className="flex-1 bg-gold-500 text-stone-900 font-bold py-3 rounded-lg hover:bg-gold-400 flex items-center justify-center gap-2"><Save size={18} />{t.save}</button><button onClick={() => setEditingItem(null)} className="bg-stone-100 text-stone-600 font-bold py-3 px-6 rounded-lg hover:bg-stone-200">{t.cancelBtn}</button></div>
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-h-[85vh] h-auto md:max-w-lg rounded-2xl p-6 shadow-2xl animate-zoom-in text-start flex flex-col">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h2 className="text-2xl font-serif font-bold text-stone-900">{t.createItemTitle}</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-stone-900 bg-stone-100 p-2 rounded-full"><X size={20} /></button>
                        </div>
                        
                        <div className="space-y-4 flex-1 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.productName}</label>
                                <input type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.category}</label>
                                    <select value={newItem.category} onChange={(e) => setNewItem({...newItem, category: e.target.value as Category})} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none">
                                        {CATEGORY_OPTIONS.map(c => (
                                            <option key={c} value={c}>{(rootT.categories as any)[c] || c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.unitType}</label>
                                    <select value={newItem.unit_type} onChange={(e) => setNewItem({...newItem, unit_type: e.target.value as UnitType})} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none">
                                        {UNIT_OPTIONS.map(u => (
                                            <option key={u} value={u}>{rootT[u] || u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.price} (₪)</label>
                                <input type="number" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: Number(e.target.value)})} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.description}</label>
                                <textarea value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none h-20" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.modifications}</label>
                                <textarea value={addMods} onChange={(e) => setAddMods(e.target.value)} placeholder={t.modsPlaceholder} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none h-20" />
                                <p className="text-xs text-stone-400 mt-1">{t.modsHint}</p>
                            </div>
                            
                             <div>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-stone-50">
                                    <input type="checkbox" checked={newItem.is_premium} onChange={(e) => setNewItem({...newItem, is_premium: e.target.checked})} className="w-4 h-4 text-gold-500 rounded" />
                                    <span className="font-bold text-sm text-stone-700">{t.premium}</span>
                                </label>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3 shrink-0">
                            <button onClick={handleAddSave} disabled={!newItem.name || !newItem.price} className="flex-1 bg-stone-900 text-gold-500 font-bold py-3 rounded-lg hover:bg-stone-800 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                <Plus size={18} />
                                {t.create}
                            </button>
                            <button onClick={() => setIsAddModalOpen(false)} className="bg-stone-100 text-stone-600 font-bold py-3 px-6 rounded-lg hover:bg-stone-200">
                                {t.cancelBtn}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
