import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <div className="flex flex-col md:flex-row min-h-screen">
          <Navbar />
          <main className="flex-1 md:pl-64 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
