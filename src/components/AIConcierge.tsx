
import React, { useState, useEffect } from 'react';
import { useStore, translations, Translations, getLocalizedItem } from '../store';
import { Sparkles, Loader2, Send, AlertCircle, RefreshCw, Check, Utensils } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { MenuItem } from '../types';

export const AIConcierge: React.FC = () => {
    const { language, menuItems, bulkAddToCart, calculationSettings } = useStore();
    const t: Translations = (translations[language] || translations['he']) as Translations;
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [recommendation, setRecommendation] = useState<{ items: { id: string, quantity: number }[], explanation: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [needsKey, setNeedsKey] = useState(false);

    // Fetch API Key from Env
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

    useEffect(() => {
        if (!API_KEY) {
            setNeedsKey(true);
        }
    }, [API_KEY]);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const generateRecommendation = async () => {
        if (!prompt.trim() || !API_KEY) return;
        
        setIsGenerating(true);
        setRecommendation(null); // Clear previous result
        setError(null); // Clear previous errors

        const MAX_RETRIES = 3;
        let attempt = 0;
        let success = false;

        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        // Prepare menu summary for context
        const menuSummary = (menuItems || []).map(m => ({ 
            id: m.id, 
            name: m.name, 
            cat: m.category,
            price: m.price,
            unit: m.unit_type,
            serves: m.serves_min
        }));

        // Feature 5: AI Guardrails & Prompt Engineering
        // Enforce strict rules on budget, quantity, and context.
        // Also inject Custom Admin Instructions if available.
        const systemInstruction = `
            You are "Ayala", the owner and head chef of a premium boutique dairy catering business.
            Your tone is warm, personal, inviting, and professional. You don't just list items; you curate an experience.
            Use phrases like "I recommend," "A perfect combination would be," "To delight your guests."
            
            STRICT CONSTRAINTS (Guardrails):
            1. **Budget Profile**: Use a "Balanced" approach. Target approximately 80-120 NIS per person.
            2. **Quantity Logic**: 
               - Be realistic. Do not order 1 unit per person for EVERY category.
               - For trays (Salads/Pastas), 1 tray serves 10-15 people.
            3. **Context**: Only choose from the provided inventory list.
            4. **Language**: 
               - If the User Prompt is in Hebrew, your explanation MUST be in Hebrew.
               - If the User Prompt is in English, reply in English.
            
            ADDITIONAL CHEF INSTRUCTIONS:
            ${calculationSettings.aiCustomInstructions || "None"}

            INPUT:
            - User Prompt: "${prompt}"
            - Menu Inventory: ${JSON.stringify(menuSummary)}

            OUTPUT:
            - A JSON object with "items" (id, quantity) and "explanation" (string).
            - The "explanation" should be your personal note to the customer, explaining why these flavors work together.
        `;

        while (attempt < MAX_RETRIES && !success) {
            try {
                attempt++;
                // Using gemini-3-flash-preview as requested
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: systemInstruction,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                items: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            id: { type: Type.STRING },
                                            quantity: { type: Type.NUMBER }
                                        },
                                        required: ["id", "quantity"]
                                    }
                                },
                                explanation: { type: Type.STRING }
                            },
                            required: ["items", "explanation"]
                        },
                    },
                });

                const text = response.text;
                
                if (text) {
                    setRecommendation(JSON.parse(text));
                    success = true;
                } else {
                    throw new Error("Empty response from AI");
                }
                
            } catch (err: any) {
                console.warn(`AI Attempt ${attempt} failed:`, err);
                if (attempt < MAX_RETRIES) {
                    await delay(1000); // Wait 1 second before retry
                } else {
                    // Final failure after retries
                    setError(language === 'he' 
                        ? "נתקלנו בבעיה זמנית בתקשורת עם היועץ הדיגיטלי. אנא נסו שנית בעוד רגע." 
                        : "Temporary connection issue with the AI Concierge. Please try again shortly.");
                }
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
            setPrompt('');
        }
    };

    // Helper to calculate total of recommendation
    const recTotal = recommendation?.items.reduce((acc, rec) => {
        const item = menuItems.find(m => m.id === rec.id);
        return acc + (item ? item.price * rec.quantity : 0);
    }, 0) || 0;

    return (
        <div className="bg-stone-900 border border-gold-500/30 rounded-3xl p-6 mb-12 shadow-2xl text-start overflow-hidden relative">
            
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 bg-gold-500/20 rounded-lg text-gold-500">
                    <Sparkles size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-serif font-bold text-white">{t.aiTitle}</h3>
                    <p className="text-xs text-stone-400">Powered by Gemini 3.0</p>
                </div>
            </div>

            {needsKey ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    שגיאה: מפתח ה-API לא הוגדר ב-Vercel. יש להגדיר VITE_GEMINI_API_KEY.
                </div>
            ) : (
                <>
                    <div className="flex flex-col md:flex-row gap-4 mb-6 relative z-10">
                        <textarea
                            value={prompt}
                            onChange={(e) => {
                                setPrompt(e.target.value);
                                if (error) setError(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    generateRecommendation();
                                }
                            }}
                            placeholder={t.aiPlaceholder}
                            className={`
                                flex-1 bg-stone-800/80 border rounded-2xl p-4 text-white h-24 resize-none focus:outline-none focus:border-gold-500 transition-colors backdrop-blur-sm
                                ${error ? 'border-red-500/50' : 'border-stone-700'}
                            `}
                        />
                        <button
                            onClick={generateRecommendation}
                            disabled={isGenerating || !prompt.trim()}
                            className="bg-gold-500 text-stone-900 font-bold rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] shadow-lg shadow-gold-500/20"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" /> : <Send size={24} />}
                            <span className="text-xs">{t.aiGenerate}</span>
                        </button>
                    </div>

                    {error && (
                         <div className="animate-fade-in bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 mb-4">
                            <RefreshCw className="text-red-400 shrink-0" size={20} />
                            <p className="text-red-200 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {recommendation && (
                        <div className="animate-fade-in relative z-10">
                            {recommendation.items.length > 0 ? (
                                <div className="bg-stone-800/80 rounded-2xl border border-stone-700 overflow-hidden backdrop-blur-md">
                                    {/* Header */}
                                    <div className="bg-stone-950/50 p-4 border-b border-stone-700 flex justify-between items-center">
                                        <h4 className="text-gold-500 font-bold flex items-center gap-2">
                                            <Utensils size={16} />
                                            {language === 'he' ? 'התפריט שהרכבתי לך' : 'My Menu Recommendation'}
                                        </h4>
                                        <span className="text-stone-300 font-serif font-bold text-lg">₪{recTotal}</span>
                                    </div>

                                    {/* Items List */}
                                    <div className="p-2">
                                        {recommendation.items.map((rec) => {
                                            const item = menuItems.find(m => m.id === rec.id);
                                            if (!item) return null;
                                            const localItem = getLocalizedItem(item, language);
                                            
                                            return (
                                                <div key={rec.id} className="flex justify-between items-center p-3 hover:bg-white/5 rounded-xl transition-colors border-b border-stone-700/50 last:border-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gold-500/20 rounded-lg flex items-center justify-center text-gold-500 font-bold text-sm shrink-0">
                                                            {rec.quantity}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-stone-200 font-bold text-sm">{localItem.name}</span>
                                                            <span className="text-[10px] text-stone-500">{t.categories[item.category] || item.category}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-stone-400 text-sm font-medium">
                                                        ₪{item.price * rec.quantity}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Chef's Note */}
                                    <div className="bg-gold-500/10 p-4 border-t border-gold-500/20">
                                        <div className="flex gap-2">
                                            <div className="w-1 h-full bg-gold-500 rounded-full shrink-0 min-h-[2rem]"></div>
                                            <p className="text-stone-300 text-sm italic leading-relaxed">
                                                "{recommendation.explanation}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="p-4 bg-stone-950/30">
                                        <button
                                            onClick={handleApply}
                                            className="w-full bg-gold-500 text-stone-900 font-bold py-3.5 rounded-xl hover:bg-gold-400 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Check size={18} />
                                            {t.aiApply} ({recommendation.items.length})
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-stone-800/80 border border-stone-700 rounded-2xl p-4 flex items-start gap-3">
                                    <AlertCircle className="text-stone-400 shrink-0 mt-0.5" size={20} />
                                    <p className="text-stone-300 text-sm">{recommendation.explanation}</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
