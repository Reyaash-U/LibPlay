"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Carousel from "@/components/Carousel";
import { MediaItem } from "@/lib/types";
import { Monitor, RefreshCw, Image, Video, Sparkles, Play, Trash2, Loader2, Shield } from "lucide-react";

export default function DisplayPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PHOTO" | "VIDEO">("ALL");
  const [user, setUser] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
      }
    } catch {
      // Not authenticated, that's fine for public display
    }
  };

  const fetchMedia = async () => {
    try {
      const typeParam = filter !== "ALL" ? `&type=${filter}` : "";
      const res = await fetch(
        `/api/media?status=APPROVED&limit=50${typeParam}`
      );
      const data = await res.json();
      if (data.success) {
        setMedia(data.data.media);
      }
    } catch (error) {
      console.error("Failed to fetch media:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media?")) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMedia((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert(data.error || "Failed to delete media");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("An error occurred while deleting");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    fetchMedia();
    const interval = setInterval(fetchMedia, 300000);
    return () => clearInterval(interval);
  }, [filter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header with mesh gradient */}
      <div className="mesh-gradient text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-primary-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 relative z-10">
          <div className="flex items-center gap-3 mb-4 animate-fade-in">
            <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
              <Monitor className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-300 animate-pulse-soft" />
              <span className="text-sm font-medium text-primary-200 uppercase tracking-widest">Live Gallery</span>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Library Events
          </h1>
          <p className="text-primary-200/80 text-lg sm:text-xl max-w-2xl mt-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Explore photos and videos from our latest library events and activities
          </p>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-3 mt-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            {[
              { key: "ALL" as const, label: "All Media", icon: null },
              { key: "PHOTO" as const, label: "Photos", icon: <Image className="w-4 h-4" /> },
              { key: "VIDEO" as const, label: "Videos", icon: <Video className="w-4 h-4" /> },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  filter === f.key
                    ? "bg-white text-primary-700 shadow-lg shadow-white/20 scale-105"
                    : "bg-white/10 text-white/80 hover:bg-white/20 backdrop-blur-sm border border-white/10"
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
            
            <button
              onClick={fetchMedia}
              className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-white/10 text-white/80 hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:scale-105"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" className="w-full text-gray-50">
            <path d="M0,60 L0,20 Q720,60 1440,20 L1440,60 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Carousel Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center h-[60vh] bg-white rounded-2xl shadow-card">
            <div className="text-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary-100 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-primary-500 rounded-full border-t-transparent animate-spin" />
              </div>
              <p className="text-gray-400 mt-6 font-medium">Loading media...</p>
            </div>
          </div>
        ) : (
          <Carousel 
            media={media} 
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Media Grid */}
      {!loading && media.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 bg-gradient-to-b from-primary-500 to-accent-500 rounded-full" />
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
              All Event Media
            </h2>
            <span className="ml-2 px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-sm font-semibold">
              {media.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {media.map((item, index) => (
              <div
                key={item.id}
                className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-card-hover transition-all duration-500 animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {item.type === "VIDEO" ? (
                  item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <Video className="w-10 h-10 text-gray-500" />
                    </div>
                  )
                ) : (
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white text-sm font-semibold truncate">
                      {item.title}
                    </p>
                    {item.eventName && (
                      <p className="text-white/60 text-xs mt-0.5 truncate">{item.eventName}</p>
                    )}
                  </div>
                </div>

                {/* Video play icon */}
                {item.type === "VIDEO" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-300">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>
                )}
                
                {/* Type badge */}
                <div className="absolute top-3 left-3">
                  <span className={`badge ${
                    item.type === "VIDEO"
                      ? "bg-red-500/90 text-white backdrop-blur-sm"
                      : "bg-primary-500/90 text-white backdrop-blur-sm"
                  }`}>
                    {item.type}
                  </span>
                </div>

                {/* Delete Button (Grid) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  disabled={deletingId === item.id}
                  className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-xl shadow-lg transition-all hover:bg-red-700 disabled:opacity-50 z-20"
                >
                  {deletingId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-100 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-soft" />
            <span>Auto-refreshes every 5 minutes</span>
          </div>
          <p className="text-gray-300 text-xs mt-2">LibPlay — Library Event Display System</p>
        </div>
      </footer>
    </div>
  );
}
