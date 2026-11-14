import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  useStore,
  translations,
  getLocalizedItem,
} from '../store';
import {
  X,
  ShoppingBag,
  Send,
  Minus,
  Plus,
  Trash2,
  Share2,
  Sparkles,
  User,
  MapPin,
  Phone,
  Route,
  Loader2,
  CheckCircle2,
  Lock,
  LocateFixed,
  Tag,
  Truck,
  Calendar,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Printer,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { useBackButton } from '../hooks/useBackButton';
import { FeedbackModal, FeedbackType } from './FeedbackModal';
import { api, ApiError } from '../lib/api';
import {
  validateQuoteRequest,
  type LocalizedError,
  type QuoteRequestInput,
} from '../../shared/validation';
import {
  DIETARY_DISCLAIMER,
  QUOTE_MODE_JOURNEY,
} from '../../shared/config';
import type { EventType, NotificationStatus } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Reference coordinates for Kedumim area distance estimation
const KEDUMIM_COORDS = {
  lat: 32.2205,
  lon: 35.1643,
};

const deg2rad = (deg: number) => deg * (Math.PI / 180);

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0, Math.round(R * c * 1.25));
};

interface SubmittedQuoteReceipt {
  referenceCode: string;
  quoteUrl: string;
  notificationStatus: NotificationStatus;
  deduplicated: boolean;
  whatsappHref: string;
  whatsappMessage: string;
  whatsappOpened: boolean;
  copiedText: boolean;
  copiedLink: boolean;
  deliveryMethod: 'pickup' | 'delivery';
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const {
    cart,
    updateQuantity,
    cartTotal,
    language,
    clearCart,
    customerDetails,
    setCustomerDetails,
    calculationSettings,
    activeCoupon,
    validateCoupon,
    removeCoupon,
    appConfig,
    getDeliveryFee,
    eventType,
    setEventType,
    adultCount,
    setAdultCount,
    childCount,
    setChildCount,
    blockedDates,
    maxDeliveryDistanceKm,
    publicContact,
  } = useStore();

  const isHe = language === 'he';
  const t = translations[language] || translations.he;

  const [isDelivery, setIsDelivery] = useState<boolean>(
    customerDetails.deliveryMethod !== 'pickup'
  );
  const [wantsSetup, setWantsSetup] = useState(false);
  const [eventDate, setEventDate] = useState(customerDetails.eventDate || '');
  const [eventTime, setEventTime] = useState(customerDetails.eventTime || '');
  const [allergyNotes, setAllergyNotes] = useState(customerDetails.allergyNotes || '');
  const [generalNotes, setGeneralNotes] = useState(customerDetails.notes || '');

