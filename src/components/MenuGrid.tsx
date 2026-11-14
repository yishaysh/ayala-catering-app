import React, { useMemo, useState } from 'react';
import { MenuItem, Category } from '../types';
import { useStore, getSuggestedQuantity, translations, getLocalizedItem } from '../store';
import {
  Info,
  Star,
  Check,
  Minus,
  Plus,
  Maximize2,
  Search,
  UtensilsCrossed,
  ShieldAlert,
  Filter,
  X,
} from 'lucide-react';
import {
  isPlaceholderImageUrl,
  toCloudinaryOptimizedImageUrl,
  buildCloudinaryImageSrcSet,
} from '../../shared/media';
import { DIETARY_DISCLAIMER, DIETARY_TAG_OPTIONS } from '../../shared/config';
import { AccessibleModal } from './AccessibleModal';
import { api } from '../lib/api';

interface MenuGridProps {
  items: MenuItem[];
}

const CATEGORY_ORDER: Category[] = [
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

const hasHebrewChars = (text?: string): boolean => Boolean(text && /[\u0590-\u05FF]/.test(text));

const isNonFoodExtra = (item: MenuItem): boolean =>
  item.category === 'Extras' &&
  /כפות|סכו|מפית|צלחת חד|מזלג|סכין|מגש הגשה|spoon|utensil|napkin|cutlery/i.test(
    `${item.name} ${item.name_en || ''}`
  );

const isValidHttpMediaUrl = (url?: string): boolean => {
  if (!url || isPlaceholderImageUrl(url)) return false;
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  );
};

