"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UploadForm from "@/components/UploadForm";
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
  Upload,
} from "lucide-react";

interface User {
  userId: string;
  name: string;
  role: string;
}

type TabType = "upload" | "pending" | "approved" | "rejected" | "all";

export default function LibrarianPage() {
  const [user, setUser] = useState<User | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Only fetch media on tab change, wait for user
    if (user) fetchMedia();
  }, [user, activeTab]);

  useEffect(() => {
    // Fetch stats only once when user loads
    if (user) fetchStats();
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        if (data.data.user.role !== "LIBRARIAN") {
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

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/media/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
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
        // Find existing status before updating stats
        const item = media.find((m) => m.id === id);
        const oldStatus = item?.status;

        // Remove from list or update
        setMedia((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: "APPROVED" as const } : m))
        );
        // If on pending tab, remove the item
        if (activeTab === "pending") {
          setMedia((prev) => prev.filter((m) => m.id !== id));
        }

        // Update global stats
        setStats((prev) => ({
          ...prev,
          approved: prev.approved + 1,
          pending: oldStatus === "PENDING" ? prev.pending - 1 : prev.pending,
          rejected: oldStatus === "REJECTED" ? prev.rejected - 1 : prev.rejected,
        }));
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
        const item = media.find((m) => m.id === id);
        const oldStatus = item?.status;

        setMedia((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: "REJECTED" as const } : m))
        );
        if (activeTab === "pending") {
          setMedia((prev) => prev.filter((m) => m.id !== id));
        }

        setStats((prev) => ({
          ...prev,
          rejected: prev.rejected + 1,
          pending: oldStatus === "PENDING" ? prev.pending - 1 : prev.pending,
          approved: oldStatus === "APPROVED" ? prev.approved - 1 : prev.approved,
        }));
      }
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        const item = media.find((m) => m.id === id);
        setMedia((prev) => prev.filter((m) => m.id !== id));

        if (item) {
          setStats((prev) => ({
            ...prev,
            pending: item.status === "PENDING" ? prev.pending - 1 : prev.pending,
            approved: item.status === "APPROVED" ? prev.approved - 1 : prev.approved,
            rejected: item.status === "REJECTED" ? prev.rejected - 1 : prev.rejected,
          }));
        }
      } else {
        alert(data.error || "Failed to delete media");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Network error. Could not delete media.");
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
      key: "upload",
      label: "Upload Media",
      icon: <Upload className="w-4 h-4" />,
      activeClass: "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/30",
    },
    {
      key: "pending",
      label: "Pending Review",
      icon: <Clock className="w-4 h-4" />,
      activeClass: "bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/30",
    },
    {
      key: "approved",
      label: "Approved",
      icon: <CheckCircle className="w-4 h-4" />,
      activeClass: "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30",
    },
    {
      key: "rejected",
      label: "Rejected",
      icon: <XCircle className="w-4 h-4" />,
      activeClass: "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30",
    },
    {
      key: "all",
      label: "All Media",
      icon: <Filter className="w-4 h-4" />,
      activeClass: "bg-gray-800 text-white border-gray-700 shadow-lg shadow-gray-800/30",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-4 sm:px-6 lg:px-8 py-8 mb-6">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/20 shadow-sm shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Librarian Dashboard
            </h1>
            <p className="text-primary-100 text-sm mt-0.5 font-medium">
              Review, approve, and manage event media
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Pending Card */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:border-amber-100 group">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Pending Review</p>
            <p className="text-4xl font-black text-gray-900 mb-4">{stats.pending}</p>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Requires Approval
            </p>
          </div>

          {/* Approved Card */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:border-emerald-100 group">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Approved Media</p>
            <p className="text-4xl font-black text-gray-900 mb-4">{stats.approved}</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Publicly Visible
            </p>
          </div>

          {/* Rejected Card */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:border-rose-100 group">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Rejected Media</p>
            <p className="text-4xl font-black text-gray-900 mb-4">{stats.rejected}</p>
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Removed From Feed
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border ${activeTab === tab.key
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
        {activeTab === "upload" ? (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <div className="glass-card rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Upload Media</h2>
              <p className="text-sm text-gray-400 mb-6">
                Media uploaded by librarians is automatically approved and displayed.
              </p>
              <UploadForm
                onUploadSuccess={() => {
                  fetchMedia();
                }}
              />
            </div>
          </div>
        ) : loading ? (
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
