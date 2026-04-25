import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LibPlay",
  description:
    "Showcase library events with photos and videos in a beautiful carousel display",
  icons: { icon: "public/favicon.svg" },
};

import { UploadProvider } from "@/context/UploadContext";
import GlobalUploadProgress from "@/components/GlobalUploadProgress";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <UploadProvider>
          <Navbar />
          <main>{children}</main>
          <GlobalUploadProgress />
        </UploadProvider>
      </body>
    </html>
  );
}
