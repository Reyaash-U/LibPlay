"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Library, Mail, Lock, Loader2, Eye, EyeOff, Upload, Shield, Monitor } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
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
    <div className="min-h-screen flex items-center justify-center bg-[#fdfdfb] px-4 py-12 relative overflow-hidden font-sans">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary-100/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary-50/40 rounded-full blur-[120px]" />
        
        {/* Abstract lines/shapes inspired by the image */}
        <svg className="absolute top-0 left-0 w-full h-full opacity-[0.03]" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,20 Q30,15 50,40 T100,30" fill="none" stroke="currentColor" strokeWidth="0.1" />
          <path d="M0,80 Q20,90 40,70 T100,85" fill="none" stroke="currentColor" strokeWidth="0.1" />
        </svg>
      </div>

      <div className="w-full max-w-[1000px] flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
        
        {/* Left Side: Branding & Illustration (Visible on MD+) */}
        <div className="hidden md:flex flex-col flex-1 animate-fade-in">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Library className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-black tracking-tight">LibPlay</h2>
            </div>
            <p className="text-black/60 max-w-sm text-lg leading-relaxed">
              Manage your library's media assets with elegance and ease.
            </p>
          </div>
          
          <div className="relative">
            <img 
              src="/illustrations/library-login.png" 
              alt="Library Illustration" 
              className="w-full max-w-md h-auto animate-float drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-black/[0.03] p-10 md:p-12 animate-slide-up">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-black mb-3">Staff Login</h1>
              <p className="text-black/40 text-sm font-medium">Hey, Enter your details to get sign in to your account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 animate-scale-in flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <div className="relative group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email / Username"
                    className="w-full px-5 py-4 bg-gray-50/50 border border-black/[0.05] rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all duration-300 text-black placeholder:text-black/30 font-medium"
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-black/10 transition-all group-focus-within:bg-primary-500 group-focus-within:scale-125" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Passcode"
                    className="w-full px-5 py-4 bg-gray-50/50 border border-black/[0.05] rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all duration-300 text-black placeholder:text-black/30 font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="text-right">
                  <button type="button" className="text-xs font-bold text-black/40 hover:text-black transition-colors">
                    Having trouble in sign in?
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary-500 text-white rounded-2xl font-bold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl shadow-primary-500/20 active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign in"
                )}
              </button>

              {/* Demo Credentials Restyled */}
              <div className="pt-6 border-t border-black/[0.05]">
                <div className="text-center mb-4">
                  <span className="text-[10px] font-bold text-black/20 uppercase tracking-[0.2em]">Demo Access</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Staff', icon: Upload, email: 'staff@library.com' },
                    { label: 'Librarian', icon: Shield, email: 'librarian@library.com' },
                    { label: 'Display', icon: Monitor, email: 'display@library.com' },
                  ].map((role) => (
                    <button
                      key={role.label}
                      type="button"
                      onClick={() => setEmail(role.email)}
                      className="flex flex-col items-center gap-2 p-3 bg-gray-50/50 rounded-xl hover:bg-primary-50 transition-colors border border-transparent hover:border-primary-100 group"
                    >
                      <role.icon className="w-4 h-4 text-black/30 group-hover:text-primary-500 transition-colors" />
                      <span className="text-[10px] font-bold text-black/50">{role.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-black/30 text-center mt-4 font-medium uppercase tracking-widest">
                  Passcode: <span className="text-black font-bold">password123</span>
                </p>
              </div>
            </form>
          </div>
          
          <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <p className="text-xs font-medium text-black/40">
              Copyright @LibPlay 2026 | Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
