"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon, 
  Maximize, 
  Minimize, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  Video,
  LayoutGrid
} from "lucide-react";
import { MediaItem } from "@/lib/types";

interface CarouselProps {
  media: MediaItem[];
  onDelete?: (id: string) => Promise<void>;
  variant?: "display" | "dashboard";
}

export default function Carousel({ media, onDelete, variant = "dashboard" }: CarouselProps) {
  const [filter, setFilter] = useState<"ALL" | "PHOTO" | "VIDEO">("ALL");
  
  // Internal filtering logic
  const filteredMedia = useMemo(() => {
    if (filter === "ALL") return media;
    return media.filter(item => item.type === filter);
  }, [media, filter]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-read current media based on filtered list
  const currentMedia = filteredMedia[selectedIndex];

  // Custom Autoplay Logic for per-item duration
  useEffect(() => {
    if (!emblaApi || !isPlaying) return;
    if (!currentMedia) return;

    if (currentMedia.type === "PHOTO") {
      const delay = (currentMedia.displayDuration || 5) * 1000;
      const timer = setTimeout(() => {
        emblaApi.scrollNext();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [selectedIndex, isPlaying, emblaApi, currentMedia]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
    showControls();
  }, [emblaApi, showControls]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
    showControls();
  }, [emblaApi, showControls]);

  const toggleFullscreen = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const element = containerRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().then(() => setIsFullscreen(true)).catch((err) => {
        console.error("Error attempting to enable full-screen mode:", err);
      });
    } else if (document.fullscreenElement === element) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const handleVideoEnded = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const toggleMute = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMuted(prev => !prev);
    showControls();
  }, [showControls]);

  const togglePlayPause = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!emblaApi) return;
    
    if (isPlaying) {
      setIsPlaying(false);
      const index = emblaApi.selectedScrollSnap();
      const mediaItem = filteredMedia[index];
      if (mediaItem?.type === "VIDEO") {
        const videoEl = videoRefs.current.get(mediaItem.id);
        if (videoEl) videoEl.pause();
      }
    } else {
      setIsPlaying(true);
      const index = emblaApi.selectedScrollSnap();
      const mediaItem = filteredMedia[index];
      if (mediaItem?.type === "VIDEO") {
        const videoEl = videoRefs.current.get(mediaItem.id);
        if (videoEl) videoEl.play().catch(() => {});
      }
    }
    showControls();
  }, [emblaApi, isPlaying, filteredMedia, showControls]);

  const handleScreenClick = useCallback(() => {
    togglePlayPause();
  }, [togglePlayPause]);

  useEffect(() => {
    videoRefs.current.forEach((video) => {
      video.muted = isMuted;
    });
  }, [isMuted]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);

    const mediaItem = filteredMedia[index];

    videoRefs.current.forEach((video, id) => {
      if (mediaItem && id !== mediaItem.id) {
        video.pause();
        video.currentTime = 0;
      }
    });

    if (mediaItem?.type === "VIDEO") {
      const videoEl = videoRefs.current.get(mediaItem.id);
      if (videoEl && videoEl.paused && isPlaying) {
        videoEl.play().catch(() => {});
      } else if (videoEl && !isPlaying) {
        videoEl.pause();
      }
    }
  }, [emblaApi, isPlaying, filteredMedia]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    const handler = () => showControls();
    window.addEventListener("mousemove", handler);
    window.addEventListener("touchstart", handler);
    return () => {
      window.removeEventListener("mousemove", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [showControls]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') scrollPrev();
      else if (e.key === 'ArrowRight') scrollNext();
      else if (e.key === ' ' || e.key === 'MediaPlayPause') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'm' || e.key === 'M') toggleMute();
      else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [scrollPrev, scrollNext, togglePlayPause, toggleMute, toggleFullscreen]);

  if (filteredMedia.length === 0) {
    return (
      <div ref={containerRef} className={`flex flex-col items-center justify-center w-full relative group transition-colors duration-700 ${
        variant === "display" ? "h-full bg-black" : "h-96 bg-gray-400"
      }`}>
        <div className="absolute top-10 left-10 z-50 animate-fade-in pointer-events-auto">
          <button
            onClick={() => toggleFullscreen()}
            className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-2xl"
            title="Enter Fullscreen (F)"
          >
            <Maximize className="w-6 h-6" />
          </button>
        </div>

        <div className="text-center animate-fade-in px-6">
          <div className={`mx-auto mb-6 relative ${variant === "display" ? "w-24 h-24" : "w-16 h-16"}`}>
            <ImageIcon className={`w-full h-full ${variant === "display" ? "text-white/20" : "text-gray-800"}`} />
          </div>
          <h3 className={`font-light italic tracking-widest uppercase ${
            variant === "display" ? "text-3xl sm:text-4xl text-white/40 font-black" : "text-2xl text-gray-500"
          }`}>
            No {filter !== "ALL" ? filter.toLowerCase() : ""} Media
          </h3>
        </div>

        {/* Filter Selection in Empty State too */}
        <div className="absolute bottom-8 right-6 z-50 flex items-center gap-2 pointer-events-auto">
          {[
            { key: "ALL", label: "All", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
            { key: "PHOTO", label: "Photos", icon: <ImageIcon className="w-3.5 h-3.5" /> },
            { key: "VIDEO", label: "Videos", icon: <Video className="w-3.5 h-3.5" /> }
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 backdrop-blur-sm border ${
                filter === f.key
                  ? "bg-white text-black border-white shadow-lg"
                  : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20"
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden">
      <div className="absolute inset-0 z-10 cursor-pointer" onClick={handleScreenClick} />

      <div className="embla w-full h-full" ref={emblaRef}>
        <div className="embla__container h-full">
          {filteredMedia.map((item) => {
            const isVideo = item.type === "VIDEO";
            const mediaUrl = isVideo
              ? `/api/media/stream?filename=${encodeURIComponent(item.publicId)}`
              : item.url;

            return (
              <div key={item.id} className="embla__slide relative flex items-center justify-center h-full w-full">
                {isVideo ? (
                  <video
                    ref={(el) => { if (el) videoRefs.current.set(item.id, el); }}
                    src={mediaUrl}
                    muted={isMuted}
                    playsInline
                    preload="auto"
                    onEnded={handleVideoEnded}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img src={mediaUrl} alt={item.title} className="w-full h-full object-cover" />
                )}

                <div className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 pointer-events-none z-20 ${
                  variant === "display" ? "p-10 pt-12" : "p-6"
                }`}>
                  <div className={`mx-auto text-center ${variant === "display" ? "max-w-4xl" : "max-w-2xl"}`}>
                    <h3 className={`text-white font-black drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] tracking-tight uppercase ${
                      variant === "display" ? "text-3xl sm:text-4xl md:text-5xl" : "text-xl sm:text-2xl"
                    }`}>
                      {item.title}
                    </h3>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-center items-center gap-12 transition-all duration-500" style={{ opacity: controlsVisible ? 1 : 0 }}>
        {/* Fullscreen Toggle - Now Always Visible on interaction */}
        <div className="absolute top-10 left-10 pointer-events-auto">
          <button
            onClick={toggleFullscreen}
            className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-2xl"
          >
            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>
        </div>

        {/* Filters - Bottom Right */}
        <div className="absolute bottom-8 right-6 z-50 flex items-center gap-2 pointer-events-auto">
          {[
            { key: "ALL", label: "All", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
            { key: "PHOTO", label: "Photos", icon: <ImageIcon className="w-3.5 h-3.5" /> },
            { key: "VIDEO", label: "Videos", icon: <Video className="w-3.5 h-3.5" /> }
          ].map((f) => (
            <button
              key={f.key}
              onClick={(e) => { e.stopPropagation(); setFilter(f.key as any); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 backdrop-blur-sm border ${
                filter === f.key
                  ? "bg-white text-black border-white shadow-lg"
                  : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20"
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {filteredMedia.length > 1 && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8">
            <button onClick={scrollPrev} className="pointer-events-auto w-16 h-16 rounded-full bg-black/30 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-black/50 hover:scale-110 transition-all shadow-2xl">
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button onClick={scrollNext} className="pointer-events-auto w-16 h-16 rounded-full bg-black/30 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-black/50 hover:scale-110 transition-all shadow-2xl">
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        )}

        {!isPlaying && (
          <div className={`${variant === "display" ? "p-8" : "p-4"} rounded-full bg-white/10 backdrop-blur-3xl border border-white/20 animate-pulse`}>
            <Pause className={`${variant === "display" ? "w-20 h-20" : "w-10 h-10"} text-white fill-white`} />
          </div>
        )}

        <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-6 pointer-events-auto ${
          variant === "display" ? "bottom-12" : "bottom-6 scale-75"
        }`}>
          <button onClick={togglePlayPause} className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all">
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>
          <button onClick={toggleMute} className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all">
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
          <div className="flex gap-2.5 px-6 py-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/5">
            {filteredMedia.map((_, index) => (
              <button key={index} onClick={() => emblaApi?.scrollTo(index)} className={`h-2 transition-all duration-300 rounded-full ${
                index === selectedIndex ? "w-8 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" : "w-2 bg-white/20 hover:bg-white/40"
              }`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
