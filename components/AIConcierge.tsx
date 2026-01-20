
import React, { useState } from 'react';
import { useStore, translations, Translations } from '../store';
import { Sparkles, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { MenuItem } from '../types';

export const AIConcierge: React.FC = () => {
    const { language, menuItems, bulkAddToCart } = useStore();
    const t: Translations = translations[language] || translations['he'];
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [recommendation, setRecommendation] = useState<{ items: { id: string, quantity: number }[], explanation: string } | null>(null);

    const generateRecommendation = async () => {
        if (!prompt.trim()) return;
        if (!process.env.API_KEY) {
            console.error("API KEY is missing");
            return;
        }
        
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const menuSummary = (menuItems || []).map(m => ({ id: m.id, name: m.name, price: m.price, cat: m.category })).slice(0, 50);

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `User event: "${prompt}". Menu: ${JSON.stringify(menuSummary)}. Recommend dishes + quantities. JSON ONLY.`,
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

            if (response.text) {
                const data = JSON.parse(response.text.trim());
                setRecommendation(data);
            }
        } catch (error) {
            console.error("AI Error:", error);
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
            <div className="flex items-center gap-3 mb-6 text-start">
                <div className="p-2 bg-gold-500/20 rounded-lg text-gold-500"><Sparkles size={24} className="animate-pulse" /></div>
                <div>
                    <h3 className="text-xl md:text-2xl font-serif font-bold text-white">{t.aiTitle}</h3>
                    <p className="text-stone-400 text-sm">{language === 'he' ? 'תנו לבינה המלאכותית לתכנן לכם אירוע מושלם' : 'Let AI plan your perfect event'}</p>
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t.aiPlaceholder}
                    className="flex-1 bg-stone-800 border border-stone-700 rounded-2xl p-4 text-white placeholder-stone-500 focus:outline-none focus:border-gold-500 transition-colors h-24 resize-none text-start"
                />
                <button
                    onClick={generateRecommendation}
                    disabled={isGenerating || !prompt.trim()}
                    className="md:w-32 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-stone-900 font-bold rounded-2xl transition-all active:scale-95 flex flex-col items-center justify-center p-4 gap-2 shadow-lg"
                >
                    {isGenerating ? <Loader2 className="animate-spin" /> : <Send size={24} />}
                    <span className="text-xs uppercase tracking-tighter">{t.aiGenerate}</span>
                </button>
            </div>
            {recommendation && (
                <div className="bg-stone-800/50 rounded-2xl p-6 animate-slide-in-top border border-gold-500/20 text-start">
                    <h4 className="text-gold-500 font-bold mb-2 flex items-center gap-2"><CheckCircle2 size={18} />{t.aiExplanation}</h4>
                    <p className="text-stone-300 text-sm mb-6 leading-relaxed">{recommendation.explanation}</p>
                    <button onClick={handleApply} className="w-full bg-white text-stone-900 font-bold py-4 rounded-xl hover:bg-stone-100 transition-colors shadow-lg active:scale-[0.98]">{t.aiApply}</button>
                </div>
            )}
        </div>
    );
};
