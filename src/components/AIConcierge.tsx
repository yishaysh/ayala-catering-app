
import React, { useState, useEffect } from 'react';
import { useStore, translations, Translations } from '../store';
import { Sparkles, Loader2, Send, AlertCircle, RefreshCw } from 'lucide-react';
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
            You are "Ayala", an expert catering planner for a premium dairy catering business.
            Your goal is to build a PERFECT menu based on the user's event description.

            STRICT CONSTRAINTS (Guardrails):
            1. **Budget Profile**: Use a "Balanced" approach. Target approximately 80-120 NIS per person. Do not suggest excessive amounts.
            2. **Quantity Logic**: 
               - Do not order 1 unit per person for EVERY category. That is too much food.
               - If ordering many categories (Salads + Quiche + Pastries), reduce the quantity per category.
               - For trays (Salads/Pastas), 1 tray usually serves 10-15 people. Do not order 5 trays for 10 people.
            3. **Context**: We sell specific items. Only choose from the provided list.
            4. **Variety**: Select a realistic variety (5-8 distinct items max for small groups).
            5. **Language**: The user prompt is in Hebrew or English. Your 'explanation' MUST be in Hebrew (unless the prompt is explicitly English).
            
            ADDITIONAL CHEF INSTRUCTIONS (Important):
            ${calculationSettings.aiCustomInstructions || "None"}

            INPUT:
            - User Prompt: "${prompt}"
            - Menu Inventory: ${JSON.stringify(menuSummary)}

            OUTPUT:
            - A JSON object with "items" (id, quantity) and "explanation" (string).
            - If the request is unclear, return empty items and a polite question.
        `;

        while (attempt < MAX_RETRIES && !success) {
            try {
                attempt++;
                // Using gemini-3-flash-preview as requested
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: systemInstruction, // Injecting the robust prompt as contents
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

    return (
        <div className="bg-stone-900 border border-gold-500/30 rounded-3xl p-6 mb-12 shadow-2xl text-start">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gold-500/20 rounded-lg text-gold-500">
                    <Sparkles size={24} />
                </div>
                <h3 className="text-xl font-serif font-bold text-white">{t.aiTitle}</h3>
            </div>

            {needsKey ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    שגיאה: מפתח ה-API לא הוגדר ב-Vercel. יש להגדיר VITE_GEMINI_API_KEY.
                </div>
            ) : (
                <>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <textarea
                            value={prompt}
                            onChange={(e) => {
                                setPrompt(e.target.value);
                                if (error) setError(null); // Clear error when user types
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    generateRecommendation();
                                }
                            }}
                            placeholder={t.aiPlaceholder}
                            className={`
                                flex-1 bg-stone-800 border rounded-2xl p-4 text-white h-24 resize-none focus:outline-none focus:border-gold-500 transition-colors
                                ${error ? 'border-red-500/50' : 'border-stone-700'}
                            `}
                        />
                        <button
                            onClick={generateRecommendation}
                            disabled={isGenerating || !prompt.trim()}
                            className="bg-gold-500 text-stone-900 font-bold rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
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
                        <div className="animate-fade-in">
                            {recommendation.items.length > 0 ? (
                                <div className="bg-stone-800/50 rounded-2xl p-6 border border-gold-500/20">
                                    <p className="text-stone-300 text-sm mb-4 italic">"{recommendation.explanation}"</p>
                                    <button
                                        onClick={handleApply}
                                        className="w-full bg-white text-stone-900 font-bold py-3 rounded-xl hover:bg-stone-100 transition-colors shadow-lg"
                                    >
                                        {t.aiApply} ({recommendation.items.length} {language === 'he' ? 'פריטים' : 'items'})
                                    </button>
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
