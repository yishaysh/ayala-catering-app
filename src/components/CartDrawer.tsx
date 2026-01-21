
import React from 'react';
import { useStore, translations, getLocalizedItem } from '../store';
import { X, ShoppingBag, Send, Minus, Plus, Trash2, Share2, Sparkles } from 'lucide-react';
import { useBackButton } from '../hooks/useBackButton';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
    const { cart, updateQuantity, cartTotal, language, clearCart } = useStore();
    const t = translations[language] || translations['he'];
    const total = cartTotal();
    
    // Handle Android/iOS Back Button
    useBackButton(isOpen, onClose);

    const MIN_ORDER = 500;
    const VIP_THRESHOLD = 1500;

    if (!isOpen) return null;

    const handleClearCart = () => {
        if (window.confirm(t.clearCartConfirm as string)) {
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
        message += `*${t.total as string}: ₪${total}*`;
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    const handleWhatsAppCheckout = () => {
        const line = "━━━━━━━━━━━━━━━━";
        let message = "";

        if (language === 'he') {
            message += `*היי איילה, אשמח לבצע הזמנה:* 🍽️\n${line}\n\n`;
        } else {
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

    const progress = Math.min((total / VIP_THRESHOLD) * 100, 100);

    return (
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
                                onClick={handleClearCart}
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

                <div className="bg-stone-800 px-6 py-4 shadow-inner">
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-2">
                        <span>{t.freeDeliveryAt as string}</span>
                        {total < VIP_THRESHOLD ? (
                            <span>{t.justMore as string} ₪{VIP_THRESHOLD - total} {t.forVip as string}</span>
                        ) : (
                            <span className="text-gold-500 flex items-center gap-1"><Sparkles size={10} /> {t.vipDelivery as string}</span>
                        )}
                    </div>
                    <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-stone-400 space-y-4">
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

                <div className="p-6 bg-white border-t border-stone-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10 shrink-0 pb-safe">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-lg text-stone-600">{t.total as string}:</span>
                        <span className="text-3xl font-bold font-serif text-stone-900">₪{total}</span>
                    </div>
                    
                    {total < MIN_ORDER && total > 0 && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4 border border-red-100 flex items-center justify-center gap-2">
                            <span>⚠️</span>
                            {t.minOrder as string}: ₪{MIN_ORDER}
                        </div>
                    )}

                    <button 
                        onClick={handleWhatsAppCheckout}
                        disabled={total < MIN_ORDER || cart.length === 0}
                        className="w-full bg-green-600 text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 group"
                    >
                        <span>{t.checkout as string}</span>
                        <Send size={18} className={`transition-transform ${language === 'he' ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                    </button>
                    {cart.length > 0 && (
                        <button onClick={handleShareDraft} className="w-full mt-3 border border-stone-200 text-stone-600 font-bold py-3 rounded-xl hover:bg-stone-50 transition flex items-center justify-center gap-2 text-sm"><Share2 size={16} /> {t.shareDraft as string}</button>
                    )}
                    <p className="text-center text-xs text-stone-400 mt-3 font-medium">
                        {t.checkoutSub as string}
                    </p>
                </div>
            </div>
        </div>
    );
};
