import React, { useState, useEffect } from 'react';
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
  Check
} from 'lucide-react';

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
  const { language } = useStore();
  const t = translations[language];
  
  const [isOpen, setIsOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem('ayala_accessibility_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Apply settings to document element
  useEffect(() => {
    const root = document.documentElement;

    // 1. Text scaling
    if (settings.fontSize === 'large') {
      root.style.fontSize = '115%';
    } else if (settings.fontSize === 'xlarge') {
      root.style.fontSize = '130%';
    } else {
      root.style.fontSize = ''; // normal / default
    }

    // 2. Classes toggling
    const toggleClass = (className: string, condition: boolean) => {
      if (condition) {
        root.classList.add(className);
      } else {
        root.classList.remove(className);
      }
    };

    toggleClass('acc-grayscale', settings.grayscale);
    toggleClass('acc-invert', settings.invert);
    toggleClass('acc-readable-font', settings.readableFont);
    toggleClass('acc-highlight-links', settings.highlightLinks);
    toggleClass('acc-large-cursor', settings.largeCursor);
    toggleClass('acc-stop-animations', settings.stopAnimations);

    // Save to localStorage
    try {
      localStorage.setItem('ayala_accessibility_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save accessibility settings to localStorage:', e);
    }
  }, [settings]);

  const toggleSetting = (key: keyof Omit<AccessibilitySettings, 'fontSize'>) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleFontSizeChange = (size: 'normal' | 'large' | 'xlarge') => {
    setSettings(prev => ({
      ...prev,
      fontSize: size
    }));
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <>
      {/* Floating Accessibility Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[100px] left-4 md:bottom-6 md:left-6 z-[140] bg-themeHeaderBg text-themePrimary hover:bg-themeHeaderBg/90 hover:scale-105 active:scale-95 transition-all duration-300 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-themePrimary/20"
        title={t.accessibility?.menuTitle || "Accessibility Options / תפריט נגישות"}
        aria-label={t.accessibility?.menuTitle || "Accessibility Options / תפריט נגישות"}
      >
        <Accessibility size={26} className="animate-pulse" />
      </button>

      {/* Slide-out Accessibility Drawer */}
      <div 
        className={`fixed inset-0 z-[200] bg-stone-900/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      >
        <div 
          className={`fixed top-0 left-0 h-full w-[340px] max-w-[90vw] bg-themeCardBg text-themeText shadow-2xl z-[210] flex flex-col transition-transform duration-300 transform ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={e => e.stopPropagation()}
          dir={language === 'he' ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-themeText/10">
            <div className="flex items-center gap-2">
              <Accessibility className="text-themePrimary" size={24} />
              <span className="font-serif font-bold text-lg text-themePrimary">
                {t.accessibility.menuTitle}
              </span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-themeText/5 rounded-full transition-colors text-themeText/70 hover:text-themeText"
              aria-label={t.accessibility.closeBtn}
            >
              <X size={20} />
            </button>
          </div>

          {/* Description */}
          <div className="px-5 py-3 bg-themeBg/30 text-xs text-themeText/70 border-b border-themeText/5">
            {t.accessibility.description}
          </div>

          {/* Settings Options (Scrollable area) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* 1. Font Size Control */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-themeText/80 flex items-center gap-2">
                <Type size={16} className="text-themePrimary" />
                <span>{t.accessibility.increaseText}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['normal', 'large', 'xlarge'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => handleFontSizeChange(size)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      settings.fontSize === size
                        ? 'bg-themeHeaderBg text-themePrimary border-themePrimary'
                        : 'bg-themeBg/40 text-themeText/70 border-themeText/10 hover:border-themePrimary/40'
                    }`}
                  >
                    {size === 'normal' && (language === 'he' ? 'רגיל' : 'Normal')}
                    {size === 'large' && '+15%'}
                    {size === 'xlarge' && '+30%'}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Contrast Modifiers */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-themeText/80 flex items-center gap-2">
                <Eye size={16} className="text-themePrimary" />
                <span>צבעים וניגודיות / Contrast</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* Contrast Invert */}
                <button
                  onClick={() => toggleSetting('invert')}
                  className={`flex items-center justify-between p-3 text-xs font-bold rounded-lg border transition-all ${
                    settings.invert
                      ? 'bg-themeHeaderBg text-themePrimary border-themePrimary'
                      : 'bg-themeBg/40 text-themeText/70 border-themeText/10 hover:border-themePrimary/40'
                  }`}
                >
                  <span className="truncate">{t.accessibility.invertContrast}</span>
                  {settings.invert && <Check size={14} className="flex-shrink-0" />}
                </button>

                {/* Grayscale */}
                <button
                  onClick={() => toggleSetting('grayscale')}
                  className={`flex items-center justify-between p-3 text-xs font-bold rounded-lg border transition-all ${
                    settings.grayscale
                      ? 'bg-themeHeaderBg text-themePrimary border-themePrimary'
                      : 'bg-themeBg/40 text-themeText/70 border-themeText/10 hover:border-themePrimary/40'
                  }`}
                >
                  <span>{t.accessibility.grayscale}</span>
                  {settings.grayscale && <Check size={14} className="flex-shrink-0" />}
                </button>
              </div>
            </div>

            {/* 3. Reading and Layout Assists */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-themeText/80 flex items-center gap-2">
                <Sparkles size={16} className="text-themePrimary" />
                <span>עזרי קריאה וניווט / Accessibility Assists</span>
              </label>
              
              <div className="space-y-2">
                {/* Readable Font */}
                <button
                  onClick={() => toggleSetting('readableFont')}
                  className={`w-full flex items-center justify-between p-3.5 text-xs font-bold rounded-lg border transition-all ${
                    settings.readableFont
                      ? 'bg-themeHeaderBg text-themePrimary border-themePrimary'
                      : 'bg-themeBg/40 text-themeText/70 border-themeText/10 hover:border-themePrimary/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Type size={16} />
                    <span>{t.accessibility.readableFont}</span>
                  </div>
                  {settings.readableFont && <Check size={14} />}
                </button>

                {/* Highlight Links */}
                <button
                  onClick={() => toggleSetting('highlightLinks')}
                  className={`w-full flex items-center justify-between p-3.5 text-xs font-bold rounded-lg border transition-all ${
                    settings.highlightLinks
                      ? 'bg-themeHeaderBg text-themePrimary border-themePrimary'
                      : 'bg-themeBg/40 text-themeText/70 border-themeText/10 hover:border-themePrimary/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Link2 size={16} />
                    <span>{t.accessibility.highlightLinks}</span>
                  </div>
                  {settings.highlightLinks && <Check size={14} />}
                </button>

                {/* Large Cursor */}
                <button
                  onClick={() => toggleSetting('largeCursor')}
                  className={`w-full flex items-center justify-between p-3.5 text-xs font-bold rounded-lg border transition-all ${
                    settings.largeCursor
                      ? 'bg-themeHeaderBg text-themePrimary border-themePrimary'
                      : 'bg-themeBg/40 text-themeText/70 border-themeText/10 hover:border-themePrimary/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MousePointer size={16} />
                    <span>{t.accessibility.largeCursor}</span>
                  </div>
                  {settings.largeCursor && <Check size={14} />}
                </button>

                {/* Stopped Animations */}
                <button
                  onClick={() => toggleSetting('stopAnimations')}
                  className={`w-full flex items-center justify-between p-3.5 text-xs font-bold rounded-lg border transition-all ${
                    settings.stopAnimations
                      ? 'bg-themeHeaderBg text-themePrimary border-themePrimary'
                      : 'bg-themeBg/40 text-themeText/70 border-themeText/10 hover:border-themePrimary/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={16} className="rotate-45" />
                    <span>{t.accessibility.stopAnimations}</span>
                  </div>
                  {settings.stopAnimations && <Check size={14} />}
                </button>
              </div>
            </div>

          </div>

          {/* Footer Controls */}
          <div className="p-5 border-t border-themeText/10 space-y-3 bg-themeBg/20">
            {/* Statement button */}
            <button
              onClick={() => setIsStatementOpen(true)}
              className="w-full bg-themeCardBg text-themeText/90 border border-themeText/10 hover:border-themePrimary/50 font-bold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText size={16} className="text-themePrimary" />
              <span>{t.accessibility.statementBtn}</span>
            </button>

            {/* Reset Settings */}
            <button
              onClick={handleReset}
              className="w-full bg-themeBg/50 hover:bg-themeBg text-themeText/80 hover:text-themeText font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer border border-transparent hover:border-themeText/10"
            >
              <RotateCcw size={14} />
              <span>{t.accessibility.resetText}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Accessibility Statement Dialog */}
      {isStatementOpen && (
        <div 
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-zoom-in"
          onClick={() => setIsStatementOpen(false)}
        >
          <div 
            className="bg-themeCardBg text-themeText border border-themeText/15 rounded-2xl p-6 md:p-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative"
            onClick={e => e.stopPropagation()}
            dir={language === 'he' ? 'rtl' : 'ltr'}
          >
            <button 
              onClick={() => setIsStatementOpen(false)}
              className="absolute top-4 right-4 text-themeText/60 hover:text-themeText bg-themeBg/50 hover:bg-themeBg/85 p-2 rounded-full transition-colors"
              aria-label={t.accessibility.closeBtn}
            >
              <X size={18} />
            </button>

            {/* Content of the Legal Accessibility Statement */}
            {language === 'he' ? (
              <article className="prose prose-stone dark:prose-invert max-w-none font-serif text-start">
                <div className="flex items-center gap-3 border-b border-themeText/10 pb-4 mb-5">
                  <FileText className="text-themePrimary" size={28} />
                  <h3 className="text-2xl font-bold text-themePrimary m-0">הצהרת נגישות - איילה פשוט טעים</h3>
                </div>
                
                <p className="text-sm leading-relaxed mb-4">
                  אנו באיילה פשוט טעים רואים חשיבות עליונה בהנגשת האתר לכלל האוכלוסייה, ובפרט לאנשים עם מוגבלויות, מתוך אמונה כי לכל אדם מגיעה זכות שווה ליהנות מחוויית גלישה נוחה, עצמאית ומכבדת.
                </p>

                <h4 className="text-base font-bold text-themePrimary mb-2">תקן נגישות</h4>
                <p className="text-sm leading-relaxed mb-4">
                  האתר מונגש בהתאם להנחיות הנגישות בתקן הישראלי ת"י 5568 ("קווים מנחים לנגישות תכנים באינטרנט") ובהתאם להנחיות הבינלאומיות של ארגון הנגישות העולמי WCAG 2.1 לרמת התאמה AA.
                </p>

                <h4 className="text-base font-bold text-themePrimary mb-2">התאמות הנגישות שבוצעו באתר:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 mb-4">
                  <li>ניווט מקלדת מלא ומותאם (מעבר עם Tab ואישור עם Enter).</li>
                  <li>התאמת ניגודיות (כהה/בהירה) וגווני אפור להקלה על ראייה.</li>
                  <li>אפשרות להגדלת הגופנים במספר רמות ללא עיוות התצוגה.</li>
                  <li>הדגשת קישורים וכפתורים בצורה בולטת ומנוגדת.</li>
                  <li>מעבר לגופן קריא ופשוט ללא סריפים.</li>
                  <li>הגדלת סמן העכבר לשיפור הניראות על המסך.</li>
                  <li>עצירת רכיבים נעים, אנימציות ואפקטים מהבהבים למניעת התקפים.</li>
                  <li>תמיכה בהקראת מסך (עבור קוראי מסך פופולריים כגון NVDA, JAWS).</li>
                </ul>

                <h4 className="text-base font-bold text-themePrimary mb-2">נתקלתם בבעיה? יש לכם הצעה לשיפור?</h4>
                <p className="text-sm leading-relaxed mb-4">
                  אנו ממשיכים במאמצים לשפר את נגישות האתר כחלק ממחויבותנו לאפשר שימוש בו עבור כלל האוכלוסייה.
                  אם במהלך הגלישה באתר נתקלתם בקושי בנושא נגישות, נשמח אם תפנו אלינו כדי שנוכל לתקן ולייעל:
                </p>

                <div className="bg-themeBg/30 p-4 rounded-xl border border-themeText/5 space-y-2 text-sm">
                  <div><strong>רכזת נגישות:</strong> איילה</div>
                  <div><strong>טלפון:</strong> <a href="tel:0547474764" className="text-themePrimary font-bold hover:underline">054-747-4764</a></div>
                  <div><strong>אימייל:</strong> <a href="mailto:ayala.delicious@gmail.com" className="text-themePrimary font-bold hover:underline">ayala.delicious@gmail.com</a></div>
                  <div className="text-xs text-themeText/50 pt-2 border-t border-themeText/5">תאריך עדכון הצהרה: יוני 2026</div>
                </div>
              </article>
            ) : (
              <article className="prose prose-stone max-w-none font-serif text-start">
                <div className="flex items-center gap-3 border-b border-themeText/10 pb-4 mb-5">
                  <FileText className="text-themePrimary" size={28} />
                  <h3 className="text-2xl font-bold text-themePrimary m-0">Accessibility Statement - Ayala Simply Delicious</h3>
                </div>

                <p className="text-sm leading-relaxed mb-4">
                  We at Ayala Simply Delicious place supreme importance on making our website accessible to the entire population, and specifically to people with disabilities, believing that everyone deserves an equal right to enjoy a comfortable, independent, and respectful browsing experience.
                </p>

                <h4 className="text-base font-bold text-themePrimary mb-2">Accessibility Standard</h4>
                <p className="text-sm leading-relaxed mb-4">
                  This website is accessible in accordance with Israeli Standard SI 5568 ("Guidelines for Internet Content Accessibility") and World Accessibility Guidelines WCAG 2.1 Level AA.
                </p>

                <h4 className="text-base font-bold text-themePrimary mb-2">Accessibility Adjustments Made:</h4>
                <ul className="list-disc list-inside text-sm space-y-1 mb-4">
                  <li>Full and optimized keyboard navigation (using Tab and Enter).</li>
                  <li>Contrast adjustment (dark contrast, grayscale).</li>
                  <li>Font size scaling options (+15%, +30%) without breaking layout.</li>
                  <li>Clear highlighting of links and buttons.</li>
                  <li>Switch to a highly readable sans-serif font.</li>
                  <li>Cursor enlargement for better visibility.</li>
                  <li>Pausing moving elements, animations, and flashing effects.</li>
                  <li>Screen reader support (NVDA, JAWS, etc.).</li>
                </ul>

                <h4 className="text-base font-bold text-themePrimary mb-2">Feedback and Coordinator Information:</h4>
                <p className="text-sm leading-relaxed mb-4">
                  We continuously strive to improve website accessibility. If you encounter any accessibility issues while browsing, please contact our coordinator:
                </p>

                <div className="bg-themeBg/30 p-4 rounded-xl border border-themeText/5 space-y-2 text-sm">
                  <div><strong>Accessibility Coordinator:</strong> Ayala</div>
                  <div><strong>Phone:</strong> <a href="tel:0547474764" className="text-themePrimary font-bold hover:underline">054-747-4764</a></div>
                  <div><strong>Email:</strong> <a href="mailto:ayala.delicious@gmail.com" className="text-themePrimary font-bold hover:underline">ayala.delicious@gmail.com</a></div>
                  <div className="text-xs text-themeText/50 pt-2 border-t border-themeText/5">Date of Statement: Date of Statement: June 2026</div>
                </div>
              </article>
            )}

            <button
              onClick={() => setIsStatementOpen(false)}
              className="mt-6 w-full bg-themePrimary text-themeHeaderBg font-bold py-3 rounded-xl hover:opacity-95 transition-all text-sm cursor-pointer"
            >
              {t.accessibility.closeBtn}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
