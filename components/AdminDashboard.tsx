import React, { useState } from 'react';
import { MenuItem } from '../types';
import { useStore, translations, getLocalizedItem } from '../store';
import { Pencil, Save, X, LogOut } from 'lucide-react';

interface AdminDashboardProps {
    onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
    const { menuItems, updateMenuItem, language } = useStore();
    const t = translations[language].admin; // Use Admin Translations
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    // Form states
    const [editPrice, setEditPrice] = useState(0);
    const [editStatus, setEditStatus] = useState(true);
    const [editMods, setEditMods] = useState('');

    const filteredItems = menuItems.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.name_en && i.name_en.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleEditClick = (item: MenuItem) => {
        setEditingItem(item);
        setEditPrice(item.price);
        setEditStatus(item.availability_status);
        // Load localized mods based on current language or default
        const mods = language === 'he' ? item.allowed_modifications : (item.allowed_modifications_en || item.allowed_modifications);
        setEditMods(mods ? mods.join(', ') : '');
    };

    const handleSave = () => {
        if (!editingItem) return;
        
        const modsArray = editMods.split(',').map(s => s.trim()).filter(s => s.length > 0);
        
        // Update correct field based on language
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

    return (
        <div className="p-8 bg-stone-100 min-h-screen font-sans" dir={language === 'he' ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center mb-8">
                 <h1 className="text-3xl font-serif font-bold text-stone-900">{t.title}</h1>
                 <button 
                    onClick={onExit}
                    className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-stone-800 transition"
                 >
                     <LogOut size={18} />
                     <span>{t.exit}</span>
                 </button>
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

            {/* Edit Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={() => setEditingItem(null)}></div>
                    <div className="relative bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 text-start">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-serif font-bold text-stone-900">{t.editItemTitle}: {getLocalizedItem(editingItem, language).name}</h2>
                            <button onClick={() => setEditingItem(null)} className="text-stone-400 hover:text-stone-900">
                                <X />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
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

                        <div className="mt-8 flex gap-3">
                             <button 
                                onClick={handleSave}
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
        </div>
    );
};