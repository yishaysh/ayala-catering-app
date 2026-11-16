import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/api';
import { useStore } from '../store';
import {
  Loader2,
  Printer,
  MessageCircle,
  MapPin,
  Calendar,
  Users,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import type { CustomerSafeQuoteView } from '../types';
import { DEFAULT_CONTACT_CONFIG } from '../../shared/config';

interface CustomerQuoteViewProps {
  token?: string;
  legacyQuoteId?: string;
}

export const CustomerQuoteView: React.FC<CustomerQuoteViewProps> = ({
  token,
  legacyQuoteId,
}) => {
  const { language } = useStore();
  const isHe = language === 'he';
  const [quote, setQuote] = useState<CustomerSafeQuoteView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadQuote = async () => {
      setLoading(true);
      setError(null);
      try {
        if (token) {
          const res = await api.fetchScopedQuote(token);
          if (active) setQuote(res.quote);
        } else if (legacyQuoteId) {
          await api.fetchLegacyQuoteError(legacyQuoteId);
        } else {
          if (active) {
            setError(
              isHe
                ? 'קישור ההצעה חסר או לא תקין.'
                : 'Quote link token is missing or invalid.'
            );
          }
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError) {
          const details = (err.details || {}) as Record<string, unknown>;
          const msg =
            (isHe ? (details.errorHe as string) : (details.errorEn as string)) || err.message;
          setError(msg);
        } else {
          setError(
            isHe ? 'לא הצלחנו לטעון את ההצעה כרגע.' : 'Unable to load quote right now.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadQuote();
    return () => {
      active = false;
    };
  }, [token, legacyQuoteId, isHe]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-themeBg text-themeText">
        <Loader2 className="animate-spin text-themePrimary mb-4" size={44} />
        <p className="text-sm font-medium">
          {isHe ? 'טוען סיכום בקשת הצעה...' : 'Loading quote summary...'}
        </p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div
        dir={isHe ? 'rtl' : 'ltr'}
        className="min-h-screen flex flex-col items-center justify-center bg-themeBg text-themeText p-4 text-center"
      >
        <div className="bg-themeCardBg border border-themeText/15 rounded-2xl p-8 max-w-md shadow-md space-y-4">
          <ShieldCheck className="mx-auto text-themePrimary" size={36} />
          <h1 className="text-lg font-bold text-themeText">
            {isHe ? 'צפייה מאובטחת בבקשת הצעה' : 'Protected Quote Access'}
          </h1>
          <p className="text-sm text-themeText/80 leading-relaxed">
            {error || (isHe ? 'ההצעה לא נמצאה.' : 'Quote not found.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <a
              href="/"
              className="px-5 py-2.5 bg-themePrimary text-white font-bold rounded-xl hover:opacity-95 transition text-sm"
            >
              {isHe ? 'חזרה לתפריט' : 'Back to Menu'}
            </a>
            <a
              href={`tel:${DEFAULT_CONTACT_CONFIG.phoneTel}`}
              className="px-5 py-2.5 border border-themeText/25 text-themeText font-bold rounded-xl hover:bg-themeText/5 transition text-sm"
            >
              {DEFAULT_CONTACT_CONFIG.phoneDisplay}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const whatsappDigits =
    quote.contact?.whatsappDigits || DEFAULT_CONTACT_CONFIG.whatsappDigits;

  const eventTypeLabel =
    quote.event_type === 'basic'
      ? isHe
        ? 'אירוע משפחתי בסיס'
        : 'Basic Family Event'
      : quote.event_type === 'plus'
      ? isHe
        ? 'אירוע עסקי / קוקטייל'
        : 'Business / Plus Event'
      : quote.event_type === 'premium'
      ? isHe
        ? 'אירוע פרימיום מלא'
        : 'Premium Event'
      : quote.event_type || (isHe ? 'אירוע מותאם' : 'Custom Event');

  const whatsappText = isHe
    ? `שלום איילה, בנוגע לבקשת ההצעה מספר ${quote.reference_code} לתאריך ${quote.event_date}`
    : `Hi Ayala, regarding my quote request ${quote.reference_code} for ${quote.event_date}`;

  return (
    <div
      dir={isHe ? 'rtl' : 'ltr'}
      className="min-h-screen bg-themeBg text-themeText relative pb-16 print:bg-white print:pb-0"
    >
      <div className="relative z-10 container mx-auto px-4 max-w-4xl pt-6 sm:pt-8 print:pt-0 print:px-0">
        {/* Actions header (hidden in print) */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-3 print:hidden">
          <a
            href="/"
            className="text-sm font-bold text-themePrimary hover:underline flex items-center gap-1"
          >
            {isHe ? '← חזרה לאתר' : '← Back to Site'}
          </a>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-themePrimary text-white rounded-xl hover:opacity-95 transition text-sm font-bold shadow-sm"
            >
              <Printer size={16} />
              <span>{isHe ? 'הדפסה / שמירה כ-PDF' : 'Print / Save PDF'}</span>
            </button>
            <a
              href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition text-sm font-bold shadow-sm"
            >
              <MessageCircle size={16} />
              <span>{isHe ? 'פנייה בוואטסאפ לאיילה' : 'Message Ayala on WhatsApp'}</span>
            </a>
          </div>
        </div>

        {/* Printable Document Container */}
        <article
          id="quote-paper-container"
          className="bg-themeCardBg border border-themeText/15 rounded-3xl p-6 md:p-10 shadow-xl print:shadow-none print:border-0 print:rounded-none print:p-2"
        >
          {/* Header */}
          <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-themeText/15 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <img
                src="/logo_text.png"
                alt={isHe ? 'איילה פשוט טעים' : 'Ayala Catering'}
                className="w-16 h-16 object-contain rounded-xl bg-themeHeaderBg p-1"
              />
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-themePrimary">
                  {isHe ? 'איילה פשוט טעים' : 'Ayala — Simply Delicious'}
                </h1>
                <p className="text-xs text-themeText/75">
                  {isHe
                    ? 'קייטרינג חלבי בוטיק ומגשי אירוח מעוצבים'
                    : 'Boutique Dairy Catering & Curated Platters'}
                </p>
              </div>
            </div>

            <div className="text-start md:text-end space-y-1">
              <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-950 text-xs font-bold border border-amber-300">
                {isHe ? 'כפוף לאישור איילה' : 'Subject to Ayala Confirmation'}
              </div>
              <p className="text-sm font-bold text-themeText">
                {isHe ? 'מספר פנייה:' : 'Reference:'}{' '}
                <span dir="ltr" className="font-mono">
                  {quote.reference_code}
                </span>
              </p>
              <p className="text-xs text-themeText/75">
                {isHe ? 'תאריך הגשה:' : 'Submitted:'}{' '}
                {quote.created_at
                  ? new Date(quote.created_at).toLocaleDateString(isHe ? 'he-IL' : 'en-US')
                  : '-'}
              </p>
            </div>
          </header>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-themeBg/60 border border-themeText/10 rounded-2xl p-5 mb-6 break-inside-avoid">
            <div className="space-y-1.5 text-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-themeText/70 mb-2">
                {isHe ? 'פרטי הפונה' : 'Contact Details'}
              </h2>
              <p>
                <strong>{isHe ? 'שם:' : 'Name:'}</strong> {quote.customer_name}
              </p>
              <p className="flex items-start gap-1.5 pt-1">
                <MapPin size={15} className="shrink-0 mt-0.5 text-themePrimary" />
                <span>
                  <strong>{isHe ? 'אופן אספקה:' : 'Fulfillment:'}</strong>{' '}
                  {quote.delivery_method === 'delivery'
                    ? `${isHe ? 'משלוח אל' : 'Delivery to'} ${quote.delivery_address || '-'}${
                        quote.distance_km != null ? ` (${quote.distance_km} ק"מ)` : ''
                      }`
                    : quote.pickup_guidance_he && isHe
                    ? quote.pickup_guidance_he
                    : quote.pickup_guidance_en}
                </span>
              </p>
            </div>

            <div className="space-y-1.5 text-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-themeText/70 mb-2">
                {isHe ? 'פרטי האירוע' : 'Event Details'}
              </h2>
              <p className="flex items-center gap-1.5">
                <Calendar size={15} className="shrink-0 text-themePrimary" />
                <span>
                  <strong>{isHe ? 'מועד:' : 'Date:'}</strong>{' '}
                  <span dir="ltr">
                    {quote.event_date}
                    {quote.event_time ? ` · ${quote.event_time}` : ''}
                  </span>
                </span>
              </p>
              <p>
                <strong>{isHe ? 'סוג אירוע:' : 'Event Type:'}</strong> {eventTypeLabel}
              </p>
              {(quote.adult_count != null || quote.child_count != null) && (
                <p className="flex items-center gap-1.5">
                  <Users size={15} className="shrink-0 text-themePrimary" />
                  <span>
                    <strong>{isHe ? 'אורחים:' : 'Guests:'}</strong>{' '}
                    {quote.adult_count ?? 0} {isHe ? 'מבוגרים' : 'adults'}
                    {quote.child_count ? `, ${quote.child_count} ${isHe ? 'ילדים' : 'children'}` : ''}
                  </span>
                </p>
              )}
              {quote.wants_setup && (
                <p className="font-semibold text-themePrimary">
                  • {isHe ? 'נדרש שירות עריכה ופינוי' : 'Setup & clearing service requested'}
                </p>
              )}
            </div>
          </div>

          {quote.allergy_notes && (
            <div className="mb-6 bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl p-4 text-sm flex items-start gap-2 break-inside-avoid">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-700" />
              <div>
                <strong>{isHe ? 'רגישויות / אלרגיות (טעון אישור איילה):' : 'Allergy Notes (Requires Ayala confirmation):'}</strong>{' '}
                {quote.allergy_notes}
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-themePrimary">
                  <th style={{ width: '75%' }} className="py-3 px-3 text-start font-bold text-themePrimary">
                    {isHe ? 'מנה / פריט' : 'Dish / Item'}
                  </th>
                  <th style={{ width: '25%' }} className="py-3 px-3 text-center font-bold text-themePrimary">
                    {isHe ? 'כמות' : 'Qty'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-themeText/10">
                {quote.items.map((item, idx) => {
                  const title = isHe ? item.name : item.name_en || item.name;
                  const mods = item.selected_modifications || [];
                  return (
                    <tr key={`${item.id}-${idx}`} className="break-inside-avoid">
                      <td className="py-3 px-3 text-start">
                        <p className="font-bold text-themeText">{title}</p>
                        {mods.length > 0 && (
                          <p className="text-xs text-themeText/75 mt-0.5">
                            {isHe ? 'התאמות:' : 'Modifications:'} {mods.join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs italic text-themeText/70 mt-0.5">{item.notes}</p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-base text-themeText">
                        {item.quantity}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {quote.notes && (
            <div className="mb-6 bg-themeBg/60 border border-themeText/15 rounded-2xl p-4 text-sm break-inside-avoid">
              <strong className="block text-xs text-themeText/70 mb-1">
                {isHe ? 'הערות נוספות מהלקוח:' : 'Customer Notes:'}
              </strong>
              <p className="whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Summary Box */}
          {typeof quote.total_price === 'number' && (
            <div className="flex justify-end mb-6 break-inside-avoid">
              <div className="bg-themePrimary/5 border border-themePrimary/20 rounded-2xl p-5 min-w-[280px] sm:min-w-[340px] space-y-2 text-sm text-themeText/85">
                {Number(quote.discount_amount || 0) > 0 && (
                  <>
                    <div className="flex justify-between items-center text-xs text-themeText/70">
                      <span>{isHe ? 'סכום לפני הנחה:' : 'Original Amount:'}</span>
                      <span className="line-through font-bold">₪{Number(quote.subtotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-amber-600 font-bold">
                      <span>{isHe ? 'הנחה:' : 'Discount:'}</span>
                      <span>-₪{Number(quote.discount_amount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-emerald-700 font-bold pb-1.5 border-b border-themeText/10">
                      <span>{isHe ? 'סכום לאחר הנחה:' : 'Amount After Discount:'}</span>
                      <span>₪{(Number(quote.subtotal || 0) - Number(quote.discount_amount || 0)).toLocaleString()}</span>
                    </div>
                  </>
                )}

                {quote.delivery_method === 'delivery' && Number(quote.delivery_fee || 0) > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span>🚚 {isHe ? 'דמי משלוח (חלק מהמחיר):' : 'Delivery Fee (Included):'}</span>
                    <span className="font-bold">₪{Number(quote.delivery_fee).toLocaleString()}</span>
                  </div>
                )}

                {quote.wants_setup && (
                  <div className="flex justify-between items-center text-xs">
                    <span>✨ {isHe ? 'שירותי עריכה ופינוי (חלק מהמחיר):' : 'Setup & Cleanup (Included):'}</span>
                    <span className="font-bold">₪1,000</span>
                  </div>
                )}

                <div className="border-t border-themePrimary/20 pt-3 mt-2 flex justify-between items-baseline">
                  <span className="text-xs font-bold uppercase tracking-wider text-themeText">
                    {isHe ? 'שורה תחתונה / סה"כ לתשלום:' : 'Bottom Line / Total Price:'}
                  </span>
                  <span className="text-2xl font-serif font-bold text-themePrimary">
                    ₪{Number(quote.total_price || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Footer / Contact info */}
          <div className="border-t border-themeText/15 pt-5 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center break-inside-avoid">
            <div className="text-xs text-themeText/75 space-y-1 max-w-lg">
              <p className="font-bold text-themeText">
                {isHe
                  ? 'מסמך זה מהווה סיכום הצעת המחיר וכפוף לאישור זמינות סופי מול איילה.'
                  : 'This document summarizes your quote and is subject to final availability confirmation by Ayala.'}
              </p>
              <p>
                {isHe ? 'ליצירת קשר:' : 'Contact:'}{' '}
                <span dir="ltr">{quote.contact?.phoneDisplay || DEFAULT_CONTACT_CONFIG.phoneDisplay}</span>
                {quote.contact?.contactEmail ? ` · ${quote.contact.contactEmail}` : ''}
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};
