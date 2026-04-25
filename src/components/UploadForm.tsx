"use client";

import { useState, useRef } from "react";
import {
  Upload,
  X,
  FileVideo,
  FileImage,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useUpload } from "@/context/UploadContext";

interface UploadFormProps {
  onUploadSuccess?: () => void;
}

export default function UploadForm({ onUploadSuccess }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const { uploadMedia } = useUpload();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate size (1GB)
    if (selected.size > 1024 * 1024 * 1024) {
      setMessage({ type: "error", text: "File must be under 1GB" });
      return;
    }

    // Validate type
    if (
      !selected.type.startsWith("image/") &&
      !selected.type.startsWith("video/")
    ) {
      setMessage({
        type: "error",
        text: "Only image and video files are allowed",
      });
      return;
    }

    setFile(selected);
    setMessage(null);

    // Create preview
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      setMessage({ type: "error", text: "File and title are required" });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      if (description.trim()) formData.append("description", description.trim());
      if (eventName.trim()) formData.append("eventName", eventName.trim());
      if (eventDate) formData.append("eventDate", eventDate);

      // Start background upload
      uploadMedia(formData, file.name);

      // Reset form and notify parent to close modal
      setFile(null);
      setPreview(null);
      setTitle("");
      setDescription("");
      setEventName("");
      setEventDate("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // We call onUploadSuccess immediately because the requirement is to close the pop up tab
      // when all necessary information is added (and upload starts).
      onUploadSuccess?.();
    } catch (error) {
      setMessage({ type: "error", text: "Failed to start upload. Please try again." });
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Message with Spotlight Effect */}
      {message && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-100 shadow-[0_4px_12px_rgba(16,185,129,0.06)]"
              : "bg-red-50 border-red-100 shadow-[0_4px_12px_rgba(239,68,68,0.06)]"
          }`}
        >
          {message.type === "success" ? (
            <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-emerald-500">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          ) : (
            <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-red-500">
              <span className="text-white text-[12px] font-bold">!</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-bold mb-0.5 ${
              message.type === "success" ? "text-emerald-900" : "text-red-900"
            }`}>
              {message.type === "success" ? "Success" : "Upload Failed"}
            </h3>
            <div className="max-h-32 overflow-y-auto pr-2">
              <p className={`text-[13px] leading-relaxed font-semibold break-all ${
                message.type === "success" ? "text-emerald-700" : "text-red-700"
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Area */}
      <div>
        <label className="block text-[13px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "#64748b" }}>
          Photo or Video <span className="text-red-400">*</span>
        </label>
        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative overflow-hidden border-2 border-dashed border-gray-200 rounded-[2rem] p-12 text-center cursor-pointer hover:border-[#4a8c62] hover:bg-[#4a8c62]/[0.02] transition-all duration-300 group"
          >
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-[1.5rem] bg-gray-50 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:bg-[#4a8c62]/[0.08] transition-all duration-300">
                <Upload className="w-7 h-7 text-gray-400 group-hover:text-[#4a8c62] transition-colors" />
              </div>
              <p className="text-[#1a2e22] text-lg font-bold mb-1">
                Click to upload or drag & drop
              </p>
              <p className="text-gray-400 text-sm font-medium">
                Images or Videos up to 1GB
              </p>
            </div>
          </div>
        ) : (
          <div className="border border-gray-100 rounded-[1.5rem] p-5 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex items-center gap-4">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-2xl ring-4 ring-gray-50"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center">
                <FileVideo className="w-8 h-8 text-gray-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#1a2e22] truncate">
                {file.name}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="px-2 py-0.5 bg-gray-100 rounded-md text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {file.type.split("/")[1]}
                </div>
                <span className="text-sm text-gray-400 font-semibold">
                  {formatFileSize(file.size)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="p-2.5 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all duration-200 text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Title */}
      <div>
        <label className="block text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a descriptive title"
          className="w-full px-5 py-3.5 rounded-2xl text-[15px] outline-none transition-all duration-200"
          style={{
            background: "#ffffff",
            border: "1.5px solid #eee",
            color: "#1a2e22",
            boxShadow: "0 2px 4px rgba(0,0,0,0.01)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#4a8c62";
            e.currentTarget.style.boxShadow = "0 0 0 4px rgba(74,140,98,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#eee";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.01)";
          }}
          required
        />
      </div>

      {/* Event Name & Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>
            Event Name
          </label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Optional event name"
            className="w-full px-5 py-3.5 rounded-2xl text-[15px] outline-none transition-all duration-200"
            style={{
              background: "#ffffff",
              border: "1.5px solid #eee",
              color: "#1a2e22",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#4a8c62";
              e.currentTarget.style.boxShadow = "0 0 0 4px rgba(74,140,98,0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#eee";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
        <div>
          <label className="block text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>
            Event Date
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full px-5 py-3.5 rounded-2xl text-[15px] outline-none transition-all duration-200"
            style={{
              background: "#ffffff",
              border: "1.5px solid #eee",
              color: "#1a2e22",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#4a8c62";
              e.currentTarget.style.boxShadow = "0 0 0 4px rgba(74,140,98,0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#eee";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[13px] font-bold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the photo or video..."
          rows={3}
          className="w-full px-5 py-3.5 rounded-2xl text-[15px] outline-none transition-all duration-200 resize-none"
          style={{
            background: "#ffffff",
            border: "1.5px solid #eee",
            color: "#1a2e22",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#4a8c62";
            e.currentTarget.style.boxShadow = "0 0 0 4px rgba(74,140,98,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#eee";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={!file || !title.trim()}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-[1.25rem] font-bold text-[15px] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.2)]"
          style={{
            background: "#1a1a1a",
            color: "#ffffff",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.background = "#000000";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.background = "#1a1a1a";
          }}
        >
          <Upload className="w-5 h-5" />
          Upload Media
        </button>
      </div>
    </form>
  );
}
