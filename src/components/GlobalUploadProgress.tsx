"use client";

import { useUpload } from "@/context/UploadContext";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function GlobalUploadProgress() {
  const { activeUploads, cancelUpload, removeUpload } = useUpload();
  const [visibleUploads, setVisibleUploads] = useState<string[]>([]);

  // Auto-remove successful or cancelled uploads after a delay
  useEffect(() => {
    activeUploads.forEach((upload) => {
      if ((upload.status === "success" || upload.status === "cancelled" || upload.status === "error") && !visibleUploads.includes(upload.id)) {
        const timer = setTimeout(() => {
          removeUpload(upload.id);
        }, 5000);
        return () => clearTimeout(timer);
      }
    });
  }, [activeUploads, removeUpload]);

  if (activeUploads.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-80 pointer-events-none">
      {activeUploads.map((upload) => (
        <div
          key={upload.id}
          className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-gray-100 p-4 animate-in slide-in-from-right-10 duration-300 pointer-events-auto overflow-hidden relative"
        >
          {/* Progress Bar Background */}
          {upload.status === "uploading" && (
            <div 
              className="absolute bottom-0 left-0 h-1 bg-emerald-500/20 transition-all duration-300"
              style={{ width: "100%" }}
            >
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${upload.progress}%` }}
              />
            </div>
          )}

          <div className="flex items-start gap-4">
            <div className={`mt-1 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
              upload.status === "success" ? "bg-emerald-50 text-emerald-500" :
              upload.status === "error" ? "bg-red-50 text-red-500" :
              upload.status === "cancelled" ? "bg-gray-50 text-gray-500" :
              "bg-blue-50 text-blue-500"
            }`}>
              {upload.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin" />}
              {upload.status === "success" && <CheckCircle className="w-4 h-4" />}
              {upload.status === "error" && <AlertCircle className="w-4 h-4" />}
              {upload.status === "cancelled" && <X className="w-4 h-4" />}
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <p className="text-sm font-bold text-gray-900 truncate">
                {upload.fileName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className={`text-[11px] font-bold uppercase tracking-wider ${
                  upload.status === "success" ? "text-emerald-600" :
                  upload.status === "error" ? "text-red-600" :
                  upload.status === "cancelled" ? "text-gray-500" :
                  "text-blue-600"
                }`}>
                  {upload.status === "uploading" ? `Uploading ${upload.progress}%` : 
                   upload.status === "success" ? "Completed" : 
                   upload.status === "error" ? "Failed" : "Cancelled"}
                </p>
              </div>
              {upload.error && (
                <p className="text-[10px] text-red-500 mt-1 font-medium line-clamp-2">
                  {upload.error}
                </p>
              )}
            </div>

            <button
              onClick={() => {
                if (upload.status === "uploading") {
                  cancelUpload(upload.id);
                } else {
                  removeUpload(upload.id);
                }
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
