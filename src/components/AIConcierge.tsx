
import React, { useState, useEffect } from 'react';
import { useStore, translations, Translations } from '../store';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { MenuItem } from '../types';

export const AIConcierge: React.FC = () => {
    const { language, menuItems, bulkAddToCart } = useStore();
    const t: Translations = (translations[language] || translations['he']) as Translations;
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [recommendation, setRecommendation] = useState<{ items: { id: string, quantity: number }[], explanation: string } | null>(null);
    const [needsKey, setNeedsKey] = useState(false);

    // משיכת המפתח מתוך משתני הסביבה של Vite (Vercel)
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

    useEffect(() => {
        if (!API_KEY) {
            setNeedsKey(true);
        }
    }, [API_KEY]);

    const generateRecommendation = async () => {
        if (!prompt.trim() || !API_KEY) return;
        
        setIsGenerating(true);
        try {
            // אתחול ה-SDK החדש
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            
            const menuSummary = (menuItems || []).map(m => ({ 
                id: m.id, 
                name: m.name, 
                cat: m.category 
            }));

            const fullPrompt = `אתה עוזר אישי לקייטרינג 'איילה'. המשתמש ביקש: "${prompt}". 
                זה התפריט הזמין: ${JSON.stringify(menuSummary)}.
                בנה תפריט מאוזן של 4-8 מנות עם כמויות מתאימות. 
                החזר רק את ה-JSON.`;

            // קריאה למודל החדש gemini-3-flash-preview
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: fullPrompt,
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

            // גישה ישירה לטקסט דרך הפרופרטי text (לא פונקציה)
            const text = response.text;
            
            if (text) {
                setRecommendation(JSON.parse(text));
            } else {
                throw new Error("Did not receive a text response from the model");
            }
            
        } catch (error: any) {
            console.error("AI Error:", error);
            alert(language === 'he' ? "חלה שגיאה בחיבור לבינה המלאכותית" : "AI connection error");
        } finally {
            setIsGenerating(false);
        }
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
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={t.aiPlaceholder}
                            className="flex-1 bg-stone-800 border border-stone-700 rounded-2xl p-4 text-white h-24 resize-none focus:outline-none focus:border-gold-500"
                        />
                        <button
                            onClick={generateRecommendation}
                            disabled={isGenerating || !prompt.trim()}
                            className="bg-gold-500 text-stone-900 font-bold rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" /> : <Send size={24} />}
                            <span className="text-xs">{t.aiGenerate}</span>
                        </button>
                    </div>

                    {recommendation && (
                        <div className="bg-stone-800/50 rounded-2xl p-6 border border-gold-500/20 animate-fade-in">
                            <p className="text-stone-300 text-sm mb-4 italic">"{recommendation.explanation}"</p>
                            <button
                                onClick={handleApply}
                                className="w-full bg-white text-stone-900 font-bold py-3 rounded-xl hover:bg-stone-100 transition-colors"
                            >
                                {t.aiApply}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
