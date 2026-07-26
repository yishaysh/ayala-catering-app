import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Loader2, Printer, Phone, Download } from 'lucide-react';

interface CustomerQuoteViewProps {
  quoteId: string;
}

export const CustomerQuoteView: React.FC<CustomerQuoteViewProps> = ({ quoteId }) => {
  const { theme, language, menuItems } = useStore();
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
  
  // Dynamic fallback calculation if order.subtotal or item prices in DB are 0
  const calculatedSubtotal = items.reduce((sum: number, item: any) => {
    let price = item.price || 0;
    if (!price || price === 0) {
      const menuI = menuItems.find((m: any) => m.id === item.id || m.name === item.name);
      if (menuI) price = menuI.price;
    }
    return sum + (price * (item.quantity || 1));
  }, 0);

  const subtotal = (order.subtotal && order.subtotal > 0) ? order.subtotal : calculatedSubtotal;
  const finalTotal = (order.total_price && order.total_price > 0) 
    ? order.total_price 
    : Math.max(0, subtotal - discountAmount + deliveryFee + setupFee);

  const dateStr = order.event_date ? new Date(order.event_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US') : '';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const element = document.getElementById('quote-paper-container');
    if (!element) return;
    if ((window as any).html2pdf) {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `הצעת_מחיר_איילה_#${order.id ? order.id.slice(0, 8) : 'quote'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      (window as any).html2pdf().set(opt).from(element).save();
    } else {
      window.print();
    }
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
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-4 py-2 bg-themePrimary text-themeCardBg rounded-xl hover:opacity-90 transition text-sm font-bold shadow-sm"
            >
              <Download size={16} />
              <span>{isHe ? 'הורדת קובץ PDF' : 'Download PDF'}</span>
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 border border-themeText/20 rounded-xl hover:bg-themeCardBg transition text-sm font-bold shadow-sm"
            >
              <Printer size={16} />
              <span>{isHe ? 'הדפסה' : 'Print'}</span>
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
        <div id="quote-paper-container" className="bg-themeCardBg border border-themeText/5 rounded-3xl p-6 md:p-12 shadow-xl shadow-themeText/5">
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
                  <th className="py-3 px-4 text-left md:text-center text-sm font-bold text-themePrimary">{isHe ? 'כמות' : 'Qty'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => {
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
                      <td className="py-4 px-4 text-left md:text-center text-sm font-medium text-themeText/80">
                        {item.quantity}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Line Total Summary */}
          <div className="flex justify-end border-t border-themeText/10 pt-6">
            <div className="bg-themePrimary/5 border border-themePrimary/20 rounded-2xl p-6 text-right min-w-[280px] sm:min-w-[340px] shadow-sm font-sans space-y-2.5">
              {/* If discount was given */}
              {discountAmount > 0 && (
                <div className="space-y-1.5 pb-2.5 border-b border-themePrimary/15">
                  <div className="flex justify-between items-center text-xs text-themeText/70">
                    <span>{isHe ? 'סכום לפני הנחה:' : 'Original Amount:'}</span>
                    <span className="line-through text-stone-400 font-bold text-sm">₪{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-amber-600 font-bold">
                    <span>{isHe ? `אחוזי הנחה (${Math.round((discountAmount / (subtotal || 1)) * 100)}%):` : `Discount (${Math.round((discountAmount / (subtotal || 1)) * 100)}%):`}</span>
                    <span>-₪{discountAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-green-600">
                    <span>{isHe ? 'סכום לאחר הנחה:' : 'Amount After Discount:'}</span>
                    <span>₪{(subtotal - discountAmount).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Delivery Fee if present */}
              {deliveryFee > 0 && (
                <div className="flex justify-between items-center text-xs text-themeText/80 font-medium">
                  <span>🚚 {isHe ? 'דמי משלוח (חלק מהמחיר):' : 'Delivery Fee (Included):'}</span>
                  <span className="font-bold">₪{deliveryFee.toLocaleString()}</span>
                </div>
              )}

              {/* Setup & Cleanup if present */}
              {wantsSetup && (
                <div className="flex justify-between items-center text-xs text-themeText/80 font-medium">
                  <span>✨ {isHe ? 'שירותי עריכה ופינוי (חלק מהמחיר):' : 'Setup & Cleanup (Included):'}</span>
                  <span className="font-bold">₪1,000</span>
                </div>
              )}

              <div className="pt-2 border-t border-themePrimary/20 flex flex-col items-end">
                <span className="text-xs uppercase font-bold tracking-wider text-themeText/60 block mb-1">
                  {isHe ? 'שורה תחתונה / סה״כ לתשלום:' : 'Bottom Line / Total Amount:'}
                </span>
                <span className="text-3xl font-serif font-bold text-themePrimary">
                  ₪{finalTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Quote Notes Box */}
          {(order.notes || order.admin_notes) && (
            <div className="mt-8 bg-amber-500/10 border-r-4 border-amber-500 rounded-2xl p-5 text-right font-sans shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1.5 flex items-center gap-1.5">
                📌 {isHe ? 'הערות ודגשים להצעה:' : 'Notes & Remarks:'}
              </h3>
              <p className="text-xs text-themeText/90 whitespace-pre-wrap leading-relaxed font-medium">
                {order.notes || order.admin_notes}
              </p>
            </div>
          )}

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

      {/* Floating Action Bar at Bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 print:hidden max-w-[95vw] overflow-x-auto">
        <button 
          onClick={handleDownloadPdf}
          className="flex items-center gap-2 px-5 py-3 bg-themePrimary text-themeCardBg rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm font-bold shadow-md whitespace-nowrap"
        >
          <Download size={18} />
          <span>{isHe ? 'הורדת קובץ PDF' : 'Download PDF'}</span>
        </button>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-3 bg-white/15 text-white rounded-xl hover:bg-white/25 active:scale-95 transition-all text-sm font-bold shadow-md whitespace-nowrap"
        >
          <Printer size={18} />
          <span>{isHe ? 'הדפסה' : 'Print'}</span>
        </button>
        <button 
          onClick={handleContactAyala}
          className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 active:scale-95 transition-all text-sm font-bold shadow-md whitespace-nowrap"
        >
          <Phone size={18} />
          <span>{isHe ? 'פנייה בוואטסאפ' : 'Chat on WhatsApp'}</span>
        </button>
      </div>
    </div>
  );
};
