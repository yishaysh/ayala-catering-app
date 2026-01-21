import React, { useState, useEffect } from 'react';
import { useStore, translations, Translations } from '../store';
import { Sparkles, Loader2, Send, CheckCircle2, Key } from 'lucide-react';
// מעבר לספרייה הרשמית של גוגל
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
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
        if (!API_KEY && !window.aistudio) {
            setNeedsKey(true);
        }
    }, [API_KEY]);

    const generateRecommendation = async () => {
        if (!prompt.trim() || !API_KEY) return;
        
        setIsGenerating(true);
        try {
            // אתחול ה-SDK הרשמי
            const genAI = new GoogleGenerativeAI(API_KEY);
            
            // הגדרת המודל וה-Schema בצורה יציבה (JSON Mode)
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            items: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        id: { type: SchemaType.STRING },
                                        quantity: { type: SchemaType.NUMBER }
                                    },
                                    required: ["id", "quantity"]
                                }
                            },
                            explanation: { type: SchemaType.STRING }
                        },
                        required: ["items", "explanation"]
                    },
                },
            });

            const menuSummary = (menuItems || []).map(m => ({ 
                id: m.id, 
                name: m.name, 
                cat: m.category 
            }));

            const result = await model.generateContent(
                `אתה עוזר אישי לקייטרינג 'איילה'. המשתמש ביקש: "${prompt}". 
                זה התפריט הזמין: ${JSON.stringify(menuSummary)}.
                בנה תפריט מאוזן של 4-8 מנות עם כמויות מתאימות. 
                החזר רק את ה-JSON.`
            );

            const response = await result.response;
            const text = response.text();
            setRecommendation(JSON.parse(text));
            
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
                            className="flex-1 bg-stone-800 border border-stone-700 rounded-2xl p-4 text-white h-24 resize-none"
                        />
                        <button
                            onClick={generateRecommendation}
                            disabled={isGenerating || !prompt.trim()}
                            className="bg-gold-500 text-stone-900 font-bold rounded-2xl p-4 flex flex-col items-center justify-center gap-2"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" /> : <Send size={24} />}
                            <span className="text-xs">{t.aiGenerate}</span>
                        </button>
                    </div>

                    {recommendation && (
                        <div className="bg-stone-800/50 rounded-2xl p-6 border border-gold-500/20">
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