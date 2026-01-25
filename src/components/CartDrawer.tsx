
import React, { useState, useEffect, useRef } from 'react';
import { useStore, translations, getLocalizedItem } from '../store';
import { X, ShoppingBag, Send, Minus, Plus, Trash2, Share2, Sparkles, User, MapPin, Phone, Route, Loader2, CheckCircle2, Lock, LocateFixed } from 'lucide-react';
import { useBackButton } from '../hooks/useBackButton';
import { FeedbackModal, FeedbackType } from './FeedbackModal';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

// Coordinates for Kedumim, Israel
const KEDUMIM_COORDS = {
    lat: 32.2205,
    lon: 35.1643
};

// Haversine formula to calculate distance + 25% buffer for road curvature
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return Math.round(d * 1.25); // Add 25% for road vs air distance
};

const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
};

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
    const { 
        cart, updateQuantity, cartTotal, language, clearCart, 
        customerDetails, setCustomerDetails, calculationSettings 
    } = useStore();
    const t = translations[language] || translations['he'];
    const total = cartTotal();
    
    // Handle Android/iOS Back Button
    useBackButton(isOpen, onClose);

    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
    const [detectedLocationName, setDetectedLocationName] = useState<string | null>(null);
    
    // Unified Feedback Modal State
    const [feedback, setFeedback] = useState<{
        isOpen: boolean;
        type: FeedbackType;
        title: string;
        message: string;
        isConfirm: boolean;
        onConfirm?: () => void;
        confirmText?: string;
    }>({ 
        isOpen: false, 
        type: 'info', 
        title: '', 
        message: '', 
        isConfirm: false 
    });

    const closeFeedback = () => setFeedback(prev => ({ ...prev, isOpen: false }));
    
    // Use number | null for browser setTimeout return type
    const debounceTimerRef = useRef<number | null>(null);

    const MIN_ORDER = 500;
    const FREE_DELIVERY_THRESHOLD = calculationSettings.minOrderFreeDelivery;

    // Feature 4: Location Based Delivery Logic
    const isWithinRadius = customerDetails.distanceKm > 0 && customerDetails.distanceKm <= calculationSettings.serviceRadiusKm;

    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCustomerDetails({ location: value });
        
        // Reset detection state when user types
        setDetectedLocationName(null);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (value.length > 2) {
            setIsCalculatingDistance(true);
            debounceTimerRef.current = window.setTimeout(async () => {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(value)}&limit=3&addressdetails=1&accept-language=he`);
                    const data = await response.json();

                    if (data && data.length > 0) {
                        const bestMatch = data[0];
                        const destLat = parseFloat(bestMatch.lat);
                        const destLon = parseFloat(bestMatch.lon);
                        
                        const dist = calculateDistance(KEDUMIM_COORDS.lat, KEDUMIM_COORDS.lon, destLat, destLon);
                        
                        setCustomerDetails({ distanceKm: dist });
                        const shortName = bestMatch.display_name.split(',')[0];
                        setDetectedLocationName(shortName);
                    } else {
                        setDetectedLocationName(null);
                    }
                } catch (error) {
                    console.error("Error calculating distance:", error);
                    setDetectedLocationName(null);
                } finally {
                    setIsCalculatingDistance(false);
                }
            }, 1000); 
        } else {
            setIsCalculatingDistance(false);
            setDetectedLocationName(null);
        }
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
             setFeedback({
                isOpen: true,
                type: 'warning',
                title: language === 'he' ? 'שגיאה' : 'Error',
                message: language === 'he' ? 'הדפדפן שלך אינו תומך בזיהוי מיקום GPS.' : 'Geolocation is not supported by your browser.',
                isConfirm: false
            });
            return;
        }

        setIsCalculatingDistance(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                // Calculate distance immediately
                const dist = calculateDistance(KEDUMIM_COORDS.lat, KEDUMIM_COORDS.lon, latitude, longitude);
                
                // Reverse Geocode for display name
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=he`);
                    const data = await response.json();
                    
                    let displayName = language === 'he' ? 'המיקום שלי' : 'My Location';
                    if (data && data.address) {
                        const city = data.address.city || data.address.town || data.address.village || data.address.settlement || '';
                        const road = data.address.road || '';
                        if (city && road) displayName = `${city}, ${road}`;
                        else if (city) displayName = city;
                        else if (data.display_name) displayName = data.display_name.split(',')[0];
                    }

                    setCustomerDetails({ location: displayName, distanceKm: dist });
                    setDetectedLocationName(displayName);

                } catch (error) {
                    console.error('Reverse geocoding failed', error);
                    const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                    setCustomerDetails({ 
                        location: fallback, 
                        distanceKm: dist 
                    });
                    setDetectedLocationName(language === 'he' ? 'מיקום GPS' : 'GPS Location');
                } finally {
                    setIsCalculatingDistance(false);
                }
            },
            (error) => {
                console.error('Geolocation error', error);
                setIsCalculatingDistance(false);
                let msg = language === 'he' ? 'לא ניתן לאתר את המיקום.' : 'Unable to retrieve location.';
                if (error.code === 1) msg = language === 'he' ? 'יש לאשר גישה למיקום בדפדפן.' : 'Please allow location access in your browser.';
                
                setFeedback({
                    isOpen: true,
                    type: 'error',
                    title: language === 'he' ? 'שגיאת מיקום' : 'Location Error',
                    message: msg,
                    isConfirm: false
                });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    if (!isOpen) return null;

    const handleClearCartClick = () => {
         setFeedback({
            isOpen: true,
            type: 'error',
            title: t.clearCart as string,
            message: t.clearCartConfirm as string,
            isConfirm: true,
            confirmText: language === 'he' ? 'כן, רוקן עגלה' : 'Yes, Empty Cart',
            onConfirm: performClearCart
        });
    };

    const performClearCart = () => {
        clearCart();
        closeFeedback();
    };

    const handleShareDraft = () => {
        const line = "━━━━━━━━━━━━━━━━";
        let message = language === 'he' ? `*טיוטת הזמנה מאיילה פשוט טעים (לאישורכם):* 📝\n${line}\n\n` : `*Draft order from Ayala Simply Delicious (for review):* 📝\n${line}\n\n`;
        
        cart.forEach(item => {
            const displayItem = getLocalizedItem(item, language);
            message += `🔹 *${item.quantity}x ${displayItem.name}*\n\n`;
        });
        message += `*${t.total as string}: ₪${total}*`;
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    const handleWhatsAppCheckout = () => {
        const line = "━━━━━━━━━━━━━━━━";
        let message = "";

        if (language === 'he') {
            message += `*פרטי לקוח להזמנה:* 👤\n`;
            message += `👤 שם: ${customerDetails.name}\n`;
            message += `📞 טלפון: ${customerDetails.phone}\n`;
            message += `📍 מיקום: ${customerDetails.location} ${detectedLocationName ? `(זוהה: ${detectedLocationName})` : ''}\n`;
            message += `🚗 מרחק משוער: ${customerDetails.distanceKm} ק"מ (מקדומים)\n\n`;
            message += `*היי איילה, אשמח לבצע הזמנה:* 🍽️\n${line}\n\n`;
        } else {
            message += `*Customer Details:* 👤\n`;
            message += `👤 Name: ${customerDetails.name}\n`;
            message += `📞 Phone: ${customerDetails.phone}\n`;
            message += `📍 Location: ${customerDetails.location} ${detectedLocationName ? `(Verified: ${detectedLocationName})` : ''}\n`;
            message += `🚗 Est. Distance: ${customerDetails.distanceKm} km (from Kedumim)\n\n`;
            message += `*Hi Ayala, I'd like to place an order:* 🍽️\n${line}\n\n`;
        }
        
        cart.forEach(item => {
            const displayItem = getLocalizedItem(item, language);
            message += `🔹 *${item.quantity}x ${displayItem.name}*\n`;
            
            if (item.selected_modifications && item.selected_modifications.length > 0) {
                 message += `   🔸 שינויים: ${item.selected_modifications.join(', ')}\n`;
            }
            if (item.notes) {
                message += `   ✏️ הערות: ${item.notes}\n`;
            }
            message += `\n`; 
        });

        message += `${line}\n`;
        message += `*${t.total as string}: ₪${total}* 💰`;
        
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/972547474764?text=${encoded}`, '_blank');
    };

    const getUnitName = (type: string) => {
      const units: Record<string, string> = {
        tray: t.tray as string,
        liter: t.liter as string,
        unit: t.unit as string,
        weight: t.weight as string
      };
      return units[type] || type;
    };

    const progress = Math.min((total / FREE_DELIVERY_THRESHOLD) * 100, 100);

    return (
        <>
            <div className="fixed inset-0 z-50 flex justify-end font-sans">
                <div 
                    className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" 
                    onClick={onClose}
                ></div>

                <div className={`
                    relative w-full max-w-md bg-stone-50 h-full shadow-2xl flex flex-col 
                    ${language === 'he' ? 'animate-slide-in-left' : 'animate-slide-in-right'}
                `}>
                    <div className="p-6 bg-stone-900 text-white flex items-center justify-between shadow-md z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            <ShoppingBag className="text-gold-500" />
                            <h2 className="text-xl font-serif font-bold tracking-wide">{t.myOrder as string}</h2>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {cart.length > 0 && (
                                <button 
                                    onClick={handleClearCartClick}
                                    className="text-stone-400 hover:text-red-400 transition-colors p-1"
                                    title={t.clearCart as string}
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                            <button onClick={onClose} className="hover:text-gold-500 transition hover:rotate-90 duration-200">
                                <X />
                            </button>
                        </div>
                    </div>

                    <div className="bg-stone-800 px-6 py-4 shadow-inner transition-all duration-300">
                        {isWithinRadius ? (
                            <>
                                <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-2">
                                    <span>{t.freeDeliveryAt as string} ₪{FREE_DELIVERY_THRESHOLD}</span>
                                    {total < FREE_DELIVERY_THRESHOLD ? (
                                        <span>{t.justMore as string} ₪{FREE_DELIVERY_THRESHOLD - total} {t.forVip as string}</span>
                                    ) : (
                                        <span className="text-gold-500 flex items-center gap-1"><Sparkles size={10} /> {t.vipDelivery as string}</span>
                                    )}
                                </div>
                                <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                                </div>
                            </>
                        ) : (
                            <div className="text-sm font-bold text-white flex items-center gap-2 justify-center py-2 bg-stone-700/50 rounded-lg border border-stone-600/50">
                                <MapPin size={16} className="text-gold-500" />
                                {t.deliveryByDistance as string}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-3">
                            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">{language === 'he' ? 'פרטי המשלוח' : 'Delivery Details'}</h3>
                            <div className="relative">
                                <User className="absolute right-3 top-2.5 text-stone-400" size={16} />
                                <input 
                                    type="text"
                                    value={customerDetails.name}
                                    onChange={(e) => setCustomerDetails({ name: e.target.value })}
                                    placeholder={t.customerName}
                                    className="w-full bg-stone-50 border border-stone-100 rounded-lg p-2 pr-9 text-sm focus:border-gold-500 outline-none"
                                />
                            </div>
                            <div className="relative">
                                <Phone className="absolute right-3 top-2.5 text-stone-400" size={16} />
                                <input 
                                    type="tel"
                                    value={customerDetails.phone}
                                    onChange={(e) => setCustomerDetails({ phone: e.target.value })}
                                    placeholder={t.customerPhone}
                                    className="w-full bg-stone-50 border border-stone-100 rounded-lg p-2 pr-9 text-sm focus:border-gold-500 outline-none"
                                />
                            </div>
                            <div className="relative">
                                <MapPin className="absolute right-3 top-2.5 text-stone-400" size={16} />
                                <input 
                                    type="text"
                                    value={customerDetails.location}
                                    onChange={handleLocationChange}
                                    placeholder={t.eventLocation}
                                    className={`
                                        w-full bg-stone-50 border border-stone-100 rounded-lg p-2 pr-9 pl-9 text-sm focus:border-gold-500 outline-none 
                                        ${detectedLocationName ? 'border-green-500/50 bg-green-50/50' : ''}
                                    `}
                                />
                                
                                <div className="absolute left-2 top-1.5 flex items-center">
                                    {isCalculatingDistance ? (
                                        <Loader2 className="animate-spin text-gold-500 m-1" size={16} />
                                    ) : detectedLocationName ? (
                                         <CheckCircle2 size={16} className="text-green-600 m-1 animate-fade-in" />
                                    ) : (
                                        <button 
                                            onClick={handleUseCurrentLocation}
                                            className="p-1.5 bg-stone-200 text-stone-600 rounded-full hover:bg-gold-500 hover:text-white transition-colors shadow-sm"
                                            title={language === 'he' ? 'השתמש במיקום הנוכחי' : 'Use Current Location'}
                                        >
                                            <LocateFixed size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {detectedLocationName && (
                                <div className="text-[11px] text-green-600 font-bold px-1 -mt-1 flex items-center gap-1 animate-fade-in">
                                    <span>✓ {language === 'he' ? 'זוהה:' : 'Identified:'} {detectedLocationName}</span>
                                </div>
                            )}

                            <div className="relative">
                                <Route className="absolute right-3 top-2.5 text-stone-400" size={16} />
                                <input 
                                    type="number"
                                    value={customerDetails.distanceKm || ''}
                                    onChange={(e) => setCustomerDetails({ distanceKm: Number(e.target.value) })}
                                    placeholder={t.eventDistance}
                                    disabled={!!detectedLocationName}
                                    className={`
                                        w-full bg-stone-50 border border-stone-100 rounded-lg p-2 pr-9 text-sm focus:border-gold-500 outline-none 
                                        ${isCalculatingDistance ? 'opacity-50' : ''}
                                        ${detectedLocationName ? 'text-stone-500 cursor-not-allowed bg-stone-100' : ''}
                                    `}
                                />
                                {detectedLocationName && (
                                    <div className="absolute left-3 top-2.5 text-stone-400" title="Distance Locked">
                                        <Lock size={14} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center text-stone-400 space-y-4">
                                <ShoppingBag size={64} strokeWidth={1} className="opacity-20" />
                                <div>
                                    <p className="text-lg font-medium">{t.emptyCart as string}</p>
                                </div>
                            </div>
                        ) : (
                            cart.map((item) => {
                                const localItem = getLocalizedItem(item, language);
                                return (
                                    <div key={item.id + (item.notes || '') + (item.selected_modifications?.join('') || '')} className="flex gap-4 border-b border-stone-200 pb-4 last:border-0 animate-fade-in">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-stone-800 text-lg">{localItem.name}</h4>
                                            <p className="text-sm text-stone-500 font-medium">₪{item.price} / {getUnitName(item.unit_type)}</p>
                                            
                                            {(item.selected_modifications && item.selected_modifications.length > 0) && (
                                                <div className="text-xs text-stone-500 mt-1">
                                                    {item.selected_modifications.join(', ')}
                                                </div>
                                            )}
                                            {item.notes && (
                                                <div className="text-xs text-stone-400 italic mt-0.5">
                                                    "{item.notes}"
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-3">
                                            <div className="font-bold text-stone-900 text-lg">₪{item.price * item.quantity}</div>
                                            <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-1 shadow-sm">
                                                <button 
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-8 h-8 grid place-items-center hover:bg-stone-100 rounded text-stone-600 transition"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                                                <button 
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-8 h-8 grid place-items-center hover:bg-stone-100 rounded text-stone-600 transition"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="p-4 bg-white border-t border-stone-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10 shrink-0 pb-safe">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-lg text-stone-600">{t.total as string}:</span>
                            <span className="text-3xl font-bold font-serif text-stone-900">₪{total}</span>
                        </div>
                        
                        {total < MIN_ORDER && total > 0 && (
                            <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs mb-3 border border-red-100 flex items-center justify-center gap-2">
                                <span>⚠️</span>
                                {t.minOrder as string}: ₪{MIN_ORDER}
                            </div>
                        )}

                        <div className="flex gap-3">
                            {cart.length > 0 && (
                                <button 
                                    onClick={handleShareDraft} 
                                    className="flex-1 border border-stone-200 text-stone-600 font-bold py-3.5 rounded-xl hover:bg-stone-50 transition flex items-center justify-center gap-2 text-sm"
                                >
                                    <Share2 size={16} /> 
                                    <span className="hidden sm:inline">{t.shareDraft as string}</span>
                                    <span className="sm:hidden">{language === 'he' ? 'טיוטה' : 'Draft'}</span>
                                </button>
                            )}
                            
                            <button 
                                onClick={handleWhatsAppCheckout}
                                disabled={total < MIN_ORDER || cart.length === 0 || !customerDetails.name || !customerDetails.phone}
                                className="flex-[2] bg-green-600 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 group text-sm sm:text-base"
                            >
                                <span>{t.checkout as string}</span>
                                <Send size={18} className={`transition-transform ${language === 'he' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                            </button>
                        </div>
                        
                        <p className="text-center text-[10px] text-stone-400 mt-3 font-medium">
                            {t.checkoutSub as string}
                        </p>
                    </div>
                </div>
            </div>

            <FeedbackModal
                isOpen={feedback.isOpen}
                onClose={closeFeedback}
                onConfirm={feedback.onConfirm}
                title={feedback.title}
                message={feedback.message}
                type={feedback.type}
                confirmText={feedback.confirmText}
                cancelText={language === 'he' ? 'ביטול' : 'Cancel'}
                isConfirm={feedback.isConfirm}
            />
        </>
    );
};
