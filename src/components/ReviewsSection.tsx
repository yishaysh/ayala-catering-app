import React, { useState } from 'react';
import { useStore } from '../store';
import { Star, MessageSquare, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { AccessibleModal } from './AccessibleModal';
import { ApiError } from '../lib/api';

export const ReviewsSection: React.FC = () => {
  const { reviews, addReview, language } = useStore();
  const isHe = language === 'he';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / totalReviews).toFixed(1)
      : null;

  const openModal = () => {
    setSubmitError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const trimmedName = name.trim();
    const trimmedComment = comment.trim();

    if (trimmedName.length < 2) {
      setSubmitError(
        isHe
          ? 'נא להזין שם מלא (לפחות 2 תווים).'
          : 'Please enter your name (at least 2 characters).'
      );
      return;
    }
    if (trimmedComment.length < 5) {
      setSubmitError(
        isHe
          ? 'נא לכתוב כמה מילים בחוות הדעת (לפחות 5 תווים).'
          : 'Please enter at least 5 characters in your review.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addReview({
        customer_name: trimmedName,
        rating,
        comment: trimmedComment,
      });
      setSuccessMessage(
        res.message ||
          (isHe
            ? 'תודה! חוות הדעת נשלחה ותפורסם באתר לאחר אישור.'
            : 'Thank you! Your review has been submitted and will appear after moderation.')
      );
      setName('');
      setComment('');
      setRating(5);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError(
          isHe
            ? 'שליחת חוות הדעת נכשלה כרגע. נסו שוב מאוחר יותר.'
            : 'Unable to submit review right now. Please try again shortly.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStaticStars = (num: number) => (
    <div
      className="flex gap-1"
      aria-label={isHe ? `דירוג ${num} מתוך 5 כוכבים` : `${num} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          aria-hidden="true"
          className={star <= num ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}
        />
      ))}
    </div>
  );

  return (
    <section className="my-16 scroll-mt-24" id="reviews-section">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-themeText mb-2">
          {isHe ? 'חוות דעת ודירוגים' : 'Customer Reviews'}
        </h2>
        <p className="text-xs md:text-sm text-themeText/75 tracking-wider uppercase">
          {isHe ? 'מה הלקוחות שלנו אומרים עלינו' : 'What our customers say about us'}
        </p>
        <div className="w-16 h-1 bg-themePrimary mx-auto mt-4 rounded-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Card */}
        <div className="bg-themeCardBg rounded-2xl p-6 border border-themeText/15 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-5xl md:text-6xl font-bold font-serif text-themeText mb-2">
            {avgRating ?? '—'}
          </span>
          {avgRating && <div className="mb-2">{renderStaticStars(Math.round(parseFloat(avgRating)))}</div>}
          <span className="text-xs text-themeText/75 mb-6">
            {totalReviews > 0
              ? isHe
                ? `מבוסס על ${totalReviews} חוות דעת מאושרות`
                : `Based on ${totalReviews} approved reviews`
              : isHe
              ? 'טרם פורסמו חוות דעת'
              : 'No published reviews yet'}
          </span>
          <button
            type="button"
            onClick={openModal}
            className="bg-themeHeaderBg text-themeHeaderTxt px-6 py-3 rounded-xl font-bold text-sm hover:opacity-95 transition active:scale-95 shadow-md flex items-center gap-2"
          >
            <MessageSquare size={16} />
            <span>{isHe ? 'כתבו חוות דעת' : 'Write a Review'}</span>
          </button>
        </div>

        {/* Reviews List */}
        <div className="lg:col-span-2 space-y-4 max-h-[360px] overflow-y-auto pe-2 custom-scrollbar">
          {reviews.length > 0 ? (
            reviews.map((rev, idx) => (
              <article
                key={rev.id || `${rev.customer_name}-${idx}`}
                className="bg-themeCardBg rounded-xl p-5 border border-themeText/10 shadow-sm text-start space-y-2"
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="font-bold text-themeText text-sm">{rev.customer_name}</span>
                  <span className="text-xs text-themeText/65">
                    {rev.created_at
                      ? new Date(rev.created_at).toLocaleDateString(isHe ? 'he-IL' : 'en-US')
                      : ''}
                  </span>
                </div>
                <div className="py-0.5">{renderStaticStars(rev.rating)}</div>
                <p className="text-themeText/85 text-xs md:text-sm leading-relaxed">{rev.comment}</p>
              </article>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-themeText/70 py-12 bg-themeCardBg rounded-xl border border-themeText/10">
              <MessageSquare size={44} className="opacity-30 mb-3" />
              <p className="text-sm font-medium">
                {isHe
                  ? 'אין עדיין חוות דעת מאושרות. נשמח שתשתפו מהחוויה שלכם!'
                  : 'No published reviews yet. Be the first to share your experience!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Accessible Moderated Review Modal */}
      <AccessibleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        titleId="review-modal-title"
        ariaLabel={isHe ? 'כתיבת חוות דעת' : 'Write a Review'}
        closeLabel={isHe ? 'סגור' : 'Close'}
        dir={isHe ? 'rtl' : 'ltr'}
        contentClassName="bg-white text-stone-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-stone-200 relative text-start"
      >
        {successMessage ? (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700 border border-emerald-200">
              <Check size={32} />
            </div>
            <h3 id="review-modal-title" className="text-xl font-bold text-stone-900">
              {isHe ? 'תודה על השיתוף!' : 'Thank You!'}
            </h3>
            <p className="text-sm text-stone-700 leading-relaxed">{successMessage}</p>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="mt-2 px-6 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-sm"
            >
              {isHe ? 'סגירה' : 'Close'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <h3
              id="review-modal-title"
              className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2 pe-8"
            >
              <MessageSquare className="text-amber-600" size={20} />
              <span>{isHe ? 'כתיבת חוות דעת חדשה' : 'Write a Review'}</span>
            </h3>
            <p className="text-xs text-stone-600">
              {isHe
                ? 'חוות הדעת עוברות אישור קצר של איילה לפני הפרסום באתר.'
                : 'Reviews undergo a short moderation check before appearing publicly.'}
            </p>

            {submitError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2"
              >
                <AlertTriangle size={15} className="shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div>
              <label htmlFor="review-customer-name" className="block text-xs font-bold text-stone-700 mb-1">
                {isHe ? 'שם מלא *' : 'Full Name *'}
              </label>
              <input
                id="review-customer-name"
                type="text"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-600 text-sm text-stone-900"
                placeholder={isHe ? 'הכניסו את שמכם' : 'Enter your name'}
              />
            </div>

            {/* Keyboard-accessible radiogroup rating */}
            <fieldset>
              <legend className="block text-xs font-bold text-stone-700 mb-2">
                {isHe ? 'דירוג (1–5 כוכבים) *' : 'Rating (1–5 Stars) *'}
              </legend>
              <div role="radiogroup" className="flex gap-1.5" aria-label={isHe ? 'בחירת דירוג' : 'Select rating'}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = hoverRating !== null ? star <= hoverRating : star <= rating;
                  const selected = rating === star;
                  return (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={
                        isHe
                          ? `${star} ${star === 1 ? 'כוכב' : 'כוכבים'}`
                          : `${star} ${star === 1 ? 'star' : 'stars'}`
                      }
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                          e.preventDefault();
                          setRating(Math.min(5, rating + 1));
                        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                          e.preventDefault();
                          setRating(Math.max(1, rating - 1));
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600"
                    >
                      <Star
                        size={28}
                        aria-hidden="true"
                        className={filled ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}
                      />
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="review-comment" className="block text-xs font-bold text-stone-700 mb-1">
                {isHe ? 'חוות הדעת שלך *' : 'Your Review *'}
              </label>
              <textarea
                id="review-comment"
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full p-2.5 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-600 text-sm resize-none text-stone-900"
                placeholder={
                  isHe
                    ? 'כתבו מה אהבתם, איך היה השירות והטעם...'
                    : 'Tell us about the service, quality, and taste...'
                }
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-stone-900 text-white font-bold py-3 rounded-xl hover:bg-stone-800 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-md text-sm"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{isHe ? 'שליחת חוות דעת לאישור' : 'Submit Review'}</span>
            </button>
          </form>
        )}
      </AccessibleModal>
    </section>
  );
};
