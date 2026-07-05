import React, { useState, useEffect } from 'react';
import { MenuGrid } from './components/MenuGrid';
import { HostHelper } from './components/HostHelper';
import { CartDrawer } from './components/CartDrawer';
import { Category } from './types';
import { ShoppingBag, Phone, Globe, Lock, X, Loader2, Award, Menu, MapPin, ArrowUp } from 'lucide-react';
import { useStore, translations } from './store';
import { AdminDashboard } from './components/AdminDashboard';
import { AIConcierge } from './components/AIConcierge';
import { useBackButton } from './hooks/useBackButton';
import { ThemeStyles } from './components/ThemeStyles';
import { EventGallery } from './components/EventGallery';
import { ReviewsSection } from './components/ReviewsSection';
import { AccessibilityMenu } from './components/AccessibilityMenu';
import { Analytics } from '@vercel/analytics/react';

const CATEGORIES: Category[] = ['Salads', 'Cold Platters', 'Sandwiches', 'Dips', 'Main Courses', 'Pastries', 'Desserts', 'Picnic Baskets'];
const NAV_LOGO_SRC = "https://txzzpwgmkhfemoiehjym.supabase.co/storage/v1/object/public/menu-images/logo.png";
const BRAND_LOGO_SRC = "/logo_text.png";
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '2024';

