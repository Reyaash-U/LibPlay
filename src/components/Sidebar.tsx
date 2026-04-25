"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LayoutDashboard,
  Play,
  Users,
  FolderOpen,
  Settings as SettingsIcon,
} from "lucide-react";

interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface SidebarProps {
  user: User | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  stats: { pending: number; approved: number; rejected: number; [key: string]: any };
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const librarianNavItems: {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  badge?: string;
}[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "#6366f1",
    bgColor: "rgba(99,102,241,0.08)",
  },
  {
    key: "media-stream",
    label: "Media Stream",
    icon: Play,
    color: "#10b981",
    bgColor: "rgba(16,185,129,0.08)",
    badge: "pending", // Show pending badge on media stream
  },
  {
    key: "roles",
    label: "Roles & Users",
    icon: Users,
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.08)",
  },
];

const staffNavItems: {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  badge?: string;
}[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "#6366f1",
    bgColor: "rgba(99,102,241,0.08)",
  },
  {
    key: "my-uploads",
    label: "My Uploads",
    icon: FolderOpen,
    color: "#6366f1",
    bgColor: "rgba(99,102,241,0.08)",
  },
];

export default function Sidebar({
  user,
  activeTab,
  onTabChange,
  stats,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const isStaff = user?.role === "STAFF";
  const currentNavItems = isStaff ? staffNavItems : librarianNavItems;

  // Close mobile sidebar on route change or resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleNavClick = (tab: string) => {
    onTabChange(tab);
    setMobileOpen(false);
  };

  const getBadgeCount = (item: (typeof currentNavItems)[0]) => {
    if (!item.badge) return null;
    const count = stats[item.badge];
    return count > 0 ? count : null;
  };

  /* ─── Sidebar Inner Content ─── */
  const sidebarContent = (isMobile: boolean) => {
    const isExpanded = isMobile || !collapsed;

    return (
      <div className="flex flex-col h-full">
        {/* ─── Logo + Toggle ─── */}
        <div
          className="relative flex items-center px-4 h-[72px] shrink-0"
          style={{
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {isExpanded ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Image
                    src="/libplay.png"
                    alt="LibPlay"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <span
                  className="text-[1.1rem] font-black uppercase tracking-tight text-slate-900"
                >
                  LibPlay
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 mb-1">
                <Image
                  src="/libplay.png"
                  alt="LibPlay"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
            </div>
          )}

          {/* ─── Floating Edge Toggle ─── */}
          {!isMobile && (
            <button
              onClick={() => onCollapsedChange(!collapsed)}
              className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-gray-100 shadow-sm hover:shadow-md hover:scale-110 transition-all duration-200 z-50 flex items-center justify-center text-gray-400 hover:text-gray-900"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* ─── Dashboard Label ─── */}
        {isExpanded && (
          <div className="px-5 pt-6 pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: "rgba(0,0,0,0.35)" }} />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{ color: "rgba(0,0,0,0.35)" }}
              >
                {isStaff ? "Staff Dashboard" : "Librarian Dashboard"}
              </span>
            </div>
          </div>
        )}

        {/* ─── Navigation ─── */}
        <nav className={`flex-1 ${isExpanded ? "px-3" : "px-2"} py-2 space-y-1 overflow-y-auto`}>
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            const badgeCount = getBadgeCount(item);

            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`group w-full flex items-center rounded-xl transition-all duration-200 relative ${
                  isExpanded
                    ? "gap-3 px-3.5 py-2.5"
                    : "justify-center px-0 py-2.5"
                } ${
                  isActive 
                    ? "bg-slate-50 border-2 border-slate-900" 
                    : "bg-transparent border-2 border-transparent hover:bg-slate-50/50"
                }`}
                title={collapsed && !isMobile ? item.label : undefined}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200"
                >
                  <Icon
                    className="w-[18px] h-[18px] transition-colors duration-200"
                    style={{
                      color: isActive
                        ? "#0f172a"
                        : "#94a3b8",
                    }}
                  />
                </div>

                {isExpanded && (
                  <>
                    <span
                      className={`text-[13px] font-black uppercase tracking-tight transition-colors duration-200 whitespace-nowrap ${
                        isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    >
                      {item.label}
                    </span>

                    {badgeCount !== null && (
                      <span
                        className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600"
                      >
                        {badgeCount}
                      </span>
                    )}
                  </>
                )}

                {/* Collapsed badge dot */}
                {!isExpanded && badgeCount !== null && (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* ─── User info + Logout ─── */}
        {user && (
          <div
            className={`shrink-0 ${isExpanded ? "px-3" : "px-2"} py-4`}
            style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
          >
            {isExpanded ? (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleNavClick("settings")}
                  className="flex items-center gap-3 px-2 py-2 flex-1 text-left hover:bg-gray-50 rounded-2xl transition-all min-w-0"
                >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden border border-gray-100 shadow-sm"
                      style={{
                        background: user.role === "LIBRARIAN" 
                          ? "url('/pfps/librarian.svg') center/cover no-repeat" 
                          : user.role === "STAFF" 
                          ? "url('/pfps/staff.svg') center/cover no-repeat" 
                          : "url('/pfps/display.svg') center/cover no-repeat"
                      }}
                    >
                      {/* Empty div for SVG background */}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-semibold truncate"
                        style={{ color: "#1a2e22" }}
                      >
                        {user.name}
                      </p>
                      <p
                        className="text-[10px] font-bold uppercase tracking-wider text-gray-400"
                      >
                        {user.role}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg transition-all duration-200 shrink-0"
                    style={{ color: "rgba(0,0,0,0.3)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#f43f5e";
                      e.currentTarget.style.background = "rgba(244,63,94,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(0,0,0,0.3)";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => handleNavClick("settings")}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold hover:scale-105 transition-transform shrink-0 overflow-hidden border border-gray-100 shadow-sm"
                    style={{
                      background: user.role === "LIBRARIAN" 
                        ? "url('/pfps/librarian.svg') center/cover no-repeat" 
                        : user.role === "STAFF" 
                        ? "url('/pfps/staff.svg') center/cover no-repeat" 
                        : "url('/pfps/display.svg') center/cover no-repeat"
                    }}
                    title={user.name}
                  >
                  </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg transition-all duration-200"
                  style={{ color: "rgba(0,0,0,0.3)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#f43f5e";
                    e.currentTarget.style.background = "rgba(244,63,94,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(0,0,0,0.3)";
                    e.currentTarget.style.background = "transparent";
                  }}
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ─── Mobile hamburger button ─── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-xl shadow-lg transition-all duration-200"
        style={{
          background: "#ffffff",
          color: "rgba(0,0,0,0.8)",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ─── Mobile overlay ─── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          />
          <div
            className="absolute left-0 top-0 bottom-0 w-[280px] animate-slide-in-left shadow-2xl"
            style={{ background: "#ffffff" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close btn */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg z-10"
              style={{ color: "rgba(0,0,0,0.3)" }}
            >
              <X className="w-5 h-5" />
            </button>

            {sidebarContent(true)}
          </div>
        </div>
      )}

      {/* ─── Desktop sidebar ─── */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 transition-all duration-300 ease-in-out"
        style={{
          width: collapsed ? 72 : 260,
          background: "#ffffff",
          borderRight: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="relative z-10 flex flex-col h-full">
          {sidebarContent(false)}
        </div>
      </aside>
    </>
  );
}
