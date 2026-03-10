"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MediaCard from "@/components/MediaCard";
import { MediaItem } from "@/lib/types";
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FolderOpen,
  Filter,
} from "lucide-react";

interface User {
  userId: string;
  name: string;
  role: string;
}

type TabType = "pending" | "approved" | "rejected" | "all";

export default function LibrarianPage() {
  const [user, setUser] = useState<User | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) fetchMedia();
  }, [user, activeTab]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        if (
          data.data.user.role !== "LIBRARIAN" &&
          data.data.user.role !== "ADMIN"
        ) {
          router.push("/staff");
          return;
        }
        setUser(data.data.user);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    }
  };

  const fetchMedia = async () => {
    setLoading(true);
    try {
      let url = "/api/media?limit=50";
      if (activeTab === "pending") {
        url = "/api/media/pending?limit=50";
      } else if (activeTab !== "all") {
        url = `/api/media?status=${activeTab.toUpperCase()}&limit=50`;
      }

      const res = await fetch(url);
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

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      const data = await res.json();
      if (data.success) {
        // Remove from list or update
        setMedia((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: "APPROVED" as const } : m))
        );
        // If on pending tab, remove the item
        if (activeTab === "pending") {
          setMedia((prev) => prev.filter((m) => m.id !== id));
        }
      }
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });
      const data = await res.json();
      if (data.success) {
        setMedia((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: "REJECTED" as const } : m))
        );
        if (activeTab === "pending") {
          setMedia((prev) => prev.filter((m) => m.id !== id));
        }
      }
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media? This cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode; activeClass: string }[] = [
    {
      key: "pending",
      label: "Pending Review",
      icon: <Clock className="w-4 h-4" />,
      activeClass: "bg-yellow-50 text-yellow-700 border-yellow-200 shadow-yellow-100/50",
    },
    {
      key: "approved",
      label: "Approved",
      icon: <CheckCircle className="w-4 h-4" />,
      activeClass: "bg-green-50 text-green-700 border-green-200 shadow-green-100/50",
    },
    {
      key: "rejected",
      label: "Rejected",
      icon: <XCircle className="w-4 h-4" />,
      activeClass: "bg-red-50 text-red-700 border-red-200 shadow-red-100/50",
    },
    {
      key: "all",
      label: "All Media",
      icon: <Filter className="w-4 h-4" />,
      activeClass: "bg-primary-50 text-primary-700 border-primary-200 shadow-primary-100/50",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-primary-900 px-4 sm:px-6 lg:px-8 py-10 mb-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
              <Shield className="w-5 h-5 text-primary-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Librarian Dashboard
              </h1>
              <p className="text-white/50 text-sm mt-0.5">
                Review, approve, and manage event media
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                activeTab === tab.key
                  ? tab.activeClass + " shadow-sm"
                  : "bg-transparent border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-500">
              No {activeTab === "all" ? "" : activeTab} media found
            </h3>
            <p className="text-gray-400 mt-1 text-sm">
              {activeTab === "pending"
                ? "No media waiting for review"
                : "Try a different filter"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {media.map((item, i) => (
              <div key={item.id} className="animate-scale-in" style={{ animationDelay: `${i * 50}ms` }}>
                <MediaCard
                  media={item}
                  mode="librarian"
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
