import React, { useState } from 'react';
import { useStore, translations } from '../store';
import { Star, MessageSquare, X, Check, Award } from 'lucide-react';
import { useBackButton } from '../hooks/useBackButton';

export const ReviewsSection: React.FC = () => {
    const { reviews, addReview, language } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const [comment, setComment] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    useBackButton(isModalOpen, () => setIsModalOpen(false));

    // Calculate rating stats
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1) 
        : "5.0";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !comment.trim()) return;

        await addReview({
            customer_name: name,
            rating,
            comment
        });

        setIsSuccess(true);
        setName('');
        setComment('');
        setRating(5);
        
        setTimeout(() => {
            setIsSuccess(false);
            setIsModalOpen(false);
        }, 1500);
    };

    const renderStars = (num: number, interactive = false) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                    const filled = interactive 
                        ? (hoverRating !== null ? star <= hoverRating : star <= rating)
                        : star <= num;
                    return (
                        <Star 
                            key={star}
                            size={interactive ? 28 : 16}
                            onClick={() => interactive && setRating(star)}
                            onMouseEnter={() => interactive && setHoverRating(star)}
                            onMouseLeave={() => interactive && setHoverRating(null)}
                            className={`
                                ${filled ? 'fill-gold-500 text-gold-500' : 'text-stone-300'}
                                ${interactive ? 'cursor-pointer hover:scale-110 active:scale-95 transition-all' : ''}
                            `}
                        />
                    );
                })}
            </div>
        );
    };

    return (
        <section className="my-16 scroll-mt-24" id="reviews-section">
            <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-themePrimary mb-2">
                    {language === 'he' ? 'חוות דעת ודירוגים' : 'Customer Reviews'}
                </h2>
                <p className="text-xs md:text-sm text-themeText/75 tracking-wider uppercase">
                    {language === 'he' ? 'מה הלקוחות שלנו אומרים עלינו' : 'What our customers say about us'}
                </p>
                <div className="w-16 h-1 bg-themePrimary mx-auto mt-4 rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Card */}
                <div className="bg-themeCardBg rounded-2xl p-6 border border-themeText/5 shadow-sm flex flex-col items-center justify-center text-center">
                    <span className="text-5xl md:text-6xl font-bold font-serif text-themeText mb-2">{avgRating}</span>
                    <div className="mb-2">{renderStars(Math.round(parseFloat(avgRating)))}</div>
                    <span className="text-xs text-themeText/60 mb-6">
                        {language === 'he' ? `מבוסס על ${totalReviews} חוות דעת` : `Based on ${totalReviews} reviews`}
                    </span>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-themeHeaderBg text-themePrimary px-6 py-3 rounded-xl font-bold text-sm hover:bg-themePrimary hover:text-themeHeaderBg transition-all duration-200 active:scale-95 shadow-md flex items-center gap-2"
                    >
                        <MessageSquare size={16} />
                        <span>{language === 'he' ? 'כתבו חוות דעת' : 'Write a Review'}</span>
                    </button>
                </div>

                {/* Reviews List */}
                <div className="lg:col-span-2 space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {reviews.length > 0 ? (
                        reviews.map((rev) => (
                            <div key={rev.id} className="bg-themeCardBg rounded-xl p-5 border border-themeText/5 shadow-sm text-start space-y-2 hover:border-themePrimary/20 transition-all">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-themeText text-sm">{rev.customer_name}</span>
                                    <span className="text-[10px] text-themeText/40">
                                        {rev.created_at ? new Date(rev.created_at).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US') : ''}
                                    </span>
                                </div>
                                <div className="py-0.5">{renderStars(rev.rating)}</div>
                                <p className="text-themeText/80 text-xs md:text-sm leading-relaxed">{rev.comment}</p>
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-themeText/45 py-12 bg-themeCardBg rounded-xl border border-themeText/5">
                            <MessageSquare size={48} className="opacity-20 mb-3" />
                            <p className="text-sm font-medium">
                                {language === 'he' ? 'אין עדיין חוות דעת. תהיו הראשונים לכתוב!' : 'No reviews yet. Be the first to share your thoughts!'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Write Review Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-zoom-in" dir={language === 'he' ? 'rtl' : 'ltr'}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-start flex flex-col" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 bg-stone-100 p-1.5 rounded-full"
                        >
                            <X size={16} />
                        </button>

                        {isSuccess ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 border border-green-200">
                                    <Check size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-stone-900">
                                    {language === 'he' ? 'תודה רבה!' : 'Thank You!'}
                                </h3>
                                <p className="text-sm text-stone-500">
                                    {language === 'he' ? 'חוות הדעת שלך התקבלה בהצלחה.' : 'Your review has been successfully submitted.'}
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <h3 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                                    <MessageSquare className="text-gold-500" size={20} />
                                    <span>{language === 'he' ? 'כתיבת חוות דעת חדשה' : 'Write a Review'}</span>
                                </h3>
                                <div className="w-full h-[1px] bg-stone-100"></div>

                                {/* Name Input */}
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 mb-1">
                                        {language === 'he' ? 'שם מלא' : 'Full Name'}
                                    </label>
                                    <input 
                                        type="text" 
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full p-2.5 border border-stone-200 rounded-xl focus:outline-none focus:border-gold-500 text-sm text-stone-900"
                                        placeholder={language === 'he' ? 'הכניסו את שמכם' : 'Enter your name'}
                                    />
                                </div>

                                {/* Star Select */}
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 mb-2">
                                        {language === 'he' ? 'דירוג (1-5 כוכבים)' : 'Rating (1-5 Stars)'}
                                    </label>
                                    <div className="flex justify-start">{renderStars(rating, true)}</div>
                                </div>

                                {/* Text Comment */}
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 mb-1">
                                        {language === 'he' ? 'חוות הדעת שלך' : 'Your Review'}
                                    </label>
                                    <textarea 
                                        required
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        rows={4}
                                        maxLength={500}
                                        className="w-full p-2.5 border border-stone-200 rounded-xl focus:outline-none focus:border-gold-500 text-sm resize-none text-stone-900"
                                        placeholder={language === 'he' ? 'כתבו מה אהבתם, איך היה השירות והטעם...' : 'Tell us about the service, quality, and taste...'}
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-stone-900 text-gold-500 font-bold py-3 rounded-xl hover:bg-stone-800 transition flex items-center justify-center gap-2 active:scale-95 shadow-md text-sm"
                                >
                                    {language === 'he' ? 'שלח חוות דעת' : 'Submit Review'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};
