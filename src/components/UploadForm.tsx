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
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
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

    setUploading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      if (description.trim()) formData.append("description", description.trim());
      if (eventName.trim()) formData.append("eventName", eventName.trim());
      if (eventDate) formData.append("eventDate", eventDate);

      // Simulate progress for large uploads
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90));
      }, 500);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: "Media uploaded! Waiting for librarian approval.",
        });
        // Reset form
        setFile(null);
        setPreview(null);
        setTitle("");
        setDescription("");
        setEventName("");
        setEventDate("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        onUploadSuccess?.();
      } else {
        setMessage({ type: "error", text: data.error || "Upload failed" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setUploading(false);
      setProgress(0);
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
      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-medium animate-slide-up ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {message.type === "success" ? (
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
              <X className="w-4 h-4 text-rose-600" />
            </div>
          )}
          {message.text}
        </div>
      )}

      {/* File Upload Area */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Photo or Video <span className="text-rose-400">*</span>
        </label>
        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all group bg-gray-50/50"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-7 h-7 text-primary-500" />
            </div>
            <p className="text-gray-600 font-semibold">
              Click to upload or drag & drop
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Images (JPG, PNG, WebP) or Videos (MP4, MOV, AVI) up to 1GB
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50">
            <div className="flex items-center gap-4">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-xl ring-2 ring-primary-100"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-xl flex items-center justify-center">
                  <FileVideo className="w-8 h-8 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-700 truncate">
                  {file.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {file.type.startsWith("video/") ? (
                    <FileVideo className="w-4 h-4 text-red-500" />
                  ) : (
                    <FileImage className="w-4 h-4 text-primary-500" />
                  )}
                  <span className="text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
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
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Title <span className="text-rose-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Annual Reading Festival 2025"
          className="input-modern"
          required
        />
      </div>

      {/* Event Name & Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Event Name
          </label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g., Book Fair 2025"
            className="input-modern"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Event Date
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="input-modern"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the photo or video..."
          rows={3}
          className="input-modern resize-none"
        />
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">Uploading...</span>
            <span className="text-primary-600 font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary-500 to-accent-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={uploading || !file || !title.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl font-semibold hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-200/50 hover:shadow-xl hover:shadow-primary-300/50"
      >
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            Upload Media
          </>
        )}
      </button>
    </form>
  );
}
