
import React, { useState, useEffect, useRef } from 'react';
import { useStore, translations, getLocalizedItem } from '../store';
import { X, ShoppingBag, Send, Minus, Plus, Trash2, Share2, Sparkles, User, MapPin, Phone, Route, Loader2, CheckCircle2, Lock, LocateFixed, Tag, Truck, Calendar } from 'lucide-react';
import { useBackButton } from '../hooks/useBackButton';
import { FeedbackModal, FeedbackType } from './FeedbackModal';
import { supabase } from '../lib/supabase';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

// Coordinates for Kedumim, Israel
const KEDUMIM_COORDS = {
    lat: 32.2205,
    lon: 35.1643
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; 
    return Math.round(d * 1.25); 
};

const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
};

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
    const { 
        cart, updateQuantity, cartTotal, language, clearCart, 
        customerDetails, setCustomerDetails, calculationSettings,
        activeCoupon, validateCoupon, removeCoupon, incrementCouponUsage,
        appConfig, getDeliveryFee, eventType
    } = useStore();
    const t = translations[language] || translations['he'];
    
    // Calculate totals
    const subtotal = cartTotal();
    let discountAmount = 0;
    if (activeCoupon) {
        if (activeCoupon.discount_type === 'percentage') {
            discountAmount = subtotal * (activeCoupon.discount_value / 100);
        } else {
            discountAmount = activeCoupon.discount_value;
        }
    }
    
    const [isDelivery, setIsDelivery] = useState(true);
    const [wantsSetup, setWantsSetup] = useState(false);
    const [eventDate, setEventDate] = useState('');
    
    const deliveryFee = isDelivery ? getDeliveryFee(customerDetails.distanceKm, subtotal) : 0;
    const setupFee = wantsSetup ? 1000 : 0;
    const finalTotal = Math.max(0, subtotal - discountAmount + deliveryFee + setupFee);

    useBackButton(isOpen, onClose);

    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [detectedLocationName, setDetectedLocationName] = useState<string | null>(null);
    const [couponInput, setCouponInput] = useState('');
    const [lastSubmittedOrderId, setLastSubmittedOrderId] = useState<string | null>(null);
    const [lastCartSignature, setLastCartSignature] = useState<string | null>(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    
    const resolvedEventType = eventType === 'basic' ? t.basicEvent : eventType === 'plus' ? t.plusEvent : t.premiumEvent;
    
    const getMinDateString = () => {
        const minDate = new Date();
        const leadTimeHours = appConfig.lead_time_hours || 48;
        minDate.setHours(minDate.getHours() + leadTimeHours);
        return minDate.toISOString().split('T')[0];
    };
    
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
    const debounceTimerRef = useRef<number | null>(null);
    const MIN_ORDER = appConfig.min_order_price;
    const FREE_DELIVERY_THRESHOLD = calculationSettings.minOrderFreeDelivery;
    const isWithinRadius = isDelivery && customerDetails.distanceKm > 0 && customerDetails.distanceKm <= calculationSettings.serviceRadiusKm;

    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) return;
        setIsValidatingCoupon(true);
        const isValid = await validateCoupon(couponInput.trim());
        setIsValidatingCoupon(false);
        
        if (isValid) {
            setCouponInput('');
        } else {
            setFeedback({
                isOpen: true,
                type: 'error',
                title: t.couponInvalid as string,
                message: language === 'he' ? 'הקופון שגוי או שהגיע למכסת השימוש המקסימלית.' : 'Invalid code or usage limit reached.',
                isConfirm: false
            });
        }
    };

    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCustomerDetails({ location: value });
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
                const dist = calculateDistance(KEDUMIM_COORDS.lat, KEDUMIM_COORDS.lon, latitude, longitude);
                
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
        let message = "";
        
        if (appConfig.ecommerce_mode) {
            message = language === 'he' ? `*טיוטת הזמנה מאיילה פשוט טעים (לאישורכם):* 📝\n${line}\n\n` : `*Draft order from Ayala Simply Delicious (for review):* 📝\n${line}\n\n`;
            cart.forEach(item => {
                const displayItem = getLocalizedItem(item, language);
                message += `🔹 *${item.quantity}x ${displayItem.name}* (₪${item.price * item.quantity})\n\n`;
            });

            if (wantsSetup) {
                message += `✨ ${language === 'he' ? 'שירותי עריכה ופינוי' : 'Setup & Cleanup Services'}: ₪1000\n\n`;
            }

            message += `*${t.total as string}: ₪${finalTotal}*`;
        } else {
            message = language === 'he' ? `*טיוטת בקשת הצעת מחיר מאיילה פשוט טעים:* 📝\n${line}\n\n` : `*Draft quote request from Ayala Simply Delicious:* 📝\n${line}\n\n`;
            cart.forEach(item => {
                const displayItem = getLocalizedItem(item, language);
                message += `🔹 *${item.quantity}x ${displayItem.name}*\n\n`;
            });
            if (wantsSetup) {
                message += `✨ ${language === 'he' ? 'מעוניין בשירותי עריכה ופינוי' : 'Interested in Setup & Cleanup Services'} ✅\n\n`;
            }
        }

        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    const proceedToWhatsApp = (
        orderId: string | undefined,
        subtotal: number,
        discountAmount: number,
        deliveryFee: number,
        finalTotal: number
    ) => {
        const line = "━━━━━━━━━━━━━━━━";
        let message = "";

        if (language === 'he') {
            if (appConfig.ecommerce_mode) {
                message += `*פרטי לקוח להזמנה #${orderId || 'NEW'}:* 👤\n`;
            } else {
                message += `*פרטי לקוח לבקשת הצעת מחיר #${orderId || 'NEW'}:* 👤\n`;
            }
            message += `👤 שם: ${customerDetails.name}\n`;
            message += `📞 טלפון: ${customerDetails.phone}\n`;
            message += `📅 תאריך אירוע: ${eventDate ? new Date(eventDate).toLocaleDateString('he-IL') : ''}\n`;
            message += `🎉 סוג אירוע: ${resolvedEventType}\n`;
            if (isDelivery) {
                message += `📍 מיקום: ${customerDetails.location} ${detectedLocationName ? `(זוהה: ${detectedLocationName})` : ''}\n`;
                message += `🚗 מרחק משוער: ${customerDetails.distanceKm} ק"מ (מקדומים)\n`;
            } else {
                message += `📍 אופן קבלה: איסוף עצמי ממקדומים 🚗\n`;
            }
            message += `✨ שירותי עריכה ופינוי: ${wantsSetup ? 'כן (בתיאום מראש) ✅' : 'לא ❌'}\n\n`;
            
            if (appConfig.ecommerce_mode) {
                message += `*היי איילה, אשמח לבצע הזמנה:* 🍽️\n${line}\n\n`;
            } else {
                message += `*היי איילה, אשמח לקבל הצעת מחיר לפריטים הבאים:* 🍽️\n${line}\n\n`;
            }
        } else {
            message += `*Customer Details #${orderId || 'NEW'}:* 👤\n`;
            message += `👤 Name: ${customerDetails.name}\n`;
            message += `📞 Phone: ${customerDetails.phone}\n`;
            message += `📅 Event Date: ${eventDate ? new Date(eventDate).toLocaleDateString('en-US') : ''}\n`;
            message += `🎉 Event Type: ${resolvedEventType}\n`;
            if (isDelivery) {
                message += `📍 Location: ${customerDetails.location} ${detectedLocationName ? `(Verified: ${detectedLocationName})` : ''}\n`;
                message += `🚗 Est. Distance: ${customerDetails.distanceKm} km (from Kedumim)\n`;
            } else {
                message += `📍 Option: Self Pickup from Kedumim 🚗\n`;
            }
            message += `✨ Setup & Cleanup Service: ${wantsSetup ? 'Yes, interested ✅' : 'No ❌'}\n\n`;
            
            if (appConfig.ecommerce_mode) {
                message += `*Hi Ayala, I'd like to place an order:* 🍽️\n${line}\n\n`;
            } else {
                message += `*Hi Ayala, I'd like to request a quote for the following:* 🍽️\n${line}\n\n`;
            }
        }
        
        cart.forEach(item => {
            const displayItem = getLocalizedItem(item, language);
            if (appConfig.ecommerce_mode) {
                const itemTotal = item.price * item.quantity;
                message += `🔹 *${item.quantity}x ${displayItem.name}* (₪${itemTotal})\n`;
            } else {
                message += `🔹 *${item.quantity}x ${displayItem.name}*\n`;
            }
            
            if (item.is_tray && item.units_per_tray) {
                message += `   📦 ${language === 'he' ? `${item.units_per_tray} יחידות במגש` : `${item.units_per_tray} units per tray`}\n`;
            }

            if (item.selected_modifications && item.selected_modifications.length > 0) {
                message += `   🔸 שינויים: ${item.selected_modifications.join(', ')}\n`;
            }
            if (item.notes) {
                message += `   ✏️ הערות: ${item.notes}\n`;
            }
            message += `\n`; 
        });

        message += `${line}\n`;
        
        if (appConfig.ecommerce_mode) {
            // Financial Summary
            message += `${t.subtotal as string}: ₪${subtotal}\n`;
            
            if (discountAmount > 0) {
                message += `🏷️ ${t.discount as string} (${activeCoupon?.code}): -₪${discountAmount}\n`;
            }
            
            if (isDelivery && deliveryFee > 0) {
                message += `🚚 ${t.delivery as string} (${customerDetails.distanceKm}km): ₪${deliveryFee}\n`;
            } else if (isDelivery && customerDetails.distanceKm > 0 && subtotal >= FREE_DELIVERY_THRESHOLD) {
                message += `🚚 ${t.delivery as string}: ${language === 'he' ? 'חינם (הזמנה גדולה)' : 'Free (Large Order)'}\n`;
            } else if (!isDelivery) {
                message += `🚚 ${t.delivery as string}: ${language === 'he' ? 'איסוף עצמי (₪0)' : 'Self Pickup (NIS 0)'}\n`;
            }

            if (wantsSetup) {
                message += `✨ ${language === 'he' ? 'שירותי עריכה ופינוי: ₪1000' : 'Setup & Cleanup: ₪1000'}\n`;
            }

            message += `*${t.finalTotal as string}: ₪${finalTotal}* 💰`;
        } else {
            message += `📝 ${language === 'he' ? 'הבקשה נשלחה בהצלחה וממתינה לתמחור מותאם אישית מאיילה.' : 'Request sent successfully and is pending a custom quote from Ayala.'}`;
        }
        
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/972547474764?text=${encoded}`, '_blank');
    };

    const sendEmailNotification = (orderId: string | undefined, customer: any, items: any[], total: number) => {
        try {
            const itemSummary = items.map(i => `${i.quantity}x ${i.name}`).join(', ');
            fetch('https://formsubmit.co/ajax/info@ayala-catering.co.il', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    _subject: `הזמנה חדשה שנכנסה באתר #${orderId || 'NEW'} - ${customer.name}`,
                    customer_name: customer.name,
                    customer_phone: customer.phone,
                    order_id: orderId,
                    items: itemSummary,
                    total_price: total
                })
            }).catch(err => console.warn("Email alert fetch catch:", err));
        } catch (e) {
            console.warn("Could not trigger email notification:", e);
        }
    };

    const handleWhatsAppCheckout = async () => {
        // Prevent double submission
        if (isSubmitting) return;
        setIsSubmitting(true);

        const currentSignature = JSON.stringify({
            items: cart.map(i => ({ id: i.id, q: i.quantity, notes: i.notes || '', mods: i.selected_modifications || [] })),
            phone: customerDetails.phone,
            name: customerDetails.name,
            date: eventDate,
            setup: wantsSetup,
            delivery: isDelivery
        });

        // 0. Check if this exact cart session has already been saved to DB
        if (lastSubmittedOrderId && lastCartSignature === currentSignature) {
            const partialId = lastSubmittedOrderId.slice(0, 8);
            proceedToWhatsApp(partialId, subtotal, discountAmount, deliveryFee, finalTotal);
            setFeedback({
                isOpen: true,
                type: 'success',
                title: language === 'he' ? 'הבקשה כבר נקלטה במערכת' : 'Request Already Saved',
                message: language === 'he'
                    ? `בקשתך להצעת מחיר (מס' #${partialId}) כבר שמורה במערכת הניהול. החלון לוואטסאפ נפתח מחדש.`
                    : `Your quote request (#${partialId}) is already saved. Opening WhatsApp again.`,
                isConfirm: false
            });
            setIsSubmitting(false);
            return;
        }

        try {
            // 1. If coupon exists, re-validate and increment (only in E-Commerce mode)
            if (appConfig.ecommerce_mode && activeCoupon) {
                const isValid = await validateCoupon(activeCoupon.code);
                if (!isValid) {
                     setFeedback({
                        isOpen: true,
                        type: 'error',
                        title: t.couponInvalid as string,
                        message: language === 'he' ? 'הקופון פג תוקף רגע לפני ההזמנה.' : 'Coupon expired just now.',
                        isConfirm: false
                    });
                    setIsSubmitting(false);
                    return;
                }
                // Increment Usage safely via RPC
                await incrementCouponUsage(activeCoupon.code);
            }

            // 2. Save Order to Database
            const orderData: any = {
                customer_name: customerDetails.name,
                customer_phone: customerDetails.phone,
                event_date: eventDate ? new Date(eventDate).toISOString() : new Date().toISOString(),
                total_price: finalTotal,
                subtotal: subtotal,
                discount_amount: discountAmount,
                delivery_fee: deliveryFee,
                coupon_code: activeCoupon ? activeCoupon.code : null,
                items: cart.map(i => ({ ...i, price: i.price || 0 })),
                status: 'pending', // It remains pending until manual approval
                event_type: resolvedEventType,
                wants_setup: wantsSetup
            };

            let { error, data } = await supabase.from('orders').insert([orderData]).select('id');

            // Fallback if event_type or wants_setup columns do not exist in backend database
            if (error && error.code === '42703') {
                console.warn("event_type/wants_setup columns missing in Supabase schema, retrying fallback insert...");
                const { event_type, wants_setup, ...fallbackOrderData } = orderData;
                let extraInfo = `(${resolvedEventType})`;
                if (wantsSetup) {
                    extraInfo += ` (עם סידור)`;
                }
                fallbackOrderData.customer_name = `${customerDetails.name} ${extraInfo}`;
                
                const retry = await supabase.from('orders').insert([fallbackOrderData]).select('id');
                error = retry.error;
                data = retry.data;
            }

            if (error) {
                console.error("Failed to save order:", error);
                setFeedback({
                    isOpen: true,
                    type: 'warning',
                    title: language === 'he' ? 'שגיאה בשמירת ההזמנה במערכת' : 'Order Database Save Error',
                    message: language === 'he' 
                        ? `ההזמנה תישלח לוואטסאפ של איילה, אך שים לב שהיא לא נשמרה במערכת הניהול בגלל השגיאה הבאה:\n"${error.message || error.details || 'שגיאה לא ידועה'}"\n\nתרצה להמשיך בשליחה לוואטסאפ?`
                        : `The order will be sent to WhatsApp, but it could not be saved to the database due to the following error:\n"${error.message || error.details || 'Unknown error'}"\n\nDo you want to continue to WhatsApp anyway?`,
                    isConfirm: true,
                    confirmText: language === 'he' ? 'כן, המשך לוואטסאפ' : 'Yes, continue to WhatsApp',
                    onConfirm: () => {
                        closeFeedback();
                        proceedToWhatsApp(undefined, subtotal, discountAmount, deliveryFee, finalTotal);
                    }
                });
                setIsSubmitting(false);
                return;
            }

            const fullOrderId = data?.[0]?.id;
            const orderId = fullOrderId?.slice(0, 8); // Get partial ID for reference

            // Lock order duplication for this cart state
            setLastSubmittedOrderId(fullOrderId || orderId || 'submitted');
            setLastCartSignature(currentSignature);

            // Send email notification in background
            sendEmailNotification(orderId, customerDetails, cart, finalTotal);

            proceedToWhatsApp(orderId, subtotal, discountAmount, deliveryFee, finalTotal);

            setFeedback({
                isOpen: true,
                type: 'success',
                title: language === 'he' ? 'הבקשה נקלטה בהצלחה! 🎉' : 'Request Saved Successfully! 🎉',
                message: language === 'he'
                    ? `בקשתך להצעת מחיר מס' #${orderId} נקלטה במערכת ונפתחה בחלון הוואטסאפ.`
                    : `Quote request #${orderId} has been saved and opened in WhatsApp.`,
                isConfirm: false
            });

            setIsSubmitting(false);
        } catch (err: any) {
            console.error("Unexpected error process checkout:", err);
            setFeedback({
                isOpen: true,
                type: 'error',
                title: language === 'he' ? 'שגיאה בלתי צפויה' : 'Unexpected Error',
                message: err?.message || 'Error occurred',
                isConfirm: false
            });
            setIsSubmitting(false);
        }
    };

    const getMissingRequirements = (): string[] => {
        const missing: string[] = [];
        if (cart.length === 0) {
            missing.push(language === 'he' ? 'חובה להוסיף פריטים לעגלה' : 'Cart is empty');
        }
        if (!customerDetails.name || !customerDetails.name.trim()) {
            missing.push(language === 'he' ? 'חובה להזין שם מלא' : 'Full name is required');
        }
        if (!customerDetails.phone || !customerDetails.phone.trim()) {
            missing.push(language === 'he' ? 'חובה להזין מספר טלפון' : 'Phone number is required');
        }
        if (!eventDate) {
            missing.push(language === 'he' ? 'חובה להזין תאריך לאירוע' : 'Event date is required');
        }
        if (isDelivery && (!customerDetails.location || !customerDetails.location.trim())) {
            missing.push(language === 'he' ? 'חובה להזין מיקום / כתובת לאירוע' : 'Event location is required');
        }
        if (appConfig.ecommerce_mode && subtotal < MIN_ORDER && subtotal > 0) {
            missing.push(language === 'he' ? `מינימום הזמנה הוא ₪${MIN_ORDER}` : `Minimum order is ₪${MIN_ORDER}`);
        }
        return missing;
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

    const progress = Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100);

    return (
        <>
            <div className="fixed inset-0 z-[180] flex justify-end font-sans">
                <div 
                    className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" 
                    onClick={onClose}
                ></div>

                <div className={`
                    relative w-full max-w-md bg-themeBg h-full shadow-2xl flex flex-col 
                    ${language === 'he' ? 'animate-slide-in-left' : 'animate-slide-in-right'}
                `}>
                    <div className="p-6 bg-themeHeaderBg text-themeHeaderTxt flex items-center justify-between shadow-md z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            <ShoppingBag className="text-themePrimary" />
                            <h2 className="text-xl font-serif font-bold tracking-wide">{t.myOrder as string}</h2>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {cart.length > 0 && (
                                <button 
                                    onClick={handleClearCartClick}
                                    className="text-themeHeaderTxt/60 hover:text-red-400 transition-colors p-1"
                                    title={t.clearCart as string}
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                            <button onClick={onClose} className="hover:text-themePrimary text-themeHeaderTxt transition hover:rotate-90 duration-200">
                                <X />
                            </button>
                        </div>
                    </div>

                    {appConfig.ecommerce_mode && (
                        <div className="bg-themeHeaderBg/90 px-6 py-4 shadow-inner transition-all duration-300">
                            {isWithinRadius ? (
                                <>
                                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-themeHeaderTxt/60 mb-2">
                                        <span>{t.freeDeliveryAt as string} ₪{FREE_DELIVERY_THRESHOLD}</span>
                                        {subtotal < FREE_DELIVERY_THRESHOLD ? (
                                            <span>{t.justMore as string} ₪{FREE_DELIVERY_THRESHOLD - subtotal} {t.forVip as string}</span>
                                        ) : (
                                            <span className="text-themePrimary flex items-center gap-1"><Sparkles size={10} /> {t.vipDelivery as string}</span>
                                        )}
                                    </div>
                                    <div className="h-2 bg-themeHeaderBg/50 rounded-full overflow-hidden">
                                        <div className="h-full bg-themePrimary transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-sm font-bold text-themeHeaderTxt flex items-center gap-2 justify-center py-2 bg-themeHeaderBg/50 rounded-lg border border-themeHeaderTxt/10">
                                    <MapPin size={16} className="text-themePrimary" />
                                    {t.deliveryByDistance as string}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-themeBg text-themeText">
                        <div className="bg-themeCardBg p-4 rounded-xl border border-themeText/10 shadow-sm space-y-3">
                            <h3 className="text-xs font-bold text-themeText/50 uppercase tracking-widest mb-1">{language === 'he' ? 'פרטי הזמנה ומשלוח' : 'Order & Delivery Details'}</h3>
                            
                            {/* Delivery Options */}
                            <div className="flex gap-2 p-1 bg-themeBg rounded-lg border border-themeText/10">
                                <button
                                    type="button"
                                    onClick={() => setIsDelivery(true)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${isDelivery ? 'bg-themeHeaderBg text-themePrimary shadow-sm' : 'text-themeText/60 hover:text-themeText'}`}
                                >
                                    {language === 'he' ? 'משלוח לכתובת' : 'Delivery'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsDelivery(false)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${!isDelivery ? 'bg-themeHeaderBg text-themePrimary shadow-sm' : 'text-themeText/60 hover:text-themeText'}`}
                                >
                                    {language === 'he' ? 'איסוף עצמי' : 'Self Pickup'}
                                </button>
                            </div>

                            <div className="relative">
                                <User className="absolute right-3 top-2.5 text-themeText/40" size={16} />
                                <input 
                                    type="text"
                                    value={customerDetails.name}
                                    onChange={(e) => setCustomerDetails({ name: e.target.value })}
                                    placeholder={t.customerName}
                                    className="w-full bg-themeBg border border-themeText/10 rounded-lg p-2 pr-9 text-sm focus:border-themePrimary outline-none text-themeText"
                                />
                            </div>
                            
                            <div className="relative">
                                <Phone className="absolute right-3 top-2.5 text-themeText/40" size={16} />
                                <input 
                                    type="tel"
                                    value={customerDetails.phone}
                                    onChange={(e) => setCustomerDetails({ phone: e.target.value })}
                                    placeholder={t.customerPhone}
                                    className="w-full bg-themeBg border border-themeText/10 rounded-lg p-2 pr-9 text-sm focus:border-themePrimary outline-none text-themeText"
                                />
                            </div>

                            {/* Event Date Picker */}
                            <div className="relative flex flex-col gap-1.5">
                                <label className="text-[10px] text-themeText/60 font-bold px-1 select-none flex items-center gap-1">
                                    <Calendar size={12} className="text-themePrimary" />
                                    {language === 'he' ? 'תאריך האירוע *' : 'Event Date *'}
                                </label>
                                <input 
                                    type="date"
                                    value={eventDate}
                                    min={getMinDateString()}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    required
                                    className="w-full bg-themeBg border border-themeText/10 rounded-lg p-2 text-sm focus:border-themePrimary outline-none text-themeText font-sans"
                                />
                            </div>

                            {isDelivery && (
                                <>
                                    <div className="relative">
                                        <MapPin className="absolute right-3 top-2.5 text-themeText/40" size={16} />
                                        <input 
                                            type="text"
                                            value={customerDetails.location}
                                            onChange={handleLocationChange}
                                            placeholder={t.eventLocation}
                                            className={`
                                                w-full bg-themeBg border border-themeText/10 rounded-lg p-2 pr-9 pl-9 text-sm focus:border-themePrimary outline-none text-themeText
                                                ${detectedLocationName ? 'border-green-500/50 bg-green-50/10' : ''}
                                            `}
                                        />
                                        <div className="absolute left-2 top-1.5 flex items-center">
                                            {isCalculatingDistance ? (
                                                <Loader2 className="animate-spin text-themePrimary m-1" size={16} />
                                            ) : detectedLocationName ? (
                                                 <CheckCircle2 size={16} className="text-green-600 m-1 animate-fade-in" />
                                            ) : (
                                                <button 
                                                    onClick={handleUseCurrentLocation}
                                                    type="button"
                                                    className="p-1.5 bg-themeBg border border-themeText/10 text-themeText rounded-full hover:bg-themePrimary hover:text-themeHeaderBg transition-colors shadow-sm"
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
                                        <Route className="absolute right-3 top-2.5 text-themeText/40" size={16} />
                                        <input 
                                            type="number"
                                            value={customerDetails.distanceKm || ''}
                                            onChange={(e) => setCustomerDetails({ distanceKm: Number(e.target.value) })}
                                            placeholder={t.eventDistance}
                                            disabled={!!detectedLocationName}
                                            className={`
                                                w-full bg-themeBg border border-themeText/10 rounded-lg p-2 pr-9 text-sm focus:border-themePrimary outline-none text-themeText
                                                ${isCalculatingDistance ? 'opacity-50' : ''}
                                                ${detectedLocationName ? 'text-themeText/50 cursor-not-allowed bg-themeBg/70' : ''}
                                            `}
                                        />
                                        {detectedLocationName && (
                                            <div className="absolute left-3 top-2.5 text-themeText/40" title="Distance Locked">
                                                <Lock size={14} />
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Setup & Cleanup services option */}
                            <label className="flex items-center gap-3 p-2.5 border border-themeText/10 rounded-lg cursor-pointer hover:bg-themeBg/30 transition-colors w-full mt-2">
                                <input
                                    type="checkbox"
                                    checked={wantsSetup}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        if (checked) {
                                            setFeedback({
                                                isOpen: true,
                                                type: 'info',
                                                title: language === 'he' ? 'תוספת שירותי עריכה ופינוי' : 'Add Setup & Cleanup Services',
                                                message: language === 'he'
                                                    ? (calculationSettings?.setupServiceDetailsHe || `✨ שירות עריכה ופינוי מקצועי לאירוע ללא דאגות ✨\n\nהשירות כולל:\n• 👩‍🍳 שעה של איילה בתחילת האירוע לארגון וסידור הבופה והסלטים בצורה מרהיבה.\n• 👥 שתי עובדות מקצועיות שילוו את האירוע שלכם (5 שעות עבודה לכל אחת).\n• 🍽️ עריכת השולחנות והבופה, הגשה ונוכחות מלאה במהלך האירוע.\n• 🧹 פינוי וניקיון מלא בסיום האירוע.\n\n💵 עלות השירות: תוספת של ₪1,000 למחיר הכולל.\n*(בתיאום מראש בלבד)*`)
                                                    : (calculationSettings?.setupServiceDetailsEn || `✨ Professional Setup & Cleanup Service ✨\n\nThe service includes:\n• 👩‍🍳 1 hour of Ayala's personal setup at the beginning to arrange the buffet and salads beautifully.\n• 👥 Two professional staff members hosting your event (5 hours of work each).\n• 🍽️ Setting tables and buffet, serving, and full presence during the event.\n• 🧹 Complete clearing and cleanup at the end.\n\n💵 Service Fee: An additional ₪1,000 to the total price.\n*(Coordinated in advance)*`),
                                                isConfirm: true,
                                                confirmText: language === 'he' ? 'הוסף שירות' : 'Add Service',
                                                onConfirm: () => {
                                                    setWantsSetup(true);
                                                    closeFeedback();
                                                }
                                            });
                                        } else {
                                            setWantsSetup(false);
                                        }
                                    }}
                                    className="w-4 h-4 text-themePrimary rounded accent-themePrimary focus:ring-themePrimary"
                                />
                                <div className="text-start flex-1">
                                    <div className="flex justify-between items-center w-full">
                                        <span className="font-bold text-xs text-themeText">
                                            {language === 'he' ? 'תוספת שירותי עריכה ופינוי' : 'Add Setup & Cleanup Services'}
                                        </span>
                                        {appConfig.ecommerce_mode && <span className="text-themePrimary font-bold text-xs">₪1,000</span>}
                                    </div>
                                    <span className="text-[10px] text-themeText/60 block leading-tight mt-0.5">
                                        {language === 'he' ? 'שירות מקצועי לאירוע ללא דאגות (בתיאום מראש)' : 'Professional setup and cleanup (coordinated in advance)'}
                                    </span>
                                </div>
                            </label>
                        </div>

                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center text-themeText/40 space-y-4">
                                <ShoppingBag size={64} strokeWidth={1} className="opacity-20" />
                                <div>
                                    <p className="text-lg font-medium">{t.emptyCart as string}</p>
                                </div>
                            </div>
                        ) : (
                            cart.map((item) => {
                                const localItem = getLocalizedItem(item, language);
                                return (
                                    <div key={item.id + (item.notes || '') + (item.selected_modifications?.join('') || '')} className="flex gap-4 border-b border-themeText/10 pb-4 last:border-0 animate-fade-in">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-themeText text-lg">{localItem.name}</h4>
                                            {appConfig.ecommerce_mode && (
                                                <p className="text-sm text-themeText/70 font-medium">₪{item.price} / {getUnitName(item.unit_type)}</p>
                                            )}
                                            {item.is_tray && item.units_per_tray && (
                                                <p className="text-xs text-themePrimary font-bold mt-0.5">
                                                    {language === 'he' ? `${item.units_per_tray} יחידות במגש` : `${item.units_per_tray} units per tray`}
                                                </p>
                                            )}
                                            
                                            {(item.selected_modifications && item.selected_modifications.length > 0) && (
                                                <div className="text-xs text-themeText/70 mt-1">
                                                    {item.selected_modifications.join(', ')}
                                                </div>
                                            )}
                                            {item.notes && (
                                                <div className="text-xs text-themeText/50 italic mt-0.5">
                                                    "{item.notes}"
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col items-end gap-3">
                                            {appConfig.ecommerce_mode && (
                                                <div className="font-bold text-themeText text-lg">₪{item.price * item.quantity}</div>
                                            )}
                                            <div className="flex items-center gap-1 bg-themeCardBg border border-themeText/15 rounded-lg p-1 shadow-sm">
                                                <button 
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-8 h-8 grid place-items-center hover:bg-themeBg/20 rounded text-themeText transition"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="text-sm font-bold w-6 text-center text-themeText">{item.quantity}</span>
                                                <button 
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-8 h-8 grid place-items-center hover:bg-themeBg/20 rounded text-themeText transition"
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

                    <div className="p-4 bg-themeCardBg border-t border-themeText/15 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10 shrink-0 pb-safe text-themeCardTxt">
                        {/* Coupon Section */}
                        {cart.length > 0 && appConfig.ecommerce_mode && (
                             <div className="mb-4 bg-themeBg/50 p-3 rounded-xl border border-themeText/15">
                                {activeCoupon ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-green-600 font-bold">
                                            <Tag size={16} />
                                            <span>{t.couponApplied as string} ({activeCoupon.code})</span>
                                        </div>
                                        <button onClick={removeCoupon} className="text-xs text-red-500 hover:underline font-bold">{t.removeCoupon as string}</button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={couponInput}
                                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                            placeholder={t.couponCode as string}
                                            className="flex-1 bg-themeBg border border-themeText/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-themePrimary text-themeText uppercase"
                                        />
                                        <button 
                                            onClick={handleApplyCoupon}
                                            disabled={!couponInput || isValidatingCoupon}
                                            className="bg-themePrimary text-themeHeaderTxt px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50"
                                        >
                                            {isValidatingCoupon ? <Loader2 size={16} className="animate-spin" /> : (t.applyCoupon as string)}
                                        </button>
                                    </div>
                                )}
                             </div>
                        )}

                        {appConfig.ecommerce_mode && (
                            <div className="space-y-1 mb-4">
                                <div className="flex justify-between items-center text-sm text-themeCardTxt/70">
                                    <span>{t.subtotal as string}:</span>
                                    <span>₪{subtotal}</span>
                                </div>

                                {activeCoupon && (
                                    <div className="flex justify-between items-center text-sm text-green-600 font-bold">
                                        <span>{t.discount as string}:</span>
                                        <span>-₪{discountAmount.toFixed(0)}</span>
                                    </div>
                                )}

                                {deliveryFee > 0 && (
                                    <div className="flex justify-between items-center text-sm text-themeCardTxt/80 font-bold">
                                        <span className="flex items-center gap-1"><Truck size={12}/> {t.delivery as string}:</span>
                                        <span>₪{deliveryFee}</span>
                                    </div>
                                )}

                                {wantsSetup && (
                                    <div className="flex justify-between items-center text-sm text-themeCardTxt/80 font-bold">
                                        <span>{language === 'he' ? 'שירותי עריכה ופינוי:' : 'Setup & Cleanup Services:'}</span>
                                        <span>₪1,000</span>
                                    </div>
                                )}

                                <div className="border-t border-themeText/10 my-1"></div>
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-lg text-themeCardTxt/80">{t.finalTotal as string}:</span>
                                    <span className="text-3xl font-bold font-serif text-themeCardTxt">₪{finalTotal}</span>
                                </div>
                            </div>
                        )}
                        
                        {(() => {
                            const missingReqs = getMissingRequirements();
                            const isCheckoutDisabled = missingReqs.length > 0 || isSubmitting;
                            return (
                                <>
                                    {missingReqs.length > 0 && cart.length > 0 && (
                                        <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs animate-fade-in font-medium text-right">
                                            <div className="font-bold mb-1 flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                                                <span>⚠️</span>
                                                <span>{language === 'he' ? 'להמשך לשליחה, נא להשלים את הפרטים הבאים:' : 'To proceed, please complete:'}</span>
                                            </div>
                                            <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                                                {missingReqs.map((req, idx) => (
                                                    <li key={idx}>{req}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        {cart.length > 0 && (
                                            <button 
                                                onClick={handleShareDraft} 
                                                className="flex-1 border border-themeText/20 text-themeCardTxt font-bold py-3.5 rounded-xl hover:bg-themeBg/20 transition flex items-center justify-center gap-2 text-sm"
                                            >
                                                <Share2 size={16} /> 
                                                <span className="hidden sm:inline">{t.shareDraft as string}</span>
                                                <span className="sm:hidden">{language === 'he' ? 'טיוטה' : 'Draft'}</span>
                                            </button>
                                        )}
                                        
                                        <div className="relative group/btn flex-[2]">
                                            {missingReqs.length > 0 && (
                                                <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 hidden group-hover/btn:block z-50 w-64 p-3 bg-stone-900 text-white text-xs rounded-xl shadow-2xl border border-amber-500/40 pointer-events-none text-right font-sans animate-fade-in">
                                                    <p className="font-bold text-amber-400 mb-1">
                                                        {language === 'he' ? 'חובה להשלים לפני השליחה:' : 'Required before sending:'}
                                                    </p>
                                                    {missingReqs.map((req, idx) => (
                                                        <p key={idx} className="text-[11px] text-stone-200 font-medium">• {req}</p>
                                                    ))}
                                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900 rotate-45 border-r border-b border-amber-500/40"></div>
                                                </div>
                                            )}

                                            <button 
                                                onClick={handleWhatsAppCheckout}
                                                disabled={isCheckoutDisabled}
                                                title={missingReqs.length > 0 ? (language === 'he' ? `חובה להשלים:\n• ${missingReqs.join('\n• ')}` : missingReqs.join('\n')) : undefined}
                                                className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 group text-sm sm:text-base"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="animate-spin" size={18} />
                                                ) : (
                                                    <>
                                                        <span>
                                                            {appConfig.ecommerce_mode 
                                                                ? (t.checkout as string) 
                                                                : (language === 'he' ? "שליחת בקשה להצעת מחיר מאיילה" : "Send quote request to Ayala")}
                                                        </span>
                                                        <Send size={18} className={`transition-transform ${language === 'he' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                        
                        <p className="text-center text-[10px] text-themeCardTxt/50 mt-3 font-medium">
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
