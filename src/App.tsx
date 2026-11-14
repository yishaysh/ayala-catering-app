import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MenuGrid } from './components/MenuGrid';
import { HostHelper } from './components/HostHelper';
import { CartDrawer } from './components/CartDrawer';
import { Category } from './types';
import {
  ShoppingBag,
  Phone,
  Globe,
  Lock,
  X,
  Loader2,
  Award,
  Menu,
  MapPin,
  ArrowUp,
  AlertTriangle,
  ExternalLink,
  Clock,
  Info,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import { useStore, translations } from './store';
import { AIConcierge } from './components/AIConcierge';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useBackButton } from './hooks/useBackButton';
import { ThemeStyles } from './components/ThemeStyles';
import { EventGallery } from './components/EventGallery';
import { ReviewsSection } from './components/ReviewsSection';
import { AccessibilityMenu } from './components/AccessibilityMenu';
import { AccessibleModal } from './components/AccessibleModal';
import { Analytics } from '@vercel/analytics/react';
import { CustomerQuoteView } from './components/CustomerQuoteView';
import { NotificationBell } from './components/NotificationBell';
import { api, ApiError } from './lib/api';

const AdminDashboard = React.lazy(() =>
  import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);

const CATEGORIES: Category[] = [
  'Salads',
  'Cold Platters',
  'Sandwiches',
  'Dips',
  'Main Courses',
  'Pastries',
  'Desserts',
  'Picnic Baskets',
  'Extras',
];

const BRAND_LOGO_SRC = '/logo_text.png';

