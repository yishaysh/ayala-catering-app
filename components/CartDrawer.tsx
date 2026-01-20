
import React from 'react';
import { useStore, translations, getLocalizedItem } from '../store';
import { X, ShoppingBag, Send, Minus, Plus, Trash2, Share2, Sparkles } from 'lucide-react';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
    const { cart, updateQuantity, cartTotal, language, clearCart } = useStore();
    const t = translations[language] || translations['he'];
    const total = cartTotal();
    
    const MIN_ORDER = 500;
    const VIP_THRESHOLD = 1500;

    if (!isOpen) return null;

    const handleClearCart = () => {
        if (window.confirm(t.clearCartConfirm)) {
            clearCart();
        }
    };

    const handleShareDraft = () => {
        const line = "━━━━━━━━━━━━━━━━";
        let message = language === 'he' ? `*טיוטת הזמנה מאיילה פשוט טעים (לאישורכם):* 📝\n${line}\n\n` : `*Draft order from Ayala Simply Delicious (for review):* 📝\n${line}\n\n`;
        
        cart.forEach(item => {
            const displayItem = getLocalizedItem(item, language);
            message += `🔹 *${item.quantity}x ${displayItem.name}*\n\n`;
        });
        message += `*${t.total}: ₪${total}*`;
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    const handleWhatsAppCheckout = () => {
        const line = "━━━━━━━━━━━━━━━━";
        let message = language === 'he' ? `*היי איילה, אשמח לבצע הזמנה:* 🍽️\n${line}\n\n` : `*Hi Ayala, I'd like to place an order:* 🍽️\n${line}\n\n`;
        
        cart.forEach(item => {
            const displayItem = getLocalizedItem(item, language);
            message += `🔹 *${item.quantity}x ${displayItem.name}*\n`;
            if (item.selected_modifications?.length) message += `   🔸 שינויים: ${item.selected_modifications.join(', ')}\n`;
            if (item.notes) message += `   ✏️ הערות: ${item.notes}\n`;
            message += `\n`; 
        });

        message += `${line}\n*${t.total}: ₪${total}* 💰`;
        window.open(`https://wa.me/972547474764?text=${encodeURIComponent(message)}`, '_blank');
    };

    // Fix: Explicit string mapping to avoid ReactNode type errors
    const getUnitName = (type: string): string => {
      const units: Record<string, string> = {
        tray: t.tray as string,
        liter: t.liter as string,
        unit: t.unit as string,
        weight: t.weight as string
      };
      return units[type] || type;
    };

    const progress = Math.min((total / VIP_THRESHOLD) * 100, 100);

    return (
        <div className="fixed inset-0 z-50 flex justify-end font-sans">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose}></div>

            <div className={`relative w-full max-w-md bg-stone-50 h-full shadow-2xl flex flex-col ${language === 'he' ? 'animate-slide-in-left' : 'animate-slide-in-right'}`}>
                <div className="p-6 bg-stone-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="text-gold-500" />
                        <h2 className="text-xl font-serif font-bold">{t.myOrder}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {cart.length > 0 && <button onClick={handleClearCart} className="text-stone-400 hover:text-red-400 p-1"><Trash2 size={20} /></button>}
                        <button onClick={onClose} className="hover:text-gold-500 transition hover:rotate-90"><X /></button>
                    </div>
                </div>

                <div className="bg-stone-800 px-6 py-4 shadow-inner">
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-2">
                        <span>{t.freeDeliveryAt}</span>
                        {total < VIP_THRESHOLD ? (
                            <span>{t.justMore} ₪{VIP_THRESHOLD - total} {t.forVip}</span>
                        ) : (
                            <span className="text-gold-500 flex items-center gap-1"><Sparkles size={10} /> {t.vipDelivery}</span>
                        )}
                    </div>
                    <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all duration-700 ease-out relative"
                            style={{ width: `${progress}%` }}
                        >
                            {progress > 0 && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-stone-400 space-y-4">
                            <ShoppingBag size={64} className="opacity-10" />
                            <p className="text-lg">{t.emptyCart}</p>
                        </div>
                    ) : (
                        cart.map((item) => {
                            const localItem = getLocalizedItem(item, language);
                            return (
                                <div key={item.id + (item.notes || '')} className="flex gap-4 border-b border-stone-200 pb-4 last:border-0">
                                    <div className="flex-1 text-start">
                                        <h4 className="font-bold text-stone-800">{localItem.name}</h4>
                                        <p className="text-xs text-stone-500">₪{item.price} / {getUnitName(item.unit_type)}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="font-bold">₪{item.price * item.quantity}</span>
                                        <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-1 shadow-sm">
                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 grid place-items-center hover:bg-stone-50"><Minus size={14} /></button>
                                            <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 grid place-items-center hover:bg-stone-50"><Plus size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-6 bg-white border-t border-stone-200 shadow-2xl z-10 pb-safe">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-stone-500">{t.total}:</span>
                        <span className="text-3xl font-bold font-serif">₪{total}</span>
                    </div>
                    
                    {total < MIN_ORDER && total > 0 && (
                        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs mb-4 text-center">
                            ⚠️ {t.minOrder}: ₪{MIN_ORDER}
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleWhatsAppCheckout}
                            disabled={total < MIN_ORDER || cart.length === 0}
                            className="w-full bg-green-600 text-white font-bold py-4 rounded-xl disabled:opacity-50 hover:bg-green-700 transition shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                        >
                            <Send size={18} /> {t.checkout}
                        </button>
                        
                        {cart.length > 0 && (
                            <button 
                                onClick={handleShareDraft}
                                className="w-full border border-stone-200 text-stone-600 font-bold py-3 rounded-xl hover:bg-stone-50 transition flex items-center justify-center gap-2 text-sm"
                            >
                                <Share2 size={16} /> {t.shareDraft}
                            </button>
                        )}
                    </div>
                    <p className="text-center text-[10px] text-stone-400 mt-4">{t.checkoutSub}</p>
                </div>
            </div>
        </div>
    );
};