export default function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isKosherOpen, setIsKosherOpen] = useState(false);
  const { cartTotal, cart, language, setLanguage, menuItems, fetchMenuItems, isLoading, featureFlags, fetchSettings, kosherCertUrl, fetchReviews, theme, aboutUs, appConfig } = useStore();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isMapSelectionOpen, setIsMapSelectionOpen] = useState(false);

  useBackButton(isLoginOpen, () => setIsLoginOpen(false));
  useBackButton(isKosherOpen, () => setIsKosherOpen(false));
  useBackButton(isMapSelectionOpen, () => setIsMapSelectionOpen(false));

  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const t = translations[language];
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
      fetchMenuItems();
      fetchSettings();
      fetchReviews();
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (pin === ADMIN_PIN) {
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

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  useBackButton(isMenuOpen, () => setIsMenuOpen(false));

  const scrollToTop = () => {
    const performScroll = () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    };

    if (isMenuOpen) {
      setIsMenuOpen(false);
      // Wait for history.back() in useBackButton to complete and not cancel the scroll animation
      setTimeout(performScroll, 150);
    } else {
      performScroll();
    }
  };

  const scrollToSection = (id: string) => {
    try {
      const element = document.getElementById(id);
      if (element) {
          const performScroll = () => {
              const headerHeight = 72; 
              const elementPosition = element.getBoundingClientRect().top + window.scrollY;
              const offsetPosition = elementPosition - headerHeight;
              window.scrollTo({
                  top: offsetPosition,
                  behavior: 'smooth'
              });
          };

          if (isMenuOpen) {
              setIsMenuOpen(false);
              // Wait for history.back() in useBackButton to complete and not cancel the scroll animation
              setTimeout(performScroll, 150);
          } else {
              performScroll();
          }
      } else {
          console.warn(`Element with id ${id} not found.`);
      }
    } catch (error) {
        console.error("Error scrolling to section:", error);
        setIsMenuOpen(false);
    }
  };

  const isHeaderDark = (() => {
    if (!theme?.header_bg_color) return true;
    const hex = theme.header_bg_color.replace('#', '');
    if (hex.length !== 6) return true;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  })();

  const isPageBgDark = (() => {
    if (!theme?.bg_color) return false;
    const hex = theme.bg_color.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  })();

  if (isAdmin) {
      return (
          <>
              <ThemeStyles />
              <AdminDashboard onExit={() => setIsAdmin(false)} />
          </>
      );
  }

  return (
    <div className="min-h-screen bg-themeBg text-themeText font-sans pb-48 overflow-x-hidden pt-[72px]">
      <ThemeStyles />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-themeHeaderBg text-themeHeaderTxt shadow-lg border-b border-themeHeaderBg/10 h-[72px]">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center h-full relative z-10">
            <div className="flex items-center gap-4">
                {/* Hamburger Menu Button */}
                <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2 text-themeHeaderTxt/80 hover:text-themePrimary transition-colors"
                    title="Menu"
                >
                    <Menu size={24} />
                </button>
                <div className="flex flex-col items-start justify-center">
                    <img 
                        src="/seal_stamp.png" 
                        alt="Ayala Logo" 
                        className={`h-9 w-auto object-contain ${
                            isHeaderDark ? 'filter invert' : ''
                        }`}
                    />
                    <a href="tel:0547474764" className="text-[9px] sm:text-[10px] text-themeHeaderTxt/90 font-bold hover:text-themePrimary transition-colors leading-none mt-0.5">
                        054-747-4764
                    </a>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                 <button 
                    onClick={() => setIsLoginOpen(true)}
                    className="p-2 text-themeHeaderTxt/70 hover:text-themePrimary transition-colors"
                    title="Admin Access"
                >
                    <Lock size={18} />
                </button>

                 <button 
                    onClick={() => setIsKosherOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-bold bg-themeHeaderBg/55 px-2.5 py-1.5 rounded-full border border-themeHeaderTxt/10 hover:border-themePrimary transition-colors"
                >
                    <Award size={18} className="text-themePrimary animate-pulse" />
                    <span>{language === 'he' ? 'כשרות' : 'Kosher'}</span>
                </button>

                 <button 
                    onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
                    className="flex items-center gap-1.5 text-xs font-bold bg-themeHeaderBg/55 px-2.5 py-1.5 rounded-full border border-themeHeaderTxt/10 hover:border-themePrimary transition-colors"
                >
                    <Globe size={14} className="text-themePrimary" />
                    <span>{language === 'he' ? 'EN' : 'עב'}</span>
                </button>

                <button 
                    onClick={() => setIsCartOpen(true)}
                    className="relative group p-2 hover:bg-themeHeaderBg/60 rounded-full transition-colors"
                >
                    <ShoppingBag size={24} className="text-themeHeaderTxt/80 group-hover:text-themePrimary transition-colors" />
                    {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-themePrimary text-themeHeaderBg text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                            {cart.length}
                        </span>
                    )}
                </button>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-6 relative z-20">
        {/* Brand Banner Section with big Logo and Seal Watermark */}
        <div className="relative w-full py-12 md:py-16 flex flex-col items-center justify-center overflow-hidden mb-6">
            {/* Background Seal Watermark */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
                <div 
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] md:w-[350px] md:h-[350px] bg-center bg-no-repeat bg-contain opacity-[0.09] ${
                        isPageBgDark ? 'filter invert mix-blend-screen' : 'mix-blend-multiply'
                    }`}
                    style={{ backgroundImage: 'url("/seal_stamp.png")' }}
                />
            </div>

            {/* Brand Logo */}
            <div className="relative z-10 flex flex-col items-center">
                <img 
                    src={BRAND_LOGO_SRC} 
                    alt="Ayala Simply Delicious" 
                    className={`h-28 md:h-40 w-auto object-contain ${
                        isPageBgDark ? 'filter invert mix-blend-screen' : 'mix-blend-multiply'
                    }`}
                />
            </div>
        </div>
        
        {featureFlags?.showCalculator && <HostHelper />}
        {featureFlags?.showAI && <AIConcierge />}

        <div className="sticky top-[72px] z-40 bg-themeBg/95 backdrop-blur-md py-4 mb-8 border-b border-themeText/10 -mx-4 px-4 overflow-x-auto shadow-sm h-[60px]">
            <nav className="flex gap-2 min-w-max mx-auto md:justify-center">
                {CATEGORIES.map(cat => (
                    <button 
                        key={cat} 
                        onClick={() => scrollToCategory(cat)}
                        className={`
                            whitespace-nowrap px-5 py-2.5 text-sm font-bold rounded-full transition-all duration-300
                            ${activeCategory === cat 
                                ? 'bg-themeHeaderBg text-themePrimary shadow-md transform scale-105' 
                                : 'bg-themeCardBg text-themeText/70 border border-themeText/10 hover:border-themePrimary hover:text-themeText'
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
                <Loader2 className="animate-spin text-themePrimary" size={48} />
            </div>
        ) : (
            <>
                <MenuGrid items={menuItems} />
                <EventGallery />
                <ReviewsSection />

                {/* About Us (מי אני / הסיפור שלנו) */}
                <section className="my-16 bg-themeCardBg rounded-2xl p-8 border border-themeText/5 shadow-sm scroll-mt-24" id="about-section">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl font-serif font-bold text-themePrimary mb-4">{language === 'he' ? 'הסיפור שלנו - איילה פשוט טעים' : 'Our Story - Ayala Simply Delicious'}</h2>
                        <div className="w-12 h-1 bg-themePrimary mx-auto mb-6 rounded-full"></div>
                        {(language === 'he' ? (aboutUs?.story_he || '') : (aboutUs?.story_en || '')).split('\n').filter(Boolean).map((para, idx) => (
                            <p key={idx} className="text-themeText/80 leading-relaxed text-base md:text-lg mb-4 text-start font-serif last:mb-0">
                                {para}
                            </p>
                        ))}
                    </div>
                </section>

                {/* Contact Section (צור קשר) */}
                <section className="my-16 bg-themeCardBg rounded-2xl p-8 border border-themeText/5 shadow-sm scroll-mt-24 text-center" id="contact-section">
                    <h2 className="text-3xl font-serif font-bold text-themePrimary mb-2">{language === 'he' ? 'צור קשר' : 'Contact Us'}</h2>
                    <p className="text-xs text-themeText/60 tracking-wider uppercase mb-6">{language === 'he' ? 'נשמח לקחת חלק באירוע שלכם' : 'We would love to take part in your event'}</p>
                    <div className="w-16 h-1 bg-themePrimary mx-auto mb-8 rounded-full"></div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 max-w-5xl mx-auto">
                        <a 
                            href="tel:0547474764" 
                            className="bg-themeBg/40 p-5 md:p-6 rounded-xl border border-themeText/5 hover:border-themePrimary/40 hover:shadow-md transition-all duration-300 flex flex-col items-center cursor-pointer group hover:scale-[1.02]"
                        >
                            <Phone className="text-themePrimary mb-3 transition-transform group-hover:scale-110" size={24} />
                            <h4 className="font-bold text-themeText text-sm mb-1">{language === 'he' ? 'טלפון' : 'Phone'}</h4>
                            <span className="text-themeText/80 text-[10px] md:text-xs font-semibold group-hover:text-themePrimary transition-colors">054-747-4764</span>
                        </a>
                        <a 
                            href="https://wa.me/972547474764" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-themeBg/40 p-5 md:p-6 rounded-xl border border-themeText/5 hover:border-themePrimary/40 hover:shadow-md transition-all duration-300 flex flex-col items-center cursor-pointer group hover:scale-[1.02]"
                        >
                            <svg className="w-6 h-6 text-themePrimary mb-3 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.247 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.52 5.242 1.521 5.46.002 9.897-4.437 9.9-9.899.001-2.646-1.03-5.132-2.903-7.006-1.874-1.873-4.361-2.903-7.01-2.903-5.464 0-9.903 4.438-9.907 9.899-.001 2.126.579 4.197 1.681 5.897l-.999 3.648 3.796-.997zm10.963-7.935c-.299-.149-1.77-.874-2.043-.974-.275-.102-.475-.149-.675.149-.199.299-.775.974-.95 1.173-.175.199-.349.224-.648.075-.3-.149-1.266-.467-2.41-1.487-.89-.794-1.49-1.775-1.665-2.074-.175-.299-.019-.462.13-.611.135-.133.3-.349.45-.523.149-.174.199-.299.299-.498.1-.2.05-.374-.025-.523-.075-.149-.675-1.62-.925-2.224-.244-.595-.493-.513-.675-.523-.175-.008-.374-.01-.573-.01-.199 0-.523.075-.798.374-.275.299-1.047 1.022-1.047 2.491 0 1.469 1.073 2.887 1.222 3.087.149.199 2.11 3.223 5.112 4.521.714.308 1.272.493 1.706.63.717.228 1.37.195 1.887.118.577-.087 1.77-.723 2.02-1.419.249-.696.249-1.293.175-1.419-.075-.126-.275-.2-.574-.349z"></path>
                            </svg>
                            <h4 className="font-bold text-themeText text-sm mb-1">{language === 'he' ? 'וואטסאפ' : 'WhatsApp'}</h4>
                            <span className="text-themeText/80 text-[10px] md:text-xs font-semibold group-hover:text-themePrimary transition-colors">{language === 'he' ? 'שלחו הודעה' : 'Send Message'}</span>
                        </a>
                        <button 
                            onClick={() => setIsMapSelectionOpen(true)}
                            className="bg-themeBg/40 p-5 md:p-6 rounded-xl border border-themeText/5 hover:border-themePrimary/40 hover:shadow-md transition-all duration-300 flex flex-col items-center cursor-pointer group hover:scale-[1.02]"
                        >
                            <MapPin className="text-themePrimary mb-3 transition-transform group-hover:scale-110" size={24} />
                            <h4 className="font-bold text-themeText text-sm mb-1">{language === 'he' ? 'מיקום' : 'Location'}</h4>
                            <span className="text-themeText/80 text-[10px] md:text-xs font-semibold group-hover:text-themePrimary transition-colors">{language === 'he' ? 'מקדומים' : 'Kedumim'}</span>
                        </button>
                        <a 
                            href="https://www.instagram.com/ayala_pashutaim/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-themeBg/40 p-5 md:p-6 rounded-xl border border-themeText/5 hover:border-themePrimary/40 hover:shadow-md transition-all duration-300 flex flex-col items-center cursor-pointer group hover:scale-[1.02]"
                        >
                            <svg className="w-6 h-6 text-themePrimary mb-3 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                            </svg>
                            <h4 className="font-bold text-themeText text-sm mb-1">{language === 'he' ? 'אינסטגרם' : 'Instagram'}</h4>
                            <span className="text-themeText/80 text-[10px] md:text-xs font-semibold group-hover:text-themePrimary transition-colors">@ayala_pashutaim</span>
                        </a>
                        <a 
                            href="https://www.facebook.com/share/1EkU7G5BDA/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-themeBg/40 p-5 md:p-6 rounded-xl border border-themeText/5 hover:border-themePrimary/40 hover:shadow-md transition-all duration-300 flex flex-col items-center cursor-pointer group hover:scale-[1.02] col-span-2 md:col-span-1"
                        >
                            <svg className="w-6 h-6 text-themePrimary mb-3 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
                            </svg>
                            <h4 className="font-bold text-themeText text-sm mb-1">{language === 'he' ? 'פייסבוק' : 'Facebook'}</h4>
                            <span className="text-themeText/80 text-[10px] md:text-xs font-semibold group-hover:text-themePrimary transition-colors">{language === 'he' ? 'איילה פשוט טעים' : 'Ayala Simply Delicious'}</span>
                        </a>
                    </div>
                </section>
            </>
        )}
        
      </main>

      <footer className="bg-themeHeaderBg text-themeHeaderTxt/70 py-8 px-4 text-center mt-auto pb-32">
          <div className="container mx-auto">
              <p className="text-sm font-medium mb-4">© {new Date().getFullYear()} {t.title}</p>
          </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 bg-themeCardBg border-t border-themeText/10 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] md:hidden z-30 pb-safe">
          <div className="flex justify-between items-center gap-4">
              {appConfig.ecommerce_mode ? (
                  <div className="flex flex-col">
                      <span className="text-xs text-themeText/60 font-medium">{t.total}</span>
                      <span className="text-2xl font-bold font-serif text-themeText">₪{cartTotal()}</span>
                  </div>
              ) : (
                  <div className="flex flex-col text-start">
                      <span className="text-xs text-themeText/60 font-medium">{language === 'he' ? 'פריטים' : 'Items'}</span>
                      <span className="text-xl font-bold font-serif text-themeText">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
              )}
              <button 
                onClick={() => setIsCartOpen(true)}
                className="flex-1 bg-themeHeaderBg text-themePrimary px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-themeHeaderBg/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                  <ShoppingBag size={18} />
                  {t.myOrder} ({cart.length})
              </button>
          </div>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Side Menu Drawer */}
      <div 
        className={`fixed inset-0 z-[150] bg-stone-900/60 backdrop-blur-sm transition-opacity duration-300 ${
            isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMenuOpen(false)}
      >
          <div 
            className={`fixed top-0 right-0 h-full w-[280px] max-w-[80vw] bg-themeCardBg text-themeText shadow-2xl z-[160] flex flex-col p-6 transition-transform duration-300 transform ${
                isMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            onClick={e => e.stopPropagation()}
            dir={language === 'he' ? 'rtl' : 'ltr'}
          >
              <div className="flex justify-between items-center mb-8 border-b border-themeText/10 pb-4">
                  <span className="font-serif font-bold text-lg text-themePrimary">{language === 'he' ? 'ניווט באתר' : 'Navigation'}</span>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1.5 hover:bg-themeText/5 rounded-full transition-colors text-themeText/70 hover:text-themeText"
                  >
                      <X size={20} />
                  </button>
              </div>

              <nav className="flex flex-col gap-4 text-start font-serif">
                  <button 
                    onClick={scrollToTop}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-themePrimary/15 hover:text-themePrimary font-bold text-base transition-all duration-200 text-start"
                  >
                      <span>{language === 'he' ? 'בית' : 'Home'}</span>
                  </button>
                  <button 
                    onClick={() => scrollToSection('gallery-section')}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-themePrimary/15 hover:text-themePrimary font-bold text-base transition-all duration-200 text-start"
                  >
                      <span>{language === 'he' ? 'גלריה' : 'Gallery'}</span>
                  </button>
                  <button 
                    onClick={() => scrollToSection('about-section')}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-themePrimary/15 hover:text-themePrimary font-bold text-base transition-all duration-200 text-start"
                  >
                      <span>{language === 'he' ? 'הסיפור שלנו' : 'Our Story'}</span>
                  </button>
                  <button 
                    onClick={() => scrollToSection('reviews-section')}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-themePrimary/15 hover:text-themePrimary font-bold text-base transition-all duration-200 text-start"
                  >
                      <span>{language === 'he' ? 'חוות דעת' : 'Reviews'}</span>
                  </button>
                  <button 
                    onClick={() => scrollToSection('contact-section')}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-themePrimary/15 hover:text-themePrimary font-bold text-base transition-all duration-200 text-start"
                  >
                      <span>{language === 'he' ? 'צור קשר' : 'Contact Us'}</span>
                  </button>
              </nav>
          </div>
      </div>

      {isKosherOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-zoom-in" onClick={() => setIsKosherOpen(false)}>
              <div className="bg-themeCardBg text-themeText border border-themeText/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => setIsKosherOpen(false)}
                    className="absolute top-4 right-4 text-themeText/60 hover:text-themeText bg-themeBg/50 hover:bg-themeBg/85 p-1.5 rounded-full"
                  >
                      <X size={16} />
                  </button>
                  <Award size={48} className="text-themePrimary mx-auto mb-2" />
                  <h3 className="text-xl font-serif font-bold text-themeText mb-1">{language === 'he' ? 'תעודת כשרות' : 'Kosher Certificate'}</h3>
                  <p className="text-xs text-themeText/60 mb-4">{language === 'he' ? 'קייטרינג חלבי כשר למהדרין' : 'Kosher Mehadrin Dairy Catering'}</p>
                  
                  <div className="border border-themeText/10 rounded-xl overflow-hidden bg-themeBg/30 aspect-[3/4] flex items-center justify-center">
                      {kosherCertUrl ? (
                          <img src={kosherCertUrl} alt="Kosher Certificate" className="w-full h-full object-contain" />
                      ) : (
                          <div className="p-4 text-themeText/40">
                              <Award size={64} className="mx-auto mb-2 opacity-25" />
                              <p className="text-sm font-bold">{language === 'he' ? 'כשר למהדרין' : 'Kosher Mehadrin'}</p>
                              <p className="text-[10px] mt-1">{language === 'he' ? 'התעודה תוצג כאן בקרוב' : 'Certificate will be uploaded soon'}</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {isLoginOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-zoom-in">
              <div className="bg-themeCardBg text-themeText border border-themeText/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl relative">
                  <button 
                    onClick={() => { setIsLoginOpen(false); setPin(''); setLoginError(false); }}
                    className="absolute top-4 right-4 text-themeText/60 hover:text-themeText bg-themeBg/50 hover:bg-themeBg/85 p-1.5 rounded-full"
                  >
                      <X size={18} />
                  </button>
                  
                  <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-themePrimary/10 rounded-full mb-4 text-themePrimary">
                          <Lock size={32} />
                      </div>
                      <h2 className="text-2xl font-serif font-bold text-themeText">כניסת מנהל</h2>
                      <p className="text-sm text-themeText/60">נא להזין קוד גישה</p>
                  </div>

                  <form onSubmit={handleAdminLogin}>
                      <input 
                        type="password" 
                        value={pin}
                        onChange={(e) => { setPin(e.target.value); setLoginError(false); }}
                        className={`
                            w-full text-center text-3xl tracking-widest font-bold border-b-2 py-2 mb-6 focus:outline-none transition-colors bg-transparent
                            ${loginError ? 'border-red-500 text-red-500' : 'border-themeText/20 focus:border-themePrimary text-themeText'}
                        `}
                        placeholder="••••"
                        maxLength={4}
                        autoFocus
                      />
                      {loginError && <p className="text-red-500 text-xs text-center mb-4 font-bold">קוד שגוי</p>}
                      
                      <button 
                        type="submit"
                        className="w-full bg-themePrimary text-themeHeaderBg font-bold py-3 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2"
                      >
                          <span>כניסה</span>
                      </button>
                  </form>
              </div>
          </div>
      )}

      {isMapSelectionOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/90 backdrop-blur-sm animate-zoom-in" onClick={() => setIsMapSelectionOpen(false)}>
              <div className="bg-themeCardBg text-themeText rounded-2xl p-6 md:p-8 w-full max-w-sm shadow-2xl relative border border-themeText/10 text-center" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => setIsMapSelectionOpen(false)}
                    className="absolute top-4 right-4 text-themeText/70 hover:text-themeText hover:bg-themeText/5 p-1.5 rounded-full"
                  >
                      <X size={16} />
                  </button>
                  <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-themePrimary/10 rounded-full mb-3 text-themePrimary">
                          <MapPin size={24} />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-themeText">{language === 'he' ? 'בחר אפליקציית ניווט' : 'Choose Navigation App'}</h3>
                      <p className="text-xs text-themeText/60 mt-1">{language === 'he' ? 'איסוף עצמי מקדומים' : 'Self-pickup from Kedumim'}</p>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                      <a 
                        href="https://waze.com/ul?q=קדומים&navigate=yes" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3.5 bg-themeBg/50 hover:bg-themePrimary/10 hover:text-themePrimary rounded-xl border border-themeText/10 transition-all font-bold text-sm cursor-pointer"
                        onClick={() => setIsMapSelectionOpen(false)}
                      >
                          <svg className="w-5 h-5 text-themePrimary" viewBox="0 0 30 30" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <path d="M23.167 15.65c.552.008.983.473.964 1.037l-.004.1c-.046 1.346-.576 2.585-1.467 3.52-.907.954-2.186 1.493-3.626 1.493-.82 0-1.579-.173-2.235-.494-.654-.316-1.216-.767-1.636-1.309a4.834 4.834 0 0 1-3.87 1.803c-1.411 0-2.673-.526-3.585-1.458-.89-.91-1.457-2.155-1.545-3.541l-.007-.156c-.019-.564.412-1.03.964-1.038.552-.008.984.472.964 1.036l-.003.078c.057.868.423 1.632.998 2.22.576.589 1.353.923 2.213.923s1.637-.334 2.214-.923l.115-.125c.34-.397.77-.706 1.258-.894a4.834 4.834 0 0 1 2.274-1.393V11.233c-.702.08-1.365.342-1.929.743-.564.4-.993.945-1.229 1.578a1 1 0 0 1-1.873-.687c.36-.967 1.026-1.802 1.89-2.416.865-.615 1.898-1.002 3.013-1.12l.128-.01v-.954c0-.552.448-1 1-1s1 .448 1 1v.961c1.173.132 2.257.545 3.155 1.18.897.636 1.583 1.503 1.942 2.502a1 1 0 0 1-1.884.673c-.237-.665-.694-1.235-1.298-1.657-.604-.422-1.312-.687-2.062-.759v6.52c.866.242 1.62.775 2.115 1.488.232.336.398.723.479 1.139.576-.589 1.353-.923 2.213-.923s1.637.334 2.214.923l.114.125a1 1 0 0 1-.115 1.415c-.34.397-.77.706-1.258.894a4.834 4.834 0 0 1-2.274 1.393c.42.542.982.993 1.636 1.31.656.32 1.416.494 2.235.494 1.44 0 2.719-.539 3.626-1.493.89-.935 1.421-2.174 1.467-3.52l.004-.1c.019-.564.45-.992 1.002-.992zm-5.667-2.183c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5zm-5 0c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5z"></path>
                          </svg>
                          <span>Waze</span>
                      </a>
                      <a 
                        href="https://www.google.com/maps/search/?api=1&query=קדומים" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3.5 bg-themeBg/50 hover:bg-themePrimary/10 hover:text-themePrimary rounded-xl border border-themeText/10 transition-all font-bold text-sm cursor-pointer"
                        onClick={() => setIsMapSelectionOpen(false)}
                      >
                          <MapPin size={20} className="text-themePrimary" />
                          <span>Google Maps</span>
                      </a>
                      <a 
                        href="https://maps.apple.com/?q=קדומים" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3.5 bg-themeBg/50 hover:bg-themePrimary/10 hover:text-themePrimary rounded-xl border border-themeText/10 transition-all font-bold text-sm cursor-pointer"
                        onClick={() => setIsMapSelectionOpen(false)}
                      >
                          <svg className="w-5 h-5 text-themePrimary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                          </svg>
                          <span>Apple Maps</span>
                      </a>
                  </div>
              </div>
          </div>
      )}
      <AccessibilityMenu />
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-[100px] right-4 md:bottom-6 md:right-6 z-[140] bg-themeHeaderBg text-themePrimary hover:bg-themeHeaderBg/90 hover:scale-105 active:scale-95 transition-all duration-300 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-themePrimary/20"
          title={language === 'he' ? 'חזרה למעלה' : 'Back to top'}
          aria-label={language === 'he' ? 'חזרה למעלה' : 'Back to top'}
        >
          <ArrowUp size={24} />
        </button>
      )}
      <Analytics />
    </div>
  );
}
