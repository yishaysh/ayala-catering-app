
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

    // Initial check for key selection state
    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                // If hasKey is false, it might still work if process.env.API_KEY is injected, 
                // but for Gemini 3 models we generally prefer selected keys.
                // We'll only show the key button if a specific "Key missing" error occurs or if explicitly needed.
            }
        };
        checkKey();
    }, []);

    const handleOpenKeyDialog = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            // Assume success and clear the warning state
            setNeedsKey(false);
        }
    };

    const generateRecommendation = async () => {
        if (!prompt.trim()) return;
        
        setIsGenerating(true);
        try {
            // ALWAYS initialize right before use to get latest key
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Limit menu items to prevent context overflow while keeping variety
            const menuSummary = (menuItems || []).map(m => ({ 
                id: m.id, 
                name: m.name, 
                cat: m.category 
            })).slice(0, 50);

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Event Request: "${prompt}". 
                Our Catering Menu: ${JSON.stringify(menuSummary)}. 
                Task: Recommend 3-6 items with quantities for this event. 
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
            const errorMsg = error?.message || "";
            
            if (errorMsg.includes("API Key") || errorMsg.includes("Requested entity was not found")) {
                setNeedsKey(true);
            } else {
                alert(language === 'he' ? "שגיאה בחיבור ל-AI. אנא נסו שוב." : "AI Connection Error. Please try again.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApply = () => {
        if (!recommendation?.items) return;
        const validItems = recommendation.items
            .map(rec => {
                const item = menuItems.find(m => m.id === rec.id);
                return item ? { item, quantity: rec.quantity } : null;
            })
            .filter((x): x is { item: MenuItem, quantity: number } => x !== null);
        
        if (validItems.length > 0) {
            bulkAddToCart(validItems);
            setRecommendation(null);
            setPrompt('');
        }
    };

    return (
        <div className="bg-stone-900 border border-gold-500/30 rounded-3xl p-6 md:p-8 mb-12 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 blur-[50px] pointer-events-none"></div>
            
            <div className="flex items-center gap-3 mb-6 text-start">
                <div className="p-2 bg-gold-500/20 rounded-lg text-gold-500">
                    <Sparkles size={24} className="animate-pulse" />
                </div>
                <div>
                    <h3 className="text-xl md:text-2xl font-serif font-bold text-white">{t.aiTitle}</h3>
                    <p className="text-stone-400 text-sm">{language === 'he' ? 'תנו לבינה המלאכותית לתכנן לכם אירוע מושלם' : 'Let AI plan your perfect event'}</p>
                </div>
            </div>

            {needsKey ? (
                <div className="bg-stone-800 border border-gold-500/20 rounded-2xl p-6 text-center animate-zoom-in">
                    <div className="inline-flex p-3 bg-gold-500/10 rounded-full text-gold-500 mb-4">
                        <Key size={24} />
                    </div>
                    <h4 className="text-white font-bold mb-2">חיבור API נדרש</h4>
                    <p className="text-stone-400 text-sm mb-6 max-w-xs mx-auto">
                        כדי להשתמש ב-AI, יש לבחור מפתח API מהפרויקט שלך.
                    </p>
                    <button 
                        onClick={handleOpenKeyDialog}
                        className="bg-gold-500 text-stone-900 font-bold px-6 py-2 rounded-full hover:bg-gold-400 transition"
                    >
                        חבר מפתח
                    </button>
                    <div className="mt-4">
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-stone-500 hover:text-gold-500 underline uppercase tracking-widest">מידע על חיוב (Billing Docs)</a>
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
                            <span className="text-xs uppercase tracking-tighter">{isGenerating ? t.aiApplying : t.aiGenerate}</span>
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