export default function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isKosherOpen, setIsKosherOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMapSelectionOpen, setIsMapSelectionOpen] = useState(false);

  const {
    cartTotal,
    cart,
    language,
    setLanguage,
    menuItems,
    hydratePublicBootstrap,
    hydrateAdminMenu,
    isLoading,
    featureFlags,
    kosherMetadata,
    kosherEvaluation,
    theme,
    aboutUs,
    appConfig,
    publicContact,
  } = useStore();

  const isHe = language === 'he';
  const t = translations[language] || translations.he;

  // Strictly server-verified admin state (HttpOnly cookie); never trust localStorage or client PINs
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showFullDashboard, setShowFullDashboard] = useState<boolean>(false);
  const [adminTargetOrderId, setAdminTargetOrderId] = useState<string | undefined>(undefined);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const navDrawerRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useBackButton(isMenuOpen, () => setIsMenuOpen(false));

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Scrub deprecated legacy client admin flag if lingering in browser storage
    try {
      localStorage.removeItem('ayala_is_admin');
    } catch {
      // Ignore storage failures
    }

    void hydratePublicBootstrap();
    void api
      .checkAdminSession()
      .then((res) => {
        const authenticated = Boolean(res.authenticated);
        setIsAdmin(authenticated);
        if (authenticated) {
          void hydrateAdminMenu();
        }
      })
      .catch(() => setIsAdmin(false));
  }, [hydratePublicBootstrap, hydrateAdminMenu]);

  useEffect(() => {
    document.documentElement.dir = isHe ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isHe]);

  // Keyboard / focus management for conditional side navigation drawer
  useEffect(() => {
    if (!isMenuOpen) return;
    const focusTimer = window.setTimeout(() => {
      const root = navDrawerRef.current;
      if (!root) return;
      const firstBtn = root.querySelector<HTMLElement>('button, a[href]');
      firstBtn?.focus();
    }, 15);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsMenuOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const root = navDrawerRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')
      ).filter((el) => el.offsetParent !== null);
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

    const menuButtonNode = menuTriggerRef.current;
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      menuButtonNode?.focus();
    };
  }, [isMenuOpen]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setLoginError(isHe ? 'נא להזין סיסמת ניהול.' : 'Please enter admin password.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await api.loginAdmin(adminPassword);
      setIsAdmin(true);
      await hydrateAdminMenu();
      setIsLoginOpen(false);
      setAdminPassword('');
    } catch (err) {
      if (err instanceof ApiError) {
        setLoginError(err.message);
      } else {
        setLoginError(isHe ? 'שגיאת תקשורת באימות.' : 'Authentication failed.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await api.logoutAdmin();
    } catch {
      // Clear local authenticated UI state regardless
    }
    setIsAdmin(false);
    setShowFullDashboard(false);
    void hydratePublicBootstrap();
  };

  const scrollToCategory = (cat: Category) => {
    const sectionId = `cat-${cat.replace(/\s+/g, '-')}`;
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = 135;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - headerHeight,
        behavior: 'smooth',
      });
      setActiveCategory(cat);
    }
  };

  const scrollToTop = () => {
    const perform = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    if (isMenuOpen) {
      setIsMenuOpen(false);
      window.setTimeout(perform, 140);
    } else {
      perform();
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    const perform = () => {
      if (!element) return;
      const headerHeight = 76;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - headerHeight,
        behavior: 'smooth',
      });
    };

    if (isMenuOpen) {
      setIsMenuOpen(false);
      window.setTimeout(perform, 140);
    } else {
      perform();
    }
  };

  const isHeaderDark = (() => {
    if (!theme?.header_bg_color) return true;
    const hex = theme.header_bg_color.replace('#', '');
    if (hex.length !== 6) return true;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  })();

  const isPageBgDark = (() => {
    if (!theme?.bg_color) return false;
    const hex = theme.bg_color.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  })();

  // Route customer quote views (?token= scoped token or legacy ?quote= UUID privacy gate)
  const urlParams = new URLSearchParams(window.location.search);
  const quoteToken = urlParams.get('token');
  const legacyQuoteId = urlParams.get('quote');

  if (quoteToken || legacyQuoteId) {
    return (
      <>
        <ThemeStyles />
        <CustomerQuoteView
          token={quoteToken || undefined}
          legacyQuoteId={legacyQuoteId || undefined}
        />
      </>
    );
  }

  if (showFullDashboard && isAdmin) {
    return (
      <>
        <ThemeStyles />
        <React.Suspense
          fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-themeBg text-themeText gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-themePrimary" />
              <p className="text-sm font-bold">{isHe ? 'טוען ממשק ניהול...' : 'Loading admin dashboard...'}</p>
            </div>
          }
        >
          <AdminDashboard
            onExit={() => setShowFullDashboard(false)}
            initialTab={0}
            targetOrderId={adminTargetOrderId}
          />
        </React.Suspense>
      </>
    );
  }

  const kosherDocUrl = kosherMetadata?.documentUrl || '';
  const isKosherPdf =
    Boolean(kosherDocUrl) &&
    (/\.pdf(\?|$)/i.test(kosherDocUrl) || kosherDocUrl.includes('/raw/upload/'));

  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-themeBg text-themeText font-sans pb-36 md:pb-16 overflow-x-hidden pt-[72px]">
      <ThemeStyles />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[1200] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-themeHeaderBg focus:text-themeHeaderTxt focus:font-bold focus:shadow-lg"
      >
        {isHe ? 'דלג לתוכן הראשי' : 'Skip to main content'}
      </a>

      {/* Header — Clean single-row budget verified down to 360px without horizontal overflow or phone wrapping */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-themeHeaderBg text-themeHeaderTxt shadow-lg border-b border-black/15 h-[72px]">
        <div className="container mx-auto px-3 sm:px-4 flex justify-between items-center h-full gap-1.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              ref={menuTriggerRef}
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-expanded={isMenuOpen}
              aria-controls="main-nav-drawer"
              aria-label={isHe ? 'פתח תפריט ניווט' : 'Open navigation menu'}
              className="p-1.5 sm:p-2 text-themeHeaderTxt hover:text-themePrimary transition-colors shrink-0 rounded-lg"
            >
              <Menu size={22} />
            </button>

            <div className="flex flex-col items-start justify-center min-w-0">
              <img
                src="/seal_stamp.png"
                alt="Ayala Simply Delicious"
                className={`h-8 sm:h-9 w-auto object-contain ${
                  isHeaderDark ? 'filter invert' : ''
                }`}
              />
              <a
                href={`tel:${publicContact.phoneTel}`}
                dir="ltr"
                className="text-[10px] sm:text-xs text-themeHeaderTxt font-bold hover:text-themePrimary transition-colors leading-none mt-1 whitespace-nowrap"
              >
                {publicContact.phoneDisplay}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {isAdmin ? (
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-full border border-white/15">
                <NotificationBell
                  onOpenOrder={(orderId) => {
                    setAdminTargetOrderId(orderId);
                    setShowFullDashboard(true);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowFullDashboard(true)}
                  className="text-[11px] font-bold bg-amber-300 text-stone-950 hover:bg-amber-200 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
                  title={isHe ? 'לוח ניהול מלא' : 'Full Dashboard'}
                >
                  {isHe ? 'ניהול' : 'Admin'}
                </button>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  aria-label={isHe ? 'יציאה מממשק מנהל' : 'Logout admin'}
                  className="p-1 text-themeHeaderTxt hover:text-red-300 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLoginError(null);
                  setIsLoginOpen(true);
                }}
                aria-label={isHe ? 'כניסת מנהל' : 'Admin login'}
                title={isHe ? 'כניסת מנהל' : 'Admin login'}
                className="p-1.5 sm:p-2 text-themeHeaderTxt/85 hover:text-themePrimary transition-colors rounded-lg"
              >
                <Lock size={17} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsKosherOpen(true)}
              aria-label={isHe ? 'פרטי כשרות ותעודה' : 'Kosher status and certificate'}
              className="flex items-center gap-1 text-[11px] sm:text-xs font-bold bg-black/20 px-2 sm:px-2.5 py-1.5 rounded-full border border-white/20 hover:border-themePrimary transition-colors whitespace-nowrap shrink-0 text-themeHeaderTxt"
            >
              <Award size={15} className="text-themePrimary shrink-0" />
              <span>{isHe ? 'כשרות' : 'Kosher'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = isHe ? 'en' : 'he';
                setLanguage(next);
                api.trackEvent('language_toggled', { language: next });
              }}
              aria-label={isHe ? 'Switch to English' : 'החלף לעברית'}
              className="flex items-center gap-1 text-[11px] sm:text-xs font-bold bg-black/20 px-2 sm:px-2.5 py-1.5 rounded-full border border-white/20 hover:border-themePrimary transition-colors whitespace-nowrap shrink-0 text-themeHeaderTxt"
            >
              <Globe size={14} className="text-themePrimary shrink-0" />
              <span>{isHe ? 'EN' : 'עב'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                api.trackEvent('cart_opened', { items: cart.length });
                setIsCartOpen(true);
              }}
              aria-label={
                isHe
                  ? `פתיחת עגלה (${cart.length} שורות)`
                  : `Open quote cart (${cart.length} items)`
              }
              className="relative p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors shrink-0 text-themeHeaderTxt"
            >
              <ShoppingBag size={22} />
              {cart.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-themePrimary text-stone-950 text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="container mx-auto px-4 mt-4 relative z-20">
        {/* Brand Banner */}
        <section className="relative w-full py-10 md:py-14 flex flex-col items-center justify-center overflow-hidden mb-4">
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] md:w-[340px] md:h-[340px] bg-center bg-no-repeat bg-contain opacity-[0.08] ${
                isPageBgDark ? 'filter invert mix-blend-screen' : 'mix-blend-multiply'
              }`}
              style={{ backgroundImage: 'url("/seal_stamp.png")' }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <img
              src={BRAND_LOGO_SRC}
              alt={isHe ? 'איילה פשוט טעים — קייטרינג חלבי' : 'Ayala Simply Delicious'}
              className={`h-24 md:h-36 w-auto object-contain ${
                isPageBgDark ? 'filter invert mix-blend-screen' : 'mix-blend-multiply'
              }`}
            />
          </div>
        </section>

        {featureFlags?.showCalculator && <HostHelper />}

        {featureFlags?.showAI && (
          <ErrorBoundary
            fallbackMessage={
              isHe
                ? 'שירות השף הדיגיטלי אינו זמין כרגע — ניתן להמשיך עם מחשבון האירוח והתפריט המלא.'
                : 'Digital chef is currently unavailable — please use the event calculator and full menu.'
            }
          >
            <AIConcierge />
          </ErrorBoundary>
        )}

        {/* Sticky Category Bar — High-contrast active state */}
        <div className="sticky top-[72px] z-40 bg-themeBg/95 backdrop-blur-md py-3 mb-8 border-b border-themeText/15 -mx-4 px-4 overflow-x-auto shadow-sm">
          <nav
            aria-label={isHe ? 'קטגוריות תפריט' : 'Menu categories'}
            className="flex gap-2 min-w-max mx-auto md:justify-center"
          >
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => scrollToCategory(cat)}
                  aria-current={active ? 'location' : undefined}
                  className={`whitespace-nowrap px-4 py-2 text-xs sm:text-sm font-bold rounded-full transition-all border ${
                    active
                      ? 'bg-themeHeaderBg text-themeHeaderTxt border-themeHeaderBg ring-2 ring-themePrimary shadow-md'
                      : 'bg-themeCardBg text-themeText border-themeText/15 hover:border-themePrimary'
                  }`}
                >
                  {(t.categories as Record<string, string>)[cat] || cat}
                </button>
              );
            })}
          </nav>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20" role="status" aria-live="polite">
            <Loader2 className="animate-spin text-themePrimary" size={44} />
          </div>
        ) : (
          <>
            <MenuGrid items={menuItems} />
            <EventGallery />
            <ReviewsSection />

            {/* About Us */}
            <section
              className="my-14 bg-themeCardBg rounded-2xl p-6 md:p-8 border border-themeText/10 shadow-sm scroll-mt-24"
              id="about-section"
            >
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-themeText mb-3">
                  {isHe
                    ? 'הסיפור שלנו — איילה פשוט טעים'
                    : 'Our Story — Ayala Simply Delicious'}
                </h2>
                <div className="w-12 h-1 bg-themePrimary mx-auto mb-6 rounded-full" />
                {(isHe ? aboutUs?.story_he || '' : aboutUs?.story_en || '')
                  .split('\n')
                  .filter(Boolean)
                  .map((para, idx) => (
                    <p
                      key={idx}
                      className="text-themeText/85 leading-relaxed text-sm md:text-base mb-4 text-start font-serif last:mb-0"
                    >
                      {para}
                    </p>
                  ))}
              </div>
            </section>

            {/* Owner-Managed Practical Details Panel (P3 — shows only owner-configured facts, zero invented hours) */}
            <section
              id="practical-section"
              className="my-12 bg-themeCardBg rounded-2xl p-6 md:p-8 border border-themeText/15 shadow-sm scroll-mt-24 text-start"
            >
              <h2 className="text-2xl font-serif font-bold text-themeText mb-4 flex items-center gap-2">
                <Info size={20} className="text-themePrimary shrink-0" />
                <span>{isHe ? 'מידע שימושי ותיאום הזמנות' : 'Practical Ordering Details'}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs md:text-sm">
                <div className="p-4 rounded-xl bg-themeBg border border-themeText/10 space-y-1.5">
                  <div className="font-bold text-themeText flex items-center gap-1.5">
                    <MapPin size={15} className="text-themePrimary" />
                    <span>
                      {isHe
                        ? `אזור איסוף: ${publicContact.pickupAreaHe}`
                        : `Pickup Area: ${publicContact.pickupAreaEn}`}
                    </span>
                  </div>
                  <p className="text-themeText/80 leading-relaxed">
                    {isHe ? publicContact.pickupPublicNoteHe : publicContact.pickupPublicNoteEn}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-themeBg border border-themeText/10 space-y-1.5">
                  <div className="font-bold text-themeText flex items-center gap-1.5">
                    <Clock size={15} className="text-themePrimary" />
                    <span>
                      {isHe
                        ? `התראה מראש: ${appConfig.lead_time_hours || 48} שעות (שעון ישראל)`
                        : `Lead Time: ${appConfig.lead_time_hours || 48} hours (Israel time)`}
                    </span>
                  </div>
                  <p className="text-themeText/80 leading-relaxed">
                    {isHe ? publicContact.serviceAreaHe : publicContact.serviceAreaEn}
                  </p>
                  {(isHe ? publicContact.businessHoursHe : publicContact.businessHoursEn) && (
                    <p className="text-themeText/85 font-semibold pt-1">
                      {isHe ? publicContact.businessHoursHe : publicContact.businessHoursEn}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-themeBg border border-themeText/10 space-y-1.5">
                  <div className="font-bold text-themeText flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-themePrimary" />
                    <span>{isHe ? 'כשרות ודגשים' : 'Kosher & Terms'}</span>
                  </div>
                  <p className="text-themeText/80 leading-relaxed">
                    {kosherEvaluation.status === 'valid' && kosherMetadata.validUntil
                      ? isHe
                        ? `כשר חלבי — תעודה בתוקף עד ${kosherMetadata.validUntil}`
                        : `Kosher dairy — valid through ${kosherMetadata.validUntil}`
                      : kosherEvaluation.status === 'expiring_soon' && kosherMetadata.validUntil
                      ? isHe
                        ? `כשר חלבי — תוקף התעודה יפוג ב-${kosherMetadata.validUntil}`
                        : `Kosher dairy — expires ${kosherMetadata.validUntil}`
                      : kosherEvaluation.status === 'expired'
                      ? isHe
                        ? 'תעודת הכשרות ממתינה לעדכון מבעלת העסק — יש לוודא ישירות מול איילה.'
                        : 'Kosher certificate pending update — please verify directly with Ayala.'
                      : isHe
                      ? 'ממתין להעלאת פרטי תעודת כשרות עדכנית מבעלת העסק.'
                      : 'Kosher certificate metadata pending owner confirmation.'}
                  </p>
                  {(isHe ? publicContact.cancellationTermsHe : publicContact.cancellationTermsEn) && (
                    <p className="text-themeText/75">
                      {isHe
                        ? publicContact.cancellationTermsHe
                        : publicContact.cancellationTermsEn}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Contact Section */}
            <section
              className="my-14 bg-themeCardBg rounded-2xl p-6 md:p-8 border border-themeText/10 shadow-sm scroll-mt-24 text-center"
              id="contact-section"
            >
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-themeText mb-2">
                {isHe ? 'צור קשר' : 'Contact Us'}
              </h2>
              <p className="text-xs text-themeText/75 tracking-wider uppercase mb-6">
                {isHe ? 'נשמח לקחת חלק באירוע שלכם' : 'We would love to take part in your event'}
              </p>
              <div className="w-16 h-1 bg-themePrimary mx-auto mb-8 rounded-full" />

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-5 max-w-5xl mx-auto">
                <a
                  href={`tel:${publicContact.phoneTel}`}
                  className="bg-themeBg p-5 rounded-xl border border-themeText/10 hover:border-themePrimary hover:shadow-md transition flex flex-col items-center"
                >
                  <Phone className="text-themePrimary mb-3" size={24} />
                  <h3 className="font-bold text-themeText text-sm mb-1">
                    {isHe ? 'טלפון' : 'Phone'}
                  </h3>
                  <span dir="ltr" className="text-themeText/85 text-xs font-semibold">
                    {publicContact.phoneDisplay}
                  </span>
                </a>

                <a
                  href={`https://wa.me/${publicContact.whatsappDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-themeBg p-5 rounded-xl border border-themeText/10 hover:border-themePrimary hover:shadow-md transition flex flex-col items-center"
                >
                  <svg
                    className="w-6 h-6 text-themePrimary mb-3"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.247 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.52 5.242 1.521 5.46.002 9.897-4.437 9.9-9.899.001-2.646-1.03-5.132-2.903-7.006-1.874-1.873-4.361-2.903-7.01-2.903-5.464 0-9.903 4.438-9.907 9.899-.001 2.126.579 4.197 1.681 5.897l-.999 3.648 3.796-.997z" />
                  </svg>
                  <h3 className="font-bold text-themeText text-sm mb-1">
                    {isHe ? 'וואטסאפ' : 'WhatsApp'}
                  </h3>
                  <span className="text-themeText/85 text-xs font-semibold">
                    {isHe ? 'שלחו הודעה' : 'Send Message'}
                  </span>
                </a>

                <button
                  type="button"
                  onClick={() => setIsMapSelectionOpen(true)}
                  className="bg-themeBg p-5 rounded-xl border border-themeText/10 hover:border-themePrimary hover:shadow-md transition flex flex-col items-center"
                >
                  <MapPin className="text-themePrimary mb-3" size={24} />
                  <h3 className="font-bold text-themeText text-sm mb-1">
                    {isHe ? 'אזור פעילות' : 'Location'}
                  </h3>
                  <span className="text-themeText/85 text-xs font-semibold">
                    {isHe ? publicContact.pickupAreaHe : publicContact.pickupAreaEn}
                  </span>
                </button>

                <a
                  href="https://www.instagram.com/ayala_pashutaim/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-themeBg p-5 rounded-xl border border-themeText/10 hover:border-themePrimary hover:shadow-md transition flex flex-col items-center"
                >
                  <svg
                    className="w-6 h-6 text-themePrimary mb-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                  <h3 className="font-bold text-themeText text-sm mb-1">
                    {isHe ? 'אינסטגרם' : 'Instagram'}
                  </h3>
                  <span dir="ltr" className="text-themeText/85 text-xs font-semibold">
                    @ayala_pashutaim
                  </span>
                </a>

                <a
                  href="https://www.facebook.com/share/1EkU7G5BDA/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-themeBg p-5 rounded-xl border border-themeText/10 hover:border-themePrimary hover:shadow-md transition flex flex-col items-center col-span-2 md:col-span-1"
                >
                  <svg
                    className="w-6 h-6 text-themePrimary mb-3"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                  </svg>
                  <h3 className="font-bold text-themeText text-sm mb-1">
                    {isHe ? 'פייסבוק' : 'Facebook'}
                  </h3>
                  <span className="text-themeText/85 text-xs font-semibold">
                    {isHe ? 'איילה פשוט טעים' : 'Ayala Simply Delicious'}
                  </span>
                </a>
              </div>

              {publicContact.contactEmail && (
                <div className="mt-5 flex justify-center">
                  <a
                    href={`mailto:${publicContact.contactEmail}`}
                    className="inline-flex items-center gap-2 text-xs font-bold text-themeText/85 hover:underline"
                  >
                    <Mail size={14} className="text-themePrimary" />
                    <span>{publicContact.contactEmail}</span>
                  </a>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="bg-themeHeaderBg text-themeHeaderTxt/90 py-8 px-4 text-center mt-auto pb-28 md:pb-8">
        <div className="container mx-auto space-y-2">
          <p className="text-sm font-semibold">
            © {new Date().getFullYear()} {t.title}
          </p>
          <p className="text-xs text-themeHeaderTxt/80">
            {isHe ? publicContact.pickupAreaHe : publicContact.pickupAreaEn} •{' '}
            <a href={`tel:${publicContact.phoneTel}`} dir="ltr" className="underline">
              {publicContact.phoneDisplay}
            </a>
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-themeCardBg border-t border-themeText/15 p-3.5 shadow-[0_-5px_20px_rgba(0,0,0,0.12)] md:hidden z-30 pb-safe">
        <div className="flex justify-between items-center gap-3">
          {appConfig.ecommerce_mode ? (
            <div className="flex flex-col text-start">
              <span className="text-xs text-themeText/75 font-medium">{t.total}</span>
              <span className="text-xl font-bold font-serif text-themeText">₪{cartTotal()}</span>
            </div>
          ) : (
            <div className="flex flex-col text-start">
              <span className="text-xs text-themeText/75 font-medium">
                {isHe ? 'פריטים' : 'Items'}
              </span>
              <span className="text-xl font-bold font-serif text-themeText">{totalCartUnits}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              api.trackEvent('cart_opened', { items: cart.length });
              setIsCartOpen(true);
            }}
            className="flex-1 bg-themeHeaderBg text-themeHeaderTxt px-5 py-3 rounded-xl font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 text-sm"
          >
            <ShoppingBag size={18} className="text-themePrimary" />
            <span>
              {t.myOrder} ({cart.length})
            </span>
          </button>
        </div>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Conditional Portal Navigation Drawer (zero closed focusable elements in DOM) */}
      {isMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[920] bg-stone-950/65 backdrop-blur-sm flex"
            onClick={() => setIsMenuOpen(false)}
          >
            <div
              id="main-nav-drawer"
              ref={navDrawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="nav-drawer-title"
              dir={isHe ? 'rtl' : 'ltr'}
              onClick={(e) => e.stopPropagation()}
              className="fixed top-0 right-0 h-full w-[280px] max-w-[82vw] bg-themeCardBg text-themeText shadow-2xl flex flex-col p-6 border-l border-themeText/15"
            >
              <div className="flex justify-between items-center mb-6 border-b border-themeText/15 pb-4">
                <h2 id="nav-drawer-title" className="font-serif font-bold text-lg text-themeText">
                  {isHe ? 'ניווט באתר' : 'Navigation'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label={isHe ? 'סגור תפריט ניווט' : 'Close menu'}
                  className="p-1.5 hover:bg-themeText/10 rounded-full text-themeText"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex flex-col gap-2 text-start font-serif">
                {[
                  { labelHe: 'בית ותפריט', labelEn: 'Home & Menu', action: scrollToTop },
                  {
                    labelHe: 'גלריה',
                    labelEn: 'Gallery',
                    action: () => scrollToSection('gallery-section'),
                  },
                  {
                    labelHe: 'הסיפור שלנו',
                    labelEn: 'Our Story',
                    action: () => scrollToSection('about-section'),
                  },
                  {
                    labelHe: 'מידע ותנאים',
                    labelEn: 'Practical Info',
                    action: () => scrollToSection('practical-section'),
                  },
                  {
                    labelHe: 'חוות דעת',
                    labelEn: 'Reviews',
                    action: () => scrollToSection('reviews-section'),
                  },
                  {
                    labelHe: 'צור קשר',
                    labelEn: 'Contact Us',
                    action: () => scrollToSection('contact-section'),
                  },
                ].map((link) => (
                  <button
                    key={link.labelEn}
                    type="button"
                    onClick={link.action}
                    className="py-2.5 px-3 rounded-xl hover:bg-themeHeaderBg hover:text-themeHeaderTxt font-bold text-base transition-colors text-start"
                  >
                    {isHe ? link.labelHe : link.labelEn}
                  </button>
                ))}
              </nav>
            </div>
          </div>,
          document.body
        )}

      {/* Honest Kosher Certificate Modal (handles expired/unverified status transparently) */}
      <AccessibleModal
        isOpen={isKosherOpen}
        onClose={() => setIsKosherOpen(false)}
        titleId="kosher-modal-title"
        ariaLabel={isHe ? 'תעודת כשרות' : 'Kosher Certificate'}
        closeLabel={isHe ? 'סגור' : 'Close'}
        dir={isHe ? 'rtl' : 'ltr'}
        contentClassName="bg-themeCardBg text-themeText border border-themeText/15 rounded-2xl p-6 md:p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative text-center"
      >
        <Award size={40} className="text-themePrimary mx-auto mb-2" />
        <h3 id="kosher-modal-title" className="text-xl font-serif font-bold text-themeText mb-1">
          {isHe ? 'פרטי כשרות ותעודה' : 'Kosher Status & Certificate'}
        </h3>
        {kosherMetadata.issuer && (
          <p className="text-xs font-bold text-themeText/80 mb-3">
            {isHe ? `גוף נותן כשרות: ${kosherMetadata.issuer}` : `Certifying body: ${kosherMetadata.issuer}`}
          </p>
        )}

        {/* Honest expiry status banner */}
        {kosherEvaluation.status === 'valid' && kosherMetadata.validUntil && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold">
            {isHe
              ? `תעודת כשרות בתוקף עד ${kosherMetadata.validUntil}`
              : `Certificate valid through ${kosherMetadata.validUntil}`}
          </div>
        )}
        {kosherEvaluation.status === 'expiring_soon' && kosherMetadata.validUntil && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5">
            <AlertTriangle size={15} className="shrink-0" />
            <span>
              {isHe
                ? `תוקף התעודה עומד לפוג בקרוב (${kosherMetadata.validUntil})`
                : `Certificate expiring soon (${kosherMetadata.validUntil})`}
            </span>
          </div>
        )}
        {kosherEvaluation.status === 'expired' && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs text-start space-y-1"
          >
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle size={15} className="shrink-0" />
              <span>
                {isHe
                  ? `תעודת הכשרות פגה בתאריך ${kosherMetadata.validUntil}`
                  : `Uploaded certificate expired on ${kosherMetadata.validUntil}`}
              </span>
            </div>
            <p>
              {isHe
                ? 'ממתין לעדכון תעודה תקפה מאיילה. מומלץ לאשר פרטי כשרות עדכניים ישירות מול בעלת העסק.'
                : 'Awaiting refreshed certificate upload from Ayala. Please verify current status directly before confirming.'}
            </p>
          </div>
        )}
        {kosherEvaluation.status === 'unverified' && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs text-start space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle size={15} className="shrink-0" />
              <span>
                {isHe
                  ? 'תוקף ופרטי הכשרות ממתינים לעדכון/אימות בעלת העסק'
                  : 'Certificate validity metadata pending owner update'}
              </span>
            </div>
            <p>
              {isHe
                ? 'לפרטים מאומתים לגבי התעודה והשגחה ניתן לפנות לאיילה בטלפון או בוואטסאפ.'
                : 'For verified certification details please contact Ayala by phone or WhatsApp.'}
            </p>
          </div>
        )}

        <div className="border border-themeText/15 rounded-xl overflow-hidden bg-themeBg min-h-[220px] flex flex-col items-center justify-center p-2">
          {kosherDocUrl ? (
            isKosherPdf ? (
              <div className="p-6 space-y-3">
                <p className="text-sm font-bold text-themeText">
                  {isHe ? 'קובץ תעודת כשרות (PDF)' : 'Kosher Certificate Document (PDF)'}
                </p>
                <a
                  href={kosherDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-themeHeaderBg text-themeHeaderTxt font-bold text-xs"
                >
                  <span>{isHe ? 'פתח / הורד מסמך PDF' : 'Open / Download PDF'}</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            ) : (
              <img
                src={kosherDocUrl}
                alt={isHe ? 'תעודת כשרות — איילה פשוט טעים' : 'Kosher Certificate'}
                className="w-full max-h-[55vh] object-contain rounded-lg"
              />
            )
          ) : (
            <div className="p-6 text-themeText/70">
              <Award size={56} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold">
                {isHe ? 'קובץ התעודה טרם הועלה' : 'Certificate file pending upload'}
              </p>
            </div>
          )}
        </div>

        {kosherDocUrl && !isKosherPdf && (
          <a
            href={kosherDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-themeText underline hover:text-themePrimary"
          >
            <span>{isHe ? 'פתיחת תמונת תעודה בגודל מלא' : 'Open full-resolution certificate'}</span>
            <ExternalLink size={13} />
          </a>
        )}
      </AccessibleModal>

      {/* Server-Authenticated Admin Login Modal */}
      <AccessibleModal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setAdminPassword('');
          setLoginError(null);
        }}
        titleId="admin-login-title"
        ariaLabel={isHe ? 'כניסת מנהל' : 'Admin Login'}
        closeLabel={isHe ? 'סגור' : 'Close'}
        dir={isHe ? 'rtl' : 'ltr'}
        contentClassName="bg-themeCardBg text-themeText border border-themeText/15 rounded-2xl p-6 md:p-7 w-full max-w-sm shadow-2xl relative"
      >
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-themeHeaderBg/10 rounded-full mb-3 text-themeText">
            <Lock size={28} />
          </div>
          <h2 id="admin-login-title" className="text-2xl font-serif font-bold text-themeText">
            {isHe ? 'כניסת מנהל מאובטחת' : 'Admin Sign In'}
          </h2>
          <p className="text-xs text-themeText/75 mt-1">
            {isHe ? 'הזדהות ישירה מול השרת' : 'Server-verified session authentication'}
          </p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-password-input" className="block text-xs font-bold text-themeText/80 mb-1">
              {isHe ? 'סיסמת ניהול' : 'Admin Password'}
            </label>
            <input
              id="admin-password-input"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                setLoginError(null);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-themeText/25 bg-themeBg text-themeText text-sm outline-none focus:border-themePrimary"
              placeholder="••••••••"
              required
            />
          </div>

          {loginError && (
            <p role="alert" className="text-red-700 text-xs font-bold text-center">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-themeHeaderBg text-themeHeaderTxt font-bold py-3 rounded-xl hover:opacity-95 disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm"
          >
            {isLoggingIn && <Loader2 size={16} className="animate-spin" />}
            <span>{isHe ? 'כניסה' : 'Sign In'}</span>
          </button>
        </form>
      </AccessibleModal>

      {/* Privacy-Safe Pickup Area Modal (does NOT expose private home address) */}
      <AccessibleModal
        isOpen={isMapSelectionOpen}
        onClose={() => setIsMapSelectionOpen(false)}
        titleId="pickup-info-title"
        ariaLabel={isHe ? 'מיקום ואיסוף עצמי' : 'Location & Self Pickup'}
        closeLabel={isHe ? 'סגור' : 'Close'}
        dir={isHe ? 'rtl' : 'ltr'}
        contentClassName="bg-themeCardBg text-themeText rounded-2xl p-6 w-full max-w-sm shadow-2xl relative border border-themeText/15 text-center"
      >
        <div className="inline-flex items-center justify-center w-12 h-12 bg-themeHeaderBg/10 rounded-full mb-3 text-themeText">
          <MapPin size={24} />
        </div>
        <h3 id="pickup-info-title" className="text-xl font-serif font-bold text-themeText mb-2">
          {isHe
            ? `אזור פעילות ואיסוף: ${publicContact.pickupAreaHe}`
            : `Service & Pickup Area: ${publicContact.pickupAreaEn}`}
        </h3>
        <p className="text-xs md:text-sm text-themeText/80 leading-relaxed mb-5">
          {isHe ? publicContact.pickupPublicNoteHe : publicContact.pickupPublicNoteEn}
        </p>

        <div className="flex flex-col gap-2.5">
          <a
            href={`https://wa.me/${publicContact.whatsappDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsMapSelectionOpen(false)}
            className="w-full py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-sm"
          >
            {isHe ? 'תיאום הגעה וכתובת בוואטסאפ' : 'Coordinate Address via WhatsApp'}
          </a>
          <a
            href={`tel:${publicContact.phoneTel}`}
            className="w-full py-2.5 rounded-xl border border-themeText/20 bg-themeBg text-themeText font-bold text-sm"
          >
            <span dir="ltr">{publicContact.phoneDisplay}</span>
          </a>
        </div>
      </AccessibleModal>

      <AccessibilityMenu />

      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="no-print fixed bottom-[96px] right-4 md:bottom-6 md:right-6 z-[140] bg-themeHeaderBg text-themeHeaderTxt hover:opacity-95 hover:scale-105 active:scale-95 transition-all w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-lg border-2 border-themePrimary/60"
          title={isHe ? 'חזרה למעלה' : 'Back to top'}
          aria-label={isHe ? 'חזרה למעלה' : 'Back to top'}
        >
          <ArrowUp size={22} />
        </button>
      )}

      <Analytics />
    </div>
  );
}
