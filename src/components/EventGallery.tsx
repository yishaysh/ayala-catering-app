import React, { useState } from 'react';
import { useStore, translations } from '../store';
import { Play, X, Image as ImageIcon, Video as VideoIcon, Film } from 'lucide-react';
import { useBackButton } from '../hooks/useBackButton';

export const EventGallery: React.FC = () => {
    const { gallery, language } = useStore();
    const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video'>('all');
    const [selectedMedia, setSelectedMedia] = useState<{ type: 'image' | 'video'; url: string; caption?: string } | null>(null);

    useBackButton(!!selectedMedia, () => setSelectedMedia(null));

    if (!gallery || gallery.length === 0) return null;

    const filteredGallery = gallery.filter(item => {
        if (activeTab === 'all') return true;
        return item.type === activeTab;
    });

    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    return (
        <section className="my-16 scroll-mt-24" id="gallery-section">
            <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-themePrimary mb-2">
                    {language === 'he' ? 'צילומי וסרטוני אירועים' : 'Event Gallery'}
                </h2>
                <p className="text-xs md:text-sm text-themeText/75 tracking-wider uppercase">
                    {language === 'he' ? 'טעימה קטנה מהאירועים המפנקים שלנו' : 'A small taste of our luxurious catering events'}
                </p>
                <div className="w-16 h-1 bg-themePrimary mx-auto mt-4 rounded-full"></div>
            </div>

            {/* Filter Tabs */}
            <div className="flex justify-center gap-3 mb-8">
                {(['all', 'image', 'video'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`
                            px-5 py-2 text-xs md:text-sm font-bold rounded-full transition-all duration-300 border
                            ${activeTab === tab
                                ? 'bg-themeHeaderBg text-themePrimary border-themeHeaderBg shadow-md'
                                : 'bg-themeCardBg text-themeText/70 border-themeText/10 hover:border-themePrimary hover:text-themeText'
                            }
                        `}
                    >
                        {tab === 'all' && (language === 'he' ? 'הכל' : 'All')}
                        {tab === 'image' && (language === 'he' ? 'תמונות' : 'Photos')}
                        {tab === 'video' && (language === 'he' ? 'סרטונים' : 'Videos')}
                    </button>
                ))}
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredGallery.map(item => {
                    const ytId = item.type === 'video' ? getYoutubeId(item.url) : null;
                    const thumbUrl = ytId 
                        ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
                        : item.url;

                    return (
                        <div
                            key={item.id}
                            onClick={() => setSelectedMedia({ type: item.type, url: item.url, caption: item.caption })}
                            className="group relative aspect-[4/3] bg-themeCardBg rounded-xl overflow-hidden border border-themeText/5 hover:border-themePrimary/40 hover:shadow-xl transition-all duration-300 cursor-pointer shadow-sm"
                        >
                            {item.type === 'video' && !ytId ? (
                                <video
                                    src={item.url}
                                    preload="metadata"
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <img
                                    src={thumbUrl}
                                    alt={item.caption || "gallery item"}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                {item.caption && (
                                    <p className="text-white text-xs font-bold truncate w-full">{item.caption}</p>
                                )}
                            </div>

                            {/* Badge */}
                            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 backdrop-blur-md text-white z-10">
                                {item.type === 'video' ? <VideoIcon size={14} /> : <ImageIcon size={14} />}
                            </div>

                            {/* Play Overlay */}
                            {item.type === 'video' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/35 transition-colors">
                                    <div className="w-12 h-12 rounded-full bg-themePrimary text-themeHeaderBg flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                        <Play size={20} fill="currentColor" className="translate-x-0.5" />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Lightbox / Video Player Modal */}
            {selectedMedia && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in p-4"
                    onClick={() => setSelectedMedia(null)}
                >
                    <button
                        onClick={() => setSelectedMedia(null)}
                        className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors z-[210]"
                    >
                        <X size={32} />
                    </button>

                    <div className="relative max-w-4xl w-full max-h-[85vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                        {selectedMedia.type === 'video' ? (
                            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
                                {getYoutubeId(selectedMedia.url) ? (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${getYoutubeId(selectedMedia.url)}?autoplay=1`}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                        className="w-full h-full"
                                    ></iframe>
                                ) : (
                                    <video
                                        src={selectedMedia.url}
                                        controls
                                        autoPlay
                                        className="w-full h-full object-contain"
                                    ></video>
                                )}
                            </div>
                        ) : (
                            <img
                                src={selectedMedia.url}
                                alt="zoomed gallery media"
                                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl animate-zoom-in"
                            />
                        )}
                        {selectedMedia.caption && (
                            <div className="mt-4 text-center text-white font-bold bg-black/55 backdrop-blur-md px-4 py-2 rounded-lg max-w-lg">
                                {selectedMedia.caption}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};
