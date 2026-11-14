import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import {
  Play,
  Image as ImageIcon,
  Video as VideoIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  buildCloudinaryImageSrcSet,
  toCloudinaryOptimizedImageUrl,
  toCloudinaryVideoPosterUrl,
  toPlayableCloudinaryVideoUrl,
} from '../../shared/media';
import type { GalleryItem } from '../types';
import { AccessibleModal } from './AccessibleModal';

export const EventGallery: React.FC = () => {
  const { gallery, language } = useStore();
  const isHe = language === 'he';
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video'>('all');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [retrySeed, setRetrySeed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartRef = useRef<number | null>(null);

  const filteredGallery = (gallery || []).filter((item) =>
    activeTab === 'all' ? true : item.type === activeTab
  );

  const selectedMedia: GalleryItem | null =
    selectedIndex !== null && filteredGallery[selectedIndex]
      ? filteredGallery[selectedIndex]
      : null;

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const openMedia = (idx: number) => {
    setVideoError(false);
    setRetrySeed(0);
    setSelectedIndex(idx);
    const item = filteredGallery[idx];
    if (item) {
      api.trackEvent('gallery_item_opened', { category: item.type });
    }
  };

  const closeMedia = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setSelectedIndex(null);
    setVideoError(false);
  };

  const handleNext = useCallback(() => {
    if (filteredGallery.length <= 1) return;
    setVideoError(false);
    setRetrySeed(0);
    setSelectedIndex((prev) =>
      prev === null ? null : (prev + 1) % filteredGallery.length
    );
  }, [filteredGallery.length]);

  const handlePrev = useCallback(() => {
    if (filteredGallery.length <= 1) return;
    setVideoError(false);
    setRetrySeed(0);
    setSelectedIndex((prev) =>
      prev === null
        ? null
        : (prev - 1 + filteredGallery.length) % filteredGallery.length
    );
  }, [filteredGallery.length]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (isHe) handleNext();
        else handlePrev();
      } else if (e.key === 'ArrowRight') {
        if (isHe) handlePrev();
        else handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedIndex, isHe, handleNext, handlePrev]);

  if (!gallery || gallery.length === 0) return null;

  const selectedCaption = selectedMedia
    ? isHe
      ? selectedMedia.caption
      : selectedMedia.caption_en || selectedMedia.caption
    : '';
  const selectedYtId =
    selectedMedia?.type === 'video' ? getYoutubeId(selectedMedia.url) : null;
  const playableVideoUrl =
    selectedMedia?.type === 'video' && !selectedYtId
      ? toPlayableCloudinaryVideoUrl(selectedMedia.url)
      : '';
  const modalPosterUrl =
    selectedMedia?.type === 'video' && !selectedYtId
      ? toCloudinaryVideoPosterUrl(selectedMedia.url, 960)
      : '';

  return (
    <section className="my-16 scroll-mt-24" id="gallery-section" aria-labelledby="gallery-heading">
      <div className="text-center mb-8">
        <h2
          id="gallery-heading"
          className="text-3xl md:text-4xl font-serif font-bold text-themePrimary mb-2"
        >
          {isHe ? 'צילומי וסרטוני אירועים' : 'Event Gallery'}
        </h2>
        <p className="text-xs md:text-sm text-themeText/80 tracking-wider uppercase">
          {isHe
            ? 'טעימה קטנה מהאירועים המפנקים שלנו'
            : 'A small taste of our catering events'}
        </p>
        <div className="w-16 h-1 bg-themePrimary mx-auto mt-4 rounded-full" />
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center gap-3 mb-8" role="group" aria-label={isHe ? 'סינון גלריה' : 'Gallery filter'}>
        {(['all', 'image', 'video'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-xs md:text-sm font-bold rounded-full transition-colors border focus-visible:outline focus-visible:outline-2 focus-visible:outline-themePrimary ${isActive
                ? 'bg-themeHeaderBg text-themeHeaderTxt border-themeHeaderBg shadow-md'
                : 'bg-themeCardBg text-themeText border-themeText/20 hover:border-themePrimary'
                }`}
            >
              {tab === 'all' && (isHe ? 'הכל' : 'All')}
              {tab === 'image' && (isHe ? 'תמונות' : 'Photos')}
              {tab === 'video' && (isHe ? 'סרטונים' : 'Videos')}
            </button>
          );
        })}
      </div>

      {/* Gallery Grid — lightweight posters only for video cards (zero multi-MB video preload) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredGallery.map((item, idx) => {
          const ytId = item.type === 'video' ? getYoutubeId(item.url) : null;
          const caption = isHe ? item.caption : item.caption_en || item.caption;
          const thumbUrl = ytId
            ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
            : item.type === 'video'
              ? toCloudinaryVideoPosterUrl(item.url, 640) || item.url
              : toCloudinaryOptimizedImageUrl(item.url, 640);
          const srcSet = item.type === 'image' ? buildCloudinaryImageSrcSet(item.url, [360, 640]) : undefined;
          const altLabel =
            caption ||
            (item.type === 'video'
              ? isHe
                ? `סרטון אירוע ${idx + 1}`
                : `Event video ${idx + 1}`
              : isHe
                ? `תמונת אירוע ${idx + 1}`
                : `Event photo ${idx + 1}`);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openMedia(idx)}
              aria-label={
                item.type === 'video'
                  ? isHe
                    ? `צפייה בסרטון: ${altLabel}`
                    : `Play video: ${altLabel}`
                  : isHe
                    ? `הגדלת תמונה: ${altLabel}`
                    : `View photo: ${altLabel}`
              }
              className="group relative aspect-[4/3] w-full text-start bg-themeCardBg rounded-xl overflow-hidden border border-themeText/15 hover:border-themePrimary hover:shadow-xl transition-all duration-300 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-themePrimary"
            >
              {thumbUrl && !(item.type === 'video' && thumbUrl === item.url && !ytId) ? (
                <img
                  src={thumbUrl}
                  srcSet={srcSet}
                  sizes="(max-width: 768px) 50vw, 25vw"
                  alt={altLabel}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-themeHeaderBg text-themeHeaderTxt">
                  <VideoIcon size={36} aria-hidden="true" />
                </div>
              )}

              {caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5">
                  <p className="text-white text-xs font-bold truncate">{caption}</p>
                </div>
              )}

              <div
                aria-hidden="true"
                className="absolute top-2 end-2 p-1.5 rounded-lg bg-black/60 text-white"
              >
                {item.type === 'video' ? <VideoIcon size={14} /> : <ImageIcon size={14} />}
              </div>

              {item.type === 'video' && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center bg-black/15 group-hover:bg-black/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-themeHeaderBg text-themeHeaderTxt border-2 border-white/80 flex items-center justify-center shadow-lg">
                    <Play size={20} fill="currentColor" className="translate-x-0.5" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Accessible Portaled Lightbox (escapes header/main stacking contexts cleanly) */}
      <AccessibleModal
        isOpen={Boolean(selectedMedia)}
        onClose={closeMedia}
        ariaLabel={selectedCaption || (isHe ? 'תצוגת מדיה מוגדלת' : 'Media Lightbox')}
        closeLabel={isHe ? 'סגור תצוגה' : 'Close gallery view'}
        dir={isHe ? 'rtl' : 'ltr'}
        overlayClassName="bg-black/90 backdrop-blur-md p-3 sm:p-6"
        contentClassName="relative max-w-4xl w-full flex flex-col items-center justify-center gap-3 outline-none"
        showCloseButton={true}
      >
        {selectedMedia && (
          <div
            className="w-full flex flex-col items-center gap-3 pt-10 sm:pt-6"
            onTouchStart={(e) => {
              touchStartRef.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartRef.current === null || filteredGallery.length <= 1) return;
              const diff = touchStartRef.current - e.changedTouches[0].clientX;
              touchStartRef.current = null;
              if (Math.abs(diff) > 45) {
                if (diff > 0) handleNext();
                else handlePrev();
              }
            }}
          >
            {selectedMedia.type === 'video' ? (
              selectedYtId ? (
                <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedYtId}?autoplay=1`}
                    title={selectedCaption || 'YouTube video player'}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : videoError ? (
                <div className="w-full max-w-lg bg-themeCardBg text-themeText rounded-2xl p-6 text-center space-y-4 shadow-xl">
                  <AlertCircle className="mx-auto text-red-700" size={32} />
                  <p className="text-sm font-bold">
                    {isHe
                      ? 'הסרטון לא נטען בדפדפן זה. ניתן לנסות שוב או לפתוח אותו ישירות.'
                      : 'Video could not play in this browser. You can retry or open it directly.'}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVideoError(false);
                        setRetrySeed((s) => s + 1);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-themePrimary text-white text-sm font-bold"
                    >
                      <RotateCcw size={16} />
                      {isHe ? 'ניסיון חוזר' : 'Retry'}
                    </button>
                    <a
                      href={playableVideoUrl || selectedMedia.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-themeText/25 text-themeText text-sm font-bold hover:bg-themeText/5"
                    >
                      <ExternalLink size={16} />
                      {isHe ? 'פתיחת סרטון בחלון חדש' : 'Open video'}
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full flex justify-center bg-black/60 rounded-xl overflow-hidden shadow-2xl">
                  <video
                    key={`${playableVideoUrl}-${retrySeed}`}
                    ref={videoRef}
                    controls
                    playsInline
                    preload="metadata"
                    poster={modalPosterUrl || undefined}
                    onError={() => setVideoError(true)}
                    className="max-w-full max-h-[72vh] w-auto h-auto rounded-xl"
                  >
                    {playableVideoUrl && <source src={playableVideoUrl} type="video/mp4" />}
                    {selectedMedia.url && selectedMedia.url !== playableVideoUrl && (
                      <source src={selectedMedia.url} />
                    )}
                  </video>
                </div>
              )
            ) : (
              <img
                src={toCloudinaryOptimizedImageUrl(selectedMedia.url, 1280)}
                alt={selectedCaption || (isHe ? 'תמונת אירוע' : 'Event photo')}
                className="max-w-full max-h-[72vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
              />
            )}

            {selectedCaption && (
              <div className="text-center text-white text-sm font-bold bg-black/70 px-4 py-2 rounded-lg max-w-lg">
                {selectedCaption}
              </div>
            )}

            {filteredGallery.length > 1 && (
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label={isHe ? 'הפריט הקודם' : 'Previous media'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/25 transition-colors"
                >
                  <ChevronRight size={16} className={isHe ? '' : 'rotate-180'} />
                  {isHe ? 'הקודם' : 'Previous'}
                </button>
                <span className="text-white/90 text-xs font-mono" aria-live="polite">
                  {selectedIndex! + 1} / {filteredGallery.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={isHe ? 'הפריט הבא' : 'Next media'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/25 transition-colors"
                >
                  {isHe ? 'הבא' : 'Next'}
                  <ChevronLeft size={16} className={isHe ? '' : 'rotate-180'} />
                </button>
              </div>
            )}
          </div>
        )}
      </AccessibleModal>
    </section>
  );
};