export const MenuGrid: React.FC<MenuGridProps> = ({ items }) => {
  const { addToCart, adultCount, childCount, language, calculationSettings, cart, appConfig } =
    useStore();
  const isHe = language === 'he';
  const t = translations[language] || translations.he;
  const totalGuests = adultCount + childCount;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const [itemToAdd, setItemToAdd] = useState<MenuItem | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  const [isZoomed, setIsZoomed] = useState(false);

  // Filter menu items cleanly from explicit metadata + localized search
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const hay = `${item.name} ${item.name_en || ''} ${item.description || ''} ${item.description_en || ''
          } ${(item.tags || []).join(' ')} ${(item.dietary_tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (selectedDietary.length > 0) {
        const tags = new Set<string>([
          ...(item.dietary_tags || []),
          ...(item.tags || []),
          ...(item.allergen_info?.can_prepare_without || []),
        ]);
        const matchesAll = selectedDietary.every((tag) => tags.has(tag));
        if (!matchesAll) return false;
      }
      return true;
    });
  }, [items, searchQuery, selectedDietary]);

  const groupedItems = useMemo(() => {
    const groups: Partial<Record<Category, MenuItem[]>> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]?.push(item);
    });
    return groups;
  }, [filteredItems]);

  // Discover only dietary tags that actually exist on items so filter pills stay honest & useful
  const availableFilterTags = useMemo(() => {
    const present = new Set<string>();
    items.forEach((item) => {
      (item.dietary_tags || []).forEach((tag) => present.add(tag));
      (item.tags || []).forEach((tag) => present.add(tag));
    });
    return DIETARY_TAG_OPTIONS.filter(
      (opt) => present.has(opt.id) || ['vegetarian', 'vegan', 'gluten_free_option'].includes(opt.id)
    );
  }, [items]);

  const openAddModal = (item: MenuItem) => {
    const suggested =
      totalGuests > 0
        ? getSuggestedQuantity(item, adultCount, childCount, calculationSettings, cart)
        : 1;
    setAddQuantity(suggested);
    setNotes('');
    setSelectedMods([]);
    setItemToAdd(item);
    setIsZoomed(false);
  };

  const handleConfirmAdd = () => {
    if (!itemToAdd) return;
    addToCart(itemToAdd, addQuantity, notes, selectedMods);
    setItemToAdd(null);
  };

  const toggleMod = (mod: string) => {
    setSelectedMods((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const toggleDietaryFilter = (id: string) => {
    setSelectedDietary((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      api.trackEvent('menu_search_or_filter', {
        filter_count: next.length,
        has_query: searchQuery.trim().length > 0,
      });
      return next;
    });
  };

  const getUnitName = (type: string) => {
    if (type === 'tray') return t.tray;
    if (type === 'liter') return t.liter;
    if (type === 'unit') return t.unit;
    if (type === 'weight') return t.weight;
    return type;
  };

  const formatServingLabel = (item: MenuItem): string => {
    if (isNonFoodExtra(item)) {
      return isHe ? 'פריט נלווה להגשה' : 'Serving accessory';
    }
    if (item.serves_min === item.serves_max) {
      if (item.serves_min === 1) {
        return isHe ? 'מתאים לסועד אחד' : 'Serves 1 person';
      }
      return isHe
        ? `מתאים ל-${item.serves_min} סועדים`
        : `Serves ${item.serves_min} people`;
    }
    return isHe
      ? `מתאים ל-${item.serves_min}–${item.serves_max} סועדים`
      : `Serves ${item.serves_min}–${item.serves_max} people`;
  };

  const renderDishMedia = (item: MenuItem, localName: string, large: boolean = false) => {
    const showPlaceholder = !isValidHttpMediaUrl(item.image_url) || failedImages[item.id];
    if (showPlaceholder || !item.image_url) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-themeBg text-themeText/70 p-3 text-center gap-1.5 border-b border-themeText/10">
          <UtensilsCrossed size={large ? 36 : 26} className="text-themePrimary/70" aria-hidden="true" />
          <span className="text-xs font-bold">
            {isHe ? 'תמונה תעלה בקרוב' : 'Photo coming soon'}
          </span>
        </div>
      );
    }

    const optimizedSrc = toCloudinaryOptimizedImageUrl(item.image_url, large ? 960 : 640);
    const srcSet = buildCloudinaryImageSrcSet(
      item.image_url,
      large ? [640, 960] : [360, 640]
    );

    return (
      <img
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={large ? '(max-width: 768px) 100vw, 520px' : '(max-width: 768px) 50vw, 25vw'}
        alt={localName}
        loading={large ? 'eager' : 'lazy'}
        decoding="async"
        onError={() =>
          setFailedImages((prev) => ({
            ...prev,
            [item.id]: true,
          }))
        }
        className={`w-full h-full object-cover ${large ? '' : 'transition-transform duration-500 group-hover:scale-105'
          }`}
      />
    );
  };

  return (
    <>
      <div id="menu-section" className="space-y-8 pb-28 scroll-mt-24">
        {/* Search & Dietary Filters Bar */}
        <div className="bg-themeCardBg border border-themeText/15 rounded-2xl p-4 shadow-sm space-y-3 text-start">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <label htmlFor="menu-search-input" className="sr-only">
                {isHe ? 'חיפוש מנות בתפריט' : 'Search catering dishes'}
              </label>
              <Search
                size={16}
                aria-hidden="true"
                className="absolute start-3 top-1/2 -translate-y-1/2 text-themeText/50 pointer-events-none"
              />
              <input
                id="menu-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isHe
                    ? 'חיפוש מנה, מרכיב או קטגוריה (למשל: סלמון, קיש, פיקניק)...'
                    : 'Search dishes or ingredients (e.g. salmon, quiche, platter)...'
                }
                className="w-full bg-themeBg border border-themeText/20 rounded-xl ps-9 pe-9 py-2.5 text-sm text-themeText outline-none focus:border-themePrimary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={isHe ? 'נקה חיפוש' : 'Clear search'}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-themeText/60 hover:text-themeText"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {(searchQuery || selectedDietary.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDietary([]);
                }}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-themeText/20 hover:bg-themeBg text-themeText shrink-0"
              >
                {isHe ? 'איפוס סינון' : 'Reset Filters'}
              </button>
            )}
          </div>

          {/* Dietary & Allergen Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-themeText/75 flex items-center gap-1 me-1">
              <Filter size={13} className="text-themePrimary" aria-hidden="true" />
              <span>{isHe ? 'סינון תזונתי:' : 'Dietary Filters:'}</span>
            </span>
            {availableFilterTags.slice(0, 6).map((opt) => {
              const active = selectedDietary.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleDietaryFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${active
                    ? 'bg-themeHeaderBg text-themeHeaderTxt border-themeHeaderBg'
                    : 'bg-themeBg text-themeText/85 border-themeText/15 hover:border-themePrimary'
                    }`}
                >
                  {isHe ? opt.labelHe : opt.labelEn}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
            <ShieldAlert size={14} className="shrink-0 mt-0.5 text-amber-800" aria-hidden="true" />
            <span>{isHe ? DIETARY_DISCLAIMER.he : DIETARY_DISCLAIMER.en}</span>
          </p>
        </div>

        {/* Empty filter result state */}
        {filteredItems.length === 0 ? (
          <div className="bg-themeCardBg rounded-2xl border border-themeText/15 p-10 text-center space-y-3">
            <p className="text-base font-bold text-themeText">
              {isHe
                ? 'לא נמצאו מנות התואמות לחיפוש או לסינון שנבחר.'
                : 'No dishes match your search or dietary filters.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedDietary([]);
              }}
              className="px-4 py-2 rounded-xl bg-themeHeaderBg text-themeHeaderTxt text-xs font-bold"
            >
              {isHe ? 'הציגו את כל המנות' : 'Show All Dishes'}
            </button>
          </div>
        ) : (
          CATEGORY_ORDER.map((cat) => {
            const catItems = groupedItems[cat];
            if (!catItems || catItems.length === 0) return null;

            const sectionId = `cat-${cat.replace(/\s+/g, '-')}`;

            return (
              <section key={cat} id={sectionId} className="scroll-mt-44 md:scroll-mt-48">
                <div className="flex items-center gap-4 mb-4 px-2">
                  <h3 className="text-xl md:text-3xl font-serif font-bold text-themeText relative">
                    {(t.categories as Record<string, string>)[cat] || cat}
                    <span className="block w-10 md:w-14 h-1 bg-themePrimary rounded-full mt-1.5" />
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                  {catItems.map((item) => {
                    const suggestedQty =
                      totalGuests > 0
                        ? getSuggestedQuantity(
                          item,
                          adultCount,
                          childCount,
                          calculationSettings,
                          cart
                        )
                        : 1;
                    const localItem = getLocalizedItem(item, language);
                    const fallbackDir =
                      !isHe && hasHebrewChars(localItem.name) ? 'rtl' : undefined;
                    const showUnitBadge = !isNonFoodExtra(item) && item.is_tray && item.units_per_tray;

                    return (
                      <article
                        key={item.id}
                        id={`item-${item.id}`}
                        className="group relative bg-themeCardBg rounded-xl overflow-hidden shadow-sm border border-themeText/10 hover:shadow-lg hover:border-themePrimary/50 transition-all duration-300 flex flex-col justify-between"
                      >
                        <button
                          type="button"
                          onClick={() => openAddModal(item)}
                          aria-label={
                            isHe
                              ? `צפייה בפרטים והוספת ${localItem.name}`
                              : `View details and customize ${localItem.name}`
                          }
                          className="relative aspect-[4/3] w-full bg-themeBg/40 overflow-hidden text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-themePrimary"
                        >
                          {renderDishMedia(item, localItem.name)}
                          {item.is_premium && (
                            <div className="absolute top-0 right-0 bg-themeHeaderBg text-themeHeaderTxt text-[10px] md:text-xs px-2 py-1 rounded-bl-lg font-bold tracking-wider z-10 flex items-center gap-1 shadow-md border-b border-l border-themePrimary/40">
                              <Star size={10} fill="currentColor" className="text-themePrimary" />
                              <span>{t.premium}</span>
                            </div>
                          )}
                        </button>

                        <div className="p-3 md:p-4 flex flex-col flex-1 text-start">
                          <h4
                            dir={fallbackDir}
                            className="text-sm md:text-base font-bold text-themeText leading-snug line-clamp-2 min-h-[2.4em] mb-1"
                          >
                            {localItem.name}
                          </h4>

                          {appConfig.ecommerce_mode ? (
                            <div className="flex items-baseline flex-wrap gap-1 mb-1">
                              <span className="text-base md:text-lg font-bold text-themeText">
                                ₪{item.price}
                              </span>
                              <span className="text-[11px] text-themeText/70">
                                / {getUnitName(item.unit_type)}
                              </span>
                              {showUnitBadge && (
                                <span className="text-[11px] text-themeText/80 font-bold">
                                  ({item.units_per_tray} {isHe ? "יח'" : 'pcs'})
                                </span>
                              )}
                            </div>
                          ) : (
                            showUnitBadge && (
                              <div className="mb-1">
                                <span className="text-[11px] text-themeText/85 font-bold font-sans">
                                  ({item.units_per_tray}{' '}
                                  {isHe ? 'יחידות במגש' : 'units per tray'})
                                </span>
                              </div>
                            )
                          )}

                          <div className="text-[11px] md:text-xs text-themeText/75 mb-2 flex items-center gap-1.5">
                            <Info
                              size={12}
                              className="text-themePrimary shrink-0"
                              aria-hidden="true"
                            />
                            <span>{formatServingLabel(item)}</span>
                          </div>

                          {item.dietary_tags && item.dietary_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {item.dietary_tags.slice(0, 2).map((tag) => {
                                const meta = DIETARY_TAG_OPTIONS.find((o) => o.id === tag);
                                return (
                                  <span
                                    key={tag}
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-themeBg border border-themeText/15 text-themeText/80"
                                  >
                                    {meta ? (isHe ? meta.labelHe : meta.labelEn) : tag}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          <p
                            dir={!isHe && hasHebrewChars(localItem.description) ? 'rtl' : undefined}
                            className="hidden md:block text-themeText/75 text-xs mb-3 leading-relaxed line-clamp-2"
                          >
                            {localItem.description}
                          </p>

                          <div className="mt-auto pt-1">
                            <button
                              type="button"
                              onClick={() => openAddModal(item)}
                              disabled={!item.availability_status}
                              className={`w-full py-2 md:py-2.5 px-2 rounded-lg flex items-center justify-center gap-1.5 font-bold text-xs md:text-sm transition-colors ${!item.availability_status
                                ? 'bg-themeText/10 text-themeText/60 cursor-not-allowed'
                                : 'bg-themeHeaderBg text-themeHeaderTxt shadow-sm hover:opacity-95 active:scale-[0.99]'
                                }`}
                            >
                              {!item.availability_status ? (
                                t.outOfStock
                              ) : (
                                <>
                                  <Plus size={14} className="md:w-4 md:h-4 shrink-0" />
                                  <span>
                                    {totalGuests > 0
                                      ? `${t.add} (${suggestedQty})`
                                      : t.addToCart}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Dish Detail & Customization Accessible Modal */}
      <AccessibleModal
        isOpen={Boolean(itemToAdd) && !isZoomed}
        onClose={() => setItemToAdd(null)}
        titleId="dish-modal-title"
        ariaLabel={itemToAdd ? getLocalizedItem(itemToAdd, language).name : 'Dish details'}
        closeLabel={isHe ? 'סגור חלון מנה' : 'Close dish details'}
        dir={isHe ? 'rtl' : 'ltr'}
        contentClassName="bg-themeBg text-themeText w-full md:max-w-lg max-h-[88vh] rounded-2xl md:rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-themeText/15 relative"
      >
        {itemToAdd && (
          <>
            <div className="relative h-40 md:h-52 bg-themeBg shrink-0 group">
              {renderDishMedia(itemToAdd, getLocalizedItem(itemToAdd, language).name, true)}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

              {isValidHttpMediaUrl(itemToAdd.image_url) && !failedImages[itemToAdd.id] && (
                <button
                  type="button"
                  onClick={() => setIsZoomed(true)}
                  aria-label={isHe ? 'הגדלת תמונה' : 'Zoom image'}
                  className="absolute bottom-3 end-3 text-white bg-black/60 hover:bg-black/80 p-2 rounded-full z-20 transition-colors"
                >
                  <Maximize2 size={16} />
                </button>
              )}

              <div className="absolute bottom-0 inset-x-0 p-4 z-10 pointer-events-none text-start">
                <h3
                  id="dish-modal-title"
                  dir={
                    !isHe && hasHebrewChars(getLocalizedItem(itemToAdd, language).name)
                      ? 'rtl'
                      : undefined
                  }
                  className="text-lg md:text-2xl font-serif font-bold text-white leading-tight drop-shadow"
                >
                  {getLocalizedItem(itemToAdd, language).name}
                </h3>
                {appConfig.ecommerce_mode && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-amber-300">
                      ₪{itemToAdd.price}
                    </span>
                    <span className="text-stone-200 text-xs">
                      / {getUnitName(itemToAdd.unit_type)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-start">
              <div className="bg-themeCardBg p-3.5 rounded-xl border border-themeText/10 shadow-sm">
                <p
                  dir={
                    !isHe &&
                      hasHebrewChars(getLocalizedItem(itemToAdd, language).description)
                      ? 'rtl'
                      : undefined
                  }
                  className="text-themeText/85 text-xs md:text-sm leading-relaxed"
                >
                  {getLocalizedItem(itemToAdd, language).description || t.description}
                </p>
              </div>

              <div className="flex items-center justify-between bg-themeCardBg p-3 rounded-xl border border-themeText/10 text-xs md:text-sm">
                <span className="font-bold flex items-center gap-1.5">
                  <Info size={16} className="text-themePrimary" />
                  <span>{isHe ? 'כמות וסועדים' : 'Servings / Capacity'}</span>
                </span>
                <span className="font-semibold">
                  {formatServingLabel(itemToAdd)}
                  {!isNonFoodExtra(itemToAdd) &&
                    itemToAdd.is_tray &&
                    itemToAdd.units_per_tray &&
                    ` (${itemToAdd.units_per_tray} ${isHe ? 'יחידות במגש' : 'units per tray'
                    })`}
                </span>
              </div>

              <div className="flex items-center justify-between bg-themeCardBg p-3 rounded-xl border border-themeText/10">
                <span className="font-bold text-sm">{t.customizeTitle}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={isHe ? 'הפחת כמות' : 'Decrease quantity'}
                    onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))}
                    className="w-8 h-8 rounded-full bg-themeBg border border-themeText/20 grid place-items-center text-themeText"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-base font-bold w-6 text-center">{addQuantity}</span>
                  <button
                    type="button"
                    aria-label={isHe ? 'הגדל כמות' : 'Increase quantity'}
                    onClick={() => setAddQuantity(Math.min(500, addQuantity + 1))}
                    className="w-8 h-8 rounded-full bg-themeHeaderBg text-themeHeaderTxt grid place-items-center shadow-sm"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {getLocalizedItem(itemToAdd, language).modifications.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-themeText/75 px-1">
                    {t.modifications}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {getLocalizedItem(itemToAdd, language).modifications.map((mod) => {
                      const selected = selectedMods.includes(mod);
                      return (
                        <button
                          key={mod}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleMod(mod)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${selected
                            ? 'bg-themeHeaderBg text-themeHeaderTxt border-themeHeaderBg'
                            : 'bg-themeCardBg text-themeText/80 border-themeText/15'
                            }`}
                        >
                          {selected && <Check size={12} />}
                          <span>{mod}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="dish-item-notes"
                  className="block text-xs font-bold text-themeText/80 px-1"
                >
                  {t.notesPlaceholder}
                </label>
                <textarea
                  id="dish-item-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={300}
                  placeholder={
                    isHe
                      ? 'דגשים מיוחדים, אלרגיות (יאושר ישירות מול איילה)...'
                      : 'Special requests, allergies (confirmed directly with Ayala)...'
                  }
                  className="w-full p-3 bg-themeCardBg border border-themeText/20 rounded-xl focus:outline-none focus:border-themePrimary min-h-[76px] text-xs resize-none text-themeText"
                />
              </div>
            </div>

            <div className="bg-themeCardBg border-t border-themeText/15 p-4 flex gap-3 shrink-0">
              {appConfig.ecommerce_mode && (
                <div className="flex flex-col justify-center">
                  <div className="text-[11px] text-themeText/70 font-bold">{t.total}</div>
                  <div className="text-xl font-bold font-serif text-themeText leading-none">
                    ₪{itemToAdd.price * addQuantity}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleConfirmAdd}
                className="flex-1 bg-themeHeaderBg text-themeHeaderTxt font-bold py-3 rounded-xl hover:opacity-95 transition shadow-md flex items-center justify-center text-base"
              >
                {t.confirmAdd}
              </button>
            </div>
          </>
        )}
      </AccessibleModal>

      {/* Portaled Zoom Lightbox */}
      <AccessibleModal
        isOpen={Boolean(itemToAdd && isZoomed && isValidHttpMediaUrl(itemToAdd.image_url))}
        onClose={() => setIsZoomed(false)}
        ariaLabel={itemToAdd ? getLocalizedItem(itemToAdd, language).name : 'Zoomed photo'}
        closeLabel={isHe ? 'סגור תמונה מוגדלת' : 'Close zoomed photo'}
        dir={isHe ? 'rtl' : 'ltr'}
        overlayClassName="bg-stone-950/95 p-3 md:p-8"
        contentClassName="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center outline-none"
      >
        {itemToAdd && itemToAdd.image_url && (
          <img
            src={toCloudinaryOptimizedImageUrl(itemToAdd.image_url, 1280)}
            alt={getLocalizedItem(itemToAdd, language).name}
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
          />
        )}
      </AccessibleModal>
    </>
  );
};
