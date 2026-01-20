
import React, { useState, useEffect } from 'react';
import { useStore, translations, Translations } from '../store';
import { Sparkles, Loader2, Send, CheckCircle2, Key } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { MenuItem } from '../types';

export const AIConcierge: React.FC = () => {
    const { language, menuItems, bulkAddToCart } = useStore();
    const t: Translations = translations[language] || translations['he'];
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [recommendation, setRecommendation] = useState<{ items: { id: string, quantity: number }[], explanation: string } | null>(null);
    const [needsKey, setNeedsKey] = useState(false);

    // Check if the user has already selected an API key. 
    // Gemini 3 models require a paid project key for full functionality in some contexts.
    useEffect(() => {
        const checkKeyStatus = async () => {
            if (window.aistudio) {
                try {
                    const hasKey = await window.aistudio.hasSelectedApiKey();
                    if (!hasKey && !process.env.API_KEY) {
                        setNeedsKey(true);
                    }
                } catch (e) {
                    console.error("Error checking API key status:", e);
                }
            }
        };
        checkKeyStatus();
    }, []);

    const handleOpenKeyDialog = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            // Proceed to the app immediately after triggering the dialog to avoid race conditions.
            setNeedsKey(false);
        }
    };

    const generateRecommendation = async () => {
        if (!prompt.trim()) return;
        
        setIsGenerating(true);
        try {
            // Re-initialize to ensure it uses the latest API key injected into process.env.API_KEY
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Provide a condensed menu context to the model
            const menuSummary = (menuItems || []).map(m => ({ 
                id: m.id, 
                name: m.name, 
                cat: m.category 
            })).slice(0, 50);

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `User event request: "${prompt}". 
                Available catering items: ${JSON.stringify(menuSummary)}. 
                Task: Suggest a menu of 3-7 items with appropriate quantities based on the request. 
                Output must be JSON only.`,
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
                    }
                }
            });

            const responseText = response.text;
            if (responseText) {
                const data = JSON.parse(responseText.trim());
                setRecommendation(data);
                setNeedsKey(false);
            }
        } catch (error: any) {
            console.error("AI Generation Error:", error);
            const msg = error?.message || "";
            // Handle specific API key errors by prompting selection
            if (msg.includes("API Key") || msg.includes("Requested entity was not found")) {
                setNeedsKey(true);
            } else {
                alert(language === 'he' 
                    ? "חלה שגיאה בתקשורת עם ה-AI. נסו שוב בעוד רגע." 
                    : "Communication error with AI. Please try again in a moment.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApply = () => {
        if (!recommendation?.items) return;
        const itemsToBulkAdd = recommendation.items
            .map(rec => {
                const item = menuItems.find(m => m.id === rec.id);
                return item ? { item, quantity: rec.quantity } : null;
            })
            .filter((x): x is { item: MenuItem, quantity: number } => x !== null);
        
        if (itemsToBulkAdd.length > 0) {
            bulkAddToCart(itemsToBulkAdd);
            setRecommendation(null);
            setPrompt('');
        }
    };

    return (
        <div className="bg-stone-900 border border-gold-500/30 rounded-3xl p-6 md:p-8 mb-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 blur-[50px] pointer-events-none"></div>
            
            <div className="flex items-center gap-3 mb-6 text-start">
                <div className="p-2 bg-gold-500/20 rounded-lg text-gold-500">
                    <Sparkles size={24} className="animate-pulse" />
                </div>
                <div>
                    <h3 className="text-xl md:text-2xl font-serif font-bold text-white">{t.aiTitle}</h3>
                    <p className="text-stone-400 text-sm">
                        {language === 'he' ? 'תכנון אירוע חכם בלחיצת כפתור' : 'Smart event planning at your fingertips'}
                    </p>
                </div>
            </div>

            {needsKey ? (
                <div className="bg-stone-800 border border-gold-500/20 rounded-2xl p-8 text-center animate-zoom-in">
                    <div className="inline-flex p-3 bg-gold-500/10 rounded-full text-gold-500 mb-4">
                        <Key size={32} />
                    </div>
                    <h4 className="text-white font-bold mb-2">נדרש חיבור מפתח API</h4>
                    <p className="text-stone-400 text-sm mb-6 max-w-sm mx-auto">
                        כדי להשתמש בשירותי הבינה המלאכותית המתקדמים של Gemini 3, עליך לחבר מפתח API מהפרויקט שלך.
                    </p>
                    <button 
                        onClick={handleOpenKeyDialog}
                        className="bg-gold-500 text-stone-900 font-bold px-8 py-3 rounded-xl hover:bg-gold-400 transition transform active:scale-95 shadow-lg shadow-gold-500/20"
                    >
                        חבר מפתח עכשיו
                    </button>
                    <div className="mt-4">
                        <a 
                            href="https://ai.google.dev/gemini-api/docs/billing" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-stone-500 hover:text-gold-500 underline uppercase tracking-widest"
                        >
                            מידע על הגדרת חיוב (Billing Docs)
                        </a>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={t.aiPlaceholder}
                            className="flex-1 bg-stone-800 border border-stone-700 rounded-2xl p-4 text-white placeholder-stone-500 focus:outline-none focus:border-gold-500 transition-colors h-24 resize-none text-start shadow-inner"
                        />
                        <button
                            onClick={generateRecommendation}
                            disabled={isGenerating || !prompt.trim()}
                            className="md:w-32 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-stone-900 font-bold rounded-2xl transition-all active:scale-95 flex flex-col items-center justify-center p-4 gap-2 shadow-lg"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" /> : <Send size={24} />}
                            <span className="text-xs uppercase tracking-tighter">
                                {isGenerating ? t.aiApplying : t.aiGenerate}
                            </span>
                        </button>
                    </div>

                    {recommendation && (
                        <div className="bg-stone-800/50 rounded-2xl p-6 animate-slide-in-top border border-gold-500/20 text-start">
                            <h4 className="text-gold-500 font-bold mb-2 flex items-center gap-2">
                                <CheckCircle2 size={18} />
                                {t.aiExplanation}
                            </h4>
                            <p className="text-stone-300 text-sm mb-6 leading-relaxed">
                                {recommendation.explanation}
                            </p>
                            <button
                                onClick={handleApply}
                                className="w-full bg-white text-stone-900 font-bold py-4 rounded-xl hover:bg-stone-100 transition-colors shadow-lg active:scale-[0.98]"
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
