"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, Image as ImageIcon, Maximize, Minimize, Volume2, VolumeX, Trash2, Loader2 } from "lucide-react";
import { MediaItem } from "@/lib/types";

interface CarouselProps {
  media: MediaItem[];
  onDelete?: (id: string) => Promise<void>;
}

export default function Carousel({ media, onDelete }: CarouselProps) {
  const autoplayPlugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: false })
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplayPlugin.current]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showSoundHint, setShowSoundHint] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // When a slide is selected, auto-play video if it's a video slide
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    
    // Check if the actual selected item index has changed
    // We don't want to reset video if just the 'media' reference changed but index is same
    setSelectedIndex((prevIndex) => {
      // If index is the same, we check if we need to do anything
      // This is a bit tricky with how React state works, but let's compare
      return index;
    });

    // Pause OTHER videos
    videoRefs.current.forEach((video, id) => {
      const currentMedia = media[index];
      if (currentMedia && id !== currentMedia.id) {
        video.pause();
        video.currentTime = 0;
      }
    });

    // If the current slide is a video, pause autoplay and play the video
    const currentMedia = media[index];
    if (currentMedia?.type === "VIDEO") {
      autoplayPlugin.current.stop();
      const videoEl = videoRefs.current.get(currentMedia.id);
      if (videoEl && videoEl.paused) {
        videoEl.play().catch(() => {});
      }
    } else {
      // For images, make sure autoplay is running
      autoplayPlugin.current.play();
    }
  }, [emblaApi, media]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Handle video ended — move to next slide
  const handleVideoEnded = useCallback(() => {
    if (emblaApi) {
      autoplayPlugin.current.play();
      emblaApi.scrollNext();
    }
  }, [emblaApi]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Sync muted state with all video elements
  useEffect(() => {
    videoRefs.current.forEach((video) => {
      video.muted = isMuted;
    });
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    setShowSoundHint(false);
  }, []);

  const handleDeleteItem = async (id: string) => {
    if (onDelete) {
      setDeletingId(id);
      try {
        await onDelete(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Listen for fullscreen changes (e.g. user presses Escape)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] glass-card rounded-3xl">
        <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center mb-5">
          <ImageIcon className="w-10 h-10 text-primary-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-500">
          No Media Available
        </h3>
        <p className="text-gray-400 mt-1 text-sm">
          Approved photos and videos will appear here
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative group bg-black ${isFullscreen ? "w-screen h-screen" : "w-full rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5"}`}
    >
      {/* Main Carousel */}
      <div className={`embla overflow-hidden ${isFullscreen ? "h-screen" : "h-[60vh] sm:h-[70vh] lg:h-[80vh]"}`} ref={emblaRef}>
        <div className={`embla__container ${isFullscreen ? "h-screen" : "h-full"}`}>
          {media.map((item) => {
            const isVideo = item.type === "VIDEO";
            // Use streaming route for videos, direct link for photos
            const mediaUrl = isVideo 
              ? `/api/media/stream?filename=${encodeURIComponent(item.publicId)}`
              : item.url;

            return (
              <div
                key={item.id}
                className={`embla__slide relative bg-black flex items-center justify-center ${isFullscreen ? "h-screen" : ""}`}
              >
                {isVideo ? (
                  <video
                    ref={(el) => {
                      if (el) videoRefs.current.set(item.id, el);
                    }}
                    src={mediaUrl}
                    muted={isMuted}
                    playsInline
                    preload="auto"
                    onEnded={handleVideoEnded}
                    className={`w-full h-full object-cover ${isFullscreen ? "h-screen" : "min-h-[60vh] max-h-[85vh]"}`}
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt={item.title}
                    className={`w-full h-full object-cover ${isFullscreen ? "h-screen" : "min-h-[60vh] max-h-[85vh]"}`}
                  />
                )}

                {/* Overlay Info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 sm:p-8 transition-opacity duration-300">
                  <h3 className="text-white text-xl sm:text-2xl font-bold drop-shadow-lg">{item.title}</h3>
                  {item.eventName && (
                    <p className="text-white/70 text-sm mt-1.5 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-accent-400 inline-block" />
                      {item.eventName}
                      {item.eventDate && ` \u2022 ${item.eventDate}`}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-white/50 text-sm mt-1 line-clamp-2 max-w-2xl">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Media type badge */}
                <div className="absolute top-4 right-4 transition-opacity duration-300">
                  <span
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm ${
                      item.type === "VIDEO"
                        ? "bg-red-500/80 text-white"
                        : "bg-primary-500/80 text-white"
                    }`}
                  >
                    {item.type === "VIDEO" ? "\u25B6 Video" : "\u2318 Photo"}
                  </span>
                </div>

                {/* Sound Hint Overlay for Videos */}
                {isVideo && isMuted && showSoundHint && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none animate-fade-in"
                  >
                    <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 flex items-center gap-3 animate-bounce-subtle">
                      <VolumeX className="w-5 h-5 text-white" />
                      <span className="text-white font-medium">Click to enable sound</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls overlay — visible on hover */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Navigation Arrows */}
        {media.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-white/20 hover:scale-105 shadow-lg"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={scrollNext}
              className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-white/20 hover:scale-105 shadow-lg"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          className="pointer-events-auto absolute top-4 left-4 w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-white/20 shadow-lg"
        >
          {isFullscreen ? (
            <Minimize className="w-5 h-5 text-white" />
          ) : (
            <Maximize className="w-5 h-5 text-white" />
          )}
        </button>

        {/* Volume Toggle */}
        <button
          onClick={toggleMute}
          className="pointer-events-auto absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-white/20 shadow-lg"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>

        {/* Delete button (Carousel) */}
        {onDelete && media[selectedIndex] && (
          <button
            onClick={() => handleDeleteItem(media[selectedIndex].id)}
            disabled={deletingId === media[selectedIndex].id}
            className="pointer-events-auto absolute top-4 left-16 w-10 h-10 rounded-xl bg-red-600/20 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-red-600/40 text-red-500 hover:text-white"
            title="Delete this media"
          >
            {deletingId === media[selectedIndex]?.id ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Dots indicator */}
        {media.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 transition-opacity duration-300">
            {media.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={`pointer-events-auto h-2 rounded-full transition-all duration-300 ${
                  index === selectedIndex
                    ? "bg-white w-8 shadow-md"
                    : "bg-white/40 w-2 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
