
import React, { useState, useEffect } from 'react';
import { useStore, translations, Translations, getLocalizedItem } from '../store';
import { Sparkles, Loader2, Send, AlertCircle, RefreshCw, Check, Utensils, Eye, X } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { MenuItem } from '../types';
import { useBackButton } from '../hooks/useBackButton';

export const AIConcierge: React.FC = () => {
    const { language, menuItems, bulkAddToCart, calculationSettings, aiPrompt, setAiPrompt } = useStore();
    const t: Translations = (translations[language] || translations['he']) as Translations;
    const [isGenerating, setIsGenerating] = useState(false);
    const [recommendation, setRecommendation] = useState<{ items: { id: string, quantity: number }[], explanation: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [needsKey, setNeedsKey] = useState(false);
    const [previewItem, setPreviewItem] = useState<MenuItem | null>(null);

    useBackButton(!!previewItem, () => setPreviewItem(null));

    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

    useEffect(() => {
        if (!API_KEY) {
            setNeedsKey(true);
        }
    }, [API_KEY]);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const generateRecommendation = async () => {
        if (!aiPrompt.trim() || !API_KEY) return;
        
        setIsGenerating(true);
        setRecommendation(null);
        setError(null);

        const MAX_RETRIES = 3;
        let attempt = 0;
        let success = false;

        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const menuSummary = (menuItems || []).map(m => ({
            id: m.id,
            name: m.name,
            cat: m.category,
            price: m.price,
            unit: m.unit_type,
            serves_min: m.serves_min,
            serves_max: m.serves_max,
            is_tray: m.is_tray,
            units_per_tray: m.units_per_tray
        }));

        const systemInstruction = `
            You are "Ayala", the owner and head chef of a premium boutique dairy catering business.
            Your tone is warm, professional, but VERY CONCISE.
            
            STRICT QUANTITY CALCULATION & BALANCING LOGIC:
            1. **Detect Guests (G)**: Identify the number of guests (G) from the user's prompt. If not specified, default to G = 10.
            2. **Target Budget**: The total order price MUST be between 80 to 120 NIS per guest (Total: G * 80 to G * 120 NIS). Under no circumstances exceed G * 130 NIS.
            3. **Quantity Calculation Rules**:
               - **Trays (unit = 'tray') / Salad / Main Course**: 1 tray serves 10-12 guests. For G guests, recommend EXACTLY ceil(G / 10) trays in total for that category, distributed among different dishes to give variety. NEVER recommend more than 1 of the same exact tray/dish unless G >= 20.
               - **Unit-based items (unit = 'unit')**: Recommend 1 to 1.5 units per guest. If the item represents a main dish/sandwich, G * 1.2 units is the max.
               - **Unit-based trays (is_tray = true, units_per_tray > 0)**: Calculate the total units needed (G * 1.5 units of finger food per guest), then divide by units_per_tray. E.g., for 15 guests and a tray of 20 units: ceil(15 * 1.5 / 20) = 2 trays.
               - **Liters (unit = 'liter') / Dips**: 1 liter serves 15-20 guests as a dip or 4-5 guests as a soup.
            4. **Composition Rules**:
               - Every standard event recommendation MUST consist of at least:
                 - Salads (סלטים)
                 - Hosting trays / Cold platters (מגשי אירוח / פלטות קרות)
                 - Main courses (מנות עיקריות)
               - If the user wants to enrich the event or if budget allows, you can add Dips, Pastries, or Desserts, but keep the total price within the 80-120 NIS/person budget.
            5. **Language**: Match the language of the user prompt (usually Hebrew).
            6. **Explanation**: Write a very warm and concise explanation (MAX 25 WORDS) describing why this selection is perfect for their event size.
            
            ADDITIONAL CHEF INSTRUCTIONS: ${calculationSettings.aiCustomInstructions || "None"}
            INPUT: User Prompt: "${aiPrompt}", Menu: ${JSON.stringify(menuSummary)}
            OUTPUT: JSON {items: [{id, quantity}], explanation: string}.
        `;

        while (attempt < MAX_RETRIES && !success) {
            try {
                attempt++;
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: systemInstruction,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, quantity: { type: Type.NUMBER } }, required: ["id", "quantity"] } },
                                explanation: { type: Type.STRING }
                            },
                            required: ["items", "explanation"]
                        },
                    },
                });

                if (response.text) {
                    setRecommendation(JSON.parse(response.text));
                    success = true;
                }
            } catch (err: any) {
                if (attempt < MAX_RETRIES) await delay(1000);
                else setError(language === 'he' ? "נתקלנו בבעיה זמנית בתקשורת." : "Temporary connection issue.");
            }
        }
        setIsGenerating(false);
    };

    const handleApply = () => {
        if (!recommendation?.items) return;
        const itemsToApply = recommendation.items
            .map(rec => {
                const item = menuItems.find(m => m.id === rec.id);
                return item ? { item, quantity: rec.quantity } : null;
            })
            .filter((x): x is { item: MenuItem, quantity: number } => x !== null);
        if (itemsToApply.length > 0) {
            bulkAddToCart(itemsToApply);
            setRecommendation(null);
            setAiPrompt('');
        }
    };

    const scrollToItem = (itemId: string) => {
        const element = document.getElementById(`item-${itemId}`);
        if (element) {
            const headerHeight = 135; 
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({
                top: elementPosition - headerHeight,
                behavior: 'smooth'
            });
        }
    };

    const recTotal = recommendation?.items.reduce((acc, rec) => {
        const item = menuItems.find(m => m.id === rec.id);
        return acc + (item ? item.price * rec.quantity : 0);
    }, 0) || 0;

    return (
        <div id="digital-chef" className="bg-themeCardBg border border-themePrimary/30 rounded-3xl p-6 mb-12 shadow-2xl text-start overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-themePrimary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 bg-themePrimary/20 rounded-lg text-themePrimary"><Sparkles size={24} /></div>
                <div><h3 className="text-xl font-serif font-bold text-themeText">{t.aiTitle}</h3><p className="text-xs text-themeText/60">Powered by Gemini 3.0</p></div>
            </div>
            {needsKey ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">VITE_GEMINI_API_KEY Missing</div>
            ) : (
                <>
                    <div className="flex flex-col md:flex-row gap-4 mb-6 relative z-10">
                        <textarea value={aiPrompt} onChange={(e) => {setAiPrompt(e.target.value); if (error) setError(null);}} placeholder={t.aiPlaceholder} className={`flex-1 bg-themeBg/80 border rounded-2xl p-4 text-themeText h-24 resize-none focus:outline-none focus:border-themePrimary transition-colors backdrop-blur-sm ${error ? 'border-red-500/50' : 'border-themeText/10'}`} />
                        <button onClick={generateRecommendation} disabled={isGenerating || !aiPrompt.trim()} className="bg-themePrimary text-themeCardBg font-bold rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:opacity-90 transition-colors disabled:opacity-50 min-w-[100px] shadow-lg shadow-themePrimary/20">{isGenerating ? <Loader2 className="animate-spin" /> : <Send size={24} />}<span className="text-xs">{t.aiGenerate}</span></button>
                    </div>
                    {error && (<div className="animate-fade-in bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 mb-4"><RefreshCw className="text-red-400 shrink-0" size={20} /><p className="text-red-200 text-sm font-medium">{error}</p></div>)}
                    {recommendation && (
                        <div className="animate-fade-in relative z-10">
                            {recommendation.items.length > 0 ? (
                                <div className="bg-themeBg/80 rounded-2xl border border-themeText/10 overflow-hidden backdrop-blur-md">
                                    <div className="bg-themePrimary/10 p-4 border-b border-themePrimary/20"><div className="flex gap-2"><div className="w-1 h-full bg-themePrimary rounded-full shrink-0 min-h-[2rem]"></div><p className="text-themeText/80 text-sm italic leading-relaxed">"{recommendation.explanation}"</p></div></div>
                                    <div className="bg-themeBg/30 p-4 border-b border-themeText/10 flex justify-between items-center"><h4 className="text-themePrimary font-bold flex items-center gap-2"><Utensils size={16} />{language === 'he' ? 'התפריט שהרכבתי לך' : 'My Recommendation'}</h4><span className="text-themeText/80 font-serif font-bold text-lg">₪{recTotal}</span></div>
                                    <div className="p-2">
                                        {recommendation.items.map((rec) => {
                                            const item = menuItems.find(m => m.id === rec.id);
                                            if (!item) return null;
                                            const localItem = getLocalizedItem(item, language);
                                            return (
                                                <div key={rec.id} className="flex justify-between items-center p-3 hover:bg-themeText/5 rounded-xl transition-colors border-b border-themeText/10 last:border-0">
                                                    <button onClick={() => scrollToItem(rec.id)} className="flex items-center gap-3 overflow-hidden text-start flex-1 group"><div className="w-8 h-8 bg-themePrimary/20 rounded-lg flex items-center justify-center text-themePrimary font-bold text-sm shrink-0">{rec.quantity}</div><div className="flex flex-col min-w-0"><span className="text-themeText/90 font-bold text-sm truncate group-hover:text-themePrimary transition-colors">{localItem.name}</span><span className="text-[10px] text-themeText/50 truncate">{t.categories[item.category] || item.category}</span></div></button>
                                                    <div className="flex items-center gap-3 shrink-0">{item.image_url && (<button onClick={() => setPreviewItem(item)} className="p-1.5 text-themeText/50 hover:text-themePrimary hover:bg-themeBg rounded-full transition-colors"><Eye size={16} /></button>)}<div className="text-themeText/70 text-sm font-medium w-16 text-end">₪{item.price * rec.quantity}</div></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="p-4 bg-themeBg/20 border-t border-themeText/10"><button onClick={handleApply} className="w-full bg-themePrimary text-themeCardBg font-bold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"><Check size={18} />{t.aiApply} ({recommendation.items.length})</button></div>
                                </div>
                            ) : (<div className="bg-themeBg/80 border border-themeText/10 rounded-2xl p-4 flex items-start gap-3"><AlertCircle className="text-themeText/60 shrink-0 mt-0.5" size={20} /><p className="text-themeText/80 text-sm">{recommendation.explanation}</p></div>)}
                        </div>
                    )}
                </>
            )}
            {previewItem && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-themeBg/95 backdrop-blur-md animate-fade-in p-4" onClick={() => setPreviewItem(null)}>
                    <button onClick={() => setPreviewItem(null)} className="absolute top-6 right-6 text-themeText p-2 hover:bg-themeText/10 rounded-full z-[210]"><X size={32} /></button>
                    <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}><img src={previewItem.image_url} alt={getLocalizedItem(previewItem, language).name} className="w-full h-auto max-h-[80vh] object-contain rounded-xl shadow-2xl animate-zoom-in"/><div className="absolute bottom-0 left-0 right-0 bg-themeCardBg/90 backdrop-blur-sm p-4 rounded-b-xl text-center"><h3 className="text-themeText font-bold text-lg">{getLocalizedItem(previewItem, language).name}</h3><p className="text-themePrimary font-serif">₪{previewItem.price}</p></div></div>
                </div>
            )}
        </div>
    );
};
