import React, { useState } from 'react';
import { MenuItem, Category, UnitType } from '../types';
import { useStore, translations, getLocalizedItem } from '../store';
import { Pencil, Save, X, LogOut, Plus } from 'lucide-react';

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

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
    const { menuItems, updateMenuItem, addMenuItem, language } = useStore();
    const t = translations[language].admin;
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Edit Form states
    const [editPrice, setEditPrice] = useState(0);
    const [editStatus, setEditStatus] = useState(true);
    const [editMods, setEditMods] = useState('');

    // Add Form States
    const [newItem, setNewItem] = useState<Partial<MenuItem>>({
        name: '',
        category: 'Salads',
        price: 0,
        unit_type: 'tray',
        description: '',
        is_premium: false,
        serves_min: 10,
        serves_max: 10,
        availability_status: true,
        tags: []
    });
    const [addMods, setAddMods] = useState('');

    const filteredItems = menuItems.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.name_en && i.name_en.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleEditClick = (item: MenuItem) => {
        setEditingItem(item);
        setEditPrice(item.price);
        setEditStatus(item.availability_status);
        const mods = language === 'he' ? item.allowed_modifications : (item.allowed_modifications_en || item.allowed_modifications);
        setEditMods(mods ? mods.join(', ') : '');
    };

    const handleEditSave = () => {
        if (!editingItem) return;
        
        const modsArray = editMods.split(',').map(s => s.trim()).filter(s => s.length > 0);
        
        const updateData: Partial<MenuItem> = {
            price: editPrice,
            availability_status: editStatus,
        };

        if (language === 'he') {
            updateData.allowed_modifications = modsArray;
        } else {
            updateData.allowed_modifications_en = modsArray;
        }
        
        updateMenuItem(editingItem.id, updateData);
        setEditingItem(null);
    };

    const handleAddSave = async () => {
        if (!newItem.name || !newItem.price) return;

        const modsArray = addMods.split(',').map(s => s.trim()).filter(s => s.length > 0);

        const itemToSave: Omit<MenuItem, 'id'> = {
            name: newItem.name || '',
            category: newItem.category as Category,
            price: Number(newItem.price),
            unit_type: newItem.unit_type as UnitType,
            description: newItem.description,
            serves_min: Number(newItem.serves_min),
            serves_max: Number(newItem.serves_max),
            is_premium: newItem.is_premium || false,
            availability_status: true,
            tags: [],
            // Assign mods to both lang fields for now to ensure visibility
            allowed_modifications: modsArray,
            allowed_modifications_en: modsArray
        };

        await addMenuItem(itemToSave);
        setIsAddModalOpen(false);
        // Reset form
        setNewItem({
            name: '',
            category: 'Salads',
            price: 0,
            unit_type: 'tray',
            description: '',
            is_premium: false,
            serves_min: 10,
            serves_max: 10,
            availability_status: true,
            tags: []
        });
        setAddMods('');
    };

    return (
        <div className="p-8 bg-stone-100 min-h-screen font-sans" dir={language === 'he' ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                 <h1 className="text-3xl font-serif font-bold text-stone-900">{t.title}</h1>
                 
                 <div className="flex gap-4">
                     <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-gold-500 text-stone-900 px-4 py-2 rounded-lg hover:bg-gold-400 transition font-bold shadow-md"
                     >
                         <Plus size={18} />
                         <span>{t.addItem}</span>
                     </button>
                     <button 
                        onClick={onExit}
                        className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-stone-800 transition shadow-md"
                     >
                         <LogOut size={18} />
                         <span>{t.exit}</span>
                     </button>
                 </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-start">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-sm font-bold text-stone-400 uppercase mb-2">{t.minOrder}</h3>
                    <input type="number" defaultValue={500} className="w-full border-b border-stone-300 text-2xl font-bold pb-2 focus:outline-none focus:border-gold-500" />
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-sm font-bold text-stone-400 uppercase mb-2">{t.prepTime}</h3>
                    <input type="number" defaultValue={48} className="w-full border-b border-stone-300 text-2xl font-bold pb-2 focus:outline-none focus:border-gold-500" />
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-sm font-bold text-stone-400 uppercase mb-2">{t.storeStatus}</h3>
                    <select className="w-full border-b border-stone-300 text-2xl font-bold pb-2 focus:outline-none focus:border-gold-500 bg-transparent">
                        <option value="open">{t.open}</option>
                        <option value="closed">{t.closed}</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden text-start">
                <div className="p-4 border-b border-stone-200">
                    <input 
                        type="text" 
                        placeholder={t.searchPlaceholder}
                        className="w-full p-2 border border-stone-200 rounded"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
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
                            {filteredItems.map(item => {
                                const localItem = getLocalizedItem(item, language);
                                return (
                                    <tr key={item.id} className="border-b border-stone-100 hover:bg-stone-50">
                                        <td className="p-4 font-bold text-stone-800">{localItem.name}</td>
                                        <td className="p-4 text-stone-500">{item.category}</td>
                                        <td className="p-4">₪{item.price}</td>
                                        <td className="p-4">
                                            <span 
                                                className={`px-3 py-1 rounded text-xs font-bold ${item.availability_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                            >
                                                {item.availability_status ? t.active : t.outOfStock}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-stone-400 max-w-xs truncate">
                                            {localItem.modifications?.join(', ') || '-'}
                                        </td>
                                        <td className="p-4">
                                            <button 
                                                onClick={() => handleEditClick(item)}
                                                className="p-2 text-stone-400 hover:text-gold-500 transition-colors"
                                            >
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

            {/* Edit Modal - Centered */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={() => setEditingItem(null)}></div>
                    <div className="relative bg-white w-full max-h-[85vh] h-auto md:max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 text-start flex flex-col">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h2 className="text-2xl font-serif font-bold text-stone-900">{t.editItemTitle}: {getLocalizedItem(editingItem, language).name}</h2>
                            <button onClick={() => setEditingItem(null)} className="text-stone-400 hover:text-stone-900 bg-stone-100 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4 flex-1 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.price} (₪)</label>
                                <input 
                                    type="number" 
                                    value={editPrice} 
                                    onChange={(e) => setEditPrice(Number(e.target.value))}
                                    className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.status}</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            checked={editStatus} 
                                            onChange={() => setEditStatus(true)}
                                            className="w-4 h-4 text-gold-500"
                                        />
                                        <span>{t.inStock}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            checked={!editStatus} 
                                            onChange={() => setEditStatus(false)}
                                            className="w-4 h-4 text-red-500"
                                        />
                                        <span>{t.outOfStockLabel}</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.modifications}</label>
                                <textarea 
                                    value={editMods}
                                    onChange={(e) => setEditMods(e.target.value)}
                                    placeholder={t.modsPlaceholder}
                                    className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none h-24"
                                />
                                <p className="text-xs text-stone-400 mt-1">{t.modsHint}</p>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3 shrink-0">
                             <button 
                                onClick={handleEditSave}
                                className="flex-1 bg-gold-500 text-stone-900 font-bold py-3 rounded-lg hover:bg-gold-400 flex items-center justify-center gap-2"
                             >
                                 <Save size={18} />
                                 {t.save}
                             </button>
                             <button 
                                onClick={() => setEditingItem(null)}
                                className="bg-stone-100 text-stone-600 font-bold py-3 px-6 rounded-lg hover:bg-stone-200"
                             >
                                 {t.cancelBtn}
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Item Modal - Centered */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-h-[90vh] md:h-auto md:max-w-2xl rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 text-start flex flex-col">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h2 className="text-2xl font-serif font-bold text-stone-900">{t.createItemTitle}</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-stone-900 bg-stone-100 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.productName}</label>
                                    <input 
                                        type="text" 
                                        value={newItem.name} 
                                        onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                                        className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none"
                                        placeholder="לדוגמה: סלט יווני"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.category}</label>
                                    <select 
                                        value={newItem.category}
                                        onChange={(e) => setNewItem({...newItem, category: e.target.value as Category})}
                                        className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none bg-white"
                                    >
                                        {CATEGORY_OPTIONS.map(c => (
                                            <option key={c} value={c}>
                                                {language === 'he' ? (translations.he.categories as any)[c] : (translations.en.categories as any)[c]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.price} (₪)</label>
                                    <input 
                                        type="number" 
                                        value={newItem.price} 
                                        onChange={(e) => setNewItem({...newItem, price: Number(e.target.value)})}
                                        className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.unitType}</label>
                                    <select 
                                        value={newItem.unit_type}
                                        onChange={(e) => setNewItem({...newItem, unit_type: e.target.value as UnitType})}
                                        className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none bg-white"
                                    >
                                        {UNIT_OPTIONS.map(u => (
                                            <option key={u} value={u}>{translations[language][u as 'tray'|'unit'|'liter'] || u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.description}</label>
                                <textarea 
                                    value={newItem.description} 
                                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                                    className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none h-20"
                                    placeholder="תיאור קצר של המנה..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.modifications}</label>
                                <textarea 
                                    value={addMods}
                                    onChange={(e) => setAddMods(e.target.value)}
                                    placeholder={t.modsPlaceholder}
                                    className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none h-20"
                                />
                                <p className="text-xs text-stone-400 mt-1">{t.modsHint}</p>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input 
                                    type="checkbox" 
                                    id="isPremium"
                                    checked={newItem.is_premium}
                                    onChange={(e) => setNewItem({...newItem, is_premium: e.target.checked})}
                                    className="w-5 h-5 accent-gold-500"
                                />
                                <label htmlFor="isPremium" className="font-bold text-stone-700 cursor-pointer">{t.premium} (מודגש עם כוכב)</label>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3 shrink-0">
                             <button 
                                onClick={handleAddSave}
                                disabled={!newItem.name || !newItem.price}
                                className="flex-1 bg-gold-500 text-stone-900 font-bold py-3 rounded-lg hover:bg-gold-400 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                 <Plus size={18} />
                                 {t.create}
                             </button>
                             <button 
                                onClick={() => setIsAddModalOpen(false)}
                                className="bg-stone-100 text-stone-600 font-bold py-3 px-6 rounded-lg hover:bg-stone-200"
                             >
                                 {t.cancelBtn}
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};