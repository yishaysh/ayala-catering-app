import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Play, X, Image as ImageIcon, Video as VideoIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBackButton } from '../hooks/useBackButton';

export const EventGallery: React.FC = () => {
    const { gallery, language } = useStore();
    const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video'>('all');
    const [selectedMedia, setSelectedMedia] = useState<{ type: 'image' | 'video'; url: string; caption?: string } | null>(null);
    const [slideDirection, setSlideDirection] = useState<'right' | 'left' | 'none'>('none');
    const modalContainerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const touchStartRef = useRef<number | null>(null);
    const isSwipingRef = useRef<boolean>(false);

    const filteredGallery = gallery ? gallery.filter(item => {
        if (activeTab === 'all') return true;
        return item.type === activeTab;
    }) : [];

    const closeMedia = () => {
        setSelectedMedia(null);
        setSlideDirection('none');

        // Stop native video
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.src = "";
        }
        // Stop YouTube iframe
        if (iframeRef.current) {
            iframeRef.current.src = "";
        }

        // Exit fullscreen if any element is fullscreen
        if (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(err => console.log("Error exiting fullscreen:", err));
            } else if ((document as any).webkitExitFullscreen) {
                (document as any).webkitExitFullscreen();
            } else if ((document as any).msExitFullscreen) {
                (document as any).msExitFullscreen();
            }
        }
    };

    const openMedia = (item: { type: 'image' | 'video'; url: string; caption?: string }) => {
        setSlideDirection('none');
        setSelectedMedia(item);

        if (item.type === 'video') {
            const ytId = getYoutubeId(item.url);
            if (ytId) {
                setTimeout(() => {
                    if (iframeRef.current) {
                        iframeRef.current.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1`;
                        const iframe = iframeRef.current;
                        if (iframe.requestFullscreen) {
                            iframe.requestFullscreen().catch(err => console.log("Iframe fullscreen error:", err));
                        } else if ((iframe as any).webkitRequestFullscreen) {
                            (iframe as any).webkitRequestFullscreen();
                        } else if ((iframe as any).msRequestFullscreen) {
                            (iframe as any).msRequestFullscreen();
                        }
                    }
                }, 50);
            } else {
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.src = item.url;
                        videoRef.current.play().catch(err => console.log("Video play error:", err));
                        const video = videoRef.current;
                        if ((video as any).webkitEnterFullscreen) {
                            (video as any).webkitEnterFullscreen();
                        } else if (video.requestFullscreen) {
                            video.requestFullscreen().catch(err => console.log("Video fullscreen error:", err));
                        } else if ((video as any).webkitRequestFullscreen) {
                            (video as any).webkitRequestFullscreen();
                        } else if ((video as any).msRequestFullscreen) {
                            (video as any).msRequestFullscreen();
                        }
                    }
                }, 50);
            }
        }
    };

    const changeMedia = (item: { type: 'image' | 'video'; url: string; caption?: string }) => {
        // Pause/reset video and iframe
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.src = "";
        }
        if (iframeRef.current) {
            iframeRef.current.src = "";
        }

        setSelectedMedia(item);

        const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement);

        if (item.type === 'video') {
            const ytId = getYoutubeId(item.url);
            if (ytId) {
                setTimeout(() => {
                    if (iframeRef.current) {
                        iframeRef.current.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1`;
                    }
                }, 50);
            } else {
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.src = item.url;
                    }
                }, 50);
            }
        } else if (item.type === 'image' && isCurrentlyFullscreen) {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(err => console.log(err));
            } else if ((document as any).webkitExitFullscreen) {
                (document as any).webkitExitFullscreen();
            }
        }
    };

    const handlePrevMedia = () => {
        if (!selectedMedia || filteredGallery.length === 0) return;
        const currentIndex = filteredGallery.findIndex(item => item.url === selectedMedia.url);
        let prevItem;
        if (currentIndex > 0) {
            prevItem = filteredGallery[currentIndex - 1];
        } else {
            prevItem = filteredGallery[filteredGallery.length - 1];
        }
        setSlideDirection('left');
        changeMedia(prevItem);
    };

    const handleNextMedia = () => {
        if (!selectedMedia || filteredGallery.length === 0) return;
        const currentIndex = filteredGallery.findIndex(item => item.url === selectedMedia.url);
        let nextItem;
        if (currentIndex < filteredGallery.length - 1) {
            nextItem = filteredGallery[currentIndex + 1];
        } else {
            nextItem = filteredGallery[0];
        }
        setSlideDirection('right');
        changeMedia(nextItem);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = e.touches[0].clientX;
        isSwipingRef.current = false;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartRef.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartRef.current - touchEndX;

        if (Math.abs(diff) > 50) {
            isSwipingRef.current = true;
            if (diff > 50) {
                handleNextMedia();
            } else {
                handlePrevMedia();
            }
            setTimeout(() => {
                isSwipingRef.current = false;
            }, 300);
        }
        touchStartRef.current = null;
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (isSwipingRef.current) return;
        closeMedia();
    };

    useBackButton(!!selectedMedia, () => closeMedia());

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement);
            if (!isFullscreen) {
                if (videoRef.current) {
                    videoRef.current.pause();
                }
            }
        };

        const handleIOSVideoClose = () => {
            if (videoRef.current) {
                videoRef.current.pause();
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        const videoEl = videoRef.current;
        if (videoEl) {
            videoEl.addEventListener('webkitendfullscreen', handleIOSVideoClose);
        }

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
            if (videoEl) {
                videoEl.removeEventListener('webkitendfullscreen', handleIOSVideoClose);
            }
        };
    }, [selectedMedia]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedMedia) return;
            if (e.key === 'ArrowLeft') {
                handlePrevMedia();
            } else if (e.key === 'ArrowRight') {
                handleNextMedia();
            } else if (e.key === 'Escape') {
                closeMedia();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedMedia, filteredGallery]);

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
                            onClick={() => openMedia({ type: item.type, url: item.url, caption: item.caption })}
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
            <div
                ref={modalContainerRef}
                className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 transition-all duration-300 overflow-hidden touch-none ${
                    selectedMedia ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={handleBackdropClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {selectedMedia && (
                    <>
                        <button
                            onClick={(e) => {
                                    e.stopPropagation();
                                    closeMedia();
                                }}
                            className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors z-[210]"
                        >
                            <X size={32} />
                        </button>

                        {/* Prev Button */}
                        <button
                            onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrevMedia();
                                }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors z-[210] hidden md:block"
                            title="Previous"
                        >
                            <ChevronLeft size={36} />
                        </button>

                        {/* Next Button */}
                        <button
                            onClick={(e) => {
                                    e.stopPropagation();
                                    handleNextMedia();
                                }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors z-[210] hidden md:block"
                            title="Next"
                        >
                            <ChevronRight size={36} />
                        </button>

                        <div 
                            key={selectedMedia.url}
                            className={`relative max-w-4xl w-full max-h-[85vh] flex flex-col items-center justify-center transition-all duration-300 touch-none ${
                                slideDirection === 'right' 
                                    ? 'animate-slide-in-right' 
                                    : slideDirection === 'left' 
                                        ? 'animate-slide-in-left' 
                                        : 'animate-zoom-in'
                            }`}
                            onClick={e => e.stopPropagation()}
                        >
                            {selectedMedia.type === 'video' ? (
                                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
                                    {/* Native Video Element */}
                                    <video
                                        ref={videoRef}
                                        className={`w-full h-full object-contain ${
                                            !getYoutubeId(selectedMedia.url) ? 'block' : 'hidden'
                                        }`}
                                        controls
                                        autoPlay
                                    />

                                    {/* YouTube Video IFrame */}
                                    <iframe
                                        ref={iframeRef}
                                        className={`w-full h-full ${
                                            getYoutubeId(selectedMedia.url) ? 'block' : 'hidden'
                                        }`}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    />

                                    {/* Overlay to intercept touches/clicks for swipe and fullscreen */}
                                    <div 
                                        className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 hover:bg-black/10 transition-colors cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const ytId = getYoutubeId(selectedMedia.url);
                                            if (ytId) {
                                                const iframe = iframeRef.current;
                                                if (iframe) {
                                                    iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1`;
                                                    if (iframe.requestFullscreen) {
                                                        iframe.requestFullscreen().catch(err => console.log(err));
                                                    } else if ((iframe as any).webkitRequestFullscreen) {
                                                        (iframe as any).webkitRequestFullscreen();
                                                    } else if ((iframe as any).msRequestFullscreen) {
                                                        (iframe as any).msRequestFullscreen();
                                                    }
                                                }
                                            } else {
                                                const video = videoRef.current;
                                                if (video) {
                                                    video.play().catch(err => console.log(err));
                                                    if ((video as any).webkitEnterFullscreen) {
                                                        (video as any).webkitEnterFullscreen();
                                                    } else if (video.requestFullscreen) {
                                                        video.requestFullscreen().catch(err => console.log(err));
                                                    } else if ((video as any).webkitRequestFullscreen) {
                                                        (video as any).webkitRequestFullscreen();
                                                    } else if ((video as any).msRequestFullscreen) {
                                                        (video as any).msRequestFullscreen();
                                                    }
                                                }
                                            }
                                        }}
                                    >
                                        <div className="w-16 h-16 rounded-full bg-themePrimary text-themeHeaderBg flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                                            <Play size={28} fill="currentColor" className="translate-x-0.5" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Image Element */
                                <img
                                    src={selectedMedia.url}
                                    alt="zoomed gallery media"
                                    className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                                />
                            )}

                            {selectedMedia.caption && (
                                <div className="mt-4 text-center text-white font-bold bg-black/55 backdrop-blur-md px-4 py-2 rounded-lg max-w-lg">
                                    {selectedMedia.caption}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};
