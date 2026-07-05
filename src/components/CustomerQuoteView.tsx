import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Loader2, Printer, Phone } from 'lucide-react';

interface CustomerQuoteViewProps {
  quoteId: string;
}

export const CustomerQuoteView: React.FC<CustomerQuoteViewProps> = ({ quoteId }) => {
  const { theme, language } = useStore();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', quoteId)
          .single();

        if (error) throw error;
        setOrder(data);
      } catch (err: any) {
        console.error('Error fetching quote:', err);
        setError(language === 'he' ? 'הצעת המחיר לא נמצאה או פגה' : 'Quote not found or expired');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [quoteId, language]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-themeBg text-themeText">
        <Loader2 className="animate-spin text-themePrimary mb-4" size={48} />
        <p className="text-sm font-medium">{language === 'he' ? 'טוען הצעת מחיר...' : 'Loading quote...'}</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-themeBg text-themeText p-4 text-center">
        <div className="bg-themeCardBg border border-themeText/10 rounded-2xl p-8 max-w-md shadow-sm">
          <p className="text-red-500 font-bold text-lg mb-4">⚠️</p>
          <p className="text-sm font-medium text-themeText/80 mb-6">{error || 'Error'}</p>
          <a href="/" className="px-6 py-2.5 bg-themePrimary text-themeCardBg font-bold rounded-xl hover:opacity-90 transition">
            {language === 'he' ? 'חזרה לאתר' : 'Back to site'}
          </a>
        </div>
      </div>
    );
  }

  const items = order.items || [];
  const discountAmount = order.discount_amount || 0;
  const deliveryFee = order.delivery_fee || 0;
  const wantsSetup = order.wants_setup || false;
  const setupFee = wantsSetup ? 1000 : 0;
  const subtotal = order.subtotal || 0;
  
  // Calculate final total based on prices saved in DB
  const finalTotal = order.total_price || Math.max(0, subtotal - discountAmount + deliveryFee + setupFee);

  const dateStr = order.event_date ? new Date(order.event_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US') : '';

  const handlePrint = () => {
    window.print();
  };

  const handleContactAyala = () => {
    const message = language === 'he' 
      ? `היי איילה, בקשר להצעת המחיר שלי #${order.id.slice(0,8)} מאירוח בתאריך ${dateStr}...`
      : `Hi Ayala, regarding my quote #${order.id.slice(0,8)} for the event on ${dateStr}...`;
    window.open(`https://wa.me/972528031411?text=${encodeURIComponent(message)}`, '_blank');
  };

  const isHe = language === 'he';

  return (
    <div className="min-h-screen bg-themeBg text-themeText relative pb-20">
      {/* Background Seal Watermark */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] md:w-[450px] md:h-[450px] bg-center bg-no-repeat bg-contain opacity-[0.06] mix-blend-multiply"
          style={{ backgroundImage: 'url("/seal_stamp.png")' }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 max-w-4xl pt-8">
        {/* Actions header (hide during print) */}
        <div className="flex justify-between items-center mb-8 gap-4 print:hidden">
          <a href="/" className="text-sm font-bold text-themePrimary hover:underline flex items-center gap-1">
            {isHe ? '← חזרה לחנות' : '← Back to store'}
          </a>
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border border-themeText/20 rounded-xl hover:bg-themeCardBg transition text-sm font-bold shadow-sm"
            >
              <Printer size={16} />
              <span>{isHe ? 'הדפסה / שמירה כ-PDF' : 'Print / Save PDF'}</span>
            </button>
            <button 
              onClick={handleContactAyala}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm font-bold shadow-sm"
            >
              <Phone size={16} />
              <span>{isHe ? 'פנייה בוואטסאפ' : 'Chat on WhatsApp'}</span>
            </button>
          </div>
        </div>

        {/* Paper Container */}
        <div className="bg-themeCardBg border border-themeText/5 rounded-3xl p-6 md:p-12 shadow-xl shadow-themeText/5">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 border-b border-themeText/10 pb-8 mb-8">
            <div className="flex items-center gap-4">
              <img src="https://txzzpwgmkhfemoiehjym.supabase.co/storage/v1/object/public/menu-images/logo.png" alt="Ayala Logo" className="w-16 h-16 object-contain" />
              <div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-themePrimary mb-1">איילה פשוט טעים</h1>
                <p className="text-xs text-themeText/60">{isHe ? 'קייטרינג חלבי בוטיק ומגשי אירוח מעוצבים' : 'Boutique Dairy Catering & Designed Platters'}</p>
              </div>
            </div>
            <div className="text-right md:text-left">
              <h2 className="text-xl md:text-2xl font-serif font-bold text-themeText mb-2">{isHe ? 'הצעת מחיר' : 'Quote Proposal'}</h2>
              <p className="text-xs text-themeText/60 mb-1"><strong>{isHe ? 'מספר הצעה:' : 'Quote No:'}</strong> #{order.id.slice(0, 8)}</p>
              <p className="text-xs text-themeText/60"><strong>{isHe ? 'תאריך הפקה:' : 'Date:'}</strong> {new Date(order.created_at).toLocaleDateString(isHe ? 'he-IL' : 'en-US')}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-themeBg/50 border border-themeText/5 rounded-2xl p-6 mb-8">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-themeText/40 mb-3">{isHe ? 'פרטי הלקוח' : 'Customer Details'}</h3>
              <p className="text-sm font-semibold mb-1"><strong>{isHe ? 'שם:' : 'Name:'}</strong> {order.customer_name}</p>
              <p className="text-sm font-semibold"><strong>{isHe ? 'טלפון:' : 'Phone:'}</strong> {order.customer_phone}</p>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-themeText/40 mb-3">{isHe ? 'פרטי האירוע' : 'Event Details'}</h3>
              <p className="text-sm font-semibold mb-1"><strong>{isHe ? 'סוג אירוע:' : 'Event Type:'}</strong> {
                order.event_type === 'basic' ? (isHe ? 'אירוע משפחתי בסיס' : 'Basic Family Event') :
                order.event_type === 'plus' ? (isHe ? 'אירוע עסקי' : 'Business Event') :
                order.event_type === 'premium' ? (isHe ? 'אירוע משפחתי פרימיום' : 'Premium Family Event') : (isHe ? 'לא נבחר' : 'None')
              }</p>
              <p className="text-sm font-semibold"><strong>{isHe ? 'תאריך אירוע:' : 'Event Date:'}</strong> {dateStr}</p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto -mx-6 md:-mx-12 px-6 md:px-12 mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-themePrimary">
                  <th className="py-3 px-4 text-right text-sm font-bold text-themePrimary">{isHe ? 'פריט' : 'Item'}</th>
                  <th className="py-3 px-4 text-center text-sm font-bold text-themePrimary">{isHe ? 'כמות' : 'Qty'}</th>
                  <th className="py-3 px-4 text-left text-sm font-bold text-themePrimary">{isHe ? 'מחיר' : 'Price'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => {
                  const hasDiscount = item.originalPrice && item.originalPrice > item.price;
                  return (
                    <tr key={idx} className="border-b border-themeText/5 hover:bg-themeBg/30 transition-colors">
                      <td className="py-4 px-4 text-right">
                        <p className="text-sm font-bold text-themeText">{isHe ? item.name : item.nameEn || item.name}</p>
                        {item.selectedModifications && item.selectedModifications.length > 0 && (
                          <p className="text-xs text-themeText/50 mt-1">
                            {isHe ? 'התאמות:' : 'Notes:'} {item.selectedModifications.join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs italic text-themeText/40 mt-0.5">"{item.notes}"</p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center text-sm font-medium text-themeText/80">
                        {item.quantity}
                      </td>
                      <td className="py-4 px-4 text-left text-sm font-bold text-themeText">
                        {hasDiscount ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="line-through text-xs text-themeText/40">₪{item.originalPrice}</span>
                            <span className="text-themePrimary">₪{item.price}</span>
                          </div>
                        ) : (
                          <span>₪{item.price}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Wrapper */}
          <div className="flex justify-end border-t border-themeText/10 pt-6">
            <table className="w-80 text-sm">
              <tbody>
                <tr className="border-b border-themeText/5">
                  <td className="py-2 text-right text-themeText/60">{isHe ? 'סיכום ביניים:' : 'Subtotal:'}</td>
                  <td className="py-2 text-left font-semibold text-themeText">₪{subtotal}</td>
                </tr>
                {discountAmount > 0 && (
                  <tr className="border-b border-themeText/5 text-themePrimary">
                    <td className="py-2 text-right">{isHe ? 'הטבה / הנחה:' : 'Discount:'}</td>
                    <td className="py-2 text-left font-bold">-₪{discountAmount}</td>
                  </tr>
                )}
                {deliveryFee > 0 && (
                  <tr className="border-b border-themeText/5">
                    <td className="py-2 text-right text-themeText/60">{isHe ? 'משלוח:' : 'Delivery:'}</td>
                    <td className="py-2 text-left font-semibold text-themeText">₪{deliveryFee}</td>
                  </tr>
                )}
                {wantsSetup && (
                  <tr className="border-b border-themeText/5">
                    <td className="py-2 text-right text-themeText/60">{isHe ? 'עריכה ופינוי:' : 'Setup & Cleanup:'}</td>
                    <td className="py-2 text-left font-semibold text-themeText">₪1,000</td>
                  </tr>
                )}
                <tr>
                  <td className="py-4 text-right text-base font-bold text-themeText">{isHe ? 'סה״כ לתשלום:' : 'Total Price:'}</td>
                  <td className="py-4 text-left text-2xl font-bold font-serif text-themePrimary">₪{finalTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Terms / Bottom */}
          <div className="mt-12 border-t border-themeText/5 pt-6 text-center text-xs text-themeText/50 leading-relaxed max-w-md mx-auto">
            {isHe ? (
              <p>הצעת מחיר זו בתוקף ל-30 יום מיום הפקתה.<br />תנאי תשלום: 50% מקדמה לאישור ההזמנה, היתרה ביום האירוע.</p>
            ) : (
              <p>This proposal is valid for 30 days from the date of issue.<br />Payment: 50% deposit to confirm order, balance due on event day.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
