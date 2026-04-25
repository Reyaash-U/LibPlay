"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Library,
  LogOut,
  Upload,
  Shield,
  Monitor,
  Menu,
  X,
} from "lucide-react";

interface User {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success && data.data.user) {
        setUser(data.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path;

  if (pathname === "/" || pathname === "/login" || pathname === "/librarian" || pathname === "/staff") return null;

  return (
    <nav className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
            >
              <div className="p-1.5 bg-gradient-to-br from-primary-600 to-accent-500 rounded-xl shadow-md group-hover:shadow-lg group-hover:shadow-primary-500/20 transition-all duration-300 group-hover:scale-105">
                <Library className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold text-gradient">LibPlay</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive("/")
                ? "bg-primary-50 text-primary-700 shadow-sm"
                : "text-gray-500 hover:text-primary-600 hover:bg-gray-50"
                }`}
            >
              <Monitor className="w-4 h-4" />
              Display
            </Link>



            {(user?.role === "STAFF" || user?.role === "LIBRARIAN" || user?.role === "ADMIN") && (
              <Link
                href={user?.role === "STAFF" ? "/staff" : "/librarian"}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive(user?.role === "STAFF" ? "/staff" : "/librarian")
                    ? "bg-primary-50 text-primary-700 shadow-sm"
                    : "text-gray-500 hover:text-primary-600 hover:bg-gray-50"
                  }`}
              >
                <Shield className="w-4 h-4" />
                Dashboard
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">
                      {user.name}
                    </p>
                    <p className="text-[10px] font-bold tracking-wider text-primary-500 uppercase">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="ml-4 btn-primary text-sm"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {menuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white pb-4">
          <div className="px-4 pt-2 space-y-1">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <Monitor className="w-5 h-5" />
              Display
            </Link>



            {(user?.role === "STAFF" || user?.role === "LIBRARIAN" || user?.role === "ADMIN") && (
              <Link
                href={user?.role === "STAFF" ? "/staff" : "/librarian"}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Shield className="w-5 h-5" />
                Dashboard
              </Link>
            )}

            {user ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 w-full"
              >
                <LogOut className="w-5 h-5" />
                Logout ({user.name})
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-primary-600 font-medium"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
