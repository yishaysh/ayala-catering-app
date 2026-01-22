
import React, { useState, useEffect } from 'react';
import { MenuGrid } from './components/MenuGrid';
import { HostHelper } from './components/HostHelper';
import { CartDrawer } from './components/CartDrawer';
import { Category } from './types';
import { ShoppingBag, Phone, Globe, Lock, X, Loader2 } from 'lucide-react';
import { useStore, translations } from './store';
import { AdminDashboard } from './components/AdminDashboard';
import { AIConcierge } from './components/AIConcierge';
import { useBackButton } from './hooks/useBackButton';

const CATEGORIES: Category[] = ['Salads', 'Cold Platters', 'Sandwiches', 'Dips', 'Main Courses', 'Pastries', 'Desserts'];
const LOGO_SRC = "https://txzzpwgmkhfemoiehjym.supabase.co/storage/v1/object/public/menu-images/logo.png";

export default function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cartTotal, cart, language, setLanguage, menuItems, fetchMenuItems, isLoading, featureFlags, fetchSettings } = useStore();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState(false);

  useBackButton(isLoginOpen, () => setIsLoginOpen(false));

  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const t = translations[language];

  useEffect(() => {
      fetchMenuItems();
      fetchSettings();
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (pin === '2024') {
          setIsAdmin(true);
          setIsLoginOpen(false);
          setPin('');
          setLoginError(false);
      } else {
          setLoginError(true);
      }
  };

  useEffect(() => {
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const scrollToCategory = (cat: Category) => {
    const sectionId = `cat-${cat.replace(/\s+/g, '-')}`;
    const element = document.getElementById(sectionId);
    if (element) {
        // Safe scroll accounting for the sticky headers
        const headerHeight = 135; 
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
            top: elementPosition - headerHeight,
            behavior: 'smooth'
        });
        setActiveCategory(cat);
    }
  };

  if (isAdmin) {
      return <AdminDashboard onExit={() => setIsAdmin(false)} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-48 overflow-x-hidden">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-stone-900 text-white shadow-lg border-b border-stone-800 h-[72px]">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center h-full">
            <div className="flex items-center gap-3">
                <div className="relative h-12 w-auto flex items-center justify-center overflow-hidden">
                   <img 
                        src={LOGO_SRC} 
                        alt="Ayala Logo" 
                        className="h-full w-auto object-contain"
                   />
                </div>
                <div className="hidden sm:block">
                    <h1 className="text-xl font-serif font-bold tracking-wide text-gold-500 leading-none mb-1">{t.title}</h1>
                    <p className="text-[10px] text-stone-400 tracking-[0.2em] uppercase font-medium">{t.subtitle}</p>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                 <button 
                    onClick={() => setIsLoginOpen(true)}
                    className="p-2 text-stone-400 hover:text-gold-500 transition-colors"
                    title="Admin Access"
                >
                    <Lock size={18} />
                </button>

                 <button 
                    onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
                    className="flex items-center gap-1.5 text-xs font-bold bg-stone-800 px-3 py-1.5 rounded-full border border-stone-700 hover:border-gold-500 transition-colors"
                >
                    <Globe size={14} className="text-gold-500" />
                    <span>{language === 'he' ? 'EN' : 'עב'}</span>
                </button>

                <a href="tel:0547474764" className="hidden md:flex items-center gap-2 text-stone-300 hover:text-white transition-colors">
                    <div className="bg-stone-800 p-2 rounded-full">
                        <Phone size={16} />
                    </div>
                    <span className="text-sm font-medium">054-747-4764</span>
                </a>

                <button 
                    onClick={() => setIsCartOpen(true)}
                    className="relative group p-2 hover:bg-stone-800 rounded-full transition-colors"
                >
                    <ShoppingBag size={24} className="text-stone-300 group-hover:text-gold-500 transition-colors" />
                    {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-gold-600 text-stone-900 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                            {cart.length}
                        </span>
                    )}
                </button>
            </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative bg-stone-900 text-white pt-16 pb-24 overflow-hidden mb-8">
         <div 
            className="absolute inset-0 bg-no-repeat opacity-20"
            style={{ 
                backgroundImage: `url(${LOGO_SRC})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center 20%'
            }}
         ></div>
         <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-transparent to-stone-900/50"></div>
         
         <div className="container mx-auto text-center px-4 relative z-10">
            <div className="inline-block border border-gold-500/30 bg-gold-500/10 backdrop-blur-sm px-4 py-1 rounded-full text-gold-400 text-xs font-bold tracking-widest uppercase mb-6 animate-fade-in">
                {t.subtitle}
            </div>
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 leading-tight drop-shadow-xl animate-slide-in-bottom">
                {language === 'he' ? 'איילה פשוט טעים' : 'Simply Delicious'}
            </h2>
            <div className="flex justify-center animate-slide-in-bottom" style={{ animationDelay: '200ms' }}>
                 <button 
                    onClick={() => scrollToCategory('Salads')}
                    className="bg-gold-500 text-stone-900 px-8 py-3 rounded-full font-bold text-lg hover:bg-gold-400 transition transform hover:scale-105 shadow-lg shadow-gold-500/20"
                >
                    {language === 'he' ? 'הזמינו עכשיו' : 'Order Now'}
                </button>
            </div>
         </div>
      </div>

      <main className="container mx-auto px-4 -mt-16 relative z-20">
        
        {featureFlags?.showCalculator && <HostHelper />}
        {featureFlags?.showAI && <AIConcierge />}

        <div className="sticky top-[72px] z-40 bg-stone-50/95 backdrop-blur-md py-4 mb-8 border-b border-stone-200 -mx-4 px-4 overflow-x-auto shadow-sm h-[60px]">
            <nav className="flex gap-2 min-w-max mx-auto md:justify-center">
                {CATEGORIES.map(cat => (
                    <button 
                        key={cat} 
                        onClick={() => scrollToCategory(cat)}
                        className={`
                            whitespace-nowrap px-5 py-2.5 text-sm font-bold rounded-full transition-all duration-300
                            ${activeCategory === cat 
                                ? 'bg-stone-900 text-gold-500 shadow-md transform scale-105' 
                                : 'bg-white text-stone-600 border border-stone-200 hover:border-gold-500 hover:text-stone-900'
                            }
                        `}
                    >
                        {(t.categories as Record<string, string>)[cat]}
                    </button>
                ))}
            </nav>
        </div>

        {isLoading ? (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-gold-500" size={48} />
            </div>
        ) : (
            <MenuGrid items={menuItems} />
        )}
        
      </main>

      <footer className="bg-stone-900 text-stone-400 py-8 px-4 text-center mt-auto pb-32">
          <div className="container mx-auto">
              <p className="text-sm font-medium mb-4">© {new Date().getFullYear()} {t.title}</p>
          </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] md:hidden z-30 pb-safe">
          <div className="flex justify-between items-center gap-4">
              <div className="flex flex-col">
                  <span className="text-xs text-stone-500 font-medium">{t.total}</span>
                  <span className="text-2xl font-bold font-serif text-stone-900">₪{cartTotal()}</span>
              </div>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="flex-1 bg-stone-900 text-gold-500 px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-stone-900/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                  <ShoppingBag size={18} />
                  {t.myOrder} ({cart.length})
              </button>
          </div>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {isLoginOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/90 backdrop-blur-sm animate-zoom-in">
              <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl relative">
                  <button 
                    onClick={() => { setIsLoginOpen(false); setPin(''); setLoginError(false); }}
                    className="absolute top-4 right-4 text-stone-400 hover:text-stone-900"
                  >
                      <X />
                  </button>
                  
                  <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-stone-100 rounded-full mb-4 text-stone-900">
                          <Lock size={32} />
                      </div>
                      <h2 className="text-2xl font-serif font-bold text-stone-900">כניסת מנהל</h2>
                      <p className="text-sm text-stone-500">נא להזין קוד גישה</p>
                  </div>

                  <form onSubmit={handleAdminLogin}>
                      <input 
                        type="password" 
                        value={pin}
                        onChange={(e) => { setPin(e.target.value); setLoginError(false); }}
                        className={`
                            w-full text-center text-3xl tracking-widest font-bold border-b-2 py-2 mb-6 focus:outline-none transition-colors
                            ${loginError ? 'border-red-500 text-red-500' : 'border-stone-200 focus:border-gold-500 text-stone-900'}
                        `}
                        placeholder="••••"
                        maxLength={4}
                        autoFocus
                      />
                      {loginError && <p className="text-red-500 text-xs text-center mb-4 font-bold">קוד שגוי</p>}
                      
                      <button 
                        type="submit"
                        className="w-full bg-stone-900 text-gold-500 font-bold py-3 rounded-xl hover:bg-stone-800 transition flex items-center justify-center gap-2"
                      >
                          <span>כניסה</span>
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
