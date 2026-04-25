"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type UploadStatus = "uploading" | "success" | "error" | "cancelled";

export interface UploadItem {
  id: string;
  fileName: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  xhr?: XMLHttpRequest;
}

interface UploadContextType {
  activeUploads: UploadItem[];
  lastUploadCompletedAt: number | null;
  uploadMedia: (formData: FormData, fileName: string) => void;
  cancelUpload: (id: string) => void;
  removeUpload: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [activeUploads, setActiveUploads] = useState<UploadItem[]>([]);
  const [lastUploadCompletedAt, setLastUploadCompletedAt] = useState<number | null>(null);

  const uploadMedia = useCallback((formData: FormData, fileName: string) => {
    const id = Math.random().toString(36).substring(7);
    const xhr = new XMLHttpRequest();

    const newUpload: UploadItem = {
      id,
      fileName,
      progress: 0,
      status: "uploading",
      xhr,
    };

    setActiveUploads((prev) => [...prev, newUpload]);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setActiveUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, progress: percentComplete } : u))
        );
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setActiveUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: "success", progress: 100 } : u))
        );
        setLastUploadCompletedAt(Date.now());
      } else {
        let errorMessage = "Upload failed";
        try {
          const response = JSON.parse(xhr.responseText);
          errorMessage = response.error || errorMessage;
        } catch (e) {}
        setActiveUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: "error", error: errorMessage } : u))
        );
      }
    });

    xhr.addEventListener("error", () => {
      setActiveUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "error", error: "Network error" } : u))
      );
    });

    xhr.addEventListener("abort", () => {
      setActiveUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "cancelled" } : u))
      );
    });

    xhr.open("POST", "/api/media/upload");
    xhr.send(formData);
  }, []);

  const cancelUpload = useCallback((id: string) => {
    setActiveUploads((prev) => {
      const upload = prev.find((u) => u.id === id);
      if (upload && upload.xhr && upload.status === "uploading") {
        upload.xhr.abort();
      }
      return prev.map((u) => (u.id === id ? { ...u, status: "cancelled" as const } : u));
    });
  }, []);

  const removeUpload = useCallback((id: string) => {
    setActiveUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return (
    <UploadContext.Provider value={{ activeUploads, lastUploadCompletedAt, uploadMedia, cancelUpload, removeUpload }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
}
