import React, { useEffect, useMemo, useState } from 'react';
import { useStore, translations, getLocalizedItem } from '../store';
import {
  Minus,
  Plus,
  UtensilsCrossed,
  Wine,
  Sparkles,
  Users,
  Baby,
  Package,
  Trash2,
  ShoppingBag,
  ArrowLeftRight,
  Info,
} from 'lucide-react';
import { Category, EventPackage, EventType, MenuItem } from '../types';
import { validateStrictNonNegativeInt } from '../../shared/validation';
import { QUOTE_MODE_JOURNEY } from '../../shared/config';
import { AccessibleModal } from './AccessibleModal';
import { api } from '../lib/api';

interface ResolvedPackageDraft {
  id: string;
  nameHe: string;
  nameEn: string;
  descriptionHe: string;
  descriptionEn: string;
  guestsLabelHe: string;
  guestsLabelEn: string;
  isOwnerConfigured: boolean;
  items: Array<{ item: MenuItem; quantity: number; note?: string }>;
}

const isNonFoodExtra = (item: MenuItem): boolean =>
  item.category === 'Extras' && /כפות|סכו|מפית|צלחת חד|מזלג|סכין|מגש הגשה|spoon|utensil|napkin|cutlery/i.test(`${item.name} ${item.name_en || ''}`);

