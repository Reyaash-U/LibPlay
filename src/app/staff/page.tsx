"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  FolderOpen,
  Loader2,
  CheckCircle,
  XCircle,
  LayoutGrid,
  Plus,
  Upload,
  Eye,
  EyeOff,
  List,
  Trash2,
  User as UserIcon,
  Play,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Carousel from "@/components/Carousel";
import UploadForm from "@/components/UploadForm";
import MediaCard from "@/components/MediaCard";
import { MediaItem } from "@/lib/types";
import { useUpload } from "@/context/UploadContext";

interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export default function StaffPage() {
  const [user, setUser] = useState<User | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [viewMode, setViewMode] = useState<"table" | "list">("list");
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [submissionsTab, setSubmissionsTab] = useState<"current" | "review" | "rejected">("current");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Settings state
  const [profileName, setProfileName] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [showProfileConfirmPassword, setShowProfileConfirmPassword] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const { lastUploadCompletedAt } = useUpload();

  const router = useRouter();

  // URL Tab Persistence
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && (tab === "dashboard" || tab === "my-uploads" || tab === "settings")) {
      setActiveTab(tab);
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`${window.location.pathname}?${params.toString()}`);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  useEffect(() => {
    if (user) {
      if (activeTab === "my-uploads" || activeTab === "dashboard") {
        fetchMyMedia();
      }
      fetchStats();
    }
  }, [user, activeTab, submissionsTab, lastUploadCompletedAt]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
        setProfileName(data.data.user.name);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    }
  };

  const fetchMyMedia = async () => {
    setLoading(true);
    try {
      let url = "/api/media?limit=50";
      if (activeTab === "dashboard") {
        url = "/api/media?limit=50&status=APPROVED";
      } else if (activeTab === "my-uploads") {
        if (submissionsTab === "current") url = "/api/media?limit=50&status=APPROVED";
        else if (submissionsTab === "review") url = "/api/media?limit=50&status=PENDING";
        else if (submissionsTab === "rejected") url = "/api/media?limit=50&status=REJECTED";
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

  const handleSaveSettings = async () => {
    if (!user) return;

    if (profilePassword && profilePassword !== profileConfirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/users/${user.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          ...(profilePassword ? { password: profilePassword } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUser((prev) => (prev ? { ...prev, name: profileName } : null));
        setProfilePassword("");
        setProfileConfirmPassword("");
        alert("Settings updated successfully");
      } else {
        alert(data.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("An error occurred while saving settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this media?")) return;
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
        fetchStats();
      } else {
        alert(data.error || "Failed to delete media");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  if (!user) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "#111111" }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "rgba(255,255,255,0.5)" }} />
      </div>
    );
  }

  const tabTitles: Record<string, string> = {
    dashboard: "Staff Dashboard",
    "my-uploads": "My Library Submissions",
    settings: "Account Settings",
  };

  const tabDescriptions: Record<string, string> = {
    dashboard: "Role & Performance Overview",
    "my-uploads": "View status and history of your uploaded media",
    settings: "Update your profile information and account credentials",
  };

  const totalUploads = (stats.pending || 0) + (stats.approved || 0) + (stats.rejected || 0);

  const dashboardStatsCards = [
    {
      label: "Total Videos",
      value: totalUploads,
      color: "#000000",
      bgColor: "rgba(0,0,0,0.02)",
    },
    {
      label: "Pending Review",
      value: stats.pending || 0,
      color: "#000000",
      bgColor: "rgba(0,0,0,0.02)",
    },
    {
      label: "Approved Media",
      value: stats.approved || 0,
      color: "#000000",
      bgColor: "rgba(0,0,0,0.02)",
    },
    {
      label: "Rejected Media",
      value: stats.rejected || 0,
      color: "#000000",
      bgColor: "rgba(0,0,0,0.02)",
    },
  ];

  const myUploadsStatsCards = [
    {
      label: "Total Uploads",
      value: totalUploads,
      color: "#000000",
      bgColor: "rgba(0,0,0,0.02)",
    },
    {
      label: "Pending Review",
      value: stats.pending || 0,
      color: "#000000",
      bgColor: "rgba(0,0,0,0.02)",
    },
    {
      label: "Approved Media",
      value: stats.approved || 0,
      color: "#000000",
      bgColor: "rgba(0,0,0,0.02)",
    },
    {
      label: "Rejected Media",
      value: stats.rejected || 0,
      color: "#000000",
      bgColor: "rgba(0,0,0,0.02)",
    },
  ];

  const statsCards = activeTab === "dashboard" ? dashboardStatsCards : myUploadsStatsCards;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      {/* Sidebar */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        stats={stats}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* ─── Main Content ─── */}
      <div
        className="min-h-screen transition-all duration-300 ease-in-out"
        style={{
          marginLeft: isDesktop ? (sidebarCollapsed ? 72 : 260) : 0,
        }}
      >
        {/* top sticky header */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 pr-4 pl-16 sm:pr-6 sm:pl-16 lg:px-8 h-[72px] flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">
              {tabTitles[activeTab] || "Staff Dashboard"}
            </h1>
            <p className="hidden sm:block mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {tabDescriptions[activeTab] || "Role & Performance Overview"}
            </p>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          {/* ─── Stats Cards (not on settings) ─── */}
          {activeTab !== "settings" && (
            <div
              className="grid gap-3 sm:gap-4 mb-10"
              style={{ gridTemplateColumns: `repeat(${statsCards.length}, minmax(0, 1fr))` }}
            >
              {statsCards.map((card) => {
                return (
                  <div
                    key={card.label}
                    className="group relative overflow-hidden rounded-[1.5rem] p-5 sm:p-7 transition-all duration-300 cursor-default"
                    style={{
                      background: "#ffffff",
                      border: "1px solid rgba(0,0,0,0.03)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.01), 0 10px 15px -3px rgba(0,0,0,0.02)",
                    }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: card.bgColor }} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#94a3b8" }}>{card.label}</p>
                      </div>
                      <p className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: "#0f172a" }}>{card.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Content Panels ─── */}
          <div className="space-y-8">
            {activeTab === "dashboard" && (
              <div className="animate-fade-in space-y-8">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gray-100/5 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" />
                  <div className="rounded-[2.5rem] overflow-hidden shadow-2xl bg-black border border-white/5 h-96">
                    <Carousel media={media} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "my-uploads" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                  {/* Filter tabs */}
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { key: "current" as const, label: "Current", badge: stats.approved },
                      { key: "review" as const, label: "Review", badge: stats.pending },
                      { key: "rejected" as const, label: "Rejected", badge: stats.rejected },
                    ].map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setSubmissionsTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                          submissionsTab === t.key
                            ? "bg-gray-900 text-white shadow-sm"
                            : "text-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {t.label}
                        {t.badge > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                            submissionsTab === t.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                          }`}>
                            {t.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Right side controls */}
                  <div className="flex items-center gap-2 sm:border-l sm:pl-3 border-gray-100">
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Upload
                    </button>
                    <button onClick={() => setViewMode("table")} className={`p-2 rounded-lg transition-all ${viewMode === "table" ? "bg-black text-white shadow-sm" : "text-gray-400"}`}>
                      <List className="w-4.5 h-4.5" />
                    </button>
                    <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-black text-white shadow-sm" : "text-gray-400"}`}>
                      <LayoutGrid className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <Loader2 className="w-10 h-10 animate-spin text-black" />
                  </div>
                ) : media.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm px-6 text-center">
                    <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-6">
                      <FolderOpen className="w-10 h-10 text-black" />
                    </div>
                    <h3 className="text-xl font-light italic text-black uppercase tracking-tight mb-2">
                       {submissionsTab === "current" ? "No Approved Media" : submissionsTab === "review" ? "Nothing Pending Review" : "No Rejected Media"}
                    </h3>
                  </div>
                ) : (
                  viewMode === "list" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                      {media.map((item, i) => (
                        <div key={item.id} className="animate-scale-in" style={{ animationDelay: `${i * 50}ms` }}>
                          <MediaCard 
                            media={item} 
                            mode="staff" 
                            onDelete={submissionsTab === "review" ? handleDelete : undefined}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_2px_4px_rgba(0,0,0,0.01),0_8px_16px_rgba(0,0,0,0.02)] overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Asset Gallery</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contributor</th>
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Log Date</th>
                          {submissionsTab === "review" && (
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Management</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {media.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/30 group transition-all duration-300">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="relative group/thumb">
                                  {item.status === "REJECTED" ? (
                                    <div className="w-16 h-11 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                      <XCircle className="w-5 h-5 text-slate-300" />
                                    </div>
                                  ) : (
                                    <div className="w-16 h-11 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                                      <img src={item.url} className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-110" alt="" />
                                    </div>
                                  )}
                                  {item.type === "VIDEO" && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-xl">
                                      <Play className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-black text-[14px] text-slate-900 leading-tight">{item.title}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{item.type}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                  <UserIcon className="w-4 h-4 text-slate-400" />
                                </div>
                                <span className="text-xs font-black text-slate-600 uppercase tracking-tight">
                                  {item.uploadedBy?.name || "Unknown"}
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-[11px] font-black text-slate-900 leading-tight">{new Date(item.createdAt).toLocaleDateString()}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Asset Log</p>
                            </td>
                            {submissionsTab === "review" && (
                              <td className="px-8 py-6 text-right">
                                <div className="flex justify-end gap-2 transition-all duration-300">
                                  <button onClick={() => handleDelete(item.id)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-rose-100"><Trash2 className="w-5 h-5" /></button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="animate-fade-in">
                <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 shadow-2xl space-y-8 sm:space-y-10 relative overflow-hidden max-w-4xl">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-gray-300">
                    <FolderOpen className="w-48 h-48" />
                  </div>

                  <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-1 space-y-4">
                      <div
                        className="w-24 h-24 rounded-[2rem] bg-gray-50 border border-gray-100 shadow-sm overflow-hidden"
                        style={{
                          background: user.role === "LIBRARIAN"
                            ? "url('/pfps/librarian.svg') center/cover no-repeat"
                            : user.role === "STAFF"
                            ? "url('/pfps/staff.svg') center/cover no-repeat"
                            : "url('/pfps/display.svg') center/cover no-repeat"
                        }}
                      />
                      <div>
                        <h3 className="text-xl font-black text-slate-900">Profile Settings</h3>
                        <p className="text-sm text-slate-400 font-medium">Manage your public presence and account security</p>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Basic Information</h4>
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-gray-400 mb-2.5 tracking-wider">Full Name</label>
                            <input
                              type="text"
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 focus:ring-2 focus:ring-gray-100 transition-all font-bold placeholder:text-gray-300"
                              placeholder="Your full name"
                            />
                          </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-gray-50">
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Security Upgrade</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-[11px] font-bold uppercase text-gray-400 mb-2.5 tracking-wider">New Password</label>
                              <div className="relative">
                                <input
                                  type={showProfilePassword ? "text" : "password"}
                                  value={profilePassword}
                                  onChange={(e) => setProfilePassword(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 focus:ring-2 focus:ring-gray-100 transition-all font-mono font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowProfilePassword(!showProfilePassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  {showProfilePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold uppercase text-gray-400 mb-2.5 tracking-wider">Confirm Changes</label>
                              <div className="relative">
                                <input
                                  type={showProfileConfirmPassword ? "text" : "password"}
                                  value={profileConfirmPassword}
                                  onChange={(e) => setProfileConfirmPassword(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 focus:ring-2 focus:ring-gray-100 transition-all font-mono font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowProfileConfirmPassword(!showProfileConfirmPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  {showProfileConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings}
                        className="w-full py-5 rounded-[1.25rem] bg-slate-900 text-white font-extrabold text-[15px] shadow-2xl shadow-slate-200 hover:bg-black transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
                      >
                        {isSavingSettings ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                        Update My Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Upload Modal (Portal) ─── */}
      {showUploadModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowUploadModal(false)} />
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-2xl animate-scale-in relative w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-slate-400">
              <Upload className="w-24 h-24" />
            </div>
            <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-10 shrink-0">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Upload Media</h2>
                <p className="text-sm text-slate-400 font-medium mt-1">Your media will be reviewed by the librarian before display.</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors shrink-0">
                <XCircle className="w-6 h-6 text-slate-300" />
              </button>
            </div>
            <div className="relative z-10 overflow-y-auto pr-2 custom-scrollbar flex-1">
              <UploadForm onUploadSuccess={() => {
                setShowUploadModal(false);
                fetchMyMedia();
                fetchStats();
              }} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
