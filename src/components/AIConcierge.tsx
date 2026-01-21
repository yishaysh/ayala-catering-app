
import React, { useState, useEffect } from 'react';
import { useStore, translations, Translations } from '../store';
import { Sparkles, Loader2, Send, AlertCircle, RefreshCw } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { MenuItem } from '../types';

export const AIConcierge: React.FC = () => {
    const { language, menuItems, bulkAddToCart } = useStore();
    const t: Translations = (translations[language] || translations['he']) as Translations;
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [recommendation, setRecommendation] = useState<{ items: { id: string, quantity: number }[], explanation: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [needsKey, setNeedsKey] = useState(false);

    // משיכת המפתח מתוך משתני הסביבה של Vite (Vercel)
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
        
        const menuSummary = (menuItems || []).map(m => ({ 
            id: m.id, 
            name: m.name, 
            cat: m.category 
        }));

        const fullPrompt = `
            תפקידך: יועץ קולינרי לקייטרינג "איילה פשוט טעים".
            בקשת המשתמש: "${prompt}".
            תפריט זמין: ${JSON.stringify(menuSummary)}.

            הוראות:
            1. אם הבקשה אינה קשורה לאוכל, אירועים או קייטרינג, או אם היא לא ברורה/ג'יבריש:
               - החזר רשימת 'items' ריקה [].
               - ב-'explanation' כתוב הודעה מנומסת בעברית שמסבירה שלא הבנת את הבקשה ומבקשת מהמשתמש לתאר את האירוע (למשל: סוג האירוע, כמות אנשים, העדפות).
            
            2. אם הבקשה תקינה:
               - בחר 4-8 מנות מתאימות מהתפריט.
               - קבע כמויות הגיוניות לאירוע סטנדרטי (אלא אם צוינה כמות אנשים).
               - החזר את המנות ב-'items'.
               - ב-'explanation' כתוב הסבר קצר ומזמין בעברית על בחירת התפריט.

            החזר JSON בלבד לפי הסכמה המוגדרת.
        `;

        while (attempt < MAX_RETRIES && !success) {
            try {
                attempt++;
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
