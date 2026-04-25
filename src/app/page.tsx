"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import DisplayCarousel from "@/components/Carousel";
import { MediaItem } from "@/lib/types";
import { Image as ImageIcon, Video, LayoutGrid, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUpload } from "@/context/UploadContext";

export default function DisplayPage() {
  const [user, setUser] = useState<any>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PHOTO" | "VIDEO">("ALL");
  const [controlsVisible, setControlsVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { lastUploadCompletedAt } = useUpload();

  // Show controls briefly on mouse movement / touch
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success) {
          setUser(data.data.user);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", showControls);
    window.addEventListener("touchstart", showControls);
    return () => {
      window.removeEventListener("mousemove", showControls);
      window.removeEventListener("touchstart", showControls);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showControls]);

  // Track fullscreen state
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    // Initial check
    setIsFullscreen(!!document.fullscreenElement);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Auto fullscreen on mount
  useEffect(() => {
    const tryFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    // Try immediately (works if triggered by user interaction like navigation)
    tryFullscreen();

    // Fallback: request on first user interaction
    const onInteraction = () => {
      tryFullscreen();
      document.removeEventListener("click", onInteraction);
      document.removeEventListener("keydown", onInteraction);
      document.removeEventListener("touchstart", onInteraction);
    };

    document.addEventListener("click", onInteraction);
    document.addEventListener("keydown", onInteraction);
    document.addEventListener("touchstart", onInteraction);

    return () => {
      document.removeEventListener("click", onInteraction);
      document.removeEventListener("keydown", onInteraction);
      document.removeEventListener("touchstart", onInteraction);
    };
  }, []);

  const fetchMedia = useCallback(async () => {
    try {
      const typeParam = filter !== "ALL" ? `&type=${filter}` : "";
      const res = await fetch(`/api/media?status=APPROVED&limit=50${typeParam}`);
      const data = await res.json();
      if (data.success) {
        setMedia(data.data.media);
      }
    } catch (error) {
      console.error("Failed to fetch media:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchMedia();
    const interval = setInterval(fetchMedia, 300000);
    return () => clearInterval(interval);
  }, [fetchMedia, lastUploadCompletedAt]);

  const filters = [
    { key: "ALL" as const, label: "All", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { key: "PHOTO" as const, label: "Photo", icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { key: "VIDEO" as const, label: "Video", icon: <Video className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Full-screen carousel — always fills the screen */}
      {loading ? (
        <div className="flex items-center justify-center w-full h-full">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-white/10 rounded-full" />
            <div className="absolute inset-0 w-14 h-14 border-4 border-white/60 rounded-full border-t-transparent animate-spin" />
          </div>
        </div>
      ) : (
        <DisplayCarousel media={media} variant="display" />
      )}

      {/* Sign Out — float bottom-left, appear on mouse move, only when NOT in fullscreen */}
      {user && !isFullscreen && (
        <div
          className="absolute bottom-8 left-6 z-[100] transition-all duration-500"
          style={{ 
            opacity: controlsVisible ? 1 : 0, 
            pointerEvents: controlsVisible ? "auto" : "none",
            transform: controlsVisible ? "translateY(0)" : "translateY(10px)"
          }}
        >
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[12px] font-black uppercase tracking-wider bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300 shadow-2xl"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
