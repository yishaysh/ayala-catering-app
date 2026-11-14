import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore, translations } from '../store';
import {
  Accessibility,
  X,
  RotateCcw,
  Type,
  Eye,
  MousePointer,
  Sparkles,
  FileText,
  Link2,
  Check,
} from 'lucide-react';
import { AccessibleModal } from './AccessibleModal';
import { useBackButton } from '../hooks/useBackButton';

interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'xlarge';
  grayscale: boolean;
  invert: boolean;
  readableFont: boolean;
  highlightLinks: boolean;
  largeCursor: boolean;
  stopAnimations: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 'normal',
  grayscale: false,
  invert: false,
  readableFont: false,
  highlightLinks: false,
  largeCursor: false,
  stopAnimations: false,
};

export function AccessibilityMenu() {
  const { language, publicContact } = useStore();
  const isHe = language === 'he';
  const t = translations[language] || translations.he;

  const [isOpen, setIsOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem('ayala_accessibility_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useBackButton(isOpen && !isStatementOpen, () => setIsOpen(false));

  // Apply settings cleanly to document root
  useEffect(() => {
    const root = document.documentElement;
    if (settings.fontSize === 'large') {
      root.style.fontSize = '115%';
    } else if (settings.fontSize === 'xlarge') {
      root.style.fontSize = '130%';
    } else {
      root.style.fontSize = '';
    }

    const toggleClass = (className: string, condition: boolean) => {
      if (condition) root.classList.add(className);
      else root.classList.remove(className);
    };

    toggleClass('acc-grayscale', settings.grayscale);
    toggleClass('acc-invert', settings.invert);
    toggleClass('acc-readable-font', settings.readableFont);
    toggleClass('acc-highlight-links', settings.highlightLinks);
    toggleClass('acc-large-cursor', settings.largeCursor);
    toggleClass('acc-stop-animations', settings.stopAnimations);

    try {
      localStorage.setItem('ayala_accessibility_settings', JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }, [settings]);

  // Focus trap & Escape handling when slide-out drawer is mounted
  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => {
      const root = drawerRef.current;
      if (!root) return;
      const firstFocusable = root.querySelector<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled])'
      );
      firstFocusable?.focus();
    }, 15);

    const onKeyDown = (e: KeyboardEvent) => {
      if (isStatementOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const root = drawerRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
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

    const triggerNode = triggerRef.current;
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      if (!isStatementOpen) {
        triggerNode?.focus();
      }
    };
  }, [isOpen, isStatementOpen]);

  const toggleSetting = (key: keyof Omit<AccessibilitySettings, 'fontSize'>) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFontSizeChange = (size: 'normal' | 'large' | 'xlarge') => {
    setSettings((prev) => ({ ...prev, fontSize: size }));
  };

  const handleReset = () => setSettings(DEFAULT_SETTINGS);

  return (
    <>
      {/* Floating Accessibility Trigger */}
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="accessibility-drawer"
        onClick={() => setIsOpen(true)}
        className="no-print fixed bottom-[96px] left-4 md:bottom-6 md:left-6 z-[140] bg-themeHeaderBg text-themeHeaderTxt hover:opacity-95 hover:scale-105 active:scale-95 transition-all w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-lg border-2 border-themePrimary/60"
        title={t.accessibility?.menuTitle || 'תפריט נגישות / Accessibility'}
        aria-label={t.accessibility?.menuTitle || 'תפריט נגישות / Accessibility'}
      >
        <Accessibility size={24} />
      </button>

      {/* Conditionally mounted portal drawer -> zero hidden focusable nodes in DOM when closed */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[940] bg-stone-950/65 backdrop-blur-sm flex"
            onClick={() => setIsOpen(false)}
          >
            <div
              id="accessibility-drawer"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="acc-drawer-title"
              dir={isHe ? 'rtl' : 'ltr'}
              onClick={(e) => e.stopPropagation()}
              className="fixed top-0 left-0 h-full w-[340px] max-w-[92vw] bg-themeCardBg text-themeText shadow-2xl flex flex-col border-r border-themeText/15"
            >
              <div className="flex justify-between items-center p-5 bg-themeHeaderBg text-themeHeaderTxt">
                <div className="flex items-center gap-2">
                  <Accessibility className="text-themePrimary" size={22} />
                  <h2 id="acc-drawer-title" className="font-serif font-bold text-lg">
                    {t.accessibility.menuTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/15 rounded-full transition-colors text-themeHeaderTxt"
                  aria-label={t.accessibility.closeBtn}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-5 py-3 bg-themeBg text-xs text-themeText/80 border-b border-themeText/10">
                {t.accessibility.description}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Font Size */}
                <div className="space-y-2.5">
                  <span className="text-sm font-bold text-themeText flex items-center gap-2">
                    <Type size={16} className="text-themePrimary" />
                    <span>{t.accessibility.increaseText}</span>
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['normal', 'large', 'xlarge'] as const).map((size) => {
                      const active = settings.fontSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          aria-pressed={active}
                          onClick={() => handleFontSizeChange(size)}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${
                            active
                              ? 'bg-themeHeaderBg text-themeHeaderTxt border-themeHeaderBg'
                              : 'bg-themeBg text-themeText border-themeText/20 hover:border-themePrimary'
                          }`}
                        >
                          {size === 'normal' && (isHe ? 'רגיל' : 'Normal')}
                          {size === 'large' && '+15%'}
                          {size === 'xlarge' && '+30%'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contrast Modifiers */}
                <div className="space-y-2.5">
                  <span className="text-sm font-bold text-themeText flex items-center gap-2">
                    <Eye size={16} className="text-themePrimary" />
                    <span>{isHe ? 'צבעים וניגודיות' : 'Colors & Contrast'}</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={settings.invert}
                      onClick={() => toggleSetting('invert')}
                      className={`flex items-center justify-between p-3 text-xs font-bold rounded-lg border transition-colors ${
                        settings.invert
                          ? 'bg-themeHeaderBg text-themeHeaderTxt border-themeHeaderBg'
                          : 'bg-themeBg text-themeText border-themeText/20 hover:border-themePrimary'
                      }`}
                    >
                      <span className="truncate">{t.accessibility.invertContrast}</span>
                      {settings.invert && <Check size={14} className="shrink-0" />}
                    </button>

                    <button
                      type="button"
                      aria-pressed={settings.grayscale}
                      onClick={() => toggleSetting('grayscale')}
                      className={`flex items-center justify-between p-3 text-xs font-bold rounded-lg border transition-colors ${
                        settings.grayscale
                          ? 'bg-themeHeaderBg text-themeHeaderTxt border-themeHeaderBg'
                          : 'bg-themeBg text-themeText border-themeText/20 hover:border-themePrimary'
                      }`}
                    >
                      <span>{t.accessibility.grayscale}</span>
                      {settings.grayscale && <Check size={14} className="shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Assists */}
                <div className="space-y-2.5">
                  <span className="text-sm font-bold text-themeText flex items-center gap-2">
                    <Sparkles size={16} className="text-themePrimary" />
                    <span>{isHe ? 'עזרי קריאה וניווט' : 'Reading & Motion Assists'}</span>
                  </span>
                  <div className="space-y-2">
                    {[
                      {
                        key: 'readableFont' as const,
                        icon: <Type size={16} />,
                        label: t.accessibility.readableFont,
                      },
                      {
                        key: 'highlightLinks' as const,
                        icon: <Link2 size={16} />,
                        label: t.accessibility.highlightLinks,
                      },
                      {
                        key: 'largeCursor' as const,
                        icon: <MousePointer size={16} />,
                        label: t.accessibility.largeCursor,
                      },
                      {
                        key: 'stopAnimations' as const,
                        icon: <Sparkles size={16} className="rotate-45" />,
                        label: t.accessibility.stopAnimations,
                      },
                    ].map((opt) => {
                      const active = settings[opt.key];
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleSetting(opt.key)}
                          className={`w-full flex items-center justify-between p-3 text-xs font-bold rounded-lg border transition-colors ${
                            active
                              ? 'bg-themeHeaderBg text-themeHeaderTxt border-themeHeaderBg'
                              : 'bg-themeBg text-themeText border-themeText/20 hover:border-themePrimary'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {opt.icon}
                            <span>{opt.label}</span>
                          </div>
                          {active && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-themeText/15 space-y-2.5 bg-themeBg">
                <button
                  type="button"
                  onClick={() => setIsStatementOpen(true)}
                  className="w-full bg-themeCardBg text-themeText border border-themeText/20 hover:border-themePrimary font-bold py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
                >
                  <FileText size={16} className="text-themePrimary" />
                  <span>{t.accessibility.statementBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full bg-themeBg hover:bg-themeText/5 text-themeText/85 font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 border border-themeText/15"
                >
                  <RotateCcw size={14} />
                  <span>{t.accessibility.resetText}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Honest Accessibility Statement Modal */}
      <AccessibleModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        titleId="acc-statement-title"
        ariaLabel={isHe ? 'הצהרת נגישות' : 'Accessibility Statement'}
        closeLabel={t.accessibility.closeBtn}
        dir={isHe ? 'rtl' : 'ltr'}
        overlayClassName="bg-black/75 backdrop-blur-sm p-4 z-[1050]"
        contentClassName="bg-themeCardBg text-themeText border border-themeText/15 rounded-2xl p-6 md:p-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative"
      >
        {isHe ? (
          <article className="space-y-4 text-start text-sm leading-relaxed">
            <div className="flex items-center gap-3 border-b border-themeText/10 pb-3 pe-8">
              <FileText className="text-themePrimary shrink-0" size={26} />
              <h3 id="acc-statement-title" className="text-2xl font-serif font-bold text-themeText">
                הצהרת נגישות — איילה פשוט טעים
              </h3>
            </div>

            <p>
              אנו פועלים להנגשת האתר לכלל המבקרים, כולל אנשים עם מוגבלויות, במטרה לאפשר הזמנת הצעות מחיר וקבלת מידע בצורה נוחה, מכובדת ושוויונית.
            </p>

            <div>
              <h4 className="font-bold text-base mb-1">התאמות הנגישות המוטמעות באתר</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>ניווט מקלדת מלא (Tab, Enter, Space ו-Escape), לכידת מיקוד בדיאלוגים והחזרת פוקוס בסגירה.</li>
                <li>תפריט נגישות להגדלת טקסט (+15%, +30%), ניגודיות גבוהה, גווני אפור, עצירת אנימציות והדגשת קישורים.</li>
                <li>טפסי בקשת הצעת מחיר עם תוויות קשורות (labels) והודעות שגיאה נגישות לצד השדות.</li>
                <li>גלריית מדיה נגישה עם כפתורי ניווט מפורשים וכתוביות תיאור.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-base mb-1">מגבלות ידועות ושיפור מתמשך</h4>
              <p>
                התאמות הנגישות באתר נבדקות באופן שוטף ומתעדכנות מעת לעת; האתר אינו מחזיק בהסמכת נגישות חיצונית רשמית. רכיבים חיצוניים כגון שירותי מיקום, תעודות סרוקות (PDF/תמונות) ונגני וידאו חיצוניים תלויים לעיתים בתמיכת הצד השלישי, ואנו נשמח למסור כל מידע בעל פה או בטלפון לפי בקשה.
              </p>
            </div>

            <div className="bg-themeBg p-4 rounded-xl border border-themeText/15 space-y-1.5">
              <div className="font-bold">פנייה בנושא נגישות והתאמות:</div>
              <div>
                <strong>איש קשר:</strong> איילה
              </div>
              <div>
                <strong>טלפון ווואטסאפ:</strong>{' '}
                <a
                  href={`tel:${publicContact.phoneTel}`}
                  dir="ltr"
                  className="font-bold underline"
                >
                  {publicContact.phoneDisplay}
                </a>
              </div>
              {publicContact.contactEmail && (
                <div>
                  <strong>אימייל:</strong>{' '}
                  <a href={`mailto:${publicContact.contactEmail}`} className="font-bold underline">
                    {publicContact.contactEmail}
                  </a>
                </div>
              )}
              <div className="text-xs text-themeText/70 pt-2 border-t border-themeText/10">
                עודכן לאחרונה: נובמבר 2026
              </div>
            </div>
          </article>
        ) : (
          <article className="space-y-4 text-start text-sm leading-relaxed">
            <div className="flex items-center gap-3 border-b border-themeText/10 pb-3 pe-8">
              <FileText className="text-themePrimary shrink-0" size={26} />
              <h3 id="acc-statement-title" className="text-2xl font-serif font-bold text-themeText">
                Accessibility Statement — Ayala Simply Delicious
              </h3>
            </div>

            <p>
              We work to make this website usable for everyone, including people with disabilities, so visitors can browse our menu and submit quote requests independently and comfortably.
            </p>

            <div>
              <h4 className="font-bold text-base mb-1">Accessibility Features Implemented</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Keyboard navigation with focus trapping and Escape handling inside modals and drawers.</li>
                <li>Accessibility tools for text scaling (+15%, +30%), high contrast, grayscale, link highlighting, and reduced motion.</li>
                <li>Associated form labels and inline accessible validation alerts.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-base mb-1">Known Limitations & Ongoing Improvements</h4>
              <p>
                Accessibility improvements are audited and updated continuously; this site has not undergone formal external certification. Third-party services, geocoding helpers, and uploaded certificates/videos may have partial screen-reader limitations—please contact us by phone or WhatsApp for direct assistance at any time.
              </p>
            </div>

            <div className="bg-themeBg p-4 rounded-xl border border-themeText/15 space-y-1.5">
              <div className="font-bold">Accessibility Contact:</div>
              <div>
                <strong>Coordinator:</strong> Ayala
              </div>
              <div>
                <strong>Phone & WhatsApp:</strong>{' '}
                <a href={`tel:${publicContact.phoneTel}`} className="font-bold underline">
                  {publicContact.phoneDisplay}
                </a>
              </div>
              {publicContact.contactEmail && (
                <div>
                  <strong>Email:</strong>{' '}
                  <a href={`mailto:${publicContact.contactEmail}`} className="font-bold underline">
                    {publicContact.contactEmail}
                  </a>
                </div>
              )}
              <div className="text-xs text-themeText/70 pt-2 border-t border-themeText/10">
                Last updated: November 2026
              </div>
            </div>
          </article>
        )}

        <button
          type="button"
          onClick={() => setIsStatementOpen(false)}
          className="mt-6 w-full bg-themeHeaderBg text-themeHeaderTxt font-bold py-3 rounded-xl hover:opacity-95 transition text-sm"
        >
          {t.accessibility.closeBtn}
        </button>
      </AccessibleModal>
    </>
  );
}
