import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, ExternalLink, Volume2, VolumeX, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';

interface NotificationBellProps {
  onOpenOrder?: (orderId: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onOpenOrder }) => {
  const { language, menuItems } = useStore();
  const [unreadOrders, setUnreadOrders] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());

  // Web Audio Context reference unlocked on mobile touch
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Unlock AudioContext on first user interaction (mobile Safari / Chrome requirement)
  useEffect(() => {
    const unlockAudio = () => {
      try {
        if (!audioCtxRef.current) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            audioCtxRef.current = new AudioCtx();
          }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      } catch (e) {
        console.warn("Could not unlock audio context:", e);
      }
    };

    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('click', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  // Play pleasant chime sound
  const playChimeSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      // Note 1 (E5 - 659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.5);

      // Note 2 (A5 - 880 Hz) slightly delayed
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime);
        gain2.gain.setValueAtTime(0.25, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.7);
      }, 150);
    } catch (e) {
      console.warn("Could not play chime sound:", e);
    }
  };

  // Fetch pending orders function
  const fetchPendingOrders = async (isPolling = false) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        // Detect newly arrived orders during polling
        if (isPolling) {
          const brandNewOrders = data.filter(order => !knownOrderIdsRef.current.has(order.id));
          if (brandNewOrders.length > 0) {
            playChimeSound();
            const latest = brandNewOrders[0];
            const name = latest.customer_name || (language === 'he' ? 'לקוח חדש' : 'New Customer');
            setToastMessage(
              language === 'he'
                ? `🔔 הזמנה חדשה נכנסה למערכת מ-${name}!`
                : `🔔 New order received from ${name}!`
            );
            setTimeout(() => setToastMessage(null), 6000);
          }
        }

        // Update known IDs
        data.forEach(order => knownOrderIdsRef.current.add(order.id));
        setUnreadOrders(data);
      }
    } catch (err) {
      console.error("Error fetching pending orders:", err);
    }
  };

  // Initial fetch and Polling interval (every 10 seconds for robust mobile updates)
  useEffect(() => {
    fetchPendingOrders(false);

    const interval = setInterval(() => {
      fetchPendingOrders(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [language, soundEnabled]);

  // Listen for real-time WebSocket inserts in Supabase
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime-bell')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new;
          if (newOrder && !knownOrderIdsRef.current.has(newOrder.id)) {
            knownOrderIdsRef.current.add(newOrder.id);
            playChimeSound();
            setUnreadOrders((prev) => [newOrder, ...prev]);

            const customerName = newOrder.customer_name || (language === 'he' ? 'לקוח חדש' : 'New Customer');
            const message = language === 'he'
              ? `🔔 הזמנה חדשה נכנסה למערכת מ-${customerName}!`
              : `🔔 New order received from ${customerName}!`;

            setToastMessage(message);
            setTimeout(() => setToastMessage(null), 6000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled, language]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = unreadOrders.length;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed top-4 inset-x-4 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:max-w-md z-[350] bg-stone-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border-2 border-amber-500/50 flex items-center justify-between gap-3 animate-fade-in text-right font-sans">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="text-xl shrink-0">🛎️</span>
            <span className="text-xs sm:text-sm font-bold text-amber-300 leading-snug whitespace-normal break-words">
              {toastMessage}
            </span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 shrink-0 mr-1 transition-colors"
            title={language === 'he' ? 'סגור' : 'Close'}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-themeHeaderTxt hover:bg-white/10 transition-colors focus:outline-none"
        title={language === 'he' ? 'התראות הזמנות חדשות' : 'New Order Notifications'}
      >
        <Bell size={22} className={unreadCount > 0 ? 'animate-wiggle text-amber-400' : ''} />

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] bg-red-500 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center px-1 shadow-md border-2 border-themeHeaderBg animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu - Positioned Centered on Mobile Viewports */}
      {isOpen && (
        <div className="fixed inset-x-3 top-[76px] sm:absolute sm:top-auto sm:inset-auto sm:right-0 sm:left-auto sm:mt-3 w-auto sm:w-96 bg-themeCardBg border border-themeText/10 rounded-2xl shadow-2xl z-[250] overflow-hidden text-themeText font-sans animate-fade-in">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-themeHeaderBg text-themeHeaderTxt flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-amber-400" />
              <h3 className="font-bold text-xs sm:text-sm">
                {language === 'he' ? 'הזמנות ובקשות חדשות' : 'New Orders & Requests'}
              </h3>
              {unreadCount > 0 && (
                <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-themeHeaderTxt/70 hover:text-white p-1 rounded transition"
                title={soundEnabled ? (language === 'he' ? 'השתק צלילי התרעה' : 'Mute sounds') : (language === 'he' ? 'הפעל צלילי התרעה' : 'Enable sounds')}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-red-400" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="text-themeHeaderTxt/70 hover:text-white p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Orders List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-themeText/5">
            {unreadOrders.length === 0 ? (
              <div className="p-8 text-center text-themeText/50">
                <CheckCheck className="mx-auto mb-2 text-green-500" size={32} />
                <p className="text-xs font-medium">
                  {language === 'he' ? 'אין הזמנות חדשות הממתינות לטיפול' : 'No pending orders right now'}
                </p>
              </div>
            ) : (
              unreadOrders.map((order) => {
                const dateStr = order.created_at
                  ? new Date(order.created_at).toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '';
                const orderNo = order.id ? order.id.slice(0, 8) : '';

                const displayPrice = (() => {
                  if (order.total_price && order.total_price > 0) return order.total_price;
                  if (!order.items || order.items.length === 0) return 0;
                  return order.items.reduce((sum: number, item: any) => {
                    let p = item.price || 0;
                    if (!p || p === 0) {
                      const menuI = menuItems.find((m: any) => m.id === item.id || m.name === item.name);
                      if (menuI) p = menuI.price;
                    }
                    return sum + (p * (item.quantity || 1));
                  }, 0);
                })();

                return (
                  <div
                    key={order.id}
                    className="p-3.5 hover:bg-themeBg/40 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-themeText truncate">
                          {order.customer_name || (language === 'he' ? 'לקוח לא ידוע' : 'Unknown Customer')}
                        </span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded">
                          #{orderNo}
                        </span>
                      </div>
                      <p className="text-xs text-themeText/70 truncate mb-1">
                        📞 {order.customer_phone}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-themeText/50">
                        <span>🕒 {dateStr}</span>
                        {displayPrice > 0 && (
                          <span className="font-bold text-themePrimary">₪{displayPrice}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsOpen(false);
                        if (onOpenOrder) {
                          onOpenOrder(order.id);
                        }
                      }}
                      className="text-xs font-bold px-3 py-1.5 bg-themePrimary text-themeHeaderBg hover:opacity-90 rounded-xl transition flex items-center gap-1 shrink-0 shadow-sm"
                    >
                      <span>{language === 'he' ? 'צפייה' : 'View'}</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {unreadOrders.length > 0 && (
            <div className="p-3 bg-themeBg/50 border-t border-themeText/10 text-center">
              <button
                onClick={() => setUnreadOrders([])}
                className="text-xs font-semibold text-themeText/60 hover:text-themePrimary transition"
              >
                {language === 'he' ? 'סימון הכל כנקרא' : 'Mark all as read'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
