
import React, { useState } from 'react';
import { useStore, translations } from '../store';
import { Sparkles, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { MenuItem } from '../types';

export const AIConcierge: React.FC = () => {
    const { language, menuItems, bulkAddToCart } = useStore();
    const t = translations[language];
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [recommendation, setRecommendation] = useState<{ items: { id: string, quantity: number }[], explanation: string } | null>(null);

    const generateRecommendation = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            // Correct initialization as per Google GenAI SDK rules
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Minimal menu context to keep tokens low and relevant
            const menuSummary = (menuItems || []).map(m => ({ id: m.id, name: m.name, price: m.price, cat: m.category })).slice(0, 40);

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `User event description: "${prompt}". Based on this catering menu: ${JSON.stringify(menuSummary)}, recommend a balanced selection of dishes and their quantities for this specific event. Return ONLY a valid JSON object matching the provided schema.`,
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
                                        id: { type: Type.STRING, description: "The ID of the menu item" },
                                        quantity: { type: Type.NUMBER, description: "Suggested quantity for this item" }
                                    },
                                    required: ["id", "quantity"]
                                }
                            },
                            explanation: { type: Type.STRING, description: "Brief explanation of why these items were chosen based on the user's description" }
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
            alert(language === 'he' ? "שגיאה בתקשורת עם ה-AI. אנא נסו שוב מאוחר יותר." : "Error communicating with AI. Please try again later.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApply = () => {
        if (!recommendation || !recommendation.items) return;
        const validItems = recommendation.items
            .map(rec => {
                const item = menuItems.find(m => m.id === rec.id);
                return item ? { item, quantity: rec.quantity } : null;
            })
            .filter(x => x !== null) as { item: MenuItem, quantity: number }[];
        
        if (validItems.length > 0) {
            bulkAddToCart(validItems);
            setRecommendation(null);
            setPrompt('');
        }
    };

    return (
        <div className="bg-stone-900 border border-gold-500/30 rounded-3xl p-6 md:p-8 mb-12 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 blur-[50px] pointer-events-none group-hover:bg-gold-500/10 transition-all duration-500"></div>
            
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gold-500/20 rounded-lg text-gold-500">
                    <Sparkles size={24} className="animate-pulse" />
                </div>
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
                    className="flex-1 bg-stone-800 border border-stone-700 rounded-2xl p-4 text-white placeholder-stone-500 focus:outline-none focus:border-gold-500 transition-colors h-24 resize-none"
                />
                <button
                    onClick={generateRecommendation}
                    disabled={isGenerating || !prompt.trim()}
                    className="md:w-32 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-stone-900 font-bold rounded-2xl transition-all active:scale-95 flex flex-col items-center justify-center p-4 gap-2 shadow-lg shadow-gold-500/10"
                >
                    {isGenerating ? <Loader2 className="animate-spin" /> : <Send size={24} />}
                    <span className="text-xs uppercase tracking-tighter">{t.aiGenerate}</span>
                </button>
            </div>

            {recommendation && (
                <div className="bg-stone-800/50 rounded-2xl p-6 animate-slide-in-top border border-gold-500/20">
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
        </div>
    );
};
