"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UploadForm from "@/components/UploadForm";
import MediaCard from "@/components/MediaCard";
import { MediaItem } from "@/lib/types";
import {
  Upload,
  FolderOpen,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface User {
  userId: string;
  name: string;
  role: string;
}

export default function StaffPage() {
  const [user, setUser] = useState<User | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upload" | "my-uploads">(
    "upload"
  );
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) fetchMyMedia();
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    }
  };

  const fetchMyMedia = async () => {
    try {
      const res = await fetch("/api/media?limit=50");
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const pendingCount = media.filter((m) => m.status === "PENDING").length;
  const approvedCount = media.filter((m) => m.status === "APPROVED").length;
  const rejectedCount = media.filter((m) => m.status === "REJECTED").length;

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 px-4 sm:px-6 lg:px-8 py-10 mb-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-accent-400/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Staff Dashboard</h1>
          </div>
          <p className="text-white/70 ml-[52px]">
            Upload photos and videos from library events
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                <p className="text-xs text-white/60 uppercase tracking-wider">Pending</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-400/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{approvedCount}</p>
                <p className="text-xs text-white/60 uppercase tracking-wider">Approved</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-400/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{rejectedCount}</p>
                <p className="text-xs text-white/60 uppercase tracking-wider">Rejected</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100/80 backdrop-blur p-1.5 rounded-2xl mb-8 max-w-md">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "upload"
                ? "bg-white shadow-md text-primary-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload New
          </button>
          <button
            onClick={() => setActiveTab("my-uploads")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "my-uploads"
                ? "bg-white shadow-md text-primary-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            My Uploads ({media.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === "upload" ? (
          <div className="max-w-2xl animate-fade-in">
            <div className="glass-card rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Upload Media</h2>
              <p className="text-sm text-gray-400 mb-6">
                Uploaded media will be reviewed by the librarian before display
              </p>
              <UploadForm
                onUploadSuccess={() => {
                  fetchMyMedia();
                }}
              />
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : media.length === 0 ? (
              <div className="text-center py-20 glass-card rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-500">
                  No uploads yet
                </h3>
                <p className="text-gray-400 mt-1 text-sm">
                  Switch to the Upload tab to add your first media
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {media.map((item, i) => (
                  <div key={item.id} className="animate-scale-in" style={{ animationDelay: `${i * 60}ms` }}>
                    <MediaCard media={item} mode="staff" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
