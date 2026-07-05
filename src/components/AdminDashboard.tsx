
import React, { useState, useEffect } from 'react';
import { MenuItem, Category, UnitType, EventType, Coupon, ThemeConfig, GalleryItem, Order, Review } from '../types';
import { useStore, translations, getLocalizedItem } from '../store';
import { Pencil, Save, X, LogOut, Plus, Calculator, Settings, ChevronDown, ChevronUp, ToggleRight, ToggleLeft, Upload, Image as ImageIcon, Loader2, Tag, Trash2, Users, Truck, Palette, Video, Award, ShoppingBag, Calendar, Eye, MessageSquare, Check, CheckCheck } from 'lucide-react';
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
    'Picnic Baskets'
];

const UNIT_OPTIONS: UnitType[] = ['tray', 'unit', 'liter', 'weight'];
const EVENT_TYPES: EventType[] = ['basic', 'plus', 'premium'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
    const {
        menuItems, updateMenuItem, addMenuItem, deleteMenuItem,
        calculationSettings, updateCalculationSettings,
        advancedSettings, updateAdvancedSettings,
        featureFlags, updateFeatureFlags,
        language, getCoupons, createCoupon, deleteCoupon,
        appConfig, updateAppConfig,
        theme, updateTheme, gallery, updateGallery, kosherCertUrl, updateKosherCertUrl,
        reviews, fetchReviews, deleteReview,
        aboutUs, updateAboutUs
    } = useStore();

    // Ensure the view starts at the top when entering admin mode
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        loadCoupons();
        loadOrders();
        fetchReviews();
    }, []);

    const t = translations[language]?.admin || translations['he'].admin;
    const rootT = translations[language] as any || translations['he'] as any;

    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
    const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
    const toggleOrderExpanded = (orderId: string) => {
        setExpandedOrders(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    const handleDeleteOrder = (orderId: string) => {
        setConfirmation({
            isOpen: true,
            title: language === 'he' ? 'מחיקת הזמנה' : 'Delete Order',
            message: language === 'he' ? 'האם אתה בטוח שברצונך למחוק הזמנה זו לצמיתות? פעולה זו אינה הפיכה.' : 'Are you sure you want to delete this order permanently? This action cannot be undone.',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('orders')
                        .delete()
                        .eq('id', orderId);
                    
                    if (error) {
                        console.error("Error deleting order:", error);
                        alert(language === 'he' 
                            ? 'שגיאה במחיקת ההזמנה. אנא ודא שקיים RLS Policy למחיקה ב-Supabase.' 
                            : 'Error deleting order. Please make sure a DELETE RLS policy exists in Supabase.');
                        return;
                    }
                    
                    setOrders(prev => prev.filter(o => o.id !== orderId));
                } catch (e) {
                    console.error("Error deleting order:", e);
                } finally {
                    closeConfirmation();
                }
            }
        });
    };

    // Tab state and controls
    const [activeTab, setActiveTab] = useState(0);
    const tabsContainerRef = React.useRef<HTMLDivElement>(null);
    const tabHeadersContainerRef = React.useRef<HTMLDivElement>(null);
    const isScrolling = React.useRef(false);

    // Reset page scroll position to 0 on activeTab change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        
        // Also run a small timeout to make sure it scrolls to top after browser paint/state load
        const timer = setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }, 100);
        
        return () => clearTimeout(timer);
    }, [activeTab]);

    const TABS = [
        { id: 'orders', label: language === 'he' ? 'הזמנות נכנסות' : 'Incoming Orders', icon: ShoppingBag },
        { id: 'menu', label: language === 'he' ? 'ניהול תפריט ומלאי' : 'Menu & Inventory', icon: Pencil },
        { id: 'calculator', label: language === 'he' ? 'מחשבון כמויות' : 'Calculator Config', icon: Calculator },
        { id: 'media', label: language === 'he' ? 'מדיה וביקורות' : 'Gallery & Reviews', icon: ImageIcon },
        { id: 'settings', label: language === 'he' ? 'הגדרות ועיצוב' : 'Settings & Themes', icon: Settings }
    ];

    const handleScroll = () => {
        if (isScrolling.current || !tabsContainerRef.current) return;
        const container = tabsContainerRef.current;
        const scrollLeft = Math.abs(container.scrollLeft);
        const width = container.clientWidth;
        if (width === 0) return;
        const index = Math.round(scrollLeft / width);
        const newActiveTab = Math.min(Math.max(0, index), TABS.length - 1);
        if (newActiveTab !== activeTab) {
            setActiveTab(newActiveTab);
        }
    };

    const handleTabClick = (index: number) => {
        if (!tabsContainerRef.current) return;
        isScrolling.current = true;
        setActiveTab(index);
        const container = tabsContainerRef.current;
        const width = container.clientWidth;
        const isRtl = document.documentElement.dir === 'rtl';
        const targetScroll = isRtl ? -(index * width) : (index * width);
        
        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });

        setTimeout(() => {
            isScrolling.current = false;
        }, 500);
    };

    useEffect(() => {
        const handleResize = () => {
            if (!tabsContainerRef.current) return;
            const container = tabsContainerRef.current;
            const width = container.clientWidth;
            const isRtl = document.documentElement.dir === 'rtl';
            const targetScroll = isRtl ? -(activeTab * width) : (activeTab * width);
            container.scrollLeft = targetScroll;
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [activeTab]);

    useEffect(() => {
        if (tabHeadersContainerRef.current) {
            const activeBtn = tabHeadersContainerRef.current.children[activeTab] as HTMLElement;
            if (activeBtn) {
                activeBtn.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [activeTab]);

    // About Us State
    const [storyHe, setStoryHe] = useState('');
    const [storyEn, setStoryEn] = useState('');

    useEffect(() => {
        if (aboutUs) {
            setStoryHe(aboutUs.story_he || '');
            setStoryEn(aboutUs.story_en || '');
        }
    }, [aboutUs]);

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

    const loadOrders = async () => {
        setLoadingOrders(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
            if (data) setOrders(data as Order[]);
        } catch (e) {
            console.error("Error loading orders:", e);
        } finally {
            setLoadingOrders(false);
        }
    };

    const cleanPhoneForWhatsapp = (phone: string) => {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('05')) {
            cleaned = '972' + cleaned.substring(1);
        } else if (cleaned.startsWith('5') && cleaned.length === 9) {
            cleaned = '972' + cleaned;
        }
        return cleaned;
    };

    const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
        const order = orders.find(o => o.id === orderId);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);
            if (!error) {
                setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
                
                if (order && (newStatus === 'approved' || newStatus === 'cancelled')) {
                    const partialId = orderId.slice(0, 8);
                    const cleanPhone = cleanPhoneForWhatsapp(order.customer_phone || '');
                    
                    let text = "";
                    if (newStatus === 'approved') {
                        text = language === 'he'
                            ? `היי ${order.customer_name}, שמחה לבשר לך שהזמנתך מס' #${partialId} בקייטרינג של איילה אושרה! 🍽️\nסכום סופי לתשלום: ₪${order.total_price}.\nנתראה במועד האירוע! ✨`
                            : `Hi ${order.customer_name}, I'm happy to inform you that your order #${partialId} with Ayala Catering has been approved! 🍽️\nTotal: ₪${order.total_price}.\nSee you at the event! ✨`;
                    } else {
                        text = language === 'he'
                            ? `היי ${order.customer_name}, הזמנתך מס' #${partialId} בקייטרינג של איילה בוטלה. במידה ויש שאלות, ניתן ליצור קשר.`
                            : `Hi ${order.customer_name}, your order #${partialId} with Ayala Catering has been cancelled. If you have any questions, feel free to contact us.`;
                    }
                    
                    const encoded = encodeURIComponent(text);
                    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
                }
            }
        } catch (e) {
            console.error("Error updating order status:", e);
        }
    };

    const handleDeleteReview = (id: string) => {
        setConfirmation({
            isOpen: true,
            title: language === 'he' ? 'מחיקת חוות דעת' : 'Delete Review',
            message: language === 'he' ? 'האם אתה בטוח שברצונך למחוק חוות דעת זו?' : 'Are you sure you want to delete this review?',
            isDestructive: true,
            onConfirm: async () => {
                await deleteReview(id);
            }
        });
    };

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

    const handleEventRatioChange = (eType: EventType, field: string, value: string) => {
        const newRatios = { ...advancedSettings.eventRatios };
        newRatios[eType] = { ...newRatios[eType], [field]: parseFloat(value) || 0 };
        updateAdvancedSettings({ eventRatios: newRatios });
    };

    const applyThemePreset = async (preset: 'classic' | 'olive' | 'midnight' | 'rosegold' | 'forest' | 'burgundy' | 'ocean') => {
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
        } else if (preset === 'olive') {
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
        } else if (preset === 'midnight') {
            await updateTheme({
                bg_color: '#0c0a09',
                text_color: '#f5f5f4',
                primary_color: '#eab308',
                secondary_color: '#ca8a04',
                header_bg_color: '#1c1917',
                header_text_color: '#ffffff',
                hero_bg_color: '#1c1917',
                card_bg_color: '#1c1917',
                card_text_color: '#f5f5f4'
            });
        } else if (preset === 'rosegold') {
            await updateTheme({
                bg_color: '#faf8f8',
                text_color: '#27272a',
                primary_color: '#e0a899',
                secondary_color: '#c48b7d',
                header_bg_color: '#18181b',
                header_text_color: '#faf8f8',
                hero_bg_color: '#18181b',
                card_bg_color: '#ffffff',
                card_text_color: '#27272a'
            });
        } else if (preset === 'forest') {
            await updateTheme({
                bg_color: '#faf6f0',
                text_color: '#2c3531',
                primary_color: '#d97706',
                secondary_color: '#b45309',
                header_bg_color: '#1e2e28',
                header_text_color: '#faf6f0',
                hero_bg_color: '#1e2e28',
                card_bg_color: '#ffffff',
                card_text_color: '#2c3531'
            });
        } else if (preset === 'burgundy') {
            await updateTheme({
                bg_color: '#fbf9f6',
                text_color: '#2d1a1e',
                primary_color: '#d4af37',
                secondary_color: '#b4941f',
                header_bg_color: '#3d1620',
                header_text_color: '#fbf9f6',
                hero_bg_color: '#3d1620',
                card_bg_color: '#ffffff',
                card_text_color: '#2d1a1e'
            });
        } else if (preset === 'ocean') {
            await updateTheme({
                bg_color: '#f0f4f8',
                text_color: '#1e293b',
                primary_color: '#0d9488',
                secondary_color: '#0f766e',
                header_bg_color: '#0f172a',
                header_text_color: '#f8fafc',
                hero_bg_color: '#0f172a',
                card_bg_color: '#ffffff',
                card_text_color: '#1e293b'
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
        setNewItem({
            name: '', category: 'Salads', price: 0, unit_type: 'tray', description: '', is_premium: false, serves_min: 10, serves_max: 10, availability_status: true, tags: [], image_url: '', is_tray: false, units_per_tray: null
        });
        setAddMods('');
    };

    return (
        <div className="p-8 bg-themeBg text-themeText min-h-screen font-sans animate-fade-in" dir={language === 'he' ? 'rtl' : 'ltr'}>

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

            <div className="flex justify-between items-center mb-6 gap-4 text-start">
                <h1 className="text-3xl font-serif font-bold text-themeText">{t.title}</h1>
                <button onClick={onExit} className="flex items-center gap-2 bg-themeHeaderBg text-themeHeaderTxt px-5 py-2.5 rounded-xl hover:opacity-90 transition shadow-md font-bold text-sm">
                    <LogOut size={16} />
                    <span>{t.exit}</span>
                </button>
            </div>

            {/* Sticky Tabs Navigation Bar */}
            <div className="sticky top-[72px] md:top-0 z-30 bg-themeBg/95 backdrop-blur-md border-b border-themeText/10 -mx-8 px-8 py-3 mb-8 shadow-sm">
                <div ref={tabHeadersContainerRef} className="flex gap-2 justify-start md:justify-center overflow-x-auto scrollbar-none py-1">
                    {TABS.map((tab, idx) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === idx;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(idx)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 shrink-0 select-none
                                    ${isActive 
                                        ? 'bg-themePrimary text-themeHeaderBg shadow-md scale-105' 
                                        : 'bg-themeCardBg text-themeText/75 border border-themeText/10 hover:border-themePrimary hover:text-themeText'
                                    }`}
                            >
                                <Icon size={16} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Swipable Tabs Content Viewport */}
            <div 
                ref={tabsContainerRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none gap-4 pb-8"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {/* Tab 1: Orders */}
                <div className="w-full shrink-0 snap-start snap-always px-1">
                    <div className="bg-themeCardBg rounded-2xl shadow-sm border border-themeText/5 overflow-hidden text-start">
                        <div className="p-6 bg-themeHeaderBg text-themeHeaderTxt flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3">
                                <ShoppingBag size={20} className="text-themePrimary" />
                                <span className="font-serif font-bold text-lg">{language === 'he' ? 'הזמנות נכנסות' : 'Incoming Orders'}</span>
                                {orders.filter(o => o.status === 'pending').length > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                                        {orders.filter(o => o.status === 'pending').length} {language === 'he' ? 'חדשות' : 'New'}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="p-6 bg-themeBg/30 space-y-6">
                            {/* Filter bar */}
                            <div className="flex flex-wrap gap-2 border-b border-themeText/5 pb-4">
                                {[
                                    { key: 'all', label: language === 'he' ? 'הכל' : 'All' },
                                    { key: 'pending', label: language === 'he' ? 'ממתין' : 'Pending' },
                                    { key: 'approved', label: language === 'he' ? 'מאושר' : 'Approved' },
                                    { key: 'completed', label: language === 'he' ? 'הושלם' : 'Completed' },
                                    { key: 'cancelled', label: language === 'he' ? 'מבוטל' : 'Cancelled' }
                                ].map(opt => {
                                    const isActive = orderStatusFilter === opt.key;
                                    const count = opt.key === 'all' 
                                        ? orders.length
                                        : orders.filter(o => o.status === opt.key).length;
                                    return (
                                        <button
                                            key={opt.key}
                                            onClick={() => setOrderStatusFilter(opt.key)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border flex items-center gap-1.5 ${
                                                isActive
                                                    ? 'bg-themePrimary text-themeHeaderBg border-themePrimary shadow-sm scale-105'
                                                    : 'bg-themeCardBg text-themeText/75 border-themeText/10 hover:border-themePrimary hover:text-themeText'
                                            }`}
                                        >
                                            <span>{opt.label}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-themeHeaderBg/25 text-themeHeaderBg' : 'bg-themeBg text-themeText/65'}`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {loadingOrders ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="animate-spin text-themePrimary" size={32} />
                                </div>
                            ) : (() => {
                                const filteredAndSorted = orders
                                    .filter(order => orderStatusFilter === 'all' || order.status === orderStatusFilter)
                                    .sort((a, b) => {
                                        if (a.status === 'completed' && b.status !== 'completed') return 1;
                                        if (a.status !== 'completed' && b.status === 'completed') return -1;
                                        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                        return dateB - dateA;
                                    });

                                if (filteredAndSorted.length === 0) {
                                    return (
                                        <p className="text-sm text-themeText/40 italic py-4">
                                            {language === 'he' ? 'אין הזמנות התואמות לסינון זה' : 'No orders match this filter.'}
                                        </p>
                                    );
                                }

                                return (
                                    <div className="space-y-4">
                                        {filteredAndSorted.map(order => {
                                            const dateStr = order.created_at ? new Date(order.created_at).toLocaleString(language === 'he' ? 'he-IL' : 'en-US') : '';
                                            const partialId = order.id ? order.id.slice(0, 8) : 'NEW';
                                            const isExpanded = !!expandedOrders[order.id!];
                                            
                                            const statusColors: Record<string, string> = {
                                                pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/25',
                                                approved: 'bg-blue-500/10 text-blue-500 border-blue-500/25',
                                                completed: 'bg-green-500/10 text-green-500 border-green-500/25',
                                                cancelled: 'bg-red-500/10 text-red-500 border-red-500/25'
                                            };
                                            
                                            const statusLabel: Record<string, string> = {
                                                pending: language === 'he' ? 'ממתין' : 'Pending',
                                                approved: language === 'he' ? 'מאושר' : 'Approved',
                                                completed: language === 'he' ? 'הושלם' : 'Completed',
                                                cancelled: language === 'he' ? 'מבוטל' : 'Cancelled'
                                            };

                                            return (
                                                <div key={order.id} className="bg-themeCardBg p-5 rounded-xl border border-themeText/10 shadow-sm space-y-4 hover:border-themePrimary/20 transition-all text-themeText">
                                                    <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 ${isExpanded ? 'border-b border-themeText/10' : ''}`}>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-themeText">#{partialId}</span>
                                                                <span className="text-xs text-themeText/60 flex items-center gap-1"><Calendar size={12} /> {dateStr}</span>
                                                            </div>
                                                            <div className="text-xs font-bold text-themeText/80 mt-1 flex items-center flex-wrap gap-2">
                                                                <span>👤 {order.customer_name}</span>
                                                                <span>|</span>
                                                                <span>
                                                                    📞 <a href={`tel:${order.customer_phone}`} className="hover:text-themePrimary transition-colors underline" title={language === 'he' ? 'חייג ללקוח' : 'Call Customer'}>{order.customer_phone}</a>
                                                                </span>
                                                                {order.customer_phone && (
                                                                    <a 
                                                                        href={`https://wa.me/${cleanPhoneForWhatsapp(order.customer_phone)}`} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 bg-green-600/10 text-green-600 hover:bg-green-600/20 px-2 py-0.5 rounded text-[10px] transition-colors"
                                                                        title={language === 'he' ? 'שלח הודעת וואטסאפ' : 'Send WhatsApp Message'}
                                                                    >
                                                                        WhatsApp 💬
                                                                    </a>
                                                                )}
                                                                <span>|</span>
                                                                <span className="bg-themePrimary/15 text-themePrimary px-2 py-0.5 rounded font-bold text-[10px]">
                                                                    🎉 {language === 'he' ? 'סוג אירוע' : 'Event Type'}: {order.event_type || (order.customer_name?.match(/\((אירוע [^)]+)\)$/)?.[1]) || (language === 'he' ? 'לא נבחר' : 'None')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 md:gap-3">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[order.status] || 'bg-themeBg text-themeText/80 border-themeText/10'}`}>
                                                                {statusLabel[order.status] || order.status}
                                                            </span>
                                                            <span className="text-lg font-bold text-themeText font-serif">₪{order.total_price}</span>
                                                            <button 
                                                                onClick={() => toggleOrderExpanded(order.id!)}
                                                                className="p-1.5 text-themeText/60 hover:text-themePrimary hover:bg-themeBg rounded-full transition-colors shrink-0"
                                                                title={isExpanded ? (language === 'he' ? 'צמצם פריטים' : 'Collapse Items') : (language === 'he' ? 'הצג פריטים' : 'Expand Items')}
                                                            >
                                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="space-y-2 border-t border-themeText/5 pt-3 animate-fade-in">
                                                            {((order.items as any) || []).map((item: any, idx: number) => (
                                                                <div key={idx} className="text-xs text-themeText/70 flex justify-between">
                                                                    <div>
                                                                        <span className="font-bold text-themeText/90">{item.quantity}x</span> {language === 'he' ? item.name : (item.name_en || item.name)}
                                                                        {item.selected_modifications && item.selected_modifications.length > 0 && (
                                                                            <span className="text-themeText/40 block text-[10px] pl-4">
                                                                                ↳ {item.selected_modifications.join(', ')}
                                                                            </span>
                                                                        )}
                                                                        {item.notes && (
                                                                            <span className="text-themeText/40 italic block text-[10px] pl-4">
                                                                                ↳ "{item.notes}"
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="font-medium text-themeText/85">₪{item.price * item.quantity}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className={`flex flex-wrap gap-2 pt-2 justify-end ${isExpanded ? 'border-t border-themeText/10' : ''}`}>
                                                        {order.status !== 'approved' && order.status !== 'completed' && (
                                                            <button
                                                                onClick={() => handleUpdateOrderStatus(order.id!, 'approved')}
                                                                className="p-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all duration-200"
                                                                title={language === 'he' ? 'אשר הזמנה' : 'Approve Order'}
                                                            >
                                                                <Check size={18} />
                                                            </button>
                                                        )}
                                                        {order.status !== 'completed' && (
                                                            <button
                                                                onClick={() => handleUpdateOrderStatus(order.id!, 'completed')}
                                                                className="p-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition-all duration-200"
                                                                title={language === 'he' ? 'סמן כהושלם' : 'Mark as Completed'}
                                                            >
                                                                <CheckCheck size={18} />
                                                            </button>
                                                        )}
                                                        {order.status !== 'cancelled' && (
                                                            <button
                                                                onClick={() => handleUpdateOrderStatus(order.id!, 'cancelled')}
                                                                className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all duration-200"
                                                                title={language === 'he' ? 'בטל הזמנה' : 'Cancel Order'}
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        )}
                                                        {order.status === 'cancelled' && (
                                                            <button
                                                                onClick={() => handleDeleteOrder(order.id!)}
                                                                className="p-2 bg-themeText/5 text-themeText/60 border border-themeText/10 rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all duration-200"
                                                                title={language === 'he' ? 'מחק לצמיתות' : 'Delete permanently'}
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Tab 2: Menu Items */}
                <div className="w-full shrink-0 snap-start snap-always px-1">
                    <div className="bg-themeCardBg rounded-2xl shadow-sm border border-themeText/10 overflow-hidden text-start text-themeText">
                        <div className="p-4 border-b border-themeText/10 flex flex-col md:flex-row justify-between items-center gap-4 bg-themeBg/20">
                            <input 
                                type="text" 
                                placeholder={t.searchPlaceholder} 
                                className="w-full md:max-w-md p-2.5 border border-themeText/20 bg-themeCardBg text-themeText rounded-xl focus:border-themePrimary focus:outline-none text-sm" 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                            <button 
                                onClick={() => setIsAddModalOpen(true)} 
                                className="w-full md:w-auto flex items-center justify-center gap-2 bg-themePrimary text-themeHeaderBg px-5 py-2.5 rounded-xl hover:opacity-90 transition font-bold shadow-sm shrink-0 text-sm"
                            >
                                <Plus size={18} />
                                <span>{t.addItem}</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-start">
                                <thead className="bg-themeBg text-themeText/65 text-sm border-b border-themeText/10">
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
                                            <tr key={item.id} className="border-b border-themeText/10 hover:bg-themeBg/40">
                                                <td className="p-4 font-bold text-themeText/95">{localItem.name}</td>
                                                <td className="p-4">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt="mini" className="w-10 h-10 object-cover rounded-md border border-themeText/15" />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-themeBg/40 rounded-md border border-themeText/15 flex items-center justify-center text-themeText/30">
                                                            <ImageIcon size={16} />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-themeText/70">{(rootT.categories as Record<string, string>)?.[item.category] || item.category}</td>
                                                <td className="p-4">₪{item.price}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded text-xs font-bold ${item.availability_status ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {item.availability_status ? t.active : t.outOfStock}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-themeText/50 max-w-xs truncate">{localItem.modifications?.join(', ') || '-'}</td>
                                                <td className="p-4">
                                                    <button onClick={() => handleEditClick(item)} className="p-2 text-themeText/40 hover:text-themePrimary transition-colors">
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
                </div>

                {/* Tab 3: Calculator settings */}
                <div className="w-full shrink-0 snap-start snap-always px-1 space-y-8 text-start">
                    {/* General Calculator Settings Card */}
                    <div className="bg-themeCardBg p-6 rounded-2xl shadow-sm border border-themeText/10 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-themePrimary/20 rounded text-themePrimary"><Calculator size={16} /></div>
                            <h3 className="text-sm font-bold text-themeText uppercase">{t.calcSettings}</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-6">
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-themeText/40 uppercase tracking-wider">{t.featureMgmt}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        onClick={() => updateFeatureFlags({ showCalculator: !featureFlags?.showCalculator })}
                                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${featureFlags?.showCalculator ? 'bg-themePrimary/15 border-themePrimary/30 text-themePrimary' : 'bg-themeBg border-themeText/10 text-themeText/40'}`}
                                    >
                                        <span className="text-xs font-bold">{t.showCalc}</span>
                                        {featureFlags?.showCalculator ? <ToggleRight className="text-themePrimary" /> : <ToggleLeft />}
                                    </button>
                                    <button
                                        onClick={() => updateFeatureFlags({ showAI: !featureFlags?.showAI })}
                                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${featureFlags?.showAI ? 'bg-themePrimary/15 border-themePrimary/30 text-themePrimary' : 'bg-themeBg border-themeText/10 text-themeText/40'}`}
                                    >
                                        <span className="text-xs font-bold">{t.showAI}</span>
                                        {featureFlags?.showAI ? <ToggleRight className="text-themePrimary" /> : <ToggleLeft />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-themeText/40 uppercase tracking-wider">{language === 'he' ? 'פרמטרים של המחשבון' : 'Calculator Parameters'}</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="flex flex-col">
                                        <label className="text-[10px] md:text-xs text-themeText/50 font-bold block mb-1 min-h-[2.5rem] flex items-end">{t.sandwichesPerPerson}</label>
                                        <input type="number" step="0.1" value={calculationSettings?.sandwichesPerPerson || 1.5} onChange={(e) => updateCalculationSettings({ sandwichesPerPerson: parseFloat(e.target.value) })} className="w-full bg-transparent border-b border-themeText/20 text-xl font-bold pb-1 focus:outline-none focus:border-themePrimary text-themeText" />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[10px] md:text-xs text-themeText/50 font-bold block mb-1 min-h-[2.5rem] flex items-end">{t.pastriesPerPerson}</label>
                                        <input type="number" step="0.1" value={calculationSettings?.pastriesPerPerson || 1.0} onChange={(e) => updateCalculationSettings({ pastriesPerPerson: parseFloat(e.target.value) })} className="w-full bg-transparent border-b border-themeText/20 text-xl font-bold pb-1 focus:outline-none focus:border-themePrimary text-themeText" />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[10px] md:text-xs text-themeText/50 font-bold block mb-1 min-h-[2.5rem] flex items-end">{t.trayCapacity}</label>
                                        <input type="number" value={calculationSettings?.averageTrayCapacity || 10} onChange={(e) => updateCalculationSettings({ averageTrayCapacity: parseInt(e.target.value) })} className="w-full bg-transparent border-b border-themeText/20 text-xl font-bold pb-1 focus:outline-none focus:border-themePrimary text-themeText" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Calculator Settings Card */}
                    <div className="bg-themeCardBg p-6 rounded-2xl shadow-sm border border-themeText/10 text-start space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-themePrimary/20 rounded text-themePrimary"><Settings size={16} /></div>
                            <h3 className="text-sm font-bold text-themeText uppercase">{t.advCalc}</h3>
                        </div>
                        
                        <div className="border-b border-themeText/10 pb-6">
                            <h4 className="text-themeText font-bold mb-2 flex items-center gap-2 text-sm"><span className="w-2 h-6 bg-themePrimary rounded-sm"></span>{t.aiInstructions}</h4>
                            <textarea
                                value={calculationSettings?.aiCustomInstructions || ''}
                                onChange={(e) => updateCalculationSettings({ aiCustomInstructions: e.target.value })}
                                placeholder={t.aiInstructionsPlaceholder}
                                className="w-full h-32 p-3 border border-themeText/20 bg-themeCardBg text-themeText rounded-lg focus:outline-none focus:border-themePrimary text-sm resize-none"
                            />
                        </div>

                        <div className="border-b border-themeText/10 pb-6">
                            <h4 className="text-themeText font-bold mb-2 flex items-center gap-2 text-sm">
                                <span className="w-2 h-6 bg-themePrimary rounded-sm"></span>
                                {language === 'he' ? 'טקסט הודעת שירותי עריכה ופינוי (עברית)' : 'Setup & Cleanup Message (Hebrew)'}
                            </h4>
                            <textarea
                                value={calculationSettings?.setupServiceDetailsHe || ''}
                                onChange={(e) => updateCalculationSettings({ setupServiceDetailsHe: e.target.value })}
                                placeholder={language === 'he' ? 'הזן את פרטי השירות שיוצגו ללקוח בעברית...' : 'Enter setup service details in Hebrew...'}
                                className="w-full h-40 p-3 border border-themeText/20 bg-themeCardBg text-themeText rounded-lg focus:outline-none focus:border-themePrimary text-sm resize-y"
                            />
                        </div>

                        <div className="border-b border-themeText/10 pb-6">
                            <h4 className="text-themeText font-bold mb-2 flex items-center gap-2 text-sm">
                                <span className="w-2 h-6 bg-themePrimary rounded-sm"></span>
                                {language === 'he' ? 'טקסט הודעת שירותי עריכה ופינוי (אנגלית)' : 'Setup & Cleanup Message (English)'}
                            </h4>
                            <textarea
                                value={calculationSettings?.setupServiceDetailsEn || ''}
                                onChange={(e) => updateCalculationSettings({ setupServiceDetailsEn: e.target.value })}
                                placeholder={language === 'he' ? 'הזן את פרטי השירות שיוצגו ללקוח באנגלית...' : 'Enter setup service details in English...'}
                                className="w-full h-40 p-3 border border-themeText/20 bg-themeCardBg text-themeText rounded-lg focus:outline-none focus:border-themePrimary text-sm resize-y"
                            />
                        </div>

                        <div>
                            <h4 className="text-themeText font-bold mb-2 flex items-center gap-2 text-sm"><span className="w-2 h-6 bg-themePrimary rounded-sm"></span>{t.eventLogic}</h4>
                            <p className="text-[11px] text-themeText/60 italic mb-4 px-2">{t.eventLogicExpl}</p>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-themeHeaderBg/10 text-themeText/80 text-[10px] uppercase">
                                            <th className="p-2 text-start">{t.tableEventType}</th>
                                            <th className="p-2 text-start">{t.tableSandwiches}</th>
                                            <th className="p-2 text-start">{t.tablePastries}</th>
                                            <th className="p-2 text-start">{t.tableSalads}</th>
                                            <th className="p-2 text-start">{t.tableMains}</th>
                                            <th className="p-2 text-start">{t.tablePlatters}</th>
                                            <th className="p-2 text-start">{t.tableDesserts}</th>
                                            <th className="p-2 text-start">{t.tableDips}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {EVENT_TYPES.map(eType => (
                                            <tr key={eType} className="border-b border-themeText/10 hover:bg-themeCardBg/30 transition-colors">
                                                <td className="p-2 font-bold text-themeText text-sm capitalize">{eType === 'basic' ? rootT.basicEvent : eType === 'plus' ? rootT.plusEvent : rootT.premiumEvent}</td>
                                                <td className="p-2"><input type="number" step="0.1" className="w-14 p-1 border border-themeText/20 bg-themeCardBg text-themeText rounded text-xs" value={advancedSettings?.eventRatios?.[eType]?.sandwiches || 0} onChange={(e) => handleEventRatioChange(eType, 'sandwiches', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" step="0.1" className="w-14 p-1 border border-themeText/20 bg-themeCardBg text-themeText rounded text-xs" value={advancedSettings?.eventRatios?.[eType]?.pastries || 0} onChange={(e) => handleEventRatioChange(eType, 'pastries', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" step="0.001" className="w-14 p-1 border border-themeText/20 bg-themeCardBg text-themeText rounded text-xs" value={advancedSettings?.eventRatios?.[eType]?.saladsCoverage || 0} onChange={(e) => handleEventRatioChange(eType, 'saladsCoverage', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" step="0.001" className="w-14 p-1 border border-themeText/20 bg-themeCardBg text-themeText rounded text-xs" value={advancedSettings?.eventRatios?.[eType]?.mainsCoverage || 0} onChange={(e) => handleEventRatioChange(eType, 'mainsCoverage', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" step="0.001" className="w-14 p-1 border border-themeText/20 bg-themeCardBg text-themeText rounded text-xs" value={advancedSettings?.eventRatios?.[eType]?.plattersCoverage || 0} onChange={(e) => handleEventRatioChange(eType, 'plattersCoverage', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" step="0.001" className="w-14 p-1 border border-themeText/20 bg-themeCardBg text-themeText rounded text-xs" value={advancedSettings?.eventRatios?.[eType]?.dessertsCoverage || 0} onChange={(e) => handleEventRatioChange(eType, 'dessertsCoverage', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" step="0.001" className="w-14 p-1 border border-themeText/20 bg-themeCardBg text-themeText rounded text-xs" value={advancedSettings?.eventRatios?.[eType]?.dipsCoverage || 0} onChange={(e) => handleEventRatioChange(eType, 'dipsCoverage', e.target.value)} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab 4: Media & Reviews */}
                <div className="w-full shrink-0 snap-start snap-always px-1 space-y-8 text-start">
                    {/* Gallery Settings Card */}
                    <div className="bg-themeCardBg p-6 rounded-2xl shadow-sm border border-themeText/10">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-themePrimary/20 rounded text-themePrimary"><ImageIcon size={16} /></div>
                            <h3 className="text-sm font-bold text-themeText uppercase">{t.galleryTitle}</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="bg-themeBg/30 p-4 rounded-xl border border-themeText/10 space-y-4">
                                <h4 className="font-bold text-themeText text-sm">{t.addGalleryItem}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div>
                                        <label className="block text-xs font-bold text-themeText/60 mb-1">{t.mediaType}</label>
                                        <select
                                            value={newGalleryItem.type}
                                            onChange={(e) => setNewGalleryItem({ ...newGalleryItem, type: e.target.value as 'image' | 'video', url: '' })}
                                            className="w-full p-2.5 border border-themeText/20 bg-themeCardBg text-themeText text-sm rounded-lg"
                                        >
                                            <option value="image">{language === 'he' ? 'תמונה' : 'Image'}</option>
                                            <option value="video">{language === 'he' ? 'סרטון' : 'Video'}</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-themeText/60 mb-1">
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
                                                        className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${videoSourceType === 'file' ? 'bg-themePrimary text-themeHeaderBg border-themePrimary shadow-sm' : 'bg-themeBg text-themeText/70 hover:border-themeText/30'}`}
                                                    >
                                                        {language === 'he' ? 'העלאת קובץ' : 'Upload File'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setVideoSourceType('url'); setNewGalleryItem(prev => ({ ...prev, url: '' })); }}
                                                        className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${videoSourceType === 'url' ? 'bg-themePrimary text-themeHeaderBg border-themePrimary shadow-sm' : 'bg-themeBg text-themeText/70 hover:border-themeText/30'}`}
                                                    >
                                                        {language === 'he' ? 'קישור URL' : 'URL Link'}
                                                    </button>
                                                </div>
                                                {videoSourceType === 'url' ? (
                                                    <input
                                                        type="text"
                                                        value={newGalleryItem.url}
                                                        onChange={(e) => setNewGalleryItem({ ...newGalleryItem, url: e.target.value })}
                                                        className="w-full p-2 border border-themeText/20 bg-themeCardBg text-themeText text-sm rounded-lg"
                                                        placeholder="https://www.youtube.com/watch?v=..."
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-4">
                                                        {newGalleryItem.url && (
                                                            <span className="text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/25 truncate max-w-[150px]">
                                                                {language === 'he' ? 'סרטון הועלה' : 'Video uploaded'}
                                                            </span>
                                                        )}
                                                        <label className="flex items-center justify-center gap-2 flex-1 p-2 border-2 border-dashed border-themeText/20 rounded cursor-pointer hover:border-themePrimary transition text-themeText/60 font-bold text-xs bg-themeCardBg">
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
                                                <label className="flex items-center justify-center gap-2 flex-1 p-2 border-2 border-dashed border-themeText/20 rounded cursor-pointer hover:border-themePrimary transition text-themeText/60 font-bold text-xs bg-themeCardBg">
                                                    <Upload size={14} />
                                                    <span>{uploading ? '...' : t.upload}</span>
                                                    <input type="file" accept="image/*" onChange={(e) => handleGalleryImageUpload(e)} className="hidden" disabled={uploading} />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-bold text-themeText/60 mb-1">{t.caption}</label>
                                        <input
                                            type="text"
                                            value={newGalleryItem.caption}
                                            onChange={(e) => setNewGalleryItem({ ...newGalleryItem, caption: e.target.value })}
                                            className="w-full p-2.5 border border-themeText/20 bg-themeCardBg text-themeText text-sm rounded-lg"
                                            placeholder={language === 'he' ? 'לדוגמה: שולחן קינוחים מעוצב' : 'e.g. Dessert table design'}
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddGalleryItem}
                                        disabled={!newGalleryItem.url || uploading}
                                        className="bg-themePrimary text-themeHeaderBg font-bold px-6 py-3 rounded-xl hover:opacity-90 transition w-full disabled:opacity-50 text-sm"
                                    >
                                        {language === 'he' ? 'הוסף לגלריה' : 'Add Item'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-themeText/40 uppercase mb-3">{language === 'he' ? 'פריטים בגלריה' : 'Items in Gallery'}</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {(gallery || []).map(item => (
                                        <div key={item.id} className="relative group bg-themeBg border border-themeText/10 rounded-xl overflow-hidden shadow-sm aspect-square flex flex-col justify-between">
                                            <div className="relative flex-1 w-full bg-themeBg/40 flex items-center justify-center overflow-hidden">
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
                                                <div className="p-1.5 text-[10px] text-themeText/60 font-medium truncate border-t border-themeText/10 bg-themeBg/30">
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
                                        <p className="text-sm text-themeText/40 italic col-span-full">No gallery items yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reviews Moderation Card */}
                    <div className="bg-themeCardBg p-6 rounded-2xl shadow-sm border border-themeText/10">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-themePrimary/20 rounded text-themePrimary"><MessageSquare size={16} /></div>
                            <h3 className="text-sm font-bold text-themeText uppercase">{language === 'he' ? 'ניהול חוות דעת' : 'Manage Reviews'}</h3>
                        </div>
                        
                        <div>
                            {reviews.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {reviews.map(review => {
                                        const dateStr = review.created_at ? new Date(review.created_at).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US') : '';
                                        return (
                                            <div key={review.id} className="bg-themeBg/40 p-4 rounded-xl border border-themeText/10 shadow-sm flex flex-col justify-between hover:border-themePrimary/20 transition-all text-themeText">
                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h5 className="font-bold text-themeText text-sm">{review.customer_name}</h5>
                                                            <span className="text-[10px] text-themeText/50">{dateStr}</span>
                                                        </div>
                                                        <div className="flex items-center gap-0.5">
                                                            {[...Array(5)].map((_, i) => (
                                                                <svg
                                                                    key={i}
                                                                    className={`w-4 h-4 ${i < review.rating ? 'text-themePrimary fill-themePrimary' : 'text-themeText/20 fill-themeText/20'}`}
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                >
                                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                </svg>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-themeText/80 italic mt-2">"{review.comment}"</p>
                                                </div>
                                                <div className="flex justify-end mt-4 pt-2 border-t border-themeText/10">
                                                    <button
                                                        onClick={() => handleDeleteReview(review.id!)}
                                                        className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-bold hover:bg-red-500/10 px-2.5 py-1 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                        <span>{language === 'he' ? 'מחק חוות דעת' : 'Delete'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-themeText/40 italic py-4">{language === 'he' ? 'אין חוות דעת במערכת' : 'No reviews in system yet.'}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tab 5: Settings & Themes */}
                <div className="w-full shrink-0 snap-start snap-always px-1 space-y-8 text-start">
                    {/* E-Commerce vs Catalog Mode Toggle Card */}
                    <div className="bg-themeCardBg p-6 rounded-2xl shadow-sm border border-themeText/10">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-themePrimary/20 rounded-xl text-themePrimary">
                                    <ShoppingBag size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-themeText uppercase">
                                        {language === 'he' ? 'מצב תצוגה ומכירה' : 'Display & Sales Mode'}
                                    </h3>
                                    <p className="text-xs text-themeText/60 mt-0.5">
                                        {language === 'he' 
                                            ? 'בחירה בין הפעלת תצוגת מחירים ורכישה מלאה לבין מצב קטלוג הצעות מחיר בלבד' 
                                            : 'Choose between full pricing/checkout (E-Commerce) or quote requests only (Catalog)'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 self-end sm:self-auto">
                                <span className="text-xs font-bold text-themeText/70">
                                    הפעלת תצוגת מחירים ומכירה (E-Commerce Mode)
                                </span>
                                <button
                                    onClick={() => updateAppConfig({ ecommerce_mode: !appConfig.ecommerce_mode })}
                                    className={`w-14 h-8 flex items-center rounded-full p-1 transition-all duration-300 ${
                                        appConfig.ecommerce_mode ? 'bg-themePrimary justify-end' : 'bg-themeBg border border-themeText/20 justify-start'
                                    }`}
                                    role="switch"
                                    aria-checked={appConfig.ecommerce_mode}
                                    id="ecommerce-mode-toggle"
                                >
                                    <span className={`w-6 h-6 rounded-full shadow-md transition-all duration-300 ${
                                        appConfig.ecommerce_mode ? 'bg-themeHeaderBg' : 'bg-themeText/45'
                                    }`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Order and Delivery Settings Card */}
                    <div className="bg-themeCardBg p-6 rounded-2xl shadow-sm border border-themeText/10">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-themePrimary/20 rounded text-themePrimary"><Truck size={16} /></div>
                            <h3 className="text-sm font-bold text-themeText uppercase">{language === 'he' ? 'הגדרות הזמנה ומשלוח' : 'Order & Delivery Settings'}</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-themeText/60 font-bold mb-1">{t.minOrder}</label>
                                <div className="flex items-center gap-1">
                                    <span className="text-themeText/40">₪</span>
                                    <input
                                        type="number"
                                        value={appConfig.min_order_price}
                                        onChange={(e) => updateAppConfig({ min_order_price: Number(e.target.value) })}
                                        className="w-full border-b border-themeText/20 bg-transparent text-themeText text-lg font-bold pb-1 focus:outline-none focus:border-themePrimary"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-themeText/60 font-bold mb-1">{t.minFreeDelivery}</label>
                                <div className="flex items-center gap-1">
                                    <span className="text-themeText/40">₪</span>
                                    <input
                                        type="number"
                                        value={calculationSettings?.minOrderFreeDelivery || 1500}
                                        onChange={(e) => updateCalculationSettings({ minOrderFreeDelivery: Number(e.target.value) })}
                                        className="w-full border-b border-themeText/20 bg-transparent text-themeText text-lg font-bold pb-1 focus:outline-none focus:border-themePrimary"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-themeText/60 font-bold mb-1">{t.baseDeliveryFee}</label>
                                <div className="flex items-center gap-1">
                                    <span className="text-themeText/40">₪</span>
                                    <input
                                        type="number"
                                        value={appConfig.delivery_base_fee ?? 60}
                                        onChange={(e) => updateAppConfig({ delivery_base_fee: Number(e.target.value) })}
                                        className="w-full border-b border-themeText/20 bg-transparent text-themeText text-lg font-bold pb-1 focus:outline-none focus:border-themePrimary"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-themeText/60 font-bold mb-1">{t.pricePerKm}</label>
                                <div className="flex items-center gap-1">
                                    <span className="text-themeText/40">₪</span>
                                    <input
                                        type="number"
                                        value={appConfig.delivery_price_per_km ?? 4}
                                        onChange={(e) => updateAppConfig({ delivery_price_per_km: Number(e.target.value) })}
                                        className="w-full border-b border-themeText/20 bg-transparent text-themeText text-lg font-bold pb-1 focus:outline-none focus:border-themePrimary"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-themeText/60 font-bold mb-1">{t.includedRadius}</label>
                                <div className="flex items-center gap-1">
                                    <span className="text-themeText/40">KM</span>
                                    <input
                                        type="number"
                                        value={appConfig.delivery_min_radius_included ?? 15}
                                        onChange={(e) => updateAppConfig({ delivery_min_radius_included: Number(e.target.value) })}
                                        className="w-full border-b border-themeText/20 bg-transparent text-themeText text-lg font-bold pb-1 focus:outline-none focus:border-themePrimary"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Coupons Management Card */}
                    <div className="bg-themeCardBg p-6 rounded-2xl shadow-sm border border-themeText/10">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-themePrimary/20 rounded text-themePrimary"><Tag size={16} /></div>
                            <h3 className="text-sm font-bold text-themeText uppercase">{t.coupons}</h3>
                        </div>
                        
                        <div className="flex flex-col lg:flex-row gap-4 mb-6 items-end border-b border-themeText/10 pb-6">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-themeText/60 mb-1">{t.couponCode}</label>
                                <input
                                    type="text"
                                    value={newCoupon.code}
                                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                    className="w-full p-2.5 border border-themeText/20 bg-themeBg/20 text-themeText rounded-xl uppercase text-sm"
                                    placeholder="SALE2024"
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-themeText/60 mb-1">{t.discountType}</label>
                                <select
                                    value={newCoupon.discount_type}
                                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value as 'percentage' | 'fixed' })}
                                    className="w-full p-2.5 border border-themeText/20 bg-themeBg/20 text-themeText text-sm rounded-xl"
                                >
                                    <option value="percentage">{t.percentage}</option>
                                    <option value="fixed">{t.fixedAmount}</option>
                                </select>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-themeText/60 mb-1">{t.discountValue}</label>
                                <input
                                    type="number"
                                    value={newCoupon.discount_value}
                                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) })}
                                    className="w-full p-2.5 border border-themeText/20 bg-themeBg/20 text-themeText text-sm rounded-xl"
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-themeText/60 mb-1">{t.usageLimit}</label>
                                <input
                                    type="number"
                                    value={newCoupon.usage_limit || ''}
                                    onChange={(e) => setNewCoupon({ ...newCoupon, usage_limit: e.target.value ? parseInt(e.target.value) : null })}
                                    className="w-full p-2.5 border border-themeText/20 bg-themeBg/20 text-themeText text-sm rounded-xl"
                                    placeholder={t.unlimited}
                                />
                            </div>
                            <button
                                onClick={handleCreateCoupon}
                                className="bg-themePrimary text-themeHeaderBg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition w-full lg:w-auto text-sm shrink-0"
                            >
                                {t.createCoupon}
                            </button>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-themeText/40 uppercase mb-3">{t.activeCoupons}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {coupons.map(coupon => (
                                    <div key={coupon.code} className="bg-themeBg/40 p-3 rounded-xl border border-themeText/10 flex justify-between items-center shadow-sm text-themeText">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="block font-bold text-themeText">{coupon.code}</span>
                                                <span className="text-[10px] bg-themeBg px-1.5 rounded text-themeText/60 border border-themeText/10">
                                                    {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₪${coupon.discount_value}`}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-themeText/40 mt-1">
                                                <Users size={12} />
                                                <span>{t.usage}: {coupon.usage_count || 0} / {coupon.usage_limit || '∞'}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteCoupon(coupon.code)}
                                            className="text-themeText/40 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {coupons.length === 0 && <p className="text-sm text-themeText/40 italic">No coupons yet.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Story Details Card */}
                    <div className="bg-themeCardBg p-6 rounded-2xl shadow-sm border border-themeText/10">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-themePrimary/20 rounded text-themePrimary"><Award size={16} /></div>
                            <h3 className="text-sm font-bold text-themeText uppercase">{language === 'he' ? 'עריכת הסיפור שלנו' : 'Edit Our Story'}</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-themeText/70 mb-1">{language === 'he' ? 'הסיפור שלנו בעברית' : 'Our Story (Hebrew)'}</label>
                                <textarea
                                    value={storyHe}
                                    onChange={(e) => setStoryHe(e.target.value)}
                                    className="w-full h-40 p-3 border border-themeText/20 bg-themeBg/20 text-themeText rounded-xl focus:outline-none focus:border-themePrimary text-sm"
                                    placeholder="כתוב את הסיפור בעברית..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-themeText/70 mb-1">{language === 'he' ? 'הסיפור שלנו באנגלית' : 'Our Story (English)'}</label>
                                <textarea
                                    value={storyEn}
                                    onChange={(e) => setStoryEn(e.target.value)}
                                    className="w-full h-40 p-3 border border-themeText/20 bg-themeBg/20 text-themeText rounded-xl focus:outline-none focus:border-themePrimary text-sm"
                                    placeholder="Write the story in English..."
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={async () => {
                                        setUploading(true);
                                        await updateAboutUs({ story_he: storyHe, story_en: storyEn });
                                        setUploading(false);
                                        setFeedback({
                                            isOpen: true,
                                            type: 'success',
                                            title: language === 'he' ? 'השמירה הצליחה' : 'Saved Successfully',
                                            message: language === 'he' ? 'הסיפור שלנו עודכן בהצלחה!' : 'Our story has been updated successfully!'
                                        });
                                    }}
                                    disabled={uploading}
                                    className="px-6 py-2.5 bg-themePrimary text-themeHeaderBg font-bold rounded-xl flex items-center gap-2 shadow-sm transition active:scale-[0.98] hover:opacity-90 text-sm"
                                >
                                    {uploading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    <span>{t.save}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Kosher Certificate Section Card */}
                    <div className="bg-themeCardBg p-6 rounded-2xl shadow-sm border border-themeText/10">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-themePrimary/20 rounded text-themePrimary"><Award size={16} /></div>
                            <h3 className="text-sm font-bold text-themeText uppercase">{t.kosherCert}</h3>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="w-32 h-32 bg-themeBg/30 rounded-lg overflow-hidden border border-themeText/10 flex items-center justify-center shrink-0">
                                {kosherCertUrl ? (
                                    <img src={kosherCertUrl} alt="Kosher Certificate" className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-themeText/40 text-xs italic">{language === 'he' ? 'אין תעודה' : 'No certificate'}</span>
                                )}
                            </div>
                            <div className="flex-1 w-full space-y-2">
                                <label className={`
                                    flex items-center justify-center gap-2 w-full max-w-xs p-3 border-2 border-dashed border-themeText/20 rounded-xl cursor-pointer hover:border-themePrimary hover:text-themePrimary transition-colors text-themeText/60 font-bold text-sm bg-themeBg/30
                                    ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                                `}>
                                    <Upload size={16} />
                                    <span>{uploading ? '...' : t.uploadKosher}</span>
                                    <input type="file" accept="image/*,application/pdf" onChange={handleKosherUpload} className="hidden" disabled={uploading} />
                                </label>
                                <p className="text-[10px] text-themeText/40">{t.imageHint}</p>
                                {kosherCertUrl && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={kosherCertUrl}
                                            className="w-full max-w-md p-1.5 border border-themeText/20 rounded-lg text-xs text-themeText/60 bg-themeBg/30"
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

                    {/* Theme Settings Customizer Card */}
                    <div className="bg-themeCardBg p-6 rounded-2xl shadow-sm border border-themeText/10">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-themePrimary/20 rounded text-themePrimary"><Palette size={16} /></div>
                            <h3 className="text-sm font-bold text-themeText uppercase">{t.themeSettings}</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-themeText font-bold mb-3 flex items-center gap-2 text-sm"><span className="w-2 h-6 bg-themePrimary rounded-sm"></span>{language === 'he' ? 'ערכות נושא מוכנות' : 'Theme Presets'}</h4>
                                <div className="flex flex-wrap gap-3">
                                    <button onClick={() => applyThemePreset('classic')} className="px-4 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all shadow-sm font-bold text-xs">
                                        {language === 'he' ? 'קלאסי (זהב ושחור)' : 'Classic (Gold & Dark)'}
                                    </button>
                                    <button onClick={() => applyThemePreset('olive')} className="px-4 py-2.5 bg-emerald-800 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm font-bold text-xs">
                                        {language === 'he' ? 'ירוק זית וקרם' : 'Olive Green & Cream'}
                                    </button>
                                    <button onClick={() => applyThemePreset('midnight')} className="px-4 py-2.5 bg-zinc-950 text-yellow-500 rounded-xl hover:bg-zinc-900 border border-yellow-500/20 transition-all shadow-sm font-bold text-xs">
                                        {language === 'he' ? 'לילה יוקרתי (Midnight)' : 'Midnight Luxury (Dark)'}
                                    </button>
                                    <button onClick={() => applyThemePreset('rosegold')} className="px-4 py-2.5 bg-[#e0a899] text-stone-900 rounded-xl hover:bg-[#d59a8c] transition-all shadow-sm font-bold text-xs">
                                        {language === 'he' ? 'רוז גולד (Modern Romance)' : 'Rose Gold (Modern)'}
                                    </button>
                                    <button onClick={() => applyThemePreset('forest')} className="px-4 py-2.5 bg-[#1e2e28] text-amber-500 rounded-xl hover:bg-[#16221d] transition-all shadow-sm font-bold text-xs">
                                        {language === 'he' ? 'יער ואדמה (Forest)' : 'Forest Ochre (Organic)'}
                                    </button>
                                    <button onClick={() => applyThemePreset('burgundy')} className="px-4 py-2.5 bg-[#3d1620] text-[#d4af37] rounded-xl hover:bg-[#2d1017] transition-all shadow-sm font-bold text-xs">
                                        {language === 'he' ? 'מלכותי בורגונדי (Burgundy)' : 'Royal Burgundy (Premium)'}
                                    </button>
                                    <button onClick={() => applyThemePreset('ocean')} className="px-4 py-2.5 bg-[#0f172a] text-teal-400 rounded-xl hover:bg-[#0c1222] transition-all shadow-sm font-bold text-xs">
                                        {language === 'he' ? 'אוקיינוס וטורקיז (Ocean)' : 'Ocean Slate (Coastal)'}
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-themeText/10 pt-6">
                                <h4 className="text-themeText font-bold mb-3 flex items-center gap-2 text-sm"><span className="w-2 h-6 bg-themePrimary rounded-sm"></span>{language === 'he' ? 'התאמת צבעים אישית' : 'Custom Theme Colors'}</h4>
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
                                        <div key={key} className="flex items-center justify-between p-3 bg-themeBg/40 rounded-xl border border-themeText/10 shadow-sm">
                                            <span className="text-xs font-bold text-themeText/80">{label}</span>
                                            <input
                                                type="color"
                                                value={(theme as any)[key] || '#ffffff'}
                                                onChange={(e) => updateTheme({ [key]: e.target.value })}
                                                className="w-8 h-8 rounded cursor-pointer border border-themeText/20 bg-transparent"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Item Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
                    <div className="relative bg-themeCardBg border border-themeText/10 w-full max-h-[85vh] h-auto md:max-w-lg rounded-2xl p-6 shadow-2xl animate-zoom-in text-start flex flex-col text-themeText">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h2 className="text-2xl font-serif font-bold text-themeText">
                                {t.createItemTitle}
                            </h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-themeText/70 hover:text-themeText bg-themeBg/50 hover:bg-themeBg p-2 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto">
                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-bold text-themeText/80 mb-2">{t.image}</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-20 h-20 bg-themeBg/50 rounded-lg overflow-hidden border border-themeText/15 shrink-0">
                                        {newItem.image_url ? (
                                            <img src={newItem.image_url} alt="preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-themeText/30">
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
                                            flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-themeText/20 rounded-lg cursor-pointer hover:border-themePrimary hover:text-themePrimary transition-colors text-themeText/60 font-bold text-sm bg-themeBg/50
                                            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}>
                                            <Upload size={16} />
                                            <span>{uploading ? '...' : t.upload}</span>
                                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, false)} className="hidden" disabled={uploading} />
                                        </label>
                                        <p className="text-[10px] text-themeText/40 mt-1">{t.imageHint}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-themeText/80 mb-1">{t.productName}</label>
                                <input type="text" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none" />
                            </div>

                            {/* Category & Unit Type Row */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-themeText/80 mb-1">{t.category}</label>
                                    <select 
                                        value={newItem.category} 
                                        onChange={(e) => {
                                            const cat = e.target.value as Category;
                                            let sMin = 10;
                                            let sMax = 10;
                                            if (cat === 'Salads') {
                                                sMin = 10; sMax = 10;
                                            } else if (cat === 'Main Courses') {
                                                sMin = 10; sMax = 15;
                                            }
                                            setNewItem({ ...newItem, category: cat, serves_min: sMin, serves_max: sMax });
                                        }} 
                                        className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none text-start bg-transparent"
                                    >
                                        {CATEGORY_OPTIONS.map(cat => (
                                            <option key={cat} value={cat}>{(rootT.categories as any)[cat] || cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-themeText/80 mb-1">{t.unitType}</label>
                                    <select value={newItem.unit_type} onChange={(e) => setNewItem({ ...newItem, unit_type: e.target.value as UnitType })} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none text-start bg-transparent">
                                        {UNIT_OPTIONS.map(u => (
                                            <option key={u} value={u}>{rootT[u] || u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Price & Serves Row */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-themeText/80 mb-1">{t.price} (₪)</label>
                                    <input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-themeText/80 mb-1">{t.servesMin}</label>
                                    <input type="number" value={newItem.serves_min} onChange={(e) => setNewItem({ ...newItem, serves_min: Number(e.target.value) })} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-themeText/80 mb-1">{t.servesMax}</label>
                                    <input type="number" value={newItem.serves_max} onChange={(e) => setNewItem({ ...newItem, serves_max: Number(e.target.value) })} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none" />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-themeText/80 mb-1">{t.description}</label>
                                <textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none h-20 resize-none" />
                            </div>

                            {/* Premium Toggle */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border border-themeText/20 bg-themeBg/30 rounded-lg hover:bg-themeBg/60 w-full">
                                    <input type="checkbox" checked={newItem.is_premium} onChange={(e) => setNewItem({ ...newItem, is_premium: e.target.checked })} className="w-4 h-4 text-themePrimary rounded bg-transparent border-themeText/20 focus:ring-themePrimary" />
                                    <span className="font-bold text-sm text-themeText/80">{t.premium}</span>
                                </label>
                            </div>

                            {/* Tray Toggle */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border border-themeText/20 bg-themeBg/30 rounded-lg hover:bg-themeBg/60 w-full">
                                    <input type="checkbox" checked={newItem.is_tray || false} onChange={(e) => setNewItem({ ...newItem, is_tray: e.target.checked, units_per_tray: e.target.checked ? newItem.units_per_tray : null })} className="w-4 h-4 text-themePrimary rounded bg-transparent border-themeText/20 focus:ring-themePrimary" />
                                    <span className="font-bold text-sm text-themeText/80">{t.isTray}</span>
                                </label>
                            </div>
                            {/* Units Per Tray (conditional) */}
                            {newItem.is_tray && (
                                <div>
                                    <label className="block text-sm font-bold text-themeText/80 mb-1">{t.unitsPerTray}</label>
                                    <input type="number" min="1" value={newItem.units_per_tray ?? ''} onChange={(e) => setNewItem({ ...newItem, units_per_tray: e.target.value ? Number(e.target.value) : null })} placeholder={language === 'he' ? 'לדוגמה: 10' : 'e.g. 10'} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none" />
                                </div>
                            )}

                            {/* Modifications */}
                            <div>
                                <label className="block text-sm font-bold text-themeText/80 mb-1">{t.modifications}</label>
                                <textarea value={addMods} onChange={(e) => setAddMods(e.target.value)} placeholder={t.modsPlaceholder} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none h-24" />
                                <p className="text-[10px] text-themeText/45 mt-1">{t.modsHint}</p>
                            </div>
                        </div>
                        <div className="mt-8 flex gap-3 shrink-0">
                            <button onClick={handleAddSave} className="flex-1 bg-themePrimary text-themeHeaderBg font-bold py-3 rounded-lg hover:opacity-90 flex items-center justify-center gap-2 shadow-md">
                                <Plus size={18} />{t.create}
                            </button>
                            <button onClick={() => setIsAddModalOpen(false)} className="bg-themeBg text-themeText/70 font-bold py-3 px-6 rounded-lg hover:opacity-90 border border-themeText/15">
                                {t.cancelBtn}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingItem(null)}></div>
                    <div className="relative bg-themeCardBg border border-themeText/10 w-full max-h-[85vh] h-auto md:max-w-lg rounded-2xl p-6 shadow-2xl animate-zoom-in text-start flex flex-col text-themeText">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h2 className="text-2xl font-serif font-bold text-themeText">
                                {t.editItemTitle}: {getLocalizedItem(editingItem, language).name}
                            </h2>
                            <button onClick={() => setEditingItem(null)} className="text-themeText/70 hover:text-themeText bg-themeBg/50 hover:bg-themeBg p-2 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-4 flex-1 overflow-y-auto">
                            {/* Dish Name */}
                            <div>
                                <label className="block text-sm font-bold text-themeText/80 mb-1">{t.dishName}</label>
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none" />
                            </div>
                            
                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-bold text-themeText/80 mb-2">{t.image}</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-20 h-20 bg-themeBg/50 rounded-lg overflow-hidden border border-themeText/15 shrink-0">
                                        {editImageUrl ? (
                                            <img src={editImageUrl} alt="preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-themeText/30">
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
                                            flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-themeText/20 rounded-lg cursor-pointer hover:border-themePrimary hover:text-themePrimary transition-colors text-themeText/60 font-bold text-sm bg-themeBg/50
                                            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}>
                                            <Upload size={16} />
                                            <span>{uploading ? '...' : t.upload}</span>
                                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, true)} className="hidden" disabled={uploading} />
                                        </label>
                                        <p className="text-[10px] text-themeText/40 mt-1">{t.imageHint}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Category & Unit Type Row */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-themeText/80 mb-1">{t.category}</label>
                                    <select 
                                        value={editCategory} 
                                        onChange={(e) => {
                                            const cat = e.target.value as Category;
                                            setEditCategory(cat);
                                            if (cat === 'Salads') {
                                                setEditServesMin(10);
                                                setEditServesMax(10);
                                            } else if (cat === 'Main Courses') {
                                                setEditServesMin(10);
                                                setEditServesMax(15);
                                            }
                                        }} 
                                        className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none text-start bg-transparent"
                                    >
                                        {CATEGORY_OPTIONS.map(cat => (
                                            <option key={cat} value={cat}>{(rootT.categories as any)[cat] || cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-themeText/80 mb-1">{t.unitType}</label>
                                    <select value={editUnitType} onChange={(e) => setEditUnitType(e.target.value as UnitType)} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none text-start bg-transparent">
                                        {UNIT_OPTIONS.map(u => (
                                            <option key={u} value={u}>{rootT[u] || u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Price & Serves Row */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-themeText/80 mb-1">{t.price} (₪)</label>
                                    <input type="number" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-themeText/80 mb-1">{t.servesMin}</label>
                                    <input type="number" value={editServesMin} onChange={(e) => setEditServesMin(Number(e.target.value))} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-themeText/80 mb-1">{t.servesMax}</label>
                                    <input type="number" value={editServesMax} onChange={(e) => setEditServesMax(Number(e.target.value))} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none" />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-themeText/80 mb-1">{t.description}</label>
                                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none h-20 resize-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-themeText/80 mb-1">{t.status}</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={editStatus} onChange={() => setEditStatus(true)} className="w-4 h-4 text-themePrimary" />
                                        <span>{t.inStock}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={!editStatus} onChange={() => setEditStatus(false)} className="w-4 h-4 text-red-500" />
                                        <span>{t.outOfStockLabel}</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border border-themeText/20 bg-themeBg/30 rounded-lg hover:bg-themeBg/60 w-full">
                                    <input type="checkbox" checked={editIsPremium} onChange={(e) => setEditIsPremium(e.target.checked)} className="w-4 h-4 text-themePrimary rounded bg-transparent border-themeText/20 focus:ring-themePrimary" />
                                    <span className="font-bold text-sm text-themeText/80">{t.premium}</span>
                                </label>
                            </div>

                            {/* Tray Checkbox */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border border-themeText/20 bg-themeBg/30 rounded-lg hover:bg-themeBg/60 w-full">
                                    <input type="checkbox" checked={editIsTray} onChange={(e) => { setEditIsTray(e.target.checked); if (!e.target.checked) setEditUnitsPerTray(null); }} className="w-4 h-4 text-themePrimary rounded bg-transparent border-themeText/20 focus:ring-themePrimary" />
                                    <span className="font-bold text-sm text-themeText/80">{t.isTray}</span>
                                </label>
                            </div>

                            {/* Units Per Tray */}
                            {editIsTray && (
                                <div>
                                    <label className="block text-sm font-bold text-themeText/80 mb-1">{t.unitsPerTray}</label>
                                    <input type="number" min="1" value={editUnitsPerTray ?? ''} onChange={(e) => setEditUnitsPerTray(e.target.value ? Number(e.target.value) : null)} placeholder={language === 'he' ? 'לדוגמה: 10' : 'e.g. 10'} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none" />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-themeText/80 mb-1">{t.modifications}</label>
                                <textarea value={editMods} onChange={(e) => setEditMods(e.target.value)} placeholder={t.modsPlaceholder} className="w-full p-2 border border-themeText/20 bg-themeBg/50 text-themeText rounded focus:border-themePrimary outline-none h-24" />
                            </div>
                        </div>
                        <div className="mt-8 flex flex-col gap-3 shrink-0">
                            <div className="flex gap-3">
                                <button onClick={handleEditSave} className="flex-1 bg-themePrimary text-themeHeaderBg font-bold py-3 rounded-lg hover:opacity-90 flex items-center justify-center gap-2 shadow-md"><Save size={18} />{t.save}</button>
                                <button onClick={() => setEditingItem(null)} className="flex-1 bg-themeBg text-themeText/70 font-bold py-3 px-6 rounded-lg hover:opacity-90 border border-themeText/15">{t.cancelBtn}</button>
                            </div>
                            <button
                                onClick={handleDeleteItem}
                                className="w-full bg-red-500/10 text-red-500 font-bold py-3 rounded-lg hover:bg-red-500/20 flex items-center justify-center gap-2 mt-2 transition-colors"
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
