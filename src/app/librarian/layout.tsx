"use client";

export default function LibrarianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f1f5f9" }}>
      {children}
    </div>
  );
}
