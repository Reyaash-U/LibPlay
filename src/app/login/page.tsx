"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Eye, EyeOff } from "lucide-react";

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
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ backgroundColor: "#111111" }}
    >
      {/* ─── LEFT PANEL ─── */}
      <div className="hidden lg:flex lg:w-[50%] flex-col items-center justify-between relative overflow-hidden px-10 xl:px-14 py-10" style={{ backgroundColor: "#111111" }}>
        {/* Spacer top */}
        <div />

        {/* Center block — circle + illustration */}
        <div className="relative flex flex-col items-center">
          {/* Large decorative circle */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 480,
              height: 480,
              background:
                "radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 65%, transparent 100%)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />

          {/* Illustration */}
          <div className="relative z-10 w-[340px] h-[340px] xl:w-[380px] xl:h-[380px]">
            <Image
              src="/library-illustration.png"
              alt="Library media management illustration"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Bottom text — elegant typography */}
        <div className="relative z-10 text-center">

          <p
            className="text-[1.35rem] xl:text-[1.5rem] font-light italic tracking-tight leading-snug"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >

           Media Management Platform
          </p>
          <div
            className="mx-auto mt-3 w-8 h-[2px] rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)" }}
          />
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div
        className="flex-1 flex flex-col min-h-screen lg:min-h-0 lg:rounded-l-[2.5rem] relative z-10"
        style={{
          backgroundColor: "#fff",
          boxShadow: "-6px 0 40px rgba(0,0,0,0.08)",
        }}
      >
        {/* Logo — top */}
        <div className="flex justify-center pt-10 sm:pt-12 lg:pt-14">
          <div className="flex items-center gap-3">
            <Image
              src="/libplay.png"
              alt="LibPlay logo"
              width={48}
              height={48}
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
            />
            <h1
              className="text-[1.6rem] sm:text-[1.85rem] font-extrabold uppercase"
              style={{ color: "#1a2e22", letterSpacing: "0.12em" }}
            >
              LIBPLAY
            </h1>
          </div>
        </div>

        {/* Form — vertically centered */}
        <div className="flex-1 flex items-center justify-center px-7 sm:px-12 lg:px-16 xl:px-20">
          <div className="w-full max-w-[400px]">
            {/* Sign In heading */}
            <h2
              className="text-[1.65rem] sm:text-[1.8rem] font-bold tracking-tight mb-7"
              style={{ color: "#1a2e22" }}
            >
              Sign In
            </h2>

            {/* Error */}
            {error && (
              <div
                className="mb-5 flex items-center gap-2.5 p-3.5 rounded-lg text-sm"
                style={{
                  background: "#fef2f2",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "#dc2626" }}
                />
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username / Email */}
              <div>
                <label
                  className="block text-[13px] font-medium mb-1.5"
                  style={{ color: "#4b5563" }}
                >
                  Username or email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  suppressHydrationWarning
                  className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all duration-200"
                  style={{
                    background: "#fff",
                    border: "1.5px solid #ddd",
                    color: "#111",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#4a8c62";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(74,140,98,0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#ddd";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-[13px] font-medium mb-1.5"
                  style={{ color: "#4b5563" }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    suppressHydrationWarning
                    className="w-full px-4 py-3 pr-12 rounded-xl text-[15px] outline-none transition-all duration-200"
                    style={{
                      background: "#fff",
                      border: "1.5px solid #ddd",
                      color: "#111",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#4a8c62";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px rgba(74,140,98,0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#ddd";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                    style={{ color: "#aaa" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#555")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#aaa")
                    }
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-[18px] h-[18px]" />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sign In button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  suppressHydrationWarning
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "#2d2d2d",
                    color: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = "#1a1a1a";
                      e.currentTarget.style.boxShadow =
                        "0 2px 8px rgba(0,0,0,0.2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#2d2d2d";
                    e.currentTarget.style.boxShadow =
                      "0 1px 3px rgba(0,0,0,0.12)";
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-[18px] h-[18px] animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div
          className="text-center px-8 py-5 text-[11px]"
          style={{ color: "#b0b0b0" }}
        >
          © 2026 LibPlay Inc. All rights reserved.
        </div>
      </div>
    </div>
  );
}