  // Keep raw string inputs for validation so invalid numbers (-10, decimals) remain visible with inline errors
  const [distanceInput, setDistanceInput] = useState<string>(() =>
    typeof customerDetails.distanceKm === 'number' && customerDetails.distanceKm > 0
      ? String(customerDetails.distanceKm)
      : ''
  );
  const [adultsInput, setAdultsInput] = useState<string>(() =>
    adultCount > 0 ? String(adultCount) : ''
  );
  const [childrenInput, setChildrenInput] = useState<string>(() =>
    childCount > 0 ? String(childCount) : ''
  );

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, LocalizedError>>({});

  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedLocationName, setDetectedLocationName] = useState<string | null>(
    customerDetails.resolvedLocation || null
  );
  const [couponInput, setCouponInput] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<SubmittedQuoteReceipt | null>(null);

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
    isConfirm: false,
  });

  const closeFeedback = () => setFeedback((prev) => ({ ...prev, isOpen: false }));
  const debounceTimerRef = useRef<number | null>(null);
  const nominatimAbortRef = useRef<AbortController | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useBackButton(isOpen, onClose);

  // Cancel any pending debounce timer or in-flight geocoding request on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      nominatimAbortRef.current?.abort();
    };
  }, []);

  // Sync guest calculator values into raw inputs whenever drawer opens or store updates cleanly
  useEffect(() => {
    if (isOpen) {
      setAdultsInput(adultCount > 0 ? String(adultCount) : '');
      setChildrenInput(childCount > 0 ? String(childCount) : '');
    }
  }, [isOpen, adultCount, childCount]);

  // Dialog focus management, Escape handling & body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => {
      const root = drawerRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) focusables[0].focus();
      else root.focus();
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (feedback.isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = drawerRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first || !root.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last || !root.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = prevOverflow;
      if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose, feedback.isOpen]);

  // Pricing totals (shown only in ecommerce mode)
  const subtotal = cartTotal();
  const discountAmount = activeCoupon
    ? activeCoupon.discount_type === 'percentage'
      ? Math.round((subtotal + (wantsSetup ? 1000 : 0)) * (activeCoupon.discount_value / 100))
      : activeCoupon.discount_value
    : 0;

  const parsedDistanceForFee = useMemo(() => {
    if (!isDelivery || distanceInput.trim() === '') return 0;
    const n = Number(distanceInput.trim());
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [isDelivery, distanceInput]);

  const deliveryFee = isDelivery ? getDeliveryFee(parsedDistanceForFee, subtotal) : 0;
  const setupFee = wantsSetup ? 1000 : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + deliveryFee + setupFee);
  const MIN_ORDER = appConfig.min_order_price;
  const FREE_DELIVERY_THRESHOLD = calculationSettings.minOrderFreeDelivery;
  const isWithinRadius =
    isDelivery &&
    parsedDistanceForFee > 0 &&
    parsedDistanceForFee <= calculationSettings.serviceRadiusKm;
  const progress =
    FREE_DELIVERY_THRESHOLD > 0
      ? Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100)
      : 0;

  const resolvedEventType =
    eventType === 'basic'
      ? t.basicEvent
      : eventType === 'plus'
        ? t.plusEvent
        : t.premiumEvent;

  // Build exact shared QuoteRequestInput object consumed identically by client validation & server /api/public/quote
  const quoteInput: QuoteRequestInput = useMemo(
    () => ({
      customerName: customerDetails.name || '',
      customerPhone: customerDetails.phone || '',
      eventDate: eventDate || '',
      eventTime: eventTime || '',
      eventType: resolvedEventType as string,
      deliveryMethod: isDelivery ? 'delivery' : 'pickup',
      deliveryAddress: isDelivery ? customerDetails.location || '' : '',
      resolvedLocation: isDelivery ? detectedLocationName || '' : '',
      distanceKm: isDelivery ? distanceInput : null,
      adultCount: adultsInput === '' ? null : adultsInput,
      childCount: childrenInput === '' ? null : childrenInput,
      wantsSetup,
      allergyNotes,
      notes: generalNotes,
      couponCode: activeCoupon?.code || '',
      items: cart.map((item) => ({
        menuItemId: item.id,
        quantity: item.quantity,
        selectedModifications: item.selected_modifications || [],
        notes: item.notes || '',
      })),
    }),
    [
      customerDetails.name,
      customerDetails.phone,
      customerDetails.location,
      eventDate,
      eventTime,
      resolvedEventType,
      isDelivery,
      detectedLocationName,
      distanceInput,
      adultsInput,
      childrenInput,
      wantsSetup,
      allergyNotes,
      generalNotes,
      activeCoupon?.code,
      cart,
    ]
  );

  // Run authoritative shared validator on every render -> single source of truth for disabled state, inline errors & submit
  const validation = useMemo(
    () =>
      validateQuoteRequest(quoteInput, {
        leadTimeHours: appConfig.lead_time_hours || 48,
        blockedDates,
        maxDeliveryDistanceKm,
      }),
    [quoteInput, appConfig.lead_time_hours, blockedDates, maxDeliveryDistanceKm]
  );

  const belowEcommerceMinOrder = Boolean(
    appConfig.ecommerce_mode && subtotal > 0 && subtotal < MIN_ORDER
  );

  const mergedFieldErrors = useMemo(
    () => ({ ...validation.fieldErrors, ...serverFieldErrors }),
    [validation.fieldErrors, serverFieldErrors]
  );

  const shouldShowFieldError = (field: string, rawVal: string) => {
    if (!mergedFieldErrors[field]) return false;
    return submitAttempted || touched[field] || rawVal.trim().length > 0;
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (serverFieldErrors[field]) {
      setServerFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

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
        message: isHe
          ? 'הקופון שגוי או שהגיע למכסת השימוש המקסימלית.'
          : 'Invalid code or usage limit reached.',
        isConfirm: false,
      });
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomerDetails({ location: value, resolvedLocation: '' });
    setDetectedLocationName(null);
    if (serverFieldErrors.deliveryAddress) {
      markTouched('deliveryAddress');
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    nominatimAbortRef.current?.abort();

    if (value.trim().length > 2) {
      setIsCalculatingDistance(true);
      debounceTimerRef.current = window.setTimeout(async () => {
        const controller = new AbortController();
        nominatimAbortRef.current = controller;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
              value
            )}&limit=3&addressdetails=1&accept-language=he`,
            { signal: controller.signal }
          );
          const data = await response.json();
          if (controller.signal.aborted) return;
          if (Array.isArray(data) && data.length > 0) {
            const bestMatch = data[0];
            const dist = calculateDistance(
              KEDUMIM_COORDS.lat,
              KEDUMIM_COORDS.lon,
              parseFloat(bestMatch.lat),
              parseFloat(bestMatch.lon)
            );
            const shortName = String(bestMatch.display_name || '').split(',')[0].trim();
            setDistanceInput(String(dist));
            setCustomerDetails({ distanceKm: dist, resolvedLocation: shortName });
            setDetectedLocationName(shortName || null);
          } else {
            setDetectedLocationName(null);
          }
        } catch {
          if (!controller.signal.aborted) {
            setDetectedLocationName(null);
          }
        } finally {
          if (!controller.signal.aborted && nominatimAbortRef.current === controller) {
            setIsCalculatingDistance(false);
          }
        }
      }, 900);
    } else {
      setIsCalculatingDistance(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFeedback({
        isOpen: true,
        type: 'warning',
        title: isHe ? 'שגיאה' : 'Error',
        message: isHe
          ? 'הדפדפן אינו תומך בזיהוי מיקום GPS.'
          : 'Geolocation is not supported by your browser.',
        isConfirm: false,
      });
      return;
    }

    setIsCalculatingDistance(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const dist = calculateDistance(
          KEDUMIM_COORDS.lat,
          KEDUMIM_COORDS.lon,
          latitude,
          longitude
        );
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=he`
          );
          const data = await response.json();
          let displayName = isHe ? 'המיקום שלי' : 'My Location';
          if (data?.address) {
            const city =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.settlement ||
              '';
            const road = data.address.road || '';
            if (city && road) displayName = `${city}, ${road}`;
            else if (city) displayName = city;
            else if (data.display_name) displayName = String(data.display_name).split(',')[0];
          }
          setDistanceInput(String(dist));
          setCustomerDetails({
            location: displayName,
            distanceKm: dist,
            resolvedLocation: displayName,
          });
          setDetectedLocationName(displayName);
        } catch {
          const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setDistanceInput(String(dist));
          setCustomerDetails({
            location: fallback,
            distanceKm: dist,
            resolvedLocation: fallback,
          });
          setDetectedLocationName(fallback);
        } finally {
          setIsCalculatingDistance(false);
        }
      },
      (error) => {
        setIsCalculatingDistance(false);
        const msg =
          error.code === 1
            ? isHe
              ? 'יש לאשר גישה למיקום בדפדפן, או להזין כתובת ומרחק ידנית.'
              : 'Please allow location permission, or enter address and distance manually.'
            : isHe
              ? 'לא ניתן לאתר מיקום אוטומטית. ניתן להזין כתובת ומרחק ידנית.'
              : 'Unable to detect location automatically. Enter address and distance manually.';
        setFeedback({
          isOpen: true,
          type: 'error',
          title: isHe ? 'שגיאת מיקום' : 'Location Error',
          message: msg,
          isConfirm: false,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleDistanceInputChange = (val: string) => {
    setDistanceInput(val);
    setDetectedLocationName(null);
    markTouched('distanceKm');
    const trimmed = val.trim();
    if (trimmed === '') {
      setCustomerDetails({ distanceKm: 0, resolvedLocation: '' });
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed >= 0) {
      setCustomerDetails({ distanceKm: parsed, resolvedLocation: '' });
    }
  };

  const handleAdultInputChange = (val: string) => {
    setAdultsInput(val);
    markTouched('adultCount');
    if (val.trim() === '') {
      setAdultCount(0);
      return;
    }
    const n = Number(val);
    if (Number.isInteger(n) && n >= 0 && n <= 5000) {
      setAdultCount(n);
    }
  };

  const handleChildInputChange = (val: string) => {
    setChildrenInput(val);
    markTouched('childCount');
    if (val.trim() === '') {
      setChildCount(0);
      return;
    }
    const n = Number(val);
    if (Number.isInteger(n) && n >= 0 && n <= 5000) {
      setChildCount(n);
    }
  };

  const buildDraftMessage = () => {
    const line = '━━━━━━━━━━━━━━━━';
    const header = appConfig.ecommerce_mode
      ? isHe
        ? `*טיוטת הזמנה מאיילה פשוט טעים (לבדיקה):*\n${line}\n\n`
        : `*Draft order from Ayala Simply Delicious:*\n${line}\n\n`
      : isHe
        ? `*טיוטת בקשת הצעת מחיר מאיילה פשוט טעים:*\n${line}\n\n`
        : `*Draft quote request from Ayala Simply Delicious:*\n${line}\n\n`;

    let msg = header;
    cart.forEach((item) => {
      const displayItem = getLocalizedItem(item, language);
      const priceStr = appConfig.ecommerce_mode ? ` (₪${item.price * item.quantity})` : '';
      msg += `• ${item.quantity}x ${displayItem.name}${priceStr}\n`;
    });
    if (wantsSetup) {
      msg += `\n• ${isHe ? 'כולל עניין בשירותי עריכה ופינוי' : 'Interested in Setup & Cleanup'}`;
    }
    if (allergyNotes.trim()) {
      msg += `\n• ${isHe ? 'רגישויות/דגשים:' : 'Allergies/notes:'} ${allergyNotes.trim()}`;
    }
    if (appConfig.ecommerce_mode) {
      msg += `\n\n*${t.total}: ₪${finalTotal}*`;
    }
    return msg;
  };

  const buildWhatsappHandoffMessage = (res: {
    reference_code: string;
    quote_url: string;
  }) => {
    const norm = validation.normalized!;
    const line = '━━━━━━━━━━━━━━━━';
    const parts: string[] = [];

    if (isHe) {
      parts.push(
        appConfig.ecommerce_mode
          ? `*בקשת הזמנה #${res.reference_code} — איילה פשוט טעים*`
          : `*בקשת הצעת מחיר #${res.reference_code} — איילה פשוט טעים*`
      );
      parts.push(`שם: ${norm.customerName}`);
      parts.push(`טלפון: ${norm.customerPhone}`);
      parts.push(
        `תאריך אירוע: ${norm.eventDate}${norm.eventTime ? ` בשעה ${norm.eventTime}` : ''}`
      );
      parts.push(`סוג אירוע: ${norm.eventType}`);
      if (norm.adultCount !== null || norm.childCount !== null) {
        parts.push(
          `סועדים משוערים: ${norm.adultCount ?? 0} מבוגרים, ${norm.childCount ?? 0} ילדים`
        );
      }
      if (norm.deliveryMethod === 'delivery') {
        parts.push(
          `משלוח לכתובת: ${norm.deliveryAddress}${norm.resolvedLocation ? ` (${norm.resolvedLocation})` : ''
          }`
        );
        parts.push(`מרחק משוער מקדומים: ${norm.distanceKm} ק"מ`);
      } else {
        parts.push(`אופן קבלה: איסוף עצמי מאזור ${publicContact.pickupAreaHe} (בתיאום כתובת מדויקת)`);
      }
      parts.push(`שירותי עריכה ופינוי: ${norm.wantsSetup ? 'כן (בתיאום מראש)' : 'לא'}`);
      if (norm.allergyNotes) parts.push(`רגישויות ואלרגיות: ${norm.allergyNotes}`);
      if (norm.notes) parts.push(`הערות כלליות: ${norm.notes}`);
      parts.push(line);
      parts.push('*פירוט מנות מבוקשות:*');
    } else {
      parts.push(
        appConfig.ecommerce_mode
          ? `*Order Request #${res.reference_code} — Ayala Simply Delicious*`
          : `*Quote Request #${res.reference_code} — Ayala Simply Delicious*`
      );
      parts.push(`Name: ${norm.customerName}`);
      parts.push(`Phone: ${norm.customerPhone}`);
      parts.push(
        `Event Date: ${norm.eventDate}${norm.eventTime ? ` at ${norm.eventTime}` : ''}`
      );
      parts.push(`Event Type: ${norm.eventType}`);
      if (norm.adultCount !== null || norm.childCount !== null) {
        parts.push(
          `Estimated Guests: ${norm.adultCount ?? 0} adults, ${norm.childCount ?? 0} children`
        );
      }
      if (norm.deliveryMethod === 'delivery') {
        parts.push(
          `Delivery Address: ${norm.deliveryAddress}${norm.resolvedLocation ? ` (${norm.resolvedLocation})` : ''
          }`
        );
        parts.push(`Est. Distance: ${norm.distanceKm} km`);
      } else {
        parts.push(`Fulfillment: Self pickup (${publicContact.pickupAreaEn} area)`);
      }
      parts.push(`Setup & Cleanup: ${norm.wantsSetup ? 'Requested' : 'No'}`);
      if (norm.allergyNotes) parts.push(`Allergies / Dietary Notes: ${norm.allergyNotes}`);
      if (norm.notes) parts.push(`Notes: ${norm.notes}`);
      parts.push(line);
      parts.push('*Requested Items:*');
    }

    cart.forEach((item) => {
      const localItem = getLocalizedItem(item, language);
      const priceSuffix = appConfig.ecommerce_mode ? ` (₪${item.price * item.quantity})` : '';
      let row = `• ${item.quantity}x ${localItem.name}${priceSuffix}`;
      if (item.selected_modifications?.length) {
        row += ` [${item.selected_modifications.join(', ')}]`;
      }
      if (item.notes) {
        row += ` — "${item.notes}"`;
      }
      parts.push(row);
    });

    if (res.quote_url) {
      parts.push('');
      parts.push(
        isHe
          ? `קישור מאובטח לצפייה בסיכום הבקשה: ${res.quote_url}`
          : `Secure link to view quote summary: ${res.quote_url}`
      );
    }

    parts.push('');
    parts.push(
      isHe
        ? 'אשמח לבדיקת זמינות ואישור פרטי הבקשה מולך.'
        : 'I would appreciate confirming availability and details with you.'
    );

    return parts.join('\n');
  };

  const handleQuoteSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitAttempted(true);
    setServerError(null);
    setServerFieldErrors({});

    if (!validation.valid || belowEcommerceMinOrder || !validation.normalized) {
      api.trackEvent('quote_validation_failed', {
        error_count: validation.errors.length,
        delivery_method: isDelivery ? 'delivery' : 'pickup',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitQuote(quoteInput);
      const whatsappMessage = buildWhatsappHandoffMessage(res);
      const waDigits = res.contact?.whatsappDigits || publicContact.whatsappDigits;
      const whatsappHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(
        whatsappMessage
      )}`;

      setCustomerDetails({
        eventDate: validation.normalized.eventDate,
        eventTime: validation.normalized.eventTime,
        deliveryMethod: validation.normalized.deliveryMethod,
        resolvedLocation: validation.normalized.resolvedLocation,
        allergyNotes: validation.normalized.allergyNotes,
        notes: validation.normalized.notes,
      });

      setSubmittedReceipt({
        referenceCode: res.reference_code,
        quoteUrl: res.quote_url,
        notificationStatus: res.notification_status,
        deduplicated: res.deduplicated,
        whatsappHref,
        whatsappMessage,
        whatsappOpened: false,
        copiedText: false,
        copiedLink: false,
        deliveryMethod: res.delivery_method,
      });

      api.trackEvent('quote_submitted', {
        delivery_method: res.delivery_method,
        item_count: cart.length,
        wants_setup: wantsSetup,
        deduplicated: res.deduplicated,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) setServerFieldErrors(err.fieldErrors);
        setServerError(err.message);
      } else {
        setServerError(
          isHe
            ? 'שמירת הבקשה נכשלה עקב תקלת תקשורת. הנתונים שלך נשמרו בטופס — ניתן לנסות שוב.'
            : 'Unable to save request due to a network error. Your input is preserved — please retry.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyText = async (text: string, which: 'text' | 'link') => {
    if (!submittedReceipt) return;
    try {
      await navigator.clipboard.writeText(text);
      setSubmittedReceipt((prev) =>
        prev
          ? {
            ...prev,
            copiedText: which === 'text' ? true : prev.copiedText,
            copiedLink: which === 'link' ? true : prev.copiedLink,
          }
          : null
      );
      window.setTimeout(() => {
        setSubmittedReceipt((prev) =>
          prev
            ? {
              ...prev,
              copiedText: which === 'text' ? false : prev.copiedText,
              copiedLink: which === 'link' ? false : prev.copiedLink,
            }
            : null
        );
      }, 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleFinishAndClear = () => {
    clearCart();
    setSubmittedReceipt(null);
    onClose();
  };

  const handleStartAnotherQuote = () => {
    clearCart();
    setSubmittedReceipt(null);
    setSubmitAttempted(false);
    setServerError(null);
  };

  const getUnitName = (type: string) => {
    const units: Record<string, string> = {
      tray: t.tray as string,
      liter: t.liter as string,
      unit: t.unit as string,
      weight: t.weight as string,
    };
    return units[type] || type;
  };

  const handleClearCartClick = () => {
    setFeedback({
      isOpen: true,
      type: 'error',
      title: t.clearCart as string,
      message: t.clearCartConfirm as string,
      isConfirm: true,
      confirmText: isHe ? 'כן, רוקן עגלה' : 'Yes, Empty Cart',
      onConfirm: () => {
        clearCart();
        closeFeedback();
      },
    });
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const isCheckoutDisabled = !validation.valid || belowEcommerceMinOrder || isSubmitting;
  const draftWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(buildDraftMessage())}`;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[950] flex justify-end font-sans"
        dir={isHe ? 'rtl' : 'ltr'}
      >
        <div
          className="absolute inset-0 bg-stone-900/65 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-title"
          tabIndex={-1}
          className={`relative w-full max-w-md bg-themeBg h-full shadow-2xl flex flex-col outline-none ${isHe ? 'animate-slide-in-left' : 'animate-slide-in-right'
            }`}
        >
          {/* Drawer Header */}
          <div className="p-5 bg-themeHeaderBg text-themeHeaderTxt flex items-center justify-between shadow-md z-10 shrink-0">
            <div className="flex items-center gap-3">
              <ShoppingBag className="text-themePrimary" aria-hidden="true" />
              <h2 id="cart-drawer-title" className="text-xl font-serif font-bold tracking-wide">
                {submittedReceipt
                  ? isHe
                    ? `סיכום פנייה #${submittedReceipt.referenceCode}`
                    : `Request #${submittedReceipt.referenceCode}`
                  : (t.myOrder as string)}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {!submittedReceipt && cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCartClick}
                  className="text-themeHeaderTxt/75 hover:text-red-300 transition-colors p-1.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-themePrimary"
                  aria-label={t.clearCart as string}
                  title={t.clearCart as string}
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label={isHe ? 'סגור עגלה' : 'Close cart'}
                className="text-themeHeaderTxt hover:text-themePrimary transition p-1.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-themePrimary"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Post-Save Decoupled Confirmation State (Saved in App -> Email Alert -> Explicit WhatsApp Handoff Link) */}
          {submittedReceipt ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-themeBg text-themeText text-start">
              {/* Step 1: Saved in app */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                  <CheckCircle2 size={20} className="text-emerald-700 shrink-0" />
                  <span>
                    {isHe
                      ? `הבקשה נשמרה במערכת (#${submittedReceipt.referenceCode})`
                      : `Request saved in system (#${submittedReceipt.referenceCode})`}
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {submittedReceipt.deduplicated
                    ? isHe
                      ? 'זוהתה בקשה זהה שכבר נשמרה קודם לכן — שמרנו את מספר הפנייה המקורי כדי למנוע כפילות.'
                      : 'Matching identical request already recorded — kept your existing reference code to prevent duplicates.'
                    : isHe
                      ? QUOTE_MODE_JOURNEY.disclaimerHe
                      : QUOTE_MODE_JOURNEY.disclaimerEn}
                </p>
              </div>

              {/* Step 2: Owner Email Notification State */}
              <div
                className={`rounded-xl p-3.5 border text-xs leading-relaxed ${submittedReceipt.notificationStatus === 'sent'
                  ? 'bg-themeCardBg border-themeText/15 text-themeText'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
              >
                <div className="font-bold mb-1">
                  {isHe ? 'סטטוס התראה לבעלת העסק:' : 'Business notification status:'}
                </div>
                {submittedReceipt.notificationStatus === 'sent' ? (
                  <p>
                    {isHe
                      ? 'התראת מייל אוטומטית נשלחה לאיילה עם פרטי הפנייה המלאים.'
                      : 'An automatic email notification was sent to Ayala with full details.'}
                  </p>
                ) : submittedReceipt.notificationStatus === 'failed' ? (
                  <p>
                    {isHe
                      ? 'הבקשה נשמרה בהצלחה במסד הנתונים, אך שליחת המייל האוטומטית נכשלה זמנית. נא לפתוח ולשלוח גם בוואטסאפ למטה.'
                      : 'Your request is safely saved, but automated email delivery failed. Please open the WhatsApp handoff below.'}
                  </p>
                ) : (
                  <p>
                    {isHe
                      ? 'הבקשה נשמרה אצלנו במערכת. לפתיחת שיחה ישירה ומהירה עם איילה, המשיכו לשליחת ההודעה בוואטסאפ.'
                      : 'Your request is saved in our system. To coordinate faster, continue by sending the details via WhatsApp below.'}
                  </p>
                )}
              </div>

              {/* Step 3: Explicit User-Initiated WhatsApp Handoff (Zero Auto Popup Blocker, Honest State) */}
              <div className="bg-themeCardBg border border-themeText/15 rounded-2xl p-4 space-y-3 shadow-sm">
                <h3 className="font-bold text-sm text-themeText flex items-center gap-2">
                  <MessageCircle size={18} className="text-green-700" />
                  <span>
                    {isHe
                      ? 'העברה יזומה לוואטסאפ (לתיאום ישיר)'
                      : 'Open WhatsApp Handoff'}
                  </span>
                </h3>
                <p className="text-xs text-themeText/75 leading-relaxed">
                  {submittedReceipt.whatsappOpened
                    ? isHe
                      ? 'חלון וואטסאפ נפתח — שימו לב שפתיחת החלון אינה שליחה בפועל עד שלוחצים על כפתור השליחה באפליקציית וואטסאפ.'
                      : 'WhatsApp compose window opened — opening it does not deliver the message until you press Send inside WhatsApp.'
                    : isHe
                      ? 'לחיצה על הכפתור תפתח חלון וואטסאפ מוכן עם כל פרטי הבקשה ומספר הפנייה. השליחה מתבצעת רק בלחיצה שלך בוואטסאפ.'
                      : 'Click below to open a pre-filled WhatsApp message with your request details. Your message is sent only when you press Send inside WhatsApp.'}
                </p>

                <a
                  href={submittedReceipt.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    api.trackEvent('whatsapp_handoff_clicked', {
                      delivery_method: submittedReceipt.deliveryMethod,
                    });
                    setSubmittedReceipt((prev) =>
                      prev ? { ...prev, whatsappOpened: true } : null
                    );
                  }}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition text-sm"
                >
                  <MessageCircle size={18} />
                  <span>
                    {isHe ? 'פתחו את הבקשה בוואטסאפ' : 'Open Request in WhatsApp'}
                  </span>
                  <ExternalLink size={15} />
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(submittedReceipt.whatsappMessage, 'text')}
                    className="py-2.5 px-3 rounded-xl border border-themeText/20 text-xs font-bold hover:bg-themeBg flex items-center justify-center gap-1.5"
                  >
                    {submittedReceipt.copiedText ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                    <span>
                      {submittedReceipt.copiedText
                        ? isHe
                          ? 'הטקסט הועתק'
                          : 'Copied'
                        : isHe
                          ? 'העתקת פירוט'
                          : 'Copy Details'}
                    </span>
                  </button>

                  {submittedReceipt.quoteUrl && (
                    <a
                      href={submittedReceipt.quoteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl border border-themeText/20 text-xs font-bold hover:bg-themeBg flex items-center justify-center gap-1.5"
                    >
                      <Printer size={14} />
                      <span>{isHe ? 'צפייה והדפסה' : 'View / Print'}</span>
                    </a>
                  )}
                </div>

                {submittedReceipt.quoteUrl && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(submittedReceipt.quoteUrl, 'link')}
                    className="w-full py-2 px-3 rounded-lg bg-themeBg text-xs font-medium text-themeText/80 hover:text-themeText flex items-center justify-center gap-1.5 border border-themeText/10"
                  >
                    {submittedReceipt.copiedLink ? <Check size={13} className="text-emerald-700" /> : <Share2 size={13} />}
                    <span>
                      {submittedReceipt.copiedLink
                        ? isHe
                          ? 'הקישור הפרטי הועתק!'
                          : 'Private link copied!'
                        : isHe
                          ? 'העתקת קישור פרטי לשיתוף עם השותפים לאירוע'
                          : 'Copy private link to share'}
                    </span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleFinishAndClear}
                  className="w-full py-3 rounded-xl bg-themeHeaderBg text-themeHeaderTxt font-bold text-sm hover:opacity-95"
                >
                  {isHe ? 'סיום וניקוי עגלה' : 'Finish & Clear Cart'}
                </button>
                <button
                  type="button"
                  onClick={handleStartAnotherQuote}
                  className="w-full py-2.5 rounded-xl border border-themeText/20 text-xs font-bold text-themeText/80 hover:bg-themeCardBg"
                >
                  {isHe ? 'הכנת בקשה נוספת (ללא ניקוי אוטומטי)' : 'Back to Cart / Edit'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Ecommerce free delivery progress bar */}
              {appConfig.ecommerce_mode && (
                <div className="bg-themeHeaderBg/95 px-5 py-3 shadow-inner shrink-0">
                  {isWithinRadius ? (
                    <>
                      <div className="flex justify-between text-[11px] font-bold text-themeHeaderTxt/85 mb-1.5">
                        <span>
                          {t.freeDeliveryAt as string} ₪{FREE_DELIVERY_THRESHOLD}
                        </span>
                        {subtotal < FREE_DELIVERY_THRESHOLD ? (
                          <span>
                            {t.justMore as string} ₪{FREE_DELIVERY_THRESHOLD - subtotal}{' '}
                            {t.forVip as string}
                          </span>
                        ) : (
                          <span className="text-themePrimary flex items-center gap-1">
                            <Sparkles size={11} /> {t.vipDelivery as string}
                          </span>
                        )}
                      </div>
                      <div className="h-2 bg-black/25 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-themePrimary transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-xs font-bold text-themeHeaderTxt flex items-center gap-2 justify-center py-1.5">
                      <MapPin size={14} className="text-themePrimary" />
                      <span>{t.deliveryByDistance as string}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Quote-mode expectation banner */}
              {!appConfig.ecommerce_mode && (
                <div className="px-5 py-2.5 bg-themePrimary/10 border-b border-themeText/10 text-xs text-themeText/85 flex items-center gap-2 shrink-0">
                  <Sparkles size={14} className="text-themePrimary shrink-0" />
                  <span>
                    {isHe
                      ? 'מצב הצעת מחיר: שליחת הפרטים שולחת בקשה להצעת מחיר ולבדיקת זמינות — ללא חיוב.'
                      : 'Quote mode: sending submits a quote request and availability check with no charge.'}
                  </span>
                </div>
              )}

              {/* Scrollable Cart + Form Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-themeBg text-themeText">
                {serverError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs space-y-1"
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle size={15} className="shrink-0" />
                      <span>{isHe ? 'שמירת הבקשה נחסמה / נכשלה' : 'Submission error'}</span>
                    </div>
                    <p>{serverError}</p>
                  </div>
                )}

                {/* Customer & Event Form */}
                <form
                  id="cart-quote-form"
                  onSubmit={handleQuoteSubmit}
                  noValidate
                  className="bg-themeCardBg p-4 rounded-xl border border-themeText/15 shadow-sm space-y-3.5"
                >
                  <h3 className="text-xs font-bold text-themeText/75 uppercase tracking-wider">
                    {isHe ? 'פרטי קשר, אירוע ואספקה' : 'Contact, Event & Fulfillment Details'}
                  </h3>

                  {/* Fulfillment Toggle */}
                  <div
                    role="group"
                    aria-label={isHe ? 'אופן קבלת ההזמנה' : 'Fulfillment method'}
                    className="flex gap-2 p-1 bg-themeBg rounded-lg border border-themeText/15"
                  >
                    <button
                      type="button"
                      aria-pressed={isDelivery}
                      onClick={() => {
                        setIsDelivery(true);
                        setCustomerDetails({ deliveryMethod: 'delivery' });
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${isDelivery
                        ? 'bg-themeHeaderBg text-themeHeaderTxt shadow-sm'
                        : 'text-themeText/75 hover:text-themeText'
                        }`}
                    >
                      {isHe ? 'משלוח לכתובת' : 'Delivery'}
                    </button>
                    <button
                      type="button"
                      aria-pressed={!isDelivery}
                      onClick={() => {
                        setIsDelivery(false);
                        setCustomerDetails({ deliveryMethod: 'pickup' });
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${!isDelivery
                        ? 'bg-themeHeaderBg text-themeHeaderTxt shadow-sm'
                        : 'text-themeText/75 hover:text-themeText'
                        }`}
                    >
                      {isHe ? 'איסוף עצמי (אזור קדומים)' : 'Self Pickup (Kedumim area)'}
                    </button>
                  </div>

                  {!isDelivery && (
                    <div className="p-2.5 rounded-lg bg-themeBg border border-themeText/10 text-xs text-themeText/80">
                      {isHe ? publicContact.pickupPublicNoteHe : publicContact.pickupPublicNoteEn}
                    </div>
                  )}

                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="cart-customer-name"
                      className="block text-xs font-bold text-themeText/85 mb-1"
                    >
                      {t.customerName} *
                    </label>
                    <div className="relative">
                      <User
                        className="absolute right-3 top-2.5 text-themeText/45 pointer-events-none"
                        size={16}
                        aria-hidden="true"
                      />
                      <input
                        id="cart-customer-name"
                        type="text"
                        value={customerDetails.name}
                        onChange={(e) => setCustomerDetails({ name: e.target.value })}
                        onBlur={() => markTouched('customerName')}
                        aria-invalid={shouldShowFieldError('customerName', customerDetails.name)}
                        aria-describedby={
                          shouldShowFieldError('customerName', customerDetails.name)
                            ? 'err-customerName'
                            : undefined
                        }
                        placeholder={isHe ? 'ישראל ישראלי' : 'Full Name'}
                        className={`w-full bg-themeBg border rounded-lg p-2 pr-9 text-sm outline-none text-themeText ${shouldShowFieldError('customerName', customerDetails.name)
                          ? 'border-red-500'
                          : 'border-themeText/20 focus:border-themePrimary'
                          }`}
                      />
                    </div>
                    {shouldShowFieldError('customerName', customerDetails.name) && (
                      <p id="err-customerName" role="alert" className="text-xs text-red-700 font-bold mt-1">
                        {isHe
                          ? mergedFieldErrors.customerName.he
                          : mergedFieldErrors.customerName.en}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      htmlFor="cart-customer-phone"
                      className="block text-xs font-bold text-themeText/85 mb-1"
                    >
                      {t.customerPhone} *
                    </label>
                    <div className="relative">
                      <Phone
                        className="absolute right-3 top-2.5 text-themeText/45 pointer-events-none"
                        size={16}
                        aria-hidden="true"
                      />
                      <input
                        id="cart-customer-phone"
                        type="tel"
                        dir="ltr"
                        value={customerDetails.phone}
                        onChange={(e) => setCustomerDetails({ phone: e.target.value })}
                        onBlur={() => markTouched('customerPhone')}
                        aria-invalid={shouldShowFieldError('customerPhone', customerDetails.phone)}
                        aria-describedby={
                          shouldShowFieldError('customerPhone', customerDetails.phone)
                            ? 'err-customerPhone'
                            : undefined
                        }
                        placeholder="054-000-0000"
                        className={`w-full bg-themeBg border rounded-lg p-2 pr-9 text-sm text-start outline-none text-themeText ${shouldShowFieldError('customerPhone', customerDetails.phone)
                          ? 'border-red-500'
                          : 'border-themeText/20 focus:border-themePrimary'
                          }`}
                      />
                    </div>
                    {shouldShowFieldError('customerPhone', customerDetails.phone) && (
                      <p id="err-customerPhone" role="alert" className="text-xs text-red-700 font-bold mt-1">
                        {isHe
                          ? mergedFieldErrors.customerPhone.he
                          : mergedFieldErrors.customerPhone.en}
                      </p>
                    )}
                  </div>

                  {/* Event Date & Time (Asia/Jerusalem lead time enforced) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="cart-event-date"
                        className="block text-xs font-bold text-themeText/85 mb-1 flex items-center gap-1"
                      >
                        <Calendar size={12} className="text-themePrimary" aria-hidden="true" />
                        <span>{isHe ? 'תאריך האירוע *' : 'Event Date *'}</span>
                      </label>
                      <input
                        id="cart-event-date"
                        type="date"
                        value={eventDate}
                        min={validation.leadTimeInfo.minDateInputValue}
                        onChange={(e) => {
                          setEventDate(e.target.value);
                          markTouched('eventDate');
                        }}
                        onBlur={() => markTouched('eventDate')}
                        aria-invalid={shouldShowFieldError('eventDate', eventDate)}
                        aria-describedby={
                          shouldShowFieldError('eventDate', eventDate) ? 'err-eventDate' : 'hint-eventDate'
                        }
                        className={`w-full bg-themeBg border rounded-lg p-2 text-sm outline-none text-themeText font-sans ${shouldShowFieldError('eventDate', eventDate)
                          ? 'border-red-500'
                          : 'border-themeText/20 focus:border-themePrimary'
                          }`}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cart-event-time"
                        className="block text-xs font-bold text-themeText/85 mb-1 flex items-center gap-1"
                      >
                        <Clock size={12} className="text-themePrimary" aria-hidden="true" />
                        <span>{isHe ? 'שעה משוערת (אופציונלי)' : 'Event Time (Optional)'}</span>
                      </label>
                      <input
                        id="cart-event-time"
                        type="time"
                        value={eventTime}
                        onChange={(e) => {
                          setEventTime(e.target.value);
                          markTouched('eventDate');
                        }}
                        className="w-full bg-themeBg border border-themeText/20 focus:border-themePrimary rounded-lg p-2 text-sm outline-none text-themeText font-sans"
                      />
                    </div>
                  </div>
                  <p id="hint-eventDate" className="text-[11px] text-themeText/70 -mt-1.5">
                    {isHe
                      ? `נדרשת התראה מראש של ${appConfig.lead_time_hours || 48} שעות (שעון ישראל). מועד מוקדם ביותר: ${validation.leadTimeInfo.earliestAllowedDate} (${validation.leadTimeInfo.earliestAllowedTime}).`
                      : `Requires ${appConfig.lead_time_hours || 48}h advance notice (Israel time). Earliest: ${validation.leadTimeInfo.earliestAllowedDate} ${validation.leadTimeInfo.earliestAllowedTime}.`}
                  </p>
                  {shouldShowFieldError('eventDate', eventDate) && (
                    <p id="err-eventDate" role="alert" className="text-xs text-red-700 font-bold -mt-1">
                      {isHe
                        ? mergedFieldErrors.eventDate.he
                        : mergedFieldErrors.eventDate.en}
                    </p>
                  )}

                  {/* Event Type */}
                  <div>
                    <span className="block text-xs font-bold text-themeText/85 mb-1.5">
                      {t.eventType}
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['basic', 'plus', 'premium'] as EventType[]).map((type) => {
                        const active = eventType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setEventType(type)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${active
                              ? 'bg-themeHeaderBg text-themeHeaderTxt border-themeHeaderBg'
                              : 'bg-themeBg text-themeText/80 border-themeText/15 hover:border-themePrimary'
                              }`}
                          >
                            {type === 'basic'
                              ? t.basicEvent
                              : type === 'plus'
                                ? t.plusEvent
                                : t.premiumEvent}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Estimated Guests */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="cart-adult-count"
                        className="block text-xs font-bold text-themeText/85 mb-1 flex items-center gap-1"
                      >
                        <Users size={12} className="text-themePrimary" aria-hidden="true" />
                        <span>{isHe ? 'מבוגרים (אופציונלי)' : 'Adults (optional)'}</span>
                      </label>
                      <input
                        id="cart-adult-count"
                        type="number"
                        min={0}
                        step={1}
                        value={adultsInput}
                        onChange={(e) => handleAdultInputChange(e.target.value)}
                        onBlur={() => markTouched('adultCount')}
                        placeholder={isHe ? 'מהמחשבון' : 'Optional'}
                        className={`w-full bg-themeBg border rounded-lg p-2 text-sm outline-none text-themeText ${shouldShowFieldError('adultCount', adultsInput)
                          ? 'border-red-500'
                          : 'border-themeText/20 focus:border-themePrimary'
                          }`}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cart-child-count"
                        className="block text-xs font-bold text-themeText/85 mb-1"
                      >
                        {isHe ? 'ילדים (אופציונלי)' : 'Children (optional)'}
                      </label>
                      <input
                        id="cart-child-count"
                        type="number"
                        min={0}
                        step={1}
                        value={childrenInput}
                        onChange={(e) => handleChildInputChange(e.target.value)}
                        onBlur={() => markTouched('childCount')}
                        placeholder="0"
                        className={`w-full bg-themeBg border rounded-lg p-2 text-sm outline-none text-themeText ${shouldShowFieldError('childCount', childrenInput)
                          ? 'border-red-500'
                          : 'border-themeText/20 focus:border-themePrimary'
                          }`}
                      />
                    </div>
                  </div>
                  {(shouldShowFieldError('adultCount', adultsInput) ||
                    shouldShowFieldError('childCount', childrenInput)) && (
                      <p role="alert" className="text-xs text-red-700 font-bold -mt-1">
                        {shouldShowFieldError('adultCount', adultsInput)
                          ? isHe
                            ? mergedFieldErrors.adultCount.he
                            : mergedFieldErrors.adultCount.en
                          : isHe
                            ? mergedFieldErrors.childCount.he
                            : mergedFieldErrors.childCount.en}
                      </p>
                    )}

                  {/* Delivery Address & Distance */}
                  {isDelivery && (
                    <>
                      <div>
                        <label
                          htmlFor="cart-delivery-address"
                          className="block text-xs font-bold text-themeText/85 mb-1"
                        >
                          {t.eventLocation} *
                        </label>
                        <div className="relative">
                          <MapPin
                            className="absolute right-3 top-2.5 text-themeText/45 pointer-events-none"
                            size={16}
                            aria-hidden="true"
                          />
                          <input
                            id="cart-delivery-address"
                            type="text"
                            value={customerDetails.location}
                            onChange={handleLocationChange}
                            onBlur={() => markTouched('deliveryAddress')}
                            aria-invalid={shouldShowFieldError(
                              'deliveryAddress',
                              customerDetails.location
                            )}
                            placeholder={isHe ? 'עיר, רחוב ומספר בית' : 'City, Street Address'}
                            className={`w-full bg-themeBg border rounded-lg p-2 pr-9 pl-10 text-sm outline-none text-themeText ${shouldShowFieldError('deliveryAddress', customerDetails.location)
                              ? 'border-red-500'
                              : detectedLocationName
                                ? 'border-emerald-600'
                                : 'border-themeText/20 focus:border-themePrimary'
                              }`}
                          />
                          <div className="absolute left-2 top-1.5 flex items-center">
                            {isCalculatingDistance ? (
                              <Loader2 className="animate-spin text-themePrimary m-1" size={16} />
                            ) : detectedLocationName ? (
                              <CheckCircle2 size={16} className="text-emerald-700 m-1" />
                            ) : (
                              <button
                                onClick={handleUseCurrentLocation}
                                type="button"
                                aria-label={isHe ? 'השתמש במיקום הנוכחי' : 'Use Current Location'}
                                title={isHe ? 'השתמש במיקום הנוכחי' : 'Use Current Location'}
                                className="p-1.5 bg-themeCardBg border border-themeText/15 text-themeText rounded-full hover:bg-themeHeaderBg hover:text-themeHeaderTxt transition-colors"
                              >
                                <LocateFixed size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        {detectedLocationName && (
                          <div className="text-xs text-emerald-800 font-bold mt-1">
                            ✓ {isHe ? 'זוהה:' : 'Identified:'} {detectedLocationName}
                          </div>
                        )}
                        {shouldShowFieldError('deliveryAddress', customerDetails.location) && (
                          <p role="alert" className="text-xs text-red-700 font-bold mt-1">
                            {isHe
                              ? mergedFieldErrors.deliveryAddress.he
                              : mergedFieldErrors.deliveryAddress.en}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="cart-distance-km"
                          className="block text-xs font-bold text-themeText/85 mb-1"
                        >
                          {t.eventDistance} *
                        </label>
                        <div className="relative">
                          <Route
                            className="absolute right-3 top-2.5 text-themeText/45 pointer-events-none"
                            size={16}
                            aria-hidden="true"
                          />
                          <input
                            id="cart-distance-km"
                            type="number"
                            min={0}
                            step="any"
                            value={distanceInput}
                            onChange={(e) => handleDistanceInputChange(e.target.value)}
                            onBlur={() => markTouched('distanceKm')}
                            disabled={!!detectedLocationName}
                            aria-invalid={shouldShowFieldError('distanceKm', distanceInput)}
                            placeholder={isHe ? 'לדוגמה: 25' : 'e.g. 25'}
                            className={`w-full bg-themeBg border rounded-lg p-2 pr-9 text-sm outline-none text-themeText ${shouldShowFieldError('distanceKm', distanceInput)
                              ? 'border-red-500'
                              : 'border-themeText/20 focus:border-themePrimary'
                              } ${detectedLocationName ? 'opacity-75 cursor-not-allowed' : ''}`}
                          />
                          {detectedLocationName && (
                            <button
                              type="button"
                              onClick={() => {
                                setDetectedLocationName(null);
                                setCustomerDetails({ resolvedLocation: '' });
                              }}
                              className="absolute left-2.5 top-2 text-xs text-themeText/70 underline hover:text-themeText flex items-center gap-1"
                            >
                              <Lock size={12} />
                              <span>{isHe ? 'ערוך' : 'Edit'}</span>
                            </button>
                          )}
                        </div>
                        {shouldShowFieldError('distanceKm', distanceInput) && (
                          <p role="alert" className="text-xs text-red-700 font-bold mt-1">
                            {isHe
                              ? mergedFieldErrors.distanceKm.he
                              : mergedFieldErrors.distanceKm.en}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Allergy / Dietary Notes + Honest Cross-Contamination Disclaimer */}
                  <div className="space-y-1.5 pt-1">
                    <label
                      htmlFor="cart-allergy-notes"
                      className="block text-xs font-bold text-themeText/85 flex items-center gap-1.5"
                    >
                      <ShieldAlert size={13} className="text-amber-700" aria-hidden="true" />
                      <span>
                        {isHe ? 'רגישויות מזון, אלרגיות ודגשי כשרות' : 'Food Allergies & Dietary Notes'}
                      </span>
                    </label>
                    <textarea
                      id="cart-allergy-notes"
                      rows={2}
                      maxLength={500}
                      value={allergyNotes}
                      onChange={(e) => setAllergyNotes(e.target.value)}
                      placeholder={
                        isHe
                          ? 'לדוגמה: 2 מנות ללא גלוטן, אלרגיה לאגוזים — ייבדק באישור אישי מול איילה'
                          : 'E.g. nut allergy, gluten-free request — confirmed personally with Ayala'
                      }
                      className="w-full bg-themeBg border border-themeText/20 focus:border-themePrimary rounded-lg p-2 text-xs outline-none text-themeText resize-none"
                    />
                    <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed">
                      {isHe ? DIETARY_DISCLAIMER.he : DIETARY_DISCLAIMER.en}
                    </p>
                  </div>

                  {/* General Notes */}
                  <div>
                    <label
                      htmlFor="cart-general-notes"
                      className="block text-xs font-bold text-themeText/85 mb-1"
                    >
                      {isHe ? 'הערות נוספות לאירוע (אופציונלי)' : 'General Event Notes (Optional)'}
                    </label>
                    <textarea
                      id="cart-general-notes"
                      rows={2}
                      maxLength={1000}
                      value={generalNotes}
                      onChange={(e) => setGeneralNotes(e.target.value)}
                      placeholder={isHe ? 'פרטי כניסה, קומה, דגשים להגשה...' : 'Access details, serving notes...'}
                      className="w-full bg-themeBg border border-themeText/20 focus:border-themePrimary rounded-lg p-2 text-xs outline-none text-themeText resize-none"
                    />
                  </div>

                  {/* Setup & Cleanup services option */}
                  <label className="flex items-start gap-3 p-2.5 border border-themeText/15 rounded-lg cursor-pointer hover:bg-themeBg/50 transition-colors w-full">
                    <input
                      type="checkbox"
                      checked={wantsSetup}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (checked) {
                          setFeedback({
                            isOpen: true,
                            type: 'info',
                            title: isHe ? 'תוספת שירותי עריכה ופינוי' : 'Add Setup & Cleanup Services',
                            message: isHe
                              ? calculationSettings?.setupServiceDetailsHe ||
                              'שירות עריכה ופינוי מקצועי לאירוע (בתיאום מראש).'
                              : calculationSettings?.setupServiceDetailsEn ||
                              'Professional setup and cleanup service (coordinated in advance).',
                            isConfirm: true,
                            confirmText: isHe ? 'הוסף שירות' : 'Add Service',
                            onConfirm: () => {
                              setWantsSetup(true);
                              closeFeedback();
                            },
                          });
                        } else {
                          setWantsSetup(false);
                        }
                      }}
                      className="w-4 h-4 mt-0.5 text-themePrimary rounded accent-themePrimary"
                    />
                    <div className="text-start flex-1">
                      <div className="flex justify-between items-center w-full">
                        <span className="font-bold text-xs text-themeText">
                          {isHe ? 'תוספת שירותי עריכה ופינוי' : 'Add Setup & Cleanup Services'}
                        </span>
                        {appConfig.ecommerce_mode && (
                          <span className="text-themePrimary font-bold text-xs">₪1,000</span>
                        )}
                      </div>
                      <span className="text-[11px] text-themeText/70 block leading-tight mt-0.5">
                        {isHe
                          ? 'בתיאום מראש מול איילה'
                          : 'Coordinated in advance with Ayala'}
                      </span>
                    </div>
                  </label>
                </form>

                {/* Cart Items List */}
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-themeText/65 space-y-3 bg-themeCardBg rounded-xl border border-themeText/10">
                    <ShoppingBag size={48} strokeWidth={1.2} className="opacity-40" />
                    <p className="text-base font-medium">{t.emptyCart as string}</p>
                  </div>
                ) : (
                  <div className="bg-themeCardBg rounded-xl border border-themeText/15 p-4 space-y-4">
                    <h3 className="text-xs font-bold text-themeText/75 uppercase tracking-wider">
                      {isHe ? `מנות בבקשה (${cart.length})` : `Selected Items (${cart.length})`}
                    </h3>
                    {cart.map((item) => {
                      const localItem = getLocalizedItem(item, language);
                      return (
                        <div
                          key={
                            item.id +
                            (item.notes || '') +
                            (item.selected_modifications?.join('') || '')
                          }
                          className="flex gap-3 border-b border-themeText/10 pb-3 last:border-0 last:pb-0"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-themeText text-base">{localItem.name}</h4>
                            {appConfig.ecommerce_mode && (
                              <p className="text-xs text-themeText/75 font-medium">
                                ₪{item.price} / {getUnitName(item.unit_type)}
                              </p>
                            )}
                            {item.is_tray && item.units_per_tray && (
                              <p className="text-xs text-themePrimary font-bold mt-0.5">
                                {isHe
                                  ? `${item.units_per_tray} יחידות במגש`
                                  : `${item.units_per_tray} units per tray`}
                              </p>
                            )}
                            {item.selected_modifications && item.selected_modifications.length > 0 && (
                              <div className="text-xs text-themeText/75 mt-1">
                                {item.selected_modifications.join(', ')}
                              </div>
                            )}
                            {item.notes && (
                              <div className="text-xs text-themeText/70 italic mt-0.5">
                                &ldquo;{item.notes}&rdquo;
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {appConfig.ecommerce_mode && (
                              <div className="font-bold text-themeText text-base">
                                ₪{item.price * item.quantity}
                              </div>
                            )}
                            <div className="flex items-center gap-1 bg-themeBg border border-themeText/20 rounded-lg p-1">
                              <button
                                type="button"
                                aria-label={
                                  isHe
                                    ? `הפחת כמות של ${localItem.name}`
                                    : `Decrease ${localItem.name} quantity`
                                }
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-7 h-7 grid place-items-center hover:bg-themeCardBg rounded text-themeText"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-sm font-bold w-6 text-center text-themeText">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                aria-label={
                                  isHe
                                    ? `הגדל כמות של ${localItem.name}`
                                    : `Increase ${localItem.name} quantity`
                                }
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-7 h-7 grid place-items-center hover:bg-themeCardBg rounded text-themeText"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="p-4 bg-themeCardBg border-t border-themeText/15 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.12)] z-10 shrink-0 pb-safe text-themeCardTxt">
                {/* Coupon (ecommerce mode only) */}
                {cart.length > 0 && appConfig.ecommerce_mode && (
                  <div className="mb-3 bg-themeBg/60 p-2.5 rounded-xl border border-themeText/15">
                    {activeCoupon ? (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                          <Tag size={14} />
                          <span>
                            {t.couponApplied as string} ({activeCoupon.code})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={removeCoupon}
                          className="text-red-700 hover:underline font-bold"
                        >
                          {t.removeCoupon as string}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder={t.couponCode as string}
                          aria-label={t.couponCode as string}
                          className="flex-1 bg-themeBg border border-themeText/20 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-themePrimary text-themeText uppercase"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={!couponInput || isValidatingCoupon}
                          className="bg-themeHeaderBg text-themeHeaderTxt px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50"
                        >
                          {isValidatingCoupon ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            (t.applyCoupon as string)
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {appConfig.ecommerce_mode && (
                  <div className="space-y-1 mb-3 text-xs">
                    <div className="flex justify-between text-themeCardTxt/80">
                      <span>{t.subtotal as string}:</span>
                      <span>₪{subtotal}</span>
                    </div>
                    {activeCoupon && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>{t.discount as string}:</span>
                        <span>-₪{discountAmount}</span>
                      </div>
                    )}
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-themeCardTxt/85 font-bold">
                        <span className="flex items-center gap-1">
                          <Truck size={12} /> {t.delivery as string}:
                        </span>
                        <span>₪{deliveryFee}</span>
                      </div>
                    )}
                    {wantsSetup && (
                      <div className="flex justify-between text-themeCardTxt/85 font-bold">
                        <span>{isHe ? 'שירותי עריכה ופינוי:' : 'Setup & Cleanup:'}</span>
                        <span>₪1,000</span>
                      </div>
                    )}
                    <div className="border-t border-themeText/15 pt-1.5 flex justify-between items-center">
                      <span className="text-sm font-bold">{t.finalTotal as string}:</span>
                      <span className="text-2xl font-bold font-serif">₪{finalTotal}</span>
                    </div>
                  </div>
                )}

                {/* Unified Missing/Invalid Summary synced to shared validator */}
                {(validation.errors.length > 0 || belowEcommerceMinOrder) && cart.length > 0 && (
                  <div className="mb-3 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs text-start">
                    <div className="font-bold mb-1">
                      {isHe ? 'יש להשלים או לתקן לפני שליחה:' : 'Required before submitting:'}
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {validation.errors.map((err, idx) => (
                        <li key={idx}>{isHe ? err.he : err.en}</li>
                      ))}
                      {belowEcommerceMinOrder && (
                        <li>
                          {isHe
                            ? `מינימום הזמנה הוא ₪${MIN_ORDER}`
                            : `Minimum order is ₪${MIN_ORDER}`}
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2.5">
                  {cart.length > 0 && (
                    <a
                      href={draftWhatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 border border-themeText/25 text-themeCardTxt font-bold py-3 rounded-xl hover:bg-themeBg transition flex items-center justify-center gap-1.5 text-xs sm:text-sm"
                    >
                      <Share2 size={15} />
                      <span className="hidden sm:inline">{t.shareDraft as string}</span>
                      <span className="sm:hidden">{isHe ? 'טיוטה' : 'Draft'}</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleQuoteSubmit()}
                    disabled={isCheckoutDisabled}
                    className="flex-[2] bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md flex items-center justify-center gap-2 text-sm"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <span>
                          {appConfig.ecommerce_mode
                            ? (t.checkout as string)
                            : isHe
                              ? 'שמירה והפקת בקשת הצעת מחיר'
                              : 'Save & Prepare Quote Request'}
                        </span>
                        <Send size={16} />
                      </>
                    )}
                  </button>
                </div>

                <p className="text-center text-[11px] text-themeCardTxt/70 mt-2">
                  {t.checkoutSub as string}
                </p>
              </div>
            </>
          )}
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
        cancelText={isHe ? 'ביטול' : 'Cancel'}
        isConfirm={feedback.isConfirm}
      />
    </>,
    document.body
  );
};
