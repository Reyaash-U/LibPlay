"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Library, Mail, Lock, Loader2, Eye, EyeOff, Upload, Shield, Monitor } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        const role = data.data.user.role;
        if (role === "LIBRARIAN" || role === "ADMIN") {
          router.push("/librarian");
        } else if (role === "DISPLAY") {
          router.push("/");
        } else {
          router.push("/staff");
        }
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-100/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-600 to-accent-500 rounded-3xl mb-5 shadow-lg shadow-primary-500/25 animate-float">
            <Library className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800">
            Welcome to <span className="text-gradient">LibPlay</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Sign in to manage library media</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-white/50 p-8 animate-slide-up">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="p-3.5 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 animate-scale-in flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@library.com"
                  className="input-modern pl-11"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-modern pl-11 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 bg-primary-50/50 backdrop-blur-sm rounded-2xl p-5 border border-primary-100/50 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <p className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-3">
            Demo Credentials
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 bg-white/60 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                  <Upload className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Staff</span>
              </div>
              <span className="text-xs text-gray-500 font-mono">staff@library.com</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-white/60 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Librarian</span>
              </div>
              <span className="text-xs text-gray-500 font-mono">librarian@library.com</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-white/60 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Monitor className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Display</span>
              </div>
              <span className="text-xs text-gray-500 font-mono">display@library.com</span>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              Password: <span className="font-mono font-semibold text-gray-500">password123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