export const HostHelper: React.FC = () => {
  const {
    adultCount,
    setAdultCount,
    childCount,
    setChildCount,
    language,
    eventType,
    setEventType,
    advancedSettings,
    featureFlags,
    setAiPrompt,
    menuItems,
    packages,
    cart,
    bulkAddToCart,
    appConfig,
  } = useStore();

  const isHe = language === 'he';
  const t = translations[language] || translations.he;

  // Keep raw input strings so invalid inputs (-5, 12.5, abc) remain visible with explicit feedback
  const [adultStr, setAdultStr] = useState<string>(() => String(Math.max(0, Math.floor(adultCount || 0))));
  const [childStr, setChildStr] = useState<string>(() => String(Math.max(0, Math.floor(childCount || 0))));
  const [adultError, setAdultError] = useState<string | null>(null);
  const [childError, setChildError] = useState<string | null>(null);

  const [editingPackage, setEditingPackage] = useState<ResolvedPackageDraft | null>(null);
  const [draftItems, setDraftItems] = useState<Array<{ item: MenuItem; quantity: number; note?: string }>>([]);
  const [packageAppliedFeedback, setPackageAppliedFeedback] = useState<string | null>(null);

  useEffect(() => {
    setAdultStr((prev) => {
      if (prev === '' && adultCount === 0) return '';
      const validCurrent = Number.isInteger(Number(prev)) && Number(prev) === adultCount;
      return validCurrent ? prev : String(Math.max(0, Math.floor(adultCount || 0)));
    });
  }, [adultCount]);

  useEffect(() => {
    setChildStr((prev) => {
      if (prev === '' && childCount === 0) return '';
      const validCurrent = Number.isInteger(Number(prev)) && Number(prev) === childCount;
      return validCurrent ? prev : String(Math.max(0, Math.floor(childCount || 0)));
    });
  }, [childCount]);

  const handleGuestInputChange = (
    raw: string,
    kind: 'adult' | 'child'
  ) => {
    const setRaw = kind === 'adult' ? setAdultStr : setChildStr;
    const setErr = kind === 'adult' ? setAdultError : setChildError;
    const commit = kind === 'adult' ? setAdultCount : setChildCount;

    setRaw(raw);
    const trimmed = raw.trim();
    if (trimmed === '') {
      setErr(null);
      commit(0);
      return;
    }

    const res = validateStrictNonNegativeInt(trimmed, {
      required: true,
      max: 5000,
      labelHe: kind === 'adult' ? 'מספר מבוגרים' : 'מספר ילדים',
      labelEn: kind === 'adult' ? 'Adult count' : 'Child count',
    });

    if (!res.valid || res.value === null) {
      setErr(res.error ? (isHe ? res.error.he : res.error.en) : (isHe ? 'ערך לא תקין' : 'Invalid value'));
      return;
    }

    setErr(null);
    commit(res.value);
    api.trackEvent('calculator_used', { guest_kind: kind, count: res.value });
  };

  const adjustGuestCount = (kind: 'adult' | 'child', delta: number) => {
    const current = kind === 'adult' ? adultCount : childCount;
    const next = Math.max(0, Math.min(5000, current + delta));
    if (kind === 'adult') {
      setAdultError(null);
      setAdultStr(String(next));
      setAdultCount(next);
    } else {
      setChildError(null);
      setChildStr(String(next));
      setChildCount(next);
    }
    api.trackEvent('calculator_used', { guest_kind: kind, count: next });
  };

  const totalGuests = adultCount + childCount;

  const recommendations = useMemo(() => {
    if (totalGuests === 0) return null;
    const ratios = advancedSettings.eventRatios[eventType];
    const weightedCount = adultCount + childCount * 0.66;
    return {
      sandwiches: Math.ceil(weightedCount * (ratios.sandwiches ?? 0)),
      pastries: Math.ceil(weightedCount * (ratios.pastries ?? 0)),
      salads: Math.ceil(weightedCount * (ratios.saladsCoverage ?? 0)),
      mains: Math.ceil(weightedCount * (ratios.mainsCoverage ?? 0)),
      platters: Math.ceil(weightedCount * (ratios.plattersCoverage ?? 0)),
      desserts: Math.ceil(weightedCount * (ratios.dessertsCoverage ?? 0)),
      dips: Math.ceil(weightedCount * (ratios.dipsCoverage ?? 0)),
    };
  }, [adultCount, childCount, eventType, advancedSettings, totalGuests]);

  const scrollToSection = (cat: Category) => {
    const sectionId = `cat-${cat.replace(/\s+/g, '-')}`;
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = 135;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - headerHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleTransferToChef = () => {
    if (!featureFlags.showAI) return;
    const generatedPrompt = isHe
      ? `היי, אני רוצה לתכנן אירוע ${
          eventType === 'basic' ? 'בסיס' : eventType === 'plus' ? 'פלוס' : 'פרימיום'
        } עבור ${adultCount} מבוגרים ו-${childCount} ילדים.
מתוך המחשבון, נתקבלו כמויות מומלצות אלו:
מנות חובה שחושבו:
- סלטים: ${recommendations?.salads || 0} מגשים
- מגשי אירוח: ${recommendations?.platters || 0} מגשים
- מנות עיקריות: ${recommendations?.mains || 0} מגשים
${recommendations?.sandwiches ? `- כריכים וביסים: ${recommendations.sandwiches} יחידות\n` : ''}${
          recommendations?.dips ? `- מטבלים: ${recommendations.dips} יחידות\n` : ''
        }${recommendations?.pastries ? `- מאפים: ${recommendations.pastries} יחידות\n` : ''}${
          recommendations?.desserts ? `- קינוחים: ${recommendations.desserts} מגשים\n` : ''
        }אנא הרכיבו לי הצעת תפריט מאוזנת מהמנות הזמינות.`
      : `Hi, I'd like to plan a ${eventType} event for ${adultCount} adults and ${childCount} children.
Suggested portions:
- Salads: ${recommendations?.salads || 0} trays
- Cold platters: ${recommendations?.platters || 0} trays
- Main courses: ${recommendations?.mains || 0} trays
${recommendations?.sandwiches ? `- Sandwiches: ${recommendations.sandwiches} units\n` : ''}${
          recommendations?.dips ? `- Dips: ${recommendations.dips} units\n` : ''
        }${recommendations?.pastries ? `- Pastries: ${recommendations.pastries} units\n` : ''}${
          recommendations?.desserts ? `- Desserts: ${recommendations.desserts} trays\n` : ''
        }Please assemble a balanced menu from available dishes.`;

    setAiPrompt(generatedPrompt);
    window.setTimeout(() => {
      const element = document.getElementById('digital-chef');
      if (element) {
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: elementPosition - 135, behavior: 'smooth' });
      }
    }, 100);
  };

  // Resolve either owner-configured active EventPackages OR live-catalog computed 10 / 20 / 30 guest templates
  const resolvedPackages: ResolvedPackageDraft[] = useMemo(() => {
    const byId = new Map<string, MenuItem>();
    const availableFood = menuItems.filter(
      (item) => item.availability_status && !isNonFoodExtra(item)
    );
    availableFood.forEach((item) => byId.set(item.id, item));

    const activeConfigured = (packages || []).filter((pkg: EventPackage) => pkg.is_active);
    if (activeConfigured.length > 0) {
      const mapped = activeConfigured
        .map((pkg): ResolvedPackageDraft | null => {
          const items = (pkg.items || [])
            .map((entry): { item: MenuItem; quantity: number; note?: string } | null => {
              const found = byId.get(entry.menu_item_id);
              return found
                ? { item: found, quantity: Math.max(1, Math.round(entry.quantity || 1)), note: entry.note }
                : null;
            })
            .filter((x): x is { item: MenuItem; quantity: number; note?: string } => x !== null);

          if (items.length === 0) return null;
          return {
            id: pkg.id,
            nameHe: pkg.name_he,
            nameEn: pkg.name_en,
            descriptionHe: pkg.description_he,
            descriptionEn: pkg.description_en,
            guestsLabelHe: `${pkg.recommended_guests_min}–${pkg.recommended_guests_max} סועדים`,
            guestsLabelEn: `${pkg.recommended_guests_min}–${pkg.recommended_guests_max} guests`,
            isOwnerConfigured: true,
            items,
          };
        })
        .filter((x): x is ResolvedPackageDraft => x !== null);

      if (mapped.length > 0) return mapped;
    }

    if (availableFood.length === 0) return [];

    const pickByCategory = (cat: Category, offset: number): MenuItem | undefined => {
      const pool = availableFood.filter((m) => m.category === cat);
      if (pool.length === 0) return undefined;
      return pool[offset % pool.length];
    };

    const tiers = [
      { key: '10', guests: 10, qtyScale: 1, titleHe: 'הרכב לדוגמה — כ-10 סועדים', titleEn: 'Sample Layout — ~10 Guests' },
      { key: '20', guests: 20, qtyScale: 2, titleHe: 'הרכב לדוגמה — כ-20 סועדים', titleEn: 'Sample Layout — ~20 Guests' },
      { key: '30', guests: 30, qtyScale: 3, titleHe: 'הרכב לדוגמה — כ-30 סועדים', titleEn: 'Sample Layout — ~30 Guests' },
    ];

    return tiers
      .map((tier, idx) => {
        const picks: Array<{ item: MenuItem; quantity: number }> = [];
        const candidates: Array<[Category, number]> = [
          ['Salads', idx],
          ['Cold Platters', idx],
          ['Main Courses', idx],
          ['Pastries', idx],
          ['Desserts', idx],
        ];
        candidates.forEach(([cat, offset]) => {
          const dish = pickByCategory(cat, offset);
          if (!dish) return;
          const baseCapacity = Math.max(1, dish.serves_max || 10);
          const qty = Math.max(1, Math.min(20, Math.ceil(tier.guests / baseCapacity)));
          if (!picks.some((p) => p.item.id === dish.id)) {
            picks.push({ item: dish, quantity: qty });
          }
        });

        if (picks.length === 0) return null;
        return {
          id: `sample-${tier.key}`,
          nameHe: tier.titleHe,
          nameEn: tier.titleEn,
          descriptionHe: 'שילוב מאוזן מתוך המנות הזמינות כעת (ניתן להחלפה, עריכה וכיוונון).',
          descriptionEn: 'Balanced combination from currently available dishes (fully editable).',
          guestsLabelHe: `מתאים לכ-${tier.guests} סועדים`,
          guestsLabelEn: `Sized for ~${tier.guests} guests`,
          isOwnerConfigured: false,
          items: picks,
        };
      })
      .filter((x): x is ResolvedPackageDraft => Boolean(x));
  }, [menuItems, packages]);

  const openPackageEditor = (pkg: ResolvedPackageDraft) => {
    setEditingPackage(pkg);
    setDraftItems(pkg.items.map((x) => ({ ...x })));
    setPackageAppliedFeedback(null);
  };

  const applyDraftPackage = (replace: boolean) => {
    if (!editingPackage || draftItems.length === 0) return;
    bulkAddToCart(
      draftItems.map((d) => ({
        item: d.item,
        quantity: Math.max(1, d.quantity),
        notes: d.note,
      })),
      replace
    );
    api.trackEvent('package_template_applied', {
      package_id: editingPackage.id,
      replace,
      item_count: draftItems.length,
    });
    setPackageAppliedFeedback(
      replace
        ? isHe
          ? 'העגלה הוחלפה בהרכב החבילה בהצלחה.'
          : 'Cart replaced with this package.'
        : isHe
        ? 'פריטי החבילה נוספו לעגלה הקיימת בהצלחה.'
        : 'Package items added to your cart.'
    );
    window.setTimeout(() => {
      setEditingPackage(null);
      setPackageAppliedFeedback(null);
    }, 900);
  };

  return (
    <div className="space-y-8 mb-12">
      {/* Quote-Mode 3-Step Journey Explainer */}
      {!appConfig.ecommerce_mode && (
        <section
          aria-label={isHe ? 'איך עובדת הזמנת הצעת מחיר' : 'How quote requests work'}
          className="bg-themeCardBg border border-themeText/15 rounded-2xl p-4 md:p-6 shadow-sm text-start"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
            <h2 className="text-base md:text-lg font-serif font-bold text-themeText flex items-center gap-2">
              <Info size={18} className="text-themePrimary shrink-0" />
              <span>
                {isHe
                  ? 'איך מזמינים הצעת מחיר ב-3 צעדים פשוטים'
                  : 'How Quote Requests Work in 3 Simple Steps'}
              </span>
            </h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-themeHeaderBg text-themeHeaderTxt w-fit">
              {isHe ? 'בקשת הצעה — ללא חיוב אונליין' : 'Quote Only — No Online Payment'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(isHe ? QUOTE_MODE_JOURNEY.stepsHe : QUOTE_MODE_JOURNEY.stepsEn).map((s) => (
              <div
                key={s.step}
                className="bg-themeBg/70 rounded-xl p-3 border border-themeText/10 flex items-start gap-3"
              >
                <span className="w-7 h-7 rounded-full bg-themeHeaderBg text-themeHeaderTxt font-bold text-xs flex items-center justify-center shrink-0">
                  {s.step}
                </span>
                <div>
                  <h3 className="text-xs md:text-sm font-bold text-themeText">{s.title}</h3>
                  <p className="text-xs text-themeText/75 mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Guest Calculator Card */}
      <div id="event-calculator" className="relative bg-themeCardBg text-themeText rounded-3xl shadow-xl border border-themeText/15 w-full overflow-hidden scroll-mt-24">
        <div className="relative z-10">
          <div className="p-5 md:p-8 border-b border-themeText/10">
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-themeText mb-1.5">
                  {t.planEvent}
                </h2>
                <p className="text-themeText/75 text-sm md:text-base">{t.guestsSub}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Adults Count */}
                <div className="space-y-1.5">
                  <div
                    className={`flex items-center justify-between bg-themeBg/80 p-3 rounded-2xl border ${
                      adultError ? 'border-red-500' : 'border-themeText/15'
                    }`}
                  >
                    <label
                      htmlFor="host-adults-input"
                      className="flex items-center gap-2.5 text-sm font-bold text-themeText cursor-pointer"
                    >
                      <span className="p-2 bg-themeCardBg rounded-lg text-themeText/80 border border-themeText/10">
                        <Users size={18} aria-hidden="true" />
                      </span>
                      <span>{t.adults}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustGuestCount('adult', -5)}
                        aria-label={isHe ? 'הפחת 5 מבוגרים' : 'Decrease adults by 5'}
                        className="w-10 h-10 rounded-lg bg-themeCardBg border border-themeText/15 hover:bg-themeText/10 grid place-items-center text-themeText"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        id="host-adults-input"
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={adultStr}
                        onChange={(e) => handleGuestInputChange(e.target.value, 'adult')}
                        aria-invalid={Boolean(adultError)}
                        aria-describedby={adultError ? 'err-host-adults' : undefined}
                        placeholder="0"
                        className="w-16 bg-themeCardBg border border-themeText/15 rounded-lg py-1.5 text-center text-lg font-bold text-themeText outline-none focus:border-themePrimary"
                      />
                      <button
                        type="button"
                        onClick={() => adjustGuestCount('adult', 5)}
                        aria-label={isHe ? 'הוסף 5 מבוגרים' : 'Increase adults by 5'}
                        className="w-10 h-10 rounded-lg bg-themeHeaderBg hover:opacity-90 text-themeHeaderTxt grid place-items-center shadow-sm"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  {adultError && (
                    <p id="err-host-adults" role="alert" className="text-xs text-red-700 font-bold px-1">
                      {adultError}
                    </p>
                  )}
                </div>

                {/* Children Count (supports 0-child events cleanly) */}
                <div className="space-y-1.5">
                  <div
                    className={`flex items-center justify-between bg-themeBg/80 p-3 rounded-2xl border ${
                      childError ? 'border-red-500' : 'border-themeText/15'
                    }`}
                  >
                    <label
                      htmlFor="host-children-input"
                      className="flex items-center gap-2.5 text-sm font-bold text-themeText cursor-pointer"
                    >
                      <span className="p-2 bg-themeCardBg rounded-lg text-themeText/80 border border-themeText/10">
                        <Baby size={18} aria-hidden="true" />
                      </span>
                      <span>{t.children}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustGuestCount('child', -5)}
                        aria-label={isHe ? 'הפחת 5 ילדים' : 'Decrease children by 5'}
                        className="w-10 h-10 rounded-lg bg-themeCardBg border border-themeText/15 hover:bg-themeText/10 grid place-items-center text-themeText"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        id="host-children-input"
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={childStr}
                        onChange={(e) => handleGuestInputChange(e.target.value, 'child')}
                        aria-invalid={Boolean(childError)}
                        aria-describedby={childError ? 'err-host-children' : undefined}
                        placeholder="0"
                        className="w-16 bg-themeCardBg border border-themeText/15 rounded-lg py-1.5 text-center text-lg font-bold text-themeText outline-none focus:border-themePrimary"
                      />
                      <button
                        type="button"
                        onClick={() => adjustGuestCount('child', 5)}
                        aria-label={isHe ? 'הוסף 5 ילדים' : 'Increase children by 5'}
                        className="w-10 h-10 rounded-lg bg-themeHeaderBg hover:opacity-90 text-themeHeaderTxt grid place-items-center shadow-sm"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  {childError && (
                    <p id="err-host-children" role="alert" className="text-xs text-red-700 font-bold px-1">
                      {childError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Event Style Selector */}
          <div className="bg-themeCardBg p-5 md:p-8">
            <span className="text-xs font-bold text-themeText/75 uppercase tracking-widest mb-3 block">
              {t.eventType}
            </span>
            <div className="grid grid-cols-3 gap-3">
              {(['basic', 'plus', 'premium'] as EventType[]).map((type) => {
                const active = eventType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setEventType(type)}
                    className={`relative p-3.5 md:p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                      active
                        ? 'bg-themeHeaderBg border-themeHeaderBg text-themeHeaderTxt shadow-md'
                        : 'bg-themeBg/60 border-themeText/15 text-themeText/80 hover:border-themePrimary'
                    }`}
                  >
                    {type === 'basic' && <Wine size={22} />}
                    {type === 'plus' && <UtensilsCrossed size={22} />}
                    {type === 'premium' && <Sparkles size={22} />}
                    <span className="text-xs md:text-sm font-bold">
                      {type === 'basic'
                        ? t.basicEvent
                        : type === 'plus'
                        ? t.plusEvent
                        : t.premiumEvent}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {totalGuests > 0 && featureFlags.showAI && (
            <div className="bg-themeCardBg px-5 md:px-8 pb-5 pt-1 flex justify-center">
              <button
                type="button"
                onClick={handleTransferToChef}
                className="bg-themeHeaderBg text-themeHeaderTxt font-bold px-6 py-3 rounded-2xl flex items-center gap-2 hover:opacity-95 transition shadow-md text-sm md:text-base w-full justify-center"
              >
                <Sparkles size={18} className="text-themePrimary" />
                <span>{isHe ? 'העבר לשף הדיגיטלי לבניית הצעה' : 'Send to Digital Chef'}</span>
              </button>
            </div>
          )}

          {totalGuests > 0 && recommendations && (
            <div className="bg-themeBg/40 p-5 md:p-8 border-t border-themeText/10">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-themePrimary/20 rounded-full text-themePrimary">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-xl font-serif font-bold text-themeText">{t.calcResults}</h3>
              </div>

              <div className="space-y-5">
                <div className="text-start">
                  <h4 className="text-xs font-bold text-themeText/75 mb-3 uppercase tracking-widest px-1">
                    {t.requiredDishes}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => scrollToSection('Salads')}
                      className="bg-themeCardBg rounded-xl p-4 border border-themeText/15 hover:border-themePrimary transition text-start"
                    >
                      <span className="block text-2xl md:text-3xl font-bold text-themeText mb-1">
                        {recommendations.salads}
                      </span>
                      <span className="text-xs text-themeText/80 font-bold">
                        {(t.categories as Record<string, string>)['Salads']}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection('Cold Platters')}
                      className="bg-themeCardBg rounded-xl p-4 border border-themeText/15 hover:border-themePrimary transition text-start"
                    >
                      <span className="block text-2xl md:text-3xl font-bold text-themeText mb-1">
                        {recommendations.platters}
                      </span>
                      <span className="text-xs text-themeText/80 font-bold">
                        {(t.categories as Record<string, string>)['Cold Platters']}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection('Main Courses')}
                      className="bg-themeCardBg rounded-xl p-4 border border-themeText/15 hover:border-themePrimary transition text-start"
                    >
                      <span className="block text-2xl md:text-3xl font-bold text-themeText mb-1">
                        {recommendations.mains}
                      </span>
                      <span className="text-xs text-themeText/80 font-bold">
                        {(t.categories as Record<string, string>)['Main Courses']}
                      </span>
                    </button>
                  </div>
                </div>

                {(recommendations.sandwiches > 0 ||
                  recommendations.dips > 0 ||
                  recommendations.pastries > 0 ||
                  recommendations.desserts > 0) && (
                  <div className="text-start">
                    <h4 className="text-xs font-bold text-themeText/75 mb-3 uppercase tracking-widest px-1">
                      {t.enrichDishes}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {recommendations.sandwiches > 0 && (
                        <button
                          type="button"
                          onClick={() => scrollToSection('Sandwiches')}
                          className="bg-themeCardBg rounded-xl p-4 border border-themeText/15 hover:border-themePrimary transition text-start"
                        >
                          <span className="block text-2xl font-bold text-themeText mb-1">
                            {recommendations.sandwiches}
                          </span>
                          <span className="text-xs text-themeText/80 font-bold">
                            {(t.categories as Record<string, string>)['Sandwiches']}
                          </span>
                        </button>
                      )}
                      {recommendations.dips > 0 && (
                        <button
                          type="button"
                          onClick={() => scrollToSection('Dips')}
                          className="bg-themeCardBg rounded-xl p-4 border border-themeText/15 hover:border-themePrimary transition text-start"
                        >
                          <span className="block text-2xl font-bold text-themeText mb-1">
                            {recommendations.dips}
                          </span>
                          <span className="text-xs text-themeText/80 font-bold">
                            {(t.categories as Record<string, string>)['Dips']}
                          </span>
                        </button>
                      )}
                      {recommendations.pastries > 0 && (
                        <button
                          type="button"
                          onClick={() => scrollToSection('Pastries')}
                          className="bg-themeCardBg rounded-xl p-4 border border-themeText/15 hover:border-themePrimary transition text-start"
                        >
                          <span className="block text-2xl font-bold text-themeText mb-1">
                            {recommendations.pastries}
                          </span>
                          <span className="text-xs text-themeText/80 font-bold">
                            {(t.categories as Record<string, string>)['Pastries']}
                          </span>
                        </button>
                      )}
                      {recommendations.desserts > 0 && (
                        <button
                          type="button"
                          onClick={() => scrollToSection('Desserts')}
                          className="bg-themeCardBg rounded-xl p-4 border border-themeText/15 hover:border-themePrimary transition text-start"
                        >
                          <span className="block text-2xl font-bold text-themeText mb-1">
                            {recommendations.desserts}
                          </span>
                          <span className="text-xs text-themeText/80 font-bold">
                            {(t.categories as Record<string, string>)['Desserts']}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* P3 Editable Event Packages (Computed from live catalog or owner-configured templates; zero invented prices) */}
      {resolvedPackages.length > 0 && (
        <section
          aria-label={isHe ? 'חבילות ותפריטים לדוגמה' : 'Editable Event Packages'}
          className="space-y-4 text-start"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
            <div>
              <h3 className="text-xl md:text-2xl font-serif font-bold text-themeText flex items-center gap-2">
                <Package size={20} className="text-themePrimary shrink-0" />
                <span>
                  {isHe ? 'תפריטים לדוגמה לפי גודל אירוע (ניתנים לעריכה)' : 'Editable Event Layouts by Guest Count'}
                </span>
              </h3>
              <p className="text-xs md:text-sm text-themeText/75 mt-0.5">
                {isHe
                  ? 'בחרו הרכב בסיסי, ערכו מנות וכמויות לפי הטעם, והעבירו לבקשת הצעת מחיר — ללא תמחור אוטומטי מומצא.'
                  : 'Pick a starter layout, adjust dishes and quantities, and send with your quote request.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resolvedPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-themeCardBg border border-themeText/15 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-themePrimary/60 transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-base text-themeText">
                      {isHe ? pkg.nameHe : pkg.nameEn}
                    </h4>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-themeBg border border-themeText/15 text-themeText/85 shrink-0">
                      {isHe ? pkg.guestsLabelHe : pkg.guestsLabelEn}
                    </span>
                  </div>
                  <p className="text-xs text-themeText/75 leading-relaxed">
                    {isHe ? pkg.descriptionHe : pkg.descriptionEn}
                  </p>
                  <ul className="space-y-1 pt-1 border-t border-themeText/10 text-xs text-themeText/85">
                    {pkg.items.slice(0, 5).map(({ item, quantity }) => (
                      <li key={item.id} className="flex justify-between gap-2">
                        <span className="truncate">{getLocalizedItem(item, language).name}</span>
                        <span className="font-bold shrink-0">×{quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => openPackageEditor(pkg)}
                  className="mt-4 w-full py-2.5 px-3 rounded-xl bg-themeHeaderBg text-themeHeaderTxt font-bold text-xs md:text-sm hover:opacity-95 transition flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag size={15} />
                  <span>{isHe ? 'פתיחה, עריכה והוספה לעגלה' : 'Customize & Apply Layout'}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Package Editor Modal */}
      <AccessibleModal
        isOpen={Boolean(editingPackage)}
        onClose={() => setEditingPackage(null)}
        titleId="package-editor-title"
        ariaLabel={isHe ? 'עריכת הרכב חבילה' : 'Edit Event Package'}
        closeLabel={isHe ? 'סגור' : 'Close'}
        dir={isHe ? 'rtl' : 'ltr'}
        contentClassName="bg-themeCardBg text-themeText rounded-2xl max-w-lg w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-themeText/15 relative"
      >
        {editingPackage && (
          <>
            <div className="p-5 bg-themeHeaderBg text-themeHeaderTxt shrink-0 pe-12">
              <h3 id="package-editor-title" className="text-lg font-serif font-bold">
                {isHe ? editingPackage.nameHe : editingPackage.nameEn}
              </h3>
              <p className="text-xs text-themeHeaderTxt/80 mt-0.5">
                {isHe
                  ? 'ניתן לשנות כמויות או להסיר מנות לפני ההוספה לעגלה'
                  : 'Adjust quantities or remove items before adding to your cart'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {packageAppliedFeedback && (
                <div
                  role="status"
                  className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold"
                >
                  {packageAppliedFeedback}
                </div>
              )}

              {draftItems.length === 0 ? (
                <p className="text-sm text-themeText/70 text-center py-6">
                  {isHe ? 'הסרת את כל המנות מהטיוטה.' : 'All items removed from draft.'}
                </p>
              ) : (
                draftItems.map(({ item, quantity }, idx) => {
                  const local = getLocalizedItem(item, language);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-themeBg border border-themeText/10"
                    >
                      <div className="min-w-0 flex-1 text-start">
                        <div className="font-bold text-sm text-themeText truncate">
                          {local.name}
                        </div>
                        <div className="text-xs text-themeText/70">
                          {item.serves_min === item.serves_max
                            ? `${t.serves}${item.serves_min}`
                            : `${t.serves}${item.serves_min}-${item.serves_max}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          aria-label={isHe ? `הפחת ${local.name}` : `Decrease ${local.name}`}
                          onClick={() =>
                            setDraftItems((prev) =>
                              prev.map((row, rIdx) =>
                                rIdx === idx ? { ...row, quantity: Math.max(1, row.quantity - 1) } : row
                              )
                            )
                          }
                          className="w-7 h-7 rounded-lg bg-themeCardBg border border-themeText/15 grid place-items-center"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-6 text-center font-bold text-sm">{quantity}</span>
                        <button
                          type="button"
                          aria-label={isHe ? `הגדל ${local.name}` : `Increase ${local.name}`}
                          onClick={() =>
                            setDraftItems((prev) =>
                              prev.map((row, rIdx) =>
                                rIdx === idx ? { ...row, quantity: Math.min(500, row.quantity + 1) } : row
                              )
                            )
                          }
                          className="w-7 h-7 rounded-lg bg-themeCardBg border border-themeText/15 grid place-items-center"
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          type="button"
                          aria-label={isHe ? `הסר ${local.name}` : `Remove ${local.name}`}
                          onClick={() =>
                            setDraftItems((prev) => prev.filter((_, rIdx) => rIdx !== idx))
                          }
                          className="w-7 h-7 rounded-lg text-red-700 hover:bg-red-50 grid place-items-center ms-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-themeText/15 bg-themeBg flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                disabled={draftItems.length === 0}
                onClick={() => applyDraftPackage(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-themeHeaderBg text-themeHeaderTxt font-bold text-xs md:text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <ShoppingBag size={15} />
                <span>{isHe ? 'הוסף לעגלה הקיימת' : 'Add to Cart'}</span>
              </button>
              {cart.length > 0 && (
                <button
                  type="button"
                  disabled={draftItems.length === 0}
                  onClick={() => applyDraftPackage(true)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-themeText/25 bg-themeCardBg text-themeText font-bold text-xs md:text-sm disabled:opacity-50 flex items-center justify-center gap-1.5 hover:bg-themeText/5"
                >
                  <ArrowLeftRight size={15} />
                  <span>{isHe ? 'החלף עגלה בחבילה' : 'Replace Cart'}</span>
                </button>
              )}
            </div>
          </>
        )}
      </AccessibleModal>
    </div>
  );
};
