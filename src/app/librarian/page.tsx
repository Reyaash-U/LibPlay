"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FolderOpen,
  BarChart3,
  TrendingUp,
  Monitor,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit,
  Play,
  LogOut,
  List,
  LayoutGrid,
  User as UserIcon,
  X,
  Upload,
  Eye,
  EyeOff,
  GripHorizontal,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";
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

type TabType = "dashboard" | "media-stream" | "roles" | "settings" | string;
type MediaStreamTab = "current" | "pending" | "rejected";
type ViewMode = "table" | "list";

interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

function SortableTableRow({ id, item, children, showDragHandle, onPreview }: { id: string, item: MediaItem, children: React.ReactNode, showDragHandle?: boolean, onPreview?: (item: MediaItem) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50/30 group transition-all duration-300">
      {showDragHandle && (
        <td className="w-10 pl-8 py-6">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-600 transition-colors">
            <GripHorizontal className="w-4 h-4" />
          </button>
        </td>
      )}
      {children}
    </tr>
  );
}

function SortableMediaItem({ id, item, mode, onApprove, onReject, onDelete, onUpdate, rank }: { 
  id: string, 
  item: MediaItem, 
  mode: any,
  onApprove?: (id: string) => Promise<void>,
  onReject?: (id: string) => Promise<void>,
  onDelete?: (id: string) => Promise<void>,
  onUpdate?: (id: string, updates: Partial<MediaItem>) => Promise<void>,
  rank?: number
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <MediaCard 
        media={item} 
        mode={mode} 
        onApprove={onApprove} 
        onReject={onReject} 
        onDelete={onDelete} 
        onUpdate={onUpdate}
        dragHandleProps={{ ...attributes, ...listeners }}
        rank={rank}
      />
    </div>
  );
}

