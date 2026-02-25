import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "LibPlay - Library Event Display",
  description:
    "Showcase library events with photos and videos in a beautiful carousel display",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
