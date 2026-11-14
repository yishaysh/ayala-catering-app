import React, { useState } from 'react';
import { useStore, translations, Translations, getLocalizedItem } from '../store';
import {
  Sparkles,
  Loader2,
  Send,
  AlertCircle,
  AlertTriangle,
  Check,
  Utensils,
  Eye,
  Plus,
  Minus,
  Trash2,
  Calculator,
  BookOpen,
} from 'lucide-react';
import { MenuItem } from '../types';
import { api, ApiError } from '../lib/api';
import { DIETARY_DISCLAIMER } from '../../shared/config';
import { toCloudinaryOptimizedImageUrl } from '../../shared/media';
import { AccessibleModal } from './AccessibleModal';

interface ProposalItemState {
  menuItem: MenuItem;
  quantity: number;
  note?: string;
}

export const AIConcierge: React.FC = () => {
  const {
    language,
    menuItems,
    cart,
    bulkAddToCart,
    adultCount,
    childCount,
    eventType,
    aiPrompt,
    setAiPrompt,
    appConfig,
  } = useStore();
  const isHe = language === 'he';
  const t: Translations = (translations[language] || translations['he']) as Translations;

  const [isGenerating, setIsGenerating] = useState(false);
  const [proposal, setProposal] = useState<{
    items: ProposalItemState[];
    explanation: string;
    requiresDietaryConfirmation: boolean;
  } | null>(null);
  const [error, setError] = useState<{ message: string; fallbackToManual: boolean } | null>(null);
  const [previewItem, setPreviewItem] = useState<MenuItem | null>(null);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const generateRecommendation = async () => {
    const cleanPrompt = aiPrompt.trim();
    if (!cleanPrompt || isGenerating) return;

    setIsGenerating(true);
    setProposal(null);
    setError(null);
    setAppliedBanner(null);

    api.trackEvent('ai_planner_requested', { language });

    try {
      const res = await api.requestAiMenu({
        prompt: cleanPrompt,
        adults: adultCount > 0 ? adultCount : 20,
        children: childCount,
        eventType,
        language,
      });

      const resolvedItems: ProposalItemState[] = res.proposal.items
        .map((entry): ProposalItemState | null => {
          const liveItem = menuItems.find(
            (m) => m.id === entry.menuItem.id && m.availability_status !== false
          );
          if (!liveItem) return null;
          return {
            menuItem: liveItem,
            quantity: Math.max(1, Math.min(50, Math.round(entry.quantity))),
            note: entry.note,
          };
        })
        .filter((x): x is ProposalItemState => x !== null);

      if (resolvedItems.length === 0) {
        setError({
          message: isHe
            ? 'לא נמצאו מנות זמינות תואמות מהתפריט. ניתן להרכיב תפריט דרך מחשבון האירועים או התפריט הידני.'
            : 'No matching available dishes were found. Please build your menu using the calculator or full menu.',
          fallbackToManual: true,
        });
      } else {
        setProposal({
          items: resolvedItems,
          explanation: res.proposal.explanation,
          requiresDietaryConfirmation: res.proposal.requiresDietaryConfirmation,
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const details = (err.details || {}) as Record<string, unknown>;
        const msg =
          (isHe ? (details.errorHe as string) : (details.errorEn as string)) || err.message;
        setError({
          message: msg,
          fallbackToManual: Boolean(details.fallbackToManual ?? err.status >= 500),
        });
      } else {
        setError({
          message: isHe
            ? 'לא ניתן להפעיל כרגע את מתכנן התפריט. ניתן להמשיך עם מחשבון הכמויות או התפריט המלא.'
            : 'Menu planner is unavailable right now. Continue using the event calculator or manual menu.',
          fallbackToManual: true,
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const updateProposalQty = (id: string, delta: number) => {
    setProposal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items
          .map((row) =>
            row.menuItem.id === id
              ? { ...row, quantity: Math.max(1, Math.min(50, row.quantity + delta)) }
              : row
          ),
      };
    });
  };

  const removeProposalItem = (id: string) => {
    setProposal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter((row) => row.menuItem.id !== id),
      };
    });
  };

  const handleApply = (replaceCart: boolean) => {
    if (!proposal?.items.length) return;
    bulkAddToCart(
      proposal.items.map((p) => ({
        item: p.menuItem,
        quantity: p.quantity,
        notes: p.note,
      })),
      replaceCart
    );
    const count = proposal.items.length;
    setProposal(null);
    setAppliedBanner(
      isHe
        ? replaceCart
          ? `העגלה הוחלפה ב-${count} מנות מההצעה. ניתן להמשיך לעריכה או לשליחת בקשה.`
          : `${count} מנות נוספו לעגלה הקיימת.`
        : replaceCart
        ? `Cart replaced with ${count} dishes. Review in your cart whenever ready.`
        : `${count} dishes added to your existing cart.`
    );
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const recTotal =
    proposal?.items.reduce((acc, rec) => acc + rec.menuItem.price * rec.quantity, 0) || 0;

  return (
    <section
      id="digital-chef"
      aria-labelledby="ai-planner-heading"
      className="bg-themeCardBg border border-themePrimary/30 rounded-3xl p-6 mb-10 shadow-xl text-start overflow-hidden relative"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-themePrimary/15 rounded-lg text-themePrimary">
          <Sparkles size={22} aria-hidden="true" />
        </div>
        <div>
          <h3 id="ai-planner-heading" className="text-xl font-serif font-bold text-themeText">
            {t.aiTitle}
          </h3>
          <p className="text-xs text-themeText/70">
            {isHe
              ? 'הצעת תפריט ראשונית מתוך המנות הזמינות — לעריכה ואישור לפני הוספה לעגלה'
              : 'Draft proposal from available dishes — editable before adding to your quote cart'}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <label htmlFor="ai-planner-input" className="sr-only">
          {t.aiPlaceholder}
        </label>
        <textarea
          id="ai-planner-input"
          value={aiPrompt}
          onChange={(e) => {
            setAiPrompt(e.target.value);
            if (error) setError(null);
            if (appliedBanner) setAppliedBanner(null);
          }}
          placeholder={t.aiPlaceholder}
          maxLength={800}
          className={`flex-1 bg-themeBg/80 border rounded-2xl p-4 text-themeText h-24 resize-none focus:outline-none focus:ring-2 focus:ring-themePrimary ${
            error ? 'border-red-600' : 'border-themeText/20'
          }`}
        />
        <button
          type="button"
          onClick={generateRecommendation}
          disabled={isGenerating || !aiPrompt.trim()}
          className="bg-themePrimary text-white font-bold rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50 min-w-[116px] shadow-md"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={22} /> : <Send size={22} />}
          <span className="text-xs">{t.aiGenerate}</span>
        </button>
      </div>

      {appliedBanner && (
        <div
          role="status"
          className="mb-4 p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-sm font-medium flex items-center gap-2"
        >
          <Check size={18} className="shrink-0 text-emerald-700" />
          <span>{appliedBanner}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 rounded-2xl p-4 mb-4 text-red-950 space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-700 shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-medium leading-relaxed">{error.message}</p>
          </div>
          {error.fallbackToManual && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => scrollToSection('event-calculator')}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-white border border-red-300 text-red-900 hover:bg-red-100 transition-colors"
              >
                <Calculator size={14} />
                {isHe ? 'למחשבון האירועים וחבילות' : 'Open Event Calculator'}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('menu-section')}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-themePrimary text-white hover:opacity-90 transition-opacity"
              >
                <BookOpen size={14} />
                {isHe ? 'בחירה ידנית מהתפריט' : 'Browse Full Menu'}
              </button>
            </div>
          )}
        </div>
      )}

      {proposal && (
        <div className="bg-themeBg/70 rounded-2xl border border-themeText/15 overflow-hidden">
          {proposal.explanation && (
            <div className="bg-themePrimary/10 p-4 border-b border-themePrimary/20">
              <p className="text-themeText text-sm leading-relaxed">{proposal.explanation}</p>
            </div>
          )}

          {proposal.requiresDietaryConfirmation && (
            <div className="p-3 bg-amber-50 border-b border-amber-300 text-amber-950 text-xs flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-700" />
              <span>{isHe ? DIETARY_DISCLAIMER.he : DIETARY_DISCLAIMER.en}</span>
            </div>
          )}

          <div className="p-4 border-b border-themeText/10 flex justify-between items-center bg-white/60">
            <h4 className="text-themePrimary font-bold flex items-center gap-2">
              <Utensils size={16} />
              {isHe ? 'טיוטת ההצעה (ניתנת לעריכה)' : 'Editable Proposal Draft'}
            </h4>
            {appConfig.ecommerce_mode && (
              <span className="text-themeText font-serif font-bold text-lg">₪{recTotal}</span>
            )}
          </div>

          <div className="divide-y divide-themeText/10 p-2">
            {proposal.items.map((rec) => {
              const localItem = getLocalizedItem(rec.menuItem, language);
              const hasImg = rec.menuItem.image_url?.startsWith('http');
              return (
                <div
                  key={rec.menuItem.id}
                  className="flex flex-wrap justify-between items-center gap-2 p-3 hover:bg-white/70 rounded-xl transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => scrollToSection(`item-${rec.menuItem.id}`)}
                    className="flex flex-col text-start flex-1 min-w-[160px] group"
                  >
                    <span className="text-themeText font-bold text-sm group-hover:text-themePrimary transition-colors">
                      {localItem.name}
                    </span>
                    <span className="text-xs text-themeText/70">
                      {t.categories[rec.menuItem.category] || rec.menuItem.category}
                      {rec.note ? ` · ${rec.note}` : ''}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="inline-flex items-center border border-themeText/20 rounded-lg bg-white">
                      <button
                        type="button"
                        onClick={() => updateProposalQty(rec.menuItem.id, -1)}
                        aria-label={isHe ? `הפחת כמות של ${localItem.name}` : `Decrease ${localItem.name}`}
                        className="p-1.5 text-themeText hover:bg-themeText/5"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-2 text-xs font-bold text-themeText min-w-[24px] text-center">
                        {rec.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateProposalQty(rec.menuItem.id, 1)}
                        aria-label={isHe ? `הגדל כמות של ${localItem.name}` : `Increase ${localItem.name}`}
                        className="p-1.5 text-themeText hover:bg-themeText/5"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {hasImg && (
                      <button
                        type="button"
                        onClick={() => setPreviewItem(rec.menuItem)}
                        aria-label={isHe ? `תצוגה מקדימה של ${localItem.name}` : `Preview ${localItem.name}`}
                        className="p-1.5 text-themeText/70 hover:text-themePrimary rounded-full hover:bg-themeText/5"
                      >
                        <Eye size={16} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removeProposalItem(rec.menuItem.id)}
                      aria-label={isHe ? `הסר את ${localItem.name} מההצעה` : `Remove ${localItem.name}`}
                      className="p-1.5 text-red-700 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-white/80 border-t border-themeText/10 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => handleApply(false)}
              disabled={proposal.items.length === 0}
              className="flex-1 bg-themePrimary text-white font-bold py-3 px-4 rounded-xl hover:opacity-95 transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check size={18} />
              {cart.length > 0
                ? isHe
                  ? `הוספה לעגלה הקיימת (${proposal.items.length})`
                  : `Add to Existing Cart (${proposal.items.length})`
                : `${t.aiApply} (${proposal.items.length})`}
            </button>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => handleApply(true)}
                className="sm:w-auto bg-white text-themeText font-bold py-3 px-4 rounded-xl border border-themeText/25 hover:bg-themeText/5 transition-colors text-sm"
              >
                {isHe ? 'החלף את העגלה בהצעה זו' : 'Replace Cart with Proposal'}
              </button>
            )}
          </div>
        </div>
      )}

      <AccessibleModal
        isOpen={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        titleId="ai-preview-title"
        closeLabel={t.accessibility.closeBtn}
        dir={isHe ? 'rtl' : 'ltr'}
        contentClassName="relative max-w-2xl w-full bg-themeCardBg rounded-2xl overflow-hidden shadow-2xl border border-themeText/15"
      >
        {previewItem && (
          <div>
            <img
              src={toCloudinaryOptimizedImageUrl(previewItem.image_url || '', 960)}
              alt={getLocalizedItem(previewItem, language).name}
              className="w-full h-auto max-h-[75vh] object-contain bg-black/5"
            />
            <div className="p-4 text-center">
              <h3 id="ai-preview-title" className="text-themeText font-bold text-lg">
                {getLocalizedItem(previewItem, language).name}
              </h3>
              {appConfig.ecommerce_mode && (
                <p className="text-themePrimary font-serif">₪{previewItem.price}</p>
              )}
            </div>
          </div>
        )}
      </AccessibleModal>
    </section>
  );
};