export default function LibrarianPage() {
  const [user, setUser] = useState<User | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [mediaStreamTab, setMediaStreamTab] = useState<MediaStreamTab>("current");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, totalUsers: 0, staffCount: 0, displayCount: 0 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [globalPhotoDuration, setGlobalPhotoDuration] = useState<number>(5);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const { lastUploadCompletedAt } = useUpload();
  
  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleUpdateMedia = async (id: string, updates: Partial<MediaItem>) => {
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
      }
    } catch (error) {
      console.error("Failed to update media:", error);
    }
  };

  const handleResetOrder = async () => {
    if (!window.confirm("Standardize order by upload time (FIFO)? This will reset any custom sorting.")) return;
    
    // Sort by createdAt ascending
    const sortedMedia = [...media].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    setMedia(sortedMedia);

    // Persist to server
    const orders = sortedMedia.map((m, index) => ({ id: m.id, order: index }));
    try {
      await fetch("/api/media/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
      });
    } catch (error) {
      console.error("Failed to reset order:", error);
    }
  };

  const handleApplyGlobalDuration = async () => {
    const photoIds = media.filter(m => m.type === "PHOTO").map(m => m.id);
    if (photoIds.length === 0) return;

    if (!window.confirm(`Apply ${globalPhotoDuration}s duration to all ${photoIds.length} photos?`)) return;

    setIsUpdatingBulk(true);
    try {
      const res = await fetch("/api/media/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: photoIds,
          updates: { displayDuration: globalPhotoDuration }
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMedia(prev => prev.map(m => 
          m.type === "PHOTO" ? { ...m, displayDuration: globalPhotoDuration } : m
        ));
      }
    } catch (error) {
      console.error("Bulk update failed:", error);
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id && over) {
      const oldIndex = media.findIndex((m) => m.id === active.id);
      const newIndex = media.findIndex((m) => m.id === over.id);

      const newMedia = arrayMove(media, oldIndex, newIndex);
      setMedia(newMedia);

      // Persist to server
      const orders = newMedia.map((m, index) => ({ id: m.id, order: index }));
      try {
        await fetch("/api/media/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders }),
        });
      } catch (error) {
        console.error("Failed to persist order:", error);
      }
    }
  };
  
  // URL Tab Persistence
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as TabType;
    if (tab && (tab === "dashboard" || tab === "media-stream" || tab === "roles" || tab === "settings")) {
      setActiveTab(tab);
    }
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`${window.location.pathname}?${params.toString()}`);
  };
  
  // New state for Roles & Settings
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: "", email: "", password: "", role: "STAFF" });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editUserPassword, setEditUserPassword] = useState("");
  const [editUserConfirmPassword, setEditUserConfirmPassword] = useState("");
  const [showEditUserPassword, setShowEditUserPassword] = useState(false);
  const [showEditUserConfirmPassword, setShowEditUserConfirmPassword] = useState(false);
  
  // Settings profile state
  const [profileName, setProfileName] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [showProfileConfirmPassword, setShowProfileConfirmPassword] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  const router = useRouter();

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
    if (user) fetchMedia();
  }, [user, activeTab, mediaStreamTab, lastUploadCompletedAt]);

  useEffect(() => {
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
        setProfileName(data.data.user.name);
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
      if (activeTab === "dashboard" || (activeTab === "media-stream" && mediaStreamTab === "current")) {
        url = "/api/media?status=APPROVED&limit=50";
      } else if (activeTab === "media-stream") {
        if (mediaStreamTab === "pending") {
          url = "/api/media?status=PENDING&limit=50";
        } else if (mediaStreamTab === "rejected") {
          url = "/api/media?status=REJECTED&limit=50";
        }
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

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setManagedUsers(data.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoadingUsers(false);
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

  useEffect(() => {
    if (activeTab === "roles") fetchUsers();
  }, [activeTab]);

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      const data = await res.json();
      if (data.success) {
        const item = media.find((m) => m.id === id);
        const oldStatus = item?.status;

        setMedia((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, status: "APPROVED" as const } : m
          )
        );
        if (activeTab === "media-stream" && mediaStreamTab === "pending") {
          setMedia((prev) => prev.filter((m) => m.id !== id));
        }

        setStats((prev) => ({
          ...prev,
          approved: prev.approved + 1,
          pending:
            oldStatus === "PENDING" ? prev.pending - 1 : prev.pending,
          rejected:
            oldStatus === "REJECTED" ? prev.rejected - 1 : prev.rejected,
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
          prev.map((m) =>
            m.id === id ? { ...m, status: "REJECTED" as const } : m
          )
        );
        if (activeTab === "media-stream" && mediaStreamTab === "pending") {
          setMedia((prev) => prev.filter((m) => m.id !== id));
        }

        setStats((prev) => ({
          ...prev,
          rejected: prev.rejected + 1,
          pending:
            oldStatus === "PENDING" ? prev.pending - 1 : prev.pending,
          approved:
            oldStatus === "APPROVED" ? prev.approved - 1 : prev.approved,
        }));
      }
    } catch (error) {
      console.error("Failed to reject:", error);
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
        fetchStats(); // Update counters
      } else {
        alert(data.error || "Failed to delete media");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this account? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setManagedUsers((prev) => prev.filter((u) => u.id !== id));
        fetchStats();
      } else {
        alert(data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserData),
      });
      const data = await res.json();
      if (data.success) {
        setManagedUsers((prev) => [data.data.user, ...prev]);
        setShowAddUser(false);
        setNewUserData({ name: "", email: "", password: "", role: "STAFF" });
        fetchStats();
      } else {
        alert(data.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingUser(true);
    try {
      if (editUserPassword && editUserPassword !== editUserConfirmPassword) {
        alert("Passwords do not match");
        return;
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: editingUser.name, 
          role: editingUser.role,
          ...(editUserPassword ? { password: editUserPassword } : {})
        }),
      });
      const data = await res.json();
      if (data.success) {
        setManagedUsers((prev) => prev.map(u => u.id === editingUser.id ? { ...u, name: editingUser.name, role: editingUser.role } : u));
        setEditingUser(null);
        setEditUserPassword("");
        setEditUserConfirmPassword("");
      } else {
        alert(data.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setIsUpdatingUser(false);
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
          ...(profilePassword ? { password: profilePassword } : {}) 
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Update local user state to sync with sidebar
        setUser(prev => prev ? { ...prev, name: profileName } : null);
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

  const tabTitles: Record<TabType, string> = {
    dashboard: "Librarian Hub",
    "media-stream": "Media Stream",
    roles: "User Roles & Access",
    settings: "Account Settings",
  };

  const tabDescriptions: Record<TabType, string> = {
    dashboard: "Overview of system activity and current library display status",
    "media-stream": "Manage approved, pending, and rejected media assets",
    roles: "Manage accounts for Library Staff and Display Screens",
    settings: "Update your profile information and account credentials",
  };

  const statsCards = [
    {
      label: "Total Users",
      value: stats.totalUsers || 0,
      color: "#000000",
      bgColor: "rgba(0,0,0,0.02)",
      trend: null,
    },
    {
      label: "Staff Count",
      value: stats.staffCount || 0,
      color: "#000000",
      bgColor: "rgba(0,0,0,0.02)",
      trend: null,
    },
    {
      label: "Display Count",
      value: stats.displayCount || 0,
      color: "#000000",
      bgColor: "rgba(0,0,0,0.02)",
      trend: null,
    },
    {
      label: "Approved Videos",
      value: stats.approved || 0,
      color: "#000000",
      bgColor: "rgba(0,0,0,0.02)",
      trend: null,
    },
  ];

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
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          <div className="pl-14 lg:pl-0">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">
              {tabTitles[activeTab]}
            </h1>
            <p className="hidden sm:block mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {tabDescriptions[activeTab]}
            </p>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          {/* ─── Stats Cards ─── */}
          {activeTab !== "settings" && (
            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 mb-10">
              {(activeTab === "media-stream" ? [
                { label: "Total Videos", value: (stats.approved || 0) + (stats.pending || 0) + (stats.rejected || 0), color: "#000000", bgColor: "rgba(0,0,0,0.02)" },
                { label: "Review", value: stats.pending || 0, color: "#000000", bgColor: "rgba(0,0,0,0.02)" },
                { label: "Rejected", value: stats.rejected || 0, color: "#000000", bgColor: "rgba(0,0,0,0.02)" },
                { label: "Total Users", value: stats.totalUsers || 0, color: "#000000", bgColor: "rgba(0,0,0,0.02)" },
              ] : statsCards).map((card) => (
                <div
                  key={card.label}
                  className="group relative overflow-hidden rounded-[1.5rem] p-5 sm:p-7 transition-all duration-300 cursor-default"
                  style={{
                    background: "#ffffff",
                    border: "1px solid rgba(0,0,0,0.03)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.01), 0 10px 15px -3px rgba(0,0,0,0.02)",
                  }}
                  onMouseEnter={(e) => {}}
                  onMouseLeave={(e) => {}}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: card.bgColor }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#94a3b8" }}>{card.label}</p>
                    </div>
                    <p className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: "#0f172a" }}>{card.value}</p>
                  </div>
                </div>
              ))}
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

            {activeTab === "media-stream" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-1">
                    {[
                      { key: "current", label: "Current",  color: "#10b981" },
                      { key: "pending", label: "Review", color: "#f59e0b" },
                      { key: "rejected", label: "Rejected", color: "#6366f1" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setMediaStreamTab(tab.key as MediaStreamTab)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                          mediaStreamTab === tab.key ? "bg-gray-900 text-white shadow-lg" : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:border-l sm:pl-4 border-gray-100 pt-2 sm:pt-0 border-t sm:border-t-0">
                    {mediaStreamTab === "current" && (
                      <div className="flex items-center gap-2 mr-4 pr-4 border-r border-gray-100">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <input 
                            type="number" 
                            value={globalPhotoDuration}
                            onChange={(e) => setGlobalPhotoDuration(Number(e.target.value))}
                            className="w-10 bg-transparent border-none outline-none text-xs font-black text-slate-900"
                            min="1"
                            max="60"
                          />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Sec</span>
                        </div>
                        <button 
                          onClick={handleApplyGlobalDuration}
                          disabled={isUpdatingBulk}
                          className="px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 shadow-sm"
                        >
                          Apply
                        </button>
                        <button 
                          onClick={handleResetOrder}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                          title="Reset to FIFO Order"
                        >
                          <Clock className="w-3 h-3" />
                          Reset
                        </button>
                      </div>
                    )}
                    <button 
                      onClick={() => setShowUploadModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all shadow-sm mr-2"
                    >
                      <Plus className="w-4 h-4" />
                      Upload Media
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
                    <h3 className="text-xl font-ligth italic text-slate-900 uppercase tracking-tight mb-2">
                      No Media Assets Found
                    </h3>
                  </div>
                ) : viewMode === "list" ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToFirstScrollableAncestor]}
                  >
                    <SortableContext
                      items={media.map((m) => m.id)}
                      strategy={rectSortingStrategy}
                      disabled={mediaStreamTab !== "current"}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {media.map((item, index) => (
                          <SortableMediaItem 
                            key={item.id} 
                            id={item.id} 
                            item={item} 
                            mode="librarian" 
                            onApprove={handleApprove} 
                            onReject={handleReject} 
                            onDelete={handleDelete}
                            onUpdate={handleUpdateMedia}
                            rank={index + 1}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                                     <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_2px_4px_rgba(0,0,0,0.01),0_8px_16px_rgba(0,0,0,0.02)] overflow-x-auto">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                      modifiers={[restrictToFirstScrollableAncestor]}
                    >
                      <table className="w-full text-left min-w-[800px]">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            {mediaStreamTab === "current" && (
                              <>
                                <th className="w-10 pl-8"></th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Rank</th>
                              </>
                            )}
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Asset Gallery</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contributor</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Log Date</th>
                            {mediaStreamTab === "current" && (
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Timing</th>
                            )}
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Management</th>
                          </tr>
                        </thead>
                        <SortableContext
                          items={media.map((m) => m.id)}
                          strategy={verticalListSortingStrategy}
                          disabled={mediaStreamTab !== "current"}
                        >
                          <tbody className="divide-y divide-slate-50">
                            {media.map((item, index) => (
                              <SortableTableRow 
                                key={item.id} 
                                id={item.id} 
                                item={item} 
                                showDragHandle={mediaStreamTab === "current"}
                                onPreview={setPreviewMedia}
                              >
                                {mediaStreamTab === "current" && (
                                  <td className="px-6 py-6">
                                    <span className="text-xs font-black text-slate-400">#{index + 1}</span>
                                  </td>
                                )}
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                    <div 
                                      className="relative group/thumb cursor-pointer"
                                      onClick={() => item.status !== "REJECTED" && setPreviewMedia(item)}
                                    >
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
                                {mediaStreamTab === "current" && (
                                  <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                      {item.type === "PHOTO" ? (
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            defaultValue={item.displayDuration || 5}
                                            onBlur={(e) => {
                                              const newVal = parseInt(e.target.value);
                                              if (newVal !== item.displayDuration) {
                                                handleUpdateMedia(item.id, { displayDuration: newVal });
                                              }
                                            }}
                                            className="w-12 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-black text-slate-900 outline-none focus:ring-2 focus:ring-slate-100 transition-all"
                                          />
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Sec</span>
                                        </div>
                                      ) : (
                                        <p className="text-[11px] font-black text-slate-900 tracking-tight leading-tight">ORIGINAL</p>
                                      )}
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Timing</p>
                                    </div>
                                  </td>
                                )}
                                <td className="px-8 py-6 text-right">
                                  <div className="flex justify-end gap-2 transition-all duration-300">
                                    {item.status === "PENDING" && (
                                      <>
                                        <button onClick={() => handleApprove(item.id)} className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-emerald-100"><CheckCircle className="w-5 h-5" /></button>
                                        <button onClick={() => handleReject(item.id)} className="p-2.5 text-amber-500 hover:bg-amber-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-amber-100"><XCircle className="w-5 h-5" /></button>
                                      </>
                                    )}
                                    <button onClick={() => handleDelete(item.id)} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-rose-100"><Trash2 className="w-5 h-5" /></button>
                                  </div>
                                </td>
                              </SortableTableRow>
                            ))}
                          </tbody>
                        </SortableContext>
                      </table>
                    </DndContext>
                  </div>
                )}
              </div>
            )}

            {activeTab === "roles" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm gap-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:flex-1 sm:max-w-2xl">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                      <input type="text" placeholder="Search accounts..." className="w-full pl-11 pr-5 py-3 rounded-2xl bg-gray-50 border-none text-sm outline-none focus:ring-2 focus:ring-gray-100 transition-all font-bold" />
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <select 
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-transparent text-xs font-bold uppercase tracking-wider text-gray-600 outline-none border-none cursor-pointer"
                      >
                        <option value="ALL">All Roles</option>
                        <option value="STAFF">Library Staff</option>
                        <option value="DISPLAY">Public Display</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowAddUser(true);
                      setEditingUser(null);
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-900 text-white font-bold text-sm shadow-lg shadow-gray-200 hover:bg-black transition-all"
                  >
                    <Plus className="w-4.5 h-4.5" />
                    New Account
                  </button>
                </div>

                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Account</th>
                        <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Role</th>
                        <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {managedUsers
                        .filter(u => roleFilter === "ALL" || u.role === roleFilter)
                        .map((mUser) => (
                        <tr key={mUser.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div 
                                className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm overflow-hidden"
                                style={{
                                  background: mUser.role === "LIBRARIAN" 
                                    ? "url('/pfps/librarian.svg') center/cover no-repeat" 
                                    : mUser.role === "STAFF" 
                                    ? "url('/pfps/staff.svg') center/cover no-repeat" 
                                    : "url('/pfps/display.svg') center/cover no-repeat"
                                }}
                              />
                              <div>
                                <p className="font-bold text-sm text-gray-900">{mUser.name}</p>
                                <p className="text-[11px] text-gray-400 font-bold">{mUser.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="px-3 py-1 bg-gray-100 text-[10px] font-extrabold uppercase tracking-widest rounded-lg text-gray-600">
                              {mUser.role}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setEditingUser(mUser)}
                                className="p-2.5 text-gray-300 hover:text-black hover:bg-gray-100/50 rounded-xl transition-all"
                              >
                                <Edit className="w-4.5 h-4.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(mUser.id)}
                                className="p-2.5 text-gray-300 hover:text-black hover:bg-gray-100/50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                              <label className="block text-[11px] font-bold uppercase text-gray-400 mb-2.5 tracking-wider">Confirm Password</label>
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
                        Update My Librarian Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modals (Portals) ─── */}
      {showAddUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddUser(false)} />
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-2xl animate-scale-in relative w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-slate-400">
              <Plus className="w-24 h-24" />
            </div>
            <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-10 shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">New System Account</h2>
              <button onClick={() => setShowAddUser(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors shrink-0">
                <XCircle className="w-6 h-6 text-slate-300" />
              </button>
            </div>
            <div className="relative z-10 overflow-y-auto pr-2 custom-scrollbar flex-1">
              <form onSubmit={handleCreateUser} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                    <input required type="text" value={newUserData.name} onChange={e => setNewUserData({...newUserData, name: e.target.value})} placeholder="Sanjay Parivallal" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 transition-all font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                    <input required type="email" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} placeholder="sanjay@libplay.com" className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 focus:ring-2 focus:ring-gray-100 transition-all font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Initial Password</label>
                    <input required type="password" value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} placeholder="••••••••" className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 focus:ring-2 focus:ring-black transition-all font-mono font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">System Role</label>
                    <select value={newUserData.role} onChange={e => setNewUserData({...newUserData, role: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 focus:ring-2 focus:ring-black transition-all appearance-none cursor-pointer font-bold">
                      <option value="STAFF">Library Staff</option>
                      <option value="DISPLAY">Public Display</option>
                    </select>
                  </div>
                </div>
                <button disabled={isCreatingUser} type="submit" className="w-full py-5 rounded-[1.25rem] bg-black text-white font-extrabold text-[15px] shadow-xl shadow-gray-100 hover:bg-gray-900 transition-all flex items-center justify-center gap-2">
                  {isCreatingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Create Authorized Account
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {editingUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => {
            setEditingUser(null);
            setEditUserPassword("");
            setEditUserConfirmPassword("");
          }} />
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-2xl animate-scale-in relative w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-slate-400">
              <Edit className="w-24 h-24" />
            </div>
            <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-10 shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Update Account</h2>
              <button onClick={() => {
                setEditingUser(null);
                setEditUserPassword("");
                setEditUserConfirmPassword("");
              }} className="p-2 hover:bg-slate-50 rounded-xl transition-colors shrink-0">
                <XCircle className="w-6 h-6 text-slate-300" />
              </button>
            </div>
            <div className="relative z-10 overflow-y-auto pr-2 custom-scrollbar flex-1">
              <form onSubmit={handleUpdateUser} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                    <input required type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 transition-all font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">System Role</label>
                    <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none text-sm text-gray-900 focus:ring-2 focus:ring-gray-100 transition-all appearance-none cursor-pointer font-bold">
                      <option value="STAFF">Library Staff</option>
                      <option value="DISPLAY">Public Display</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">New Password (leave blank to keep current)</label>
                    <div className="relative">
                      <input 
                        type={showEditUserPassword ? "text" : "password"} 
                        value={editUserPassword} 
                        onChange={e => setEditUserPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 transition-all font-mono font-bold" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditUserPassword(!showEditUserPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showEditUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Confirm New Password</label>
                    <div className="relative">
                      <input 
                        type={showEditUserConfirmPassword ? "text" : "password"} 
                        value={editUserConfirmPassword} 
                        onChange={e => setEditUserConfirmPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 transition-all font-mono font-bold" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditUserConfirmPassword(!showEditUserConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showEditUserConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button disabled={isUpdatingUser} type="submit" className="flex-1 py-5 rounded-[1.25rem] bg-black text-white font-extrabold text-[15px] shadow-xl shadow-gray-100 hover:bg-gray-900 transition-all flex items-center justify-center gap-2">
                    {isUpdatingUser ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Update
                  </button>
                  <button type="button" onClick={() => {
                    setEditingUser(null);
                    setEditUserPassword("");
                    setEditUserConfirmPassword("");
                  }} className="px-8 py-5 rounded-[1.25rem] bg-gray-100 text-gray-600 font-bold text-[15px] hover:bg-gray-200 transition-all">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showUploadModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowUploadModal(false)} />
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-2xl animate-scale-in relative w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-slate-400">
              <Upload className="w-24 h-24" />
            </div>
            <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-10 shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Upload New Media</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors shrink-0">
                <XCircle className="w-6 h-6 text-slate-300" />
              </button>
            </div>
            <div className="relative z-10 overflow-y-auto pr-2 custom-scrollbar flex-1">
              <UploadForm onUploadSuccess={() => {
                setShowUploadModal(false);
                fetchStats();
                fetchMedia();
              }} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {previewMedia && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-14 right-0 z-[210] p-2.5 bg-white/10 backdrop-blur rounded-xl text-white hover:bg-white/20 transition-colors shadow-lg"
            >
              <X className="w-6 h-6" />
            </button>
            {previewMedia.type === "VIDEO" ? (
              <video
                src={`/api/media/stream?filename=${encodeURIComponent(previewMedia.publicId)}`}
                controls
                autoPlay
                className="w-full max-h-[85vh] rounded-2xl"
              />
            ) : (
              <img
                src={previewMedia.url}
                alt={previewMedia.title}
                className="w-full max-h-[85vh] object-contain rounded-2xl"
              />
            )}
            <div className="mt-3 text-center">
              <h3 className="text-white text-lg font-semibold">
                {previewMedia.title}
              </h3>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
