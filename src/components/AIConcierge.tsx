import React, { useState, useEffect } from 'react';
import { useStore, translations, Translations } from '../store';
import { Sparkles, Loader2, Send, CheckCircle2, Key, ExternalLink } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { MenuItem } from '../types';

export const AIConcierge: React.FC = () => {
    const { language, menuItems, bulkAddToCart } = useStore();
    const t: Translations = (translations[language] || translations['he']) as Translations;
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [recommendation, setRecommendation] = useState<{ items: { id: string, quantity: number }[], explanation: string } | null>(null);
    const [needsKey, setNeedsKey] = useState(false);

    // Use Vite-specific env variable
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

    useEffect(() => {
        const checkKeyStatus = async () => {
            // If we are in AI Studio preview
            if (window.aistudio) {
                try {
                    const hasKey = await window.aistudio.hasSelectedApiKey();
                    if (!hasKey && !API_KEY) {
                        setNeedsKey(true);
                    }
                } catch (e) {
                    console.error("AI Studio key check failed", e);
                }
            } 
            // If deployed (Vercel), check if the env var is missing
            else if (!API_KEY) {
                setNeedsKey(true);
            }
        };
        checkKeyStatus();
    }, [API_KEY]);

    const handleConnect = async () => {
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                setNeedsKey(false);
            } catch (e) {
                console.error("Error opening key selector", e);
            }
        } else {
            // Instruction for production users
            alert(language === 'he' 
                ? "יש להגדיר מפתח API במערכת הניהול (Vercel Environment Variables)." 
                : "API Key must be configured in Vercel Environment Variables.");
        }
    };

    const generateRecommendation = async () => {
        if (!prompt.trim()) return;
        
        setIsGenerating(true);
        try {
            // Initialize with the available key
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            
            const menuSummary = (menuItems || []).map(m => ({ 
                id: m.id, 
                name: m.name, 
                cat: m.category 
            })).slice(0, 50);

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash', // Corrected model name
                contents: `User event: "${prompt}". 
                Menu: ${JSON.stringify(menuSummary)}. 
                Suggest a balanced menu of 4-8 items with quantities. 
                Return JSON only.`,
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

            const text = response.text;
            if (text) {
                const data = JSON.parse(text.trim());
                setRecommendation(data);
                setNeedsKey(false);
            }
        } catch (error: any) {
            console.error("AI Error:", error);
            if (error?.message?.includes("API Key") || error?.message?.includes("not found")) {
                setNeedsKey(true);
            } else {
                alert(language === 'he' ? "משהו השתבש בבניית התפריט. נסו שוב." : "Something went wrong. Please try again.");
            }
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
        <div className="bg-stone-900 border border-gold-500/30 rounded-3xl p-6 md:p-8 mb-12 shadow-2xl relative overflow-hidden transition-all duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 blur-[50px] pointer-events-none"></div>
            
            <div className="flex items-center gap-3 mb-6 text-start">
                <div className="p-2 bg-gold-500/20 rounded-lg text-gold-500">
                    <Sparkles size={24} className="animate-pulse" />
                </div>
                <div>
                    <h3 className="text-xl md:text-2xl font-serif font-bold text-white">{t.aiTitle}</h3>
                    <p className="text-stone-400 text-sm">
                        {language === 'he' ? 'הקונסיירז׳ הדיגיטלי שיבנה לכם תפריט אישי' : 'The digital concierge that builds your menu'}
                    </p>
                </div>
            </div>

            {needsKey ? (
                <div className="bg-stone-800 border border-gold-500/20 rounded-2xl p-8 text-center animate-zoom-in">
                    <div className="inline-flex p-3 bg-gold-500/10 rounded-full text-gold-500 mb-4">
                        <Key size={32} />
                    </div>
                    <h4 className="text-white font-bold mb-2">חיבור מפתח API נדרש</h4>
                    <p className="text-stone-400 text-sm mb-6 max-w-sm mx-auto">
                        לצורך שימוש בבינה מלאכותית, יש להגדיר מפתח API תקין במערכת.
                    </p>
                    <button 
                        onClick={handleConnect}
                        className="bg-gold-500 text-stone-900 font-bold px-8 py-3 rounded-xl hover:bg-gold-400 transition transform active:scale-95 shadow-xl shadow-gold-500/20 flex items-center gap-2 mx-auto"
                    >
                        <span>{window.aistudio ? "חבר מפתח עכשיו" : "הדרכה להגדרת מפתח"}</span>
                    </button>
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
                            <p className="text-stone-300 text-sm mb-6 leading-relaxed italic">
                                "{recommendation.explanation}"
                            </p>
                            <button
                                onClick={handleApply}
                                className="w-full bg-white text-stone-900 font-bold py-4 rounded-xl hover:bg-stone-100 transition-colors shadow-lg active:scale-[0.98] uppercase tracking-wider"
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