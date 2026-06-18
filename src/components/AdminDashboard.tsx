
import React, { useState, useEffect } from 'react';
import { MenuItem, Category, UnitType, EventType, Coupon, ThemeConfig, GalleryItem } from '../types';
import { useStore, translations, getLocalizedItem } from '../store';
import { Pencil, Save, X, LogOut, Plus, Calculator, Settings, ChevronDown, ChevronUp, ToggleRight, ToggleLeft, Upload, Image as ImageIcon, Loader2, Tag, Trash2, Users, Truck, Palette, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBackButton } from '../hooks/useBackButton';
import { FeedbackModal, FeedbackType } from './FeedbackModal';
import { ConfirmationModal } from './ConfirmationModal';

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
    'Desserts',
    'Picnic Baskets',
    'Breakfast & Dinner'
];

const UNIT_OPTIONS: UnitType[] = ['tray', 'unit', 'liter', 'weight'];
const EVENT_TYPES: EventType[] = ['brunch', 'dinner', 'snack'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
    const {
        menuItems, updateMenuItem, addMenuItem, deleteMenuItem,
        calculationSettings, updateCalculationSettings,
        advancedSettings, updateAdvancedSettings,
        featureFlags, updateFeatureFlags,
        language, getCoupons, createCoupon, deleteCoupon,
        appConfig, updateAppConfig,
        theme, updateTheme, gallery, updateGallery, kosherCertUrl, updateKosherCertUrl
    } = useStore();

    // Ensure the view starts at the top when entering admin mode
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        loadCoupons();
    }, []);

    const t = translations[language]?.admin || translations['he'].admin;
    const rootT = translations[language] as any || translations['he'] as any;

    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showAdvancedCalc, setShowAdvancedCalc] = useState(false);
    const [showCoupons, setShowCoupons] = useState(false);
    const [showThemeSettings, setShowThemeSettings] = useState(false);
    const [showGallerySettings, setShowGallerySettings] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Coupon State
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
        code: '', discount_type: 'percentage', discount_value: 10, is_active: true, usage_limit: null
    });

    const loadCoupons = async () => {
        const data = await getCoupons();
        setCoupons(data);
    };

    const handleCreateCoupon = async () => {
        if (!newCoupon.code || !newCoupon.discount_value) return;
        await createCoupon(newCoupon as Coupon);
        setNewCoupon({ code: '', discount_type: 'percentage', discount_value: 10, is_active: true, usage_limit: null });
        loadCoupons();
    };

    // Confirmation Modal State
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const closeConfirmation = () => setConfirmation(prev => ({ ...prev, isOpen: false }));

    const handleDeleteCoupon = (code: string) => {
        setConfirmation({
            isOpen: true,
            title: language === 'he' ? 'מחיקת קופון' : 'Delete Coupon',
            message: language === 'he' ? 'האם אתה בטוח שברצונך למחוק קופון זה? פעולה זו אינה הפיכה.' : 'Are you sure you want to delete this coupon? This action cannot be undone.',
            isDestructive: true,
            onConfirm: async () => {
                await deleteCoupon(code);
                loadCoupons();
            }
        });
    };

    // Feedback Modal State
    const [feedback, setFeedback] = useState<{
        isOpen: boolean;
        type: FeedbackType;
        title: string;
        message: string;
    }>({ isOpen: false, type: 'info', title: '', message: '' });

    const closeFeedback = () => setFeedback(prev => ({ ...prev, isOpen: false }));

    // Handle Back Button for Modals
    useBackButton(!!editingItem, () => setEditingItem(null));
    useBackButton(isAddModalOpen, () => setIsAddModalOpen(false));

    // Edit State
    const [editPrice, setEditPrice] = useState(0);
    const [editStatus, setEditStatus] = useState(true);
    const [editIsPremium, setEditIsPremium] = useState(false);
    const [editMods, setEditMods] = useState('');
    const [editImageUrl, setEditImageUrl] = useState('');
    const [editName, setEditName] = useState('');
    const [editIsTray, setEditIsTray] = useState(false);
    const [editUnitsPerTray, setEditUnitsPerTray] = useState<number | null>(null);
    const [editDescription, setEditDescription] = useState('');
    const [editCategory, setEditCategory] = useState<Category>('Salads');
    const [editUnitType, setEditUnitType] = useState<UnitType>('tray');
    const [editServesMin, setEditServesMin] = useState(10);
    const [editServesMax, setEditServesMax] = useState(10);

    // Gallery state
    const [newGalleryItem, setNewGalleryItem] = useState<{
        type: 'image' | 'video';
        url: string;
        caption: string;
    }>({ type: 'image', url: '', caption: '' });
    const [videoSourceType, setVideoSourceType] = useState<'url' | 'file'>('file');

    // New Item State
    const [newItem, setNewItem] = useState<Partial<MenuItem>>({
        name: '', category: 'Salads', price: 0, unit_type: 'tray', description: '', is_premium: false, serves_min: 10, serves_max: 10, availability_status: true, tags: [], image_url: '', is_tray: false, units_per_tray: null
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
        setEditImageUrl(item.image_url || '');
        setEditName(item.name);
        setEditIsTray(item.is_tray || false);
        setEditUnitsPerTray(item.units_per_tray ?? null);
        setEditDescription(item.description || '');
        setEditCategory(item.category);
        setEditUnitType(item.unit_type);
        setEditServesMin(item.serves_min);
        setEditServesMax(item.serves_max);
        const mods = language === 'he' ? item.allowed_modifications : (item.allowed_modifications_en || item.allowed_modifications);
        setEditMods(mods ? mods.join(', ') : '');
    };

    const applyThemePreset = async (preset: 'classic' | 'olive') => {
        if (preset === 'classic') {
            await updateTheme({
                bg_color: '#fafaf9',
                text_color: '#1c1917',
                primary_color: '#d4af37',
                secondary_color: '#b4941f',
                header_bg_color: '#1c1917',
                header_text_color: '#ffffff',
                hero_bg_color: '#1c1917',
                card_bg_color: '#ffffff',
                card_text_color: '#1c1917'
            });
        } else {
            await updateTheme({
                bg_color: '#f4f6f0',
                text_color: '#2d3a1a',
                primary_color: '#5f7a36',
                secondary_color: '#8fa86b',
                header_bg_color: '#3d4b24',
                header_text_color: '#fcfbf7',
                hero_bg_color: '#3d4b24',
                card_bg_color: '#ffffff',
                card_text_color: '#2d3a1a'
            });
        }
    };

    const handleKosherUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;
            setUploading(true);
            const randomName = `kosher_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
            const ext = file.name.split('.').pop() || 'jpg';
            const cleanFileName = `${randomName}.${ext}`;
            const arrayBuffer = await file.arrayBuffer();
            const fileData = new Uint8Array(arrayBuffer);

            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(cleanFileName, fileData, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('menu-images')
                .getPublicUrl(cleanFileName);

            await updateKosherCertUrl(data.publicUrl);
            setFeedback({
                isOpen: true,
                type: 'info',
                title: language === 'he' ? 'העלאה הושלמה' : 'Upload Complete',
                message: language === 'he' ? 'תעודת הכשרות עודכנה בהצלחה.' : 'Kosher certificate updated successfully.'
            });
        } catch (error: any) {
            console.error('Error uploading kosher cert:', error);
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'שגיאה',
                message: error.message
            });
        } finally {
            setUploading(false);
        }
    };

    const handleGalleryImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;
            setUploading(true);
            const randomName = `gallery_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
            const ext = file.name.split('.').pop() || 'jpg';
            const cleanFileName = `${randomName}.${ext}`;
            const arrayBuffer = await file.arrayBuffer();
            const fileData = new Uint8Array(arrayBuffer);

            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(cleanFileName, fileData, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('menu-images')
                .getPublicUrl(cleanFileName);

            setNewGalleryItem(prev => ({ ...prev, url: data.publicUrl }));
        } catch (error: any) {
            console.error('Error uploading gallery image:', error);
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'שגיאה',
                message: error.message
            });
        } finally {
            setUploading(false);
        }
    };

    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleGalleryVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            // Size limit: 50MB
            const maxSize = 50 * 1024 * 1024;
            if (file.size > maxSize) {
                setFeedback({
                    isOpen: true,
                    type: 'warning',
                    title: language === 'he' ? 'קובץ גדול מדי' : 'File Too Large',
                    message: language === 'he' ? 'אנא בחר סרטון קטן מ-50MB.' : 'Please choose a video smaller than 50MB.'
                });
                return;
            }

            setUploading(true);
            const randomName = `gallery_vid_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
            const ext = file.name.split('.').pop() || 'mp4';
            const cleanFileName = `${randomName}.${ext}`;
            const arrayBuffer = await file.arrayBuffer();
            const fileData = new Uint8Array(arrayBuffer);

            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(cleanFileName, fileData, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('menu-images')
                .getPublicUrl(cleanFileName);

            setNewGalleryItem(prev => ({ ...prev, url: data.publicUrl }));
        } catch (error: any) {
            console.error('Error uploading gallery video:', error);
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'שגיאה',
                message: error.message
            });
        } finally {
            setUploading(false);
        }
    };

    const handleAddGalleryItem = async () => {
        if (!newGalleryItem.url) return;
        const item: GalleryItem = {
            id: Math.random().toString(36).substring(2, 15),
            type: newGalleryItem.type,
            url: newGalleryItem.url,
            caption: newGalleryItem.caption || undefined
        };
        await updateGallery([...(gallery || []), item]);
        setNewGalleryItem({ type: 'image', url: '', caption: '' });
    };

    const handleDeleteGalleryItem = (id: string) => {
        setConfirmation({
            isOpen: true,
            title: language === 'he' ? 'מחיקת פריט מהגלריה' : 'Delete Gallery Item',
            message: language === 'he' ? 'האם אתה בטוח שברצונך למחוק פריט זה מהגלריה?' : 'Are you sure you want to delete this item from the gallery?',
            isDestructive: true,
            onConfirm: async () => {
                await updateGallery((gallery || []).filter(i => i.id !== id));
            }
        });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                setFeedback({
                    isOpen: true,
                    type: 'warning',
                    title: language === 'he' ? 'קובץ גדול מדי' : 'File Too Large',
                    message: language === 'he' ? 'אנא בחר תמונה קטנה מ-5MB.' : 'Please choose an image smaller than 5MB.'
                });
                return;
            }

            setUploading(true);

            let mimeType = file.type;
            let ext = 'jpg';

            if (mimeType === 'image/png') {
                ext = 'png';
            } else if (mimeType === 'image/webp') {
                ext = 'webp';
            } else {
                mimeType = 'image/jpeg';
                ext = 'jpg';
            }

            const randomName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
            const cleanFileName = `${randomName}.${ext}`;

            const arrayBuffer = await file.arrayBuffer();
            const fileData = new Uint8Array(arrayBuffer);

            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(cleanFileName, fileData, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: mimeType
                });

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('menu-images')
                .getPublicUrl(cleanFileName);

            if (isEdit) {
                setEditImageUrl(data.publicUrl);
            } else {
                setNewItem(prev => ({ ...prev, image_url: data.publicUrl }));
            }

        } catch (error: any) {
            console.error('Error uploading image:', error);
            setFeedback({
                isOpen: true,
                type: 'error',
                title: 'שגיאת העלאה',
                message: `Error uploading image: ${error.message}`
            });
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    const handleEditSave = () => {
        if (!editingItem) return;
        const modsArray = editMods.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const updateData: Partial<MenuItem> = {
            price: editPrice,
            availability_status: editStatus,
            is_premium: editIsPremium,
            image_url: editImageUrl,
            name: editName,
            is_tray: editIsTray,
            units_per_tray: editIsTray ? editUnitsPerTray : null,
            description: editDescription,
            category: editCategory,
            unit_type: editUnitType,
            serves_min: editServesMin,
            serves_max: editServesMax
        };
        if (language === 'he') updateData.allowed_modifications = modsArray;
        else updateData.allowed_modifications_en = modsArray;
        updateMenuItem(editingItem.id, updateData);
        setEditingItem(null);
    };

    const handleDeleteItem = () => {
        if (!editingItem) return;
        setConfirmation({
            isOpen: true,
            title: language === 'he' ? 'מחיקת מנה' : 'Delete Item',
            message: language === 'he' ? `האם אתה בטוח שברצונך למחוק את "${editingItem.name}"? פעולה זו אינה הפיכה.` : `Are you sure you want to delete "${getLocalizedItem(editingItem, language).name}"? This action cannot be undone.`,
            isDestructive: true,
            onConfirm: async () => {
                await deleteMenuItem(editingItem.id);
                setEditingItem(null);
            }
        });
    };

    const handleAddSave = async () => {
        if (!newItem.name || !newItem.price) return;
        const modsArray = addMods.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const itemToSave: Omit<MenuItem, 'id'> = {
            name: newItem.name || '', category: (newItem.category as Category) || 'Salads', price: Number(newItem.price), unit_type: (newItem.unit_type as UnitType) || 'tray', description: newItem.description || '', serves_min: Number(newItem.serves_min) || 1, serves_max: Number(newItem.serves_max) || 1, is_premium: newItem.is_premium || false, availability_status: true, tags: [], allowed_modifications: modsArray, allowed_modifications_en: modsArray, image_url: newItem.image_url, is_tray: newItem.is_tray || false, units_per_tray: newItem.is_tray ? (newItem.units_per_tray ?? null) : null
        };
        await addMenuItem(itemToSave);
        setIsAddModalOpen(false);
        setNewItem({ name: '', category: 'Salads', price: 0, unit_type: 'tray', description: '', is_premium: false, serves_min: 10, serves_max: 10, availability_status: true, tags: [], image_url: '', is_tray: false, units_per_tray: null });
    };

    const handleEventRatioChange = (eType: EventType, field: string, value: string) => {
        const newRatios = { ...advancedSettings.eventRatios };
        newRatios[eType] = { ...newRatios[eType], [field]: parseFloat(value) || 0 };
        updateAdvancedSettings({ eventRatios: newRatios });
    };

    return (
        <div className="p-8 bg-stone-100 min-h-screen font-sans animate-fade-in" dir={language === 'he' ? 'rtl' : 'ltr'}>

            <FeedbackModal
                isOpen={feedback.isOpen}
                onClose={closeFeedback}
                title={feedback.title}
                message={feedback.message}
                type={feedback.type}
            />

            <ConfirmationModal
                isOpen={confirmation.isOpen}
                onClose={closeConfirmation}
                onConfirm={confirmation.onConfirm}
                title={confirmation.title}
                message={confirmation.message}
                isDestructive={confirmation.isDestructive}
                confirmText={language === 'he' ? 'מחק' : 'Delete'}
                cancelText={language === 'he' ? 'ביטול' : 'Cancel'}
            />

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 text-start">
                <h1 className="text-3xl font-serif font-bold text-stone-900">{t.title}</h1>
                <div className="flex gap-4">
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-gold-500 text-stone-900 px-4 py-2 rounded-lg hover:bg-gold-400 transition font-bold shadow-md"><Plus size={18} /><span>{t.addItem}</span></button>
                    <button onClick={onExit} className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-stone-800 transition shadow-md"><LogOut size={18} /><span>{t.exit}</span></button>
                </div>
            </div>

            {/* Top Stats & Feature Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 text-start">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-sm font-bold text-stone-400 uppercase mb-2">{t.minOrder}</h3>
                    <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-stone-800">₪</span>
                        <input
                            type="number"
                            value={appConfig.min_order_price}
                            onChange={(e) => updateAppConfig({ min_order_price: Number(e.target.value) })}
                            className="w-full border-b border-stone-300 text-2xl font-bold pb-2 focus:outline-none focus:border-gold-500"
                        />
                    </div>
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

            {/* Delivery Settings */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-100 mb-8 text-start relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-stone-100 rounded text-stone-600"><Truck size={16} /></div>
                    <h3 className="text-sm font-bold text-stone-900 uppercase">{t.deliverySettings}</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="flex flex-col">
                        <label className="text-[10px] text-stone-500 font-bold mb-1">{t.minFreeDelivery}</label>
                        <div className="flex items-center gap-1">
                            <span className="text-stone-400">₪</span>
                            <input
                                type="number"
                                value={calculationSettings?.minOrderFreeDelivery || 1500}
                                onChange={(e) => updateCalculationSettings({ minOrderFreeDelivery: Number(e.target.value) })}
                                className="w-full border-b border-stone-300 text-lg font-bold pb-1 focus:outline-none focus:border-gold-500"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] text-stone-500 font-bold mb-1">{t.baseDeliveryFee}</label>
                        <div className="flex items-center gap-1">
                            <span className="text-stone-400">₪</span>
                            <input
                                type="number"
                                value={appConfig.delivery_base_fee ?? 60}
                                onChange={(e) => updateAppConfig({ delivery_base_fee: Number(e.target.value) })}
                                className="w-full border-b border-stone-300 text-lg font-bold pb-1 focus:outline-none focus:border-gold-500"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] text-stone-500 font-bold mb-1">{t.pricePerKm}</label>
                        <div className="flex items-center gap-1">
                            <span className="text-stone-400">₪</span>
                            <input
                                type="number"
                                value={appConfig.delivery_price_per_km ?? 4}
                                onChange={(e) => updateAppConfig({ delivery_price_per_km: Number(e.target.value) })}
                                className="w-full border-b border-stone-300 text-lg font-bold pb-1 focus:outline-none focus:border-gold-500"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] text-stone-500 font-bold mb-1">{t.includedRadius}</label>
                        <div className="flex items-center gap-1">
                            <span className="text-stone-400">KM</span>
                            <input
                                type="number"
                                value={appConfig.delivery_min_radius_included ?? 15}
                                onChange={(e) => updateAppConfig({ delivery_min_radius_included: Number(e.target.value) })}
                                className="w-full border-b border-stone-300 text-lg font-bold pb-1 focus:outline-none focus:border-gold-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Coupon Manager */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8 text-start">
                <button onClick={() => setShowCoupons(!showCoupons)} className="w-full p-6 flex items-center justify-between bg-stone-900 text-white hover:bg-stone-800 transition">
                    <div className="flex items-center gap-3"><Tag size={20} className="text-gold-500" /><span className="font-serif font-bold text-lg">{t.coupons}</span></div>
                    {showCoupons ? <ChevronUp /> : <ChevronDown />}
                </button>
                {showCoupons && (
                    <div className="p-6 bg-stone-50 animate-slide-in-top">
                        <div className="flex flex-col lg:flex-row gap-4 mb-6 items-end border-b border-stone-200 pb-6">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-stone-500 mb-1">{t.couponCode}</label>
                                <input
                                    type="text"
                                    value={newCoupon.code}
                                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                    className="w-full p-2 border rounded uppercase"
                                    placeholder="SALE2024"
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-stone-500 mb-1">{t.discountType}</label>
                                <select
                                    value={newCoupon.discount_type}
                                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value as 'percentage' | 'fixed' })}
                                    className="w-full p-2 border rounded bg-white"
                                >
                                    <option value="percentage">{t.percentage}</option>
                                    <option value="fixed">{t.fixedAmount}</option>
                                </select>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-stone-500 mb-1">{t.discountValue}</label>
                                <input
                                    type="number"
                                    value={newCoupon.discount_value}
                                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) })}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-stone-500 mb-1">{t.usageLimit}</label>
                                <input
                                    type="number"
                                    value={newCoupon.usage_limit || ''}
                                    onChange={(e) => setNewCoupon({ ...newCoupon, usage_limit: e.target.value ? parseInt(e.target.value) : null })}
                                    className="w-full p-2 border rounded"
                                    placeholder={t.unlimited}
                                />
                            </div>
                            <button
                                onClick={handleCreateCoupon}
                                className="bg-gold-500 text-stone-900 font-bold px-6 py-2 rounded hover:bg-gold-400 transition w-full lg:w-auto"
                            >
                                {t.createCoupon}
                            </button>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-stone-400 uppercase mb-3">{t.activeCoupons}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {coupons.map(coupon => (
                                    <div key={coupon.code} className="bg-white p-3 rounded border border-stone-200 flex justify-between items-center shadow-sm">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="block font-bold text-stone-800">{coupon.code}</span>
                                                <span className="text-[10px] bg-stone-100 px-1.5 rounded text-stone-500">
                                                    {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₪${coupon.discount_value}`}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-stone-400 mt-1">
                                                <Users size={12} />
                                                <span>{t.usage}: {coupon.usage_count || 0} / {coupon.usage_limit || '∞'}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteCoupon(coupon.code)}
                                            className="text-stone-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {coupons.length === 0 && <p className="text-sm text-stone-400 italic">No coupons yet.</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Advanced Calculator Settings */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8 text-start">
                <button onClick={() => setShowAdvancedCalc(!showAdvancedCalc)} className="w-full p-6 flex items-center justify-between bg-stone-900 text-white hover:bg-stone-800 transition">
                    <div className="flex items-center gap-3"><Settings size={20} className="text-gold-500" /><span className="font-serif font-bold text-lg">{t.advCalc}</span></div>
                    {showAdvancedCalc ? <ChevronUp /> : <ChevronDown />}
                </button>
                {showAdvancedCalc && (
                    <div className="p-6 bg-stone-50 animate-slide-in-top">
                        <div className="mb-8 border-b border-stone-200 pb-8">
                            <h4 className="text-stone-900 font-bold mb-2 flex items-center gap-2"><span className="w-2 h-6 bg-gold-500 rounded-sm"></span>{t.aiInstructions}</h4>
                            <textarea
                                value={calculationSettings?.aiCustomInstructions || ''}
                                onChange={(e) => updateCalculationSettings({ aiCustomInstructions: e.target.value })}
                                placeholder={t.aiInstructionsPlaceholder}
                                className="w-full h-32 p-3 border border-stone-300 rounded-lg focus:outline-none focus:border-gold-500 text-sm resize-none"
                            />
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

            {/* Theme Settings Customizer */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8 text-start">
                <button onClick={() => setShowThemeSettings(!showThemeSettings)} className="w-full p-6 flex items-center justify-between bg-stone-900 text-white hover:bg-stone-800 transition">
                    <div className="flex items-center gap-3"><Palette size={20} className="text-gold-500" /><span className="font-serif font-bold text-lg">{t.themeSettings}</span></div>
                    {showThemeSettings ? <ChevronUp /> : <ChevronDown />}
                </button>
                {showThemeSettings && (
                    <div className="p-6 bg-stone-50 animate-slide-in-top space-y-8">
                        {/* Theme Presets */}
                        <div>
                            <h4 className="text-stone-900 font-bold mb-3 flex items-center gap-2"><span className="w-2 h-6 bg-gold-500 rounded-sm"></span>{language === 'he' ? 'ערכות נושא מוכנות' : 'Theme Presets'}</h4>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => applyThemePreset('classic')}
                                    className="px-4 py-2 bg-stone-900 text-white rounded hover:bg-stone-800 transition font-bold text-xs"
                                >
                                    {language === 'he' ? 'קלאסי (זהב ושחור)' : 'Classic (Gold & Dark)'}
                                </button>
                                <button
                                    onClick={() => applyThemePreset('olive')}
                                    className="px-4 py-2 bg-emerald-800 text-white rounded hover:bg-emerald-700 transition font-bold text-xs"
                                >
                                    {language === 'he' ? 'ירוק זית וקרם' : 'Olive Green & Cream'}
                                </button>
                            </div>
                        </div>

                        {/* Theme Color Inputs */}
                        <div className="border-t border-stone-200 pt-6">
                            <h4 className="text-stone-900 font-bold mb-3 flex items-center gap-2"><span className="w-2 h-6 bg-gold-500 rounded-sm"></span>{language === 'he' ? 'התאמת צבעים אישית' : 'Custom Theme Colors'}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                    { key: 'bg_color', label: language === 'he' ? 'צבע רקע כללי' : 'General Background' },
                                    { key: 'text_color', label: language === 'he' ? 'צבע טקסט כללי' : 'General Text Color' },
                                    { key: 'primary_color', label: language === 'he' ? 'צבע ראשי (כפתורים וזהב)' : 'Primary Theme Color' },
                                    { key: 'secondary_color', label: language === 'he' ? 'צבע משני' : 'Secondary Theme Color' },
                                    { key: 'header_bg_color', label: language === 'he' ? 'רקע תפריט עליון' : 'Header Background' },
                                    { key: 'header_text_color', label: language === 'he' ? 'טקסט תפריט עליון' : 'Header Text Color' },
                                    { key: 'hero_bg_color', label: language === 'he' ? 'רקע אזור הירו (פתיחה)' : 'Hero Background' },
                                    { key: 'card_bg_color', label: language === 'he' ? 'רקע כרטיס מנה' : 'Dish Card Background' },
                                    { key: 'card_text_color', label: language === 'he' ? 'טקסט כרטיס מנה' : 'Dish Card Text Color' },
                                ].map(({ key, label }) => (
                                    <div key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-200 shadow-sm">
                                        <span className="text-xs font-bold text-stone-700">{label}</span>
                                        <input
                                            type="color"
                                            value={(theme as any)[key] || '#ffffff'}
                                            onChange={(e) => updateTheme({ [key]: e.target.value })}
                                            className="w-8 h-8 rounded cursor-pointer border border-stone-300"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Kosher Certificate */}
                        <div className="border-t border-stone-200 pt-6">
                            <h4 className="text-stone-900 font-bold mb-3 flex items-center gap-2"><span className="w-2 h-6 bg-gold-500 rounded-sm"></span>{t.kosherCert}</h4>
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className="w-32 h-32 bg-stone-100 rounded-lg overflow-hidden border border-stone-200 flex items-center justify-center shrink-0">
                                    {kosherCertUrl ? (
                                        <img src={kosherCertUrl} alt="Kosher Certificate" className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="text-stone-400 text-xs italic">{language === 'he' ? 'אין תעודה' : 'No certificate'}</span>
                                    )}
                                </div>
                                <div className="flex-1 w-full space-y-2">
                                    <label className={`
                                        flex items-center justify-center gap-2 w-full max-w-xs p-3 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-gold-500 hover:text-gold-600 transition-colors text-stone-500 font-bold text-sm bg-white
                                        ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}>
                                        <Upload size={16} />
                                        <span>{uploading ? '...' : t.uploadKosher}</span>
                                        <input type="file" accept="image/*,application/pdf" onChange={handleKosherUpload} className="hidden" disabled={uploading} />
                                    </label>
                                    <p className="text-[10px] text-stone-400">{t.imageHint}</p>
                                    {kosherCertUrl && (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={kosherCertUrl}
                                                className="w-full max-w-md p-1.5 border border-stone-200 rounded text-xs text-stone-500 bg-stone-100"
                                            />
                                            <button
                                                onClick={() => updateKosherCertUrl('')}
                                                className="text-xs text-red-500 hover:underline font-bold"
                                            >
                                                {language === 'he' ? 'הסר' : 'Remove'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Gallery Settings Customizer */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8 text-start">
                <button onClick={() => setShowGallerySettings(!showGallerySettings)} className="w-full p-6 flex items-center justify-between bg-stone-900 text-white hover:bg-stone-800 transition">
                    <div className="flex items-center gap-3"><ImageIcon size={20} className="text-gold-500" /><span className="font-serif font-bold text-lg">{t.galleryTitle}</span></div>
                    {showGallerySettings ? <ChevronUp /> : <ChevronDown />}
                </button>
                {showGallerySettings && (
                    <div className="p-6 bg-stone-50 animate-slide-in-top space-y-6">
                        {/* Add Gallery Item Form */}
                        <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-4">
                            <h4 className="font-bold text-stone-900 text-sm">{t.addGalleryItem}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 mb-1">{t.mediaType}</label>
                                    <select
                                        value={newGalleryItem.type}
                                        onChange={(e) => setNewGalleryItem({ ...newGalleryItem, type: e.target.value as 'image' | 'video', url: '' })}
                                        className="w-full p-2 border rounded bg-white text-sm"
                                    >
                                        <option value="image">{language === 'he' ? 'תמונה' : 'Image'}</option>
                                        <option value="video">{language === 'he' ? 'סרטון' : 'Video'}</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-stone-500 mb-1">
                                        {newGalleryItem.type === 'video' 
                                            ? (language === 'he' ? 'סרטון' : 'Video') 
                                            : (language === 'he' ? 'תמונה' : 'Image')}
                                    </label>
                                    {newGalleryItem.type === 'video' ? (
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setVideoSourceType('file'); setNewGalleryItem(prev => ({ ...prev, url: '' })); }}
                                                    className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${videoSourceType === 'file' ? 'bg-stone-900 text-white border-stone-900 shadow-sm' : 'bg-white text-stone-600 hover:border-stone-300'}`}
                                                >
                                                    {language === 'he' ? 'העלאת קובץ' : 'Upload File'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setVideoSourceType('url'); setNewGalleryItem(prev => ({ ...prev, url: '' })); }}
                                                    className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${videoSourceType === 'url' ? 'bg-stone-900 text-white border-stone-900 shadow-sm' : 'bg-white text-stone-600 hover:border-stone-300'}`}
                                                >
                                                    {language === 'he' ? 'קישור URL' : 'URL Link'}
                                                </button>
                                            </div>
                                            {videoSourceType === 'url' ? (
                                                <input
                                                    type="text"
                                                    value={newGalleryItem.url}
                                                    onChange={(e) => setNewGalleryItem({ ...newGalleryItem, url: e.target.value })}
                                                    className="w-full p-2 border rounded text-sm bg-white"
                                                    placeholder="https://www.youtube.com/watch?v=..."
                                                />
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    {newGalleryItem.url && (
                                                        <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 truncate max-w-[150px]">
                                                            {language === 'he' ? 'סרטון הועלה' : 'Video uploaded'}
                                                        </span>
                                                    )}
                                                    <label className="flex items-center justify-center gap-2 flex-1 p-2 border-2 border-dashed border-stone-300 rounded cursor-pointer hover:border-gold-500 transition text-stone-500 font-bold text-xs bg-stone-50">
                                                        <Upload size={14} />
                                                        <span>{uploading ? '...' : (language === 'he' ? 'העלאת סרטון' : 'Upload Video')}</span>
                                                        <input type="file" accept="video/*" onChange={handleGalleryVideoUpload} className="hidden" disabled={uploading} />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            {newGalleryItem.url && (
                                                <img src={newGalleryItem.url} alt="Gallery Preview" className="w-10 h-10 object-cover rounded" />
                                            )}
                                            <label className="flex items-center justify-center gap-2 flex-1 p-2 border-2 border-dashed border-stone-300 rounded cursor-pointer hover:border-gold-500 transition text-stone-500 font-bold text-xs bg-stone-50">
                                                <Upload size={14} />
                                                <span>{uploading ? '...' : t.upload}</span>
                                                <input type="file" accept="image/*" onChange={handleGalleryImageUpload} className="hidden" disabled={uploading} />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-stone-500 mb-1">{t.caption}</label>
                                    <input
                                        type="text"
                                        value={newGalleryItem.caption}
                                        onChange={(e) => setNewGalleryItem({ ...newGalleryItem, caption: e.target.value })}
                                        className="w-full p-2 border rounded text-sm"
                                        placeholder={language === 'he' ? 'לדוגמה: שולחן קינוחים מעוצב' : 'e.g. Dessert table design'}
                                    />
                                </div>
                                <button
                                    onClick={handleAddGalleryItem}
                                    disabled={!newGalleryItem.url || uploading}
                                    className="bg-gold-500 text-stone-900 font-bold px-6 py-2 rounded hover:bg-gold-400 transition w-full disabled:opacity-50 text-sm"
                                >
                                    {language === 'he' ? 'הוסף לגלריה' : 'Add Item'}
                                </button>
                            </div>
                        </div>

                        {/* Gallery List */}
                        <div>
                            <h4 className="text-sm font-bold text-stone-400 uppercase mb-3">{language === 'he' ? 'פריטים בגלריה' : 'Items in Gallery'}</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {(gallery || []).map(item => (
                                    <div key={item.id} className="relative group bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm aspect-square flex flex-col justify-between">
                                        <div className="relative flex-1 w-full bg-stone-100 flex items-center justify-center overflow-hidden">
                                            {item.type === 'video' ? (
                                                getYoutubeId(item.url) ? (
                                                    <div className="relative w-full h-full">
                                                        <img src={`https://img.youtube.com/vi/${getYoutubeId(item.url)}/hqdefault.jpg`} className="w-full h-full object-cover" alt="YouTube Preview" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                            <span className="font-bold text-red-500 text-[10px] uppercase border border-red-500 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">YouTube</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="relative w-full h-full font-bold">
                                                        <video src={item.url} className="w-full h-full object-cover" preload="metadata" muted playsInline />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                            <span className="font-bold text-emerald-500 text-[10px] uppercase border border-emerald-500 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">Video</span>
                                                        </div>
                                                    </div>
                                                )
                                            ) : (
                                                <img src={item.url} alt={item.caption} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
                                            )}
                                        </div>
                                        {item.caption && (
                                            <div className="p-1.5 text-[10px] text-stone-500 font-medium truncate border-t bg-stone-50">
                                                {item.caption}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleDeleteGalleryItem(item.id)}
                                            className="absolute top-2 left-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100 animate-fade-in"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {(gallery || []).length === 0 && (
                                    <p className="text-sm text-stone-400 italic col-span-full">No gallery items yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Menu Items Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden text-start">
                <div className="p-4 border-b border-stone-200">
                    <input type="text" placeholder={t.searchPlaceholder} className="w-full p-2 border border-stone-200 rounded" onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-stone-50 text-stone-500 text-sm">
                            <tr>
                                <th className="p-4 text-start">{t.productName}</th>
                                <th className="p-4 text-start">{t.image}</th>
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
                                        <td className="p-4">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt="mini" className="w-10 h-10 object-cover rounded-md border border-stone-200" />
                                            ) : (
                                                <div className="w-10 h-10 bg-stone-100 rounded-md border border-stone-200 flex items-center justify-center text-stone-300">
                                                    <ImageIcon size={16} />
                                                </div>
                                            )}
                                        </td>
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

            {/* Add Item Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-h-[85vh] h-auto md:max-w-lg rounded-2xl p-6 shadow-2xl animate-zoom-in text-start flex flex-col">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h2 className="text-2xl font-serif font-bold text-stone-900">
                                {t.createItemTitle}
                            </h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-stone-900 bg-stone-100 p-2 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto">
                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-2">{t.image}</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-20 h-20 bg-stone-100 rounded-lg overflow-hidden border border-stone-200 shrink-0">
                                        {newItem.image_url ? (
                                            <img src={newItem.image_url} alt="preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                                                <ImageIcon size={24} />
                                            </div>
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <Loader2 className="animate-spin text-white" size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className={`
                                            flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-gold-500 hover:text-gold-600 transition-colors text-stone-500 font-bold text-sm bg-white
                                            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}>
                                            <Upload size={16} />
                                            <span>{uploading ? '...' : t.upload}</span>
                                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, false)} className="hidden" disabled={uploading} />
                                        </label>
                                        <p className="text-[10px] text-stone-400 mt-1">{t.imageHint}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.productName}</label>
                                <input type="text" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none" />
                            </div>

                            {/* Category & Unit Type Row */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.category}</label>
                                    <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value as Category })} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none bg-white">
                                        {CATEGORY_OPTIONS.map(cat => (
                                            <option key={cat} value={cat}>{(rootT.categories as any)[cat] || cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.unitType}</label>
                                    <select value={newItem.unit_type} onChange={(e) => setNewItem({ ...newItem, unit_type: e.target.value as UnitType })} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none bg-white">
                                        {UNIT_OPTIONS.map(u => (
                                            <option key={u} value={u}>{rootT[u] || u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Price & Serves Row */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.price} (₪)</label>
                                    <input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.servesMin}</label>
                                    <input type="number" value={newItem.serves_min} onChange={(e) => setNewItem({ ...newItem, serves_min: Number(e.target.value) })} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.servesMax}</label>
                                    <input type="number" value={newItem.serves_max} onChange={(e) => setNewItem({ ...newItem, serves_max: Number(e.target.value) })} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none" />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.description}</label>
                                <textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none h-20 resize-none" />
                            </div>

                            {/* Premium Toggle */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-stone-50 w-full">
                                    <input type="checkbox" checked={newItem.is_premium} onChange={(e) => setNewItem({ ...newItem, is_premium: e.target.checked })} className="w-4 h-4 text-gold-500 rounded" />
                                    <span className="font-bold text-sm text-stone-700">{t.premium}</span>
                                </label>
                            </div>

                            {/* Tray Toggle */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-stone-50 w-full">
                                    <input type="checkbox" checked={newItem.is_tray || false} onChange={(e) => setNewItem({ ...newItem, is_tray: e.target.checked, units_per_tray: e.target.checked ? newItem.units_per_tray : null })} className="w-4 h-4 text-gold-500 rounded" />
                                    <span className="font-bold text-sm text-stone-700">{t.isTray}</span>
                                </label>
                            </div>
                            {/* Units Per Tray (conditional) */}
                            {newItem.is_tray && (
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.unitsPerTray}</label>
                                    <input type="number" min="1" value={newItem.units_per_tray ?? ''} onChange={(e) => setNewItem({ ...newItem, units_per_tray: e.target.value ? Number(e.target.value) : null })} placeholder={language === 'he' ? 'לדוגמה: 10' : 'e.g. 10'} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none" />
                                </div>
                            )}

                            {/* Modifications */}
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.modifications}</label>
                                <textarea value={addMods} onChange={(e) => setAddMods(e.target.value)} placeholder={t.modsPlaceholder} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none h-24" />
                                <p className="text-[10px] text-stone-400 mt-1">{t.modsHint}</p>
                            </div>
                        </div>
                        <div className="mt-8 flex gap-3 shrink-0">
                            <button onClick={handleAddSave} className="flex-1 bg-gold-500 text-stone-900 font-bold py-3 rounded-lg hover:bg-gold-400 flex items-center justify-center gap-2">
                                <Plus size={18} />{t.create}
                            </button>
                            <button onClick={() => setIsAddModalOpen(false)} className="bg-stone-100 text-stone-600 font-bold py-3 px-6 rounded-lg hover:bg-stone-200">
                                {t.cancelBtn}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm" onClick={() => setEditingItem(null)}></div>
                    <div className="relative bg-white w-full max-h-[85vh] h-auto md:max-w-lg rounded-2xl p-6 shadow-2xl animate-zoom-in text-start flex flex-col">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h2 className="text-2xl font-serif font-bold text-stone-900">
                                {t.editItemTitle}: {getLocalizedItem(editingItem, language).name}
                            </h2>
                            <button onClick={() => setEditingItem(null)} className="text-stone-400 hover:text-stone-900 bg-stone-100 p-2 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto">
                            {/* Dish Name */}
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.dishName}</label>
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none" />
                            </div>
                            
                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-2">{t.image}</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-20 h-20 bg-stone-100 rounded-lg overflow-hidden border border-stone-200 shrink-0">
                                        {editImageUrl ? (
                                            <img src={editImageUrl} alt="preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                                                <ImageIcon size={24} />
                                            </div>
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <Loader2 className="animate-spin text-white" size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className={`
                                            flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-gold-500 hover:text-gold-600 transition-colors text-stone-500 font-bold text-sm bg-white
                                            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}>
                                            <Upload size={16} />
                                            <span>{uploading ? '...' : t.upload}</span>
                                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, true)} className="hidden" disabled={uploading} />
                                        </label>
                                        <p className="text-[10px] text-stone-400 mt-1">{t.imageHint}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Category & Unit Type Row */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.category}</label>
                                    <select value={editCategory} onChange={(e) => setEditCategory(e.target.value as Category)} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none bg-white">
                                        {CATEGORY_OPTIONS.map(cat => (
                                            <option key={cat} value={cat}>{(rootT.categories as any)[cat] || cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.unitType}</label>
                                    <select value={editUnitType} onChange={(e) => setEditUnitType(e.target.value as UnitType)} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none bg-white">
                                        {UNIT_OPTIONS.map(u => (
                                            <option key={u} value={u}>{rootT[u] || u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Price & Serves Row */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.price} (₪)</label>
                                    <input type="number" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.servesMin}</label>
                                    <input type="number" value={editServesMin} onChange={(e) => setEditServesMin(Number(e.target.value))} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.servesMax}</label>
                                    <input type="number" value={editServesMax} onChange={(e) => setEditServesMax(Number(e.target.value))} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none" />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.description}</label>
                                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none h-20 resize-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.status}</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={editStatus} onChange={() => setEditStatus(true)} className="w-4 h-4 text-gold-500" />
                                        <span>{t.inStock}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={!editStatus} onChange={() => setEditStatus(false)} className="w-4 h-4 text-red-500" />
                                        <span>{t.outOfStockLabel}</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-stone-50 w-full">
                                    <input type="checkbox" checked={editIsPremium} onChange={(e) => setEditIsPremium(e.target.checked)} className="w-4 h-4 text-gold-500 rounded" />
                                    <span className="font-bold text-sm text-stone-700">{t.premium}</span>
                                </label>
                            </div>

                            {/* Tray Checkbox */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-stone-50 w-full">
                                    <input type="checkbox" checked={editIsTray} onChange={(e) => { setEditIsTray(e.target.checked); if (!e.target.checked) setEditUnitsPerTray(null); }} className="w-4 h-4 text-gold-500 rounded" />
                                    <span className="font-bold text-sm text-stone-700">{t.isTray}</span>
                                </label>
                            </div>

                            {/* Units Per Tray */}
                            {editIsTray && (
                                <div>
                                    <label className="block text-sm font-bold text-stone-700 mb-1">{t.unitsPerTray}</label>
                                    <input type="number" min="1" value={editUnitsPerTray ?? ''} onChange={(e) => setEditUnitsPerTray(e.target.value ? Number(e.target.value) : null)} placeholder={language === 'he' ? 'לדוגמה: 10' : 'e.g. 10'} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none" />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">{t.modifications}</label>
                                <textarea value={editMods} onChange={(e) => setEditMods(e.target.value)} placeholder={t.modsPlaceholder} className="w-full p-2 border border-stone-300 rounded focus:border-gold-500 outline-none h-24" />
                            </div>
                        </div>
                        <div className="mt-8 flex flex-col gap-3 shrink-0">
                            <div className="flex gap-3">
                                <button onClick={handleEditSave} className="flex-1 bg-gold-500 text-stone-900 font-bold py-3 rounded-lg hover:bg-gold-400 flex items-center justify-center gap-2"><Save size={18} />{t.save}</button>
                                <button onClick={() => setEditingItem(null)} className="flex-1 bg-stone-100 text-stone-600 font-bold py-3 px-6 rounded-lg hover:bg-stone-200">{t.cancelBtn}</button>
                            </div>
                            <button
                                onClick={handleDeleteItem}
                                className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2 mt-2 transition-colors"
                            >
                                <Trash2 size={18} />
                                {t.deleteItem}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
