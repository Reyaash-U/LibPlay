"use client";

import { useState } from "react";
import {
  Check,
  X,
  Trash2,
  Play,
  Image as ImageIcon,
  Clock,
  User,
  Calendar,
  FileVideo,
  FileImage,
  Loader2,
  Eye,
} from "lucide-react";
import { MediaItem } from "@/lib/types";

interface MediaCardProps {
  media: MediaItem;
  mode: "staff" | "librarian" | "display";
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function MediaCard({
  media,
  mode,
  onApprove,
  onReject,
  onDelete,
}: MediaCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAction = async (
    action: "approve" | "reject" | "delete",
    handler?: (id: string) => Promise<void>
  ) => {
    if (!handler) return;
    setLoading(action);
    try {
      await handler(media.id);
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusColors = {
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
  };

  return (
    <>
      <div className="glass-card rounded-2xl overflow-hidden hover:shadow-card-hover transition-all duration-300 group/card">
        {/* Thumbnail */}
        <div
          className="relative aspect-video bg-gray-100 cursor-pointer overflow-hidden"
          onClick={() => setShowPreview(true)}
        >
          {media.type === "VIDEO" ? (
            media.thumbnailUrl && !imageError ? (
              <img
                src={media.thumbnailUrl}
                alt={media.title}
                className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <FileVideo className="w-12 h-12 text-gray-500" />
              </div>
            )
          ) : !imageError ? (
            <img
              src={media.thumbnailUrl || media.url}
              alt={media.title}
              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <FileImage className="w-12 h-12 text-gray-300" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/30 transition-colors duration-300 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/card:opacity-100 scale-75 group-hover/card:scale-100 transition-all duration-300">
              <Eye className="w-5 h-5 text-gray-700" />
            </div>
          </div>

          {/* Type badge */}
          <div className="absolute top-2.5 left-2.5">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-sm ${
                media.type === "VIDEO"
                  ? "bg-red-500/80 text-white"
                  : "bg-primary-500/80 text-white"
              }`}
            >
              {media.type === "VIDEO" ? (
                <Play className="w-3 h-3" />
              ) : (
                <ImageIcon className="w-3 h-3" />
              )}
              {media.type}
            </span>
          </div>

          {/* Status badge */}
          <div className="absolute top-2.5 right-2.5">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border backdrop-blur-sm ${
                statusColors[media.status as keyof typeof statusColors]
              }`}
            >
              {media.status}
            </span>
          </div>

          {/* File size */}
          {media.fileSize && (
            <div className="absolute bottom-2.5 right-2.5">
              <span className="px-2 py-1 rounded-lg text-xs bg-black/50 backdrop-blur-sm text-white font-medium">
                {formatFileSize(media.fileSize)}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-800 truncate">{media.title}</h3>

          {media.eventName && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {media.eventName}
              {media.eventDate && ` \u2022 ${media.eventDate}`}
            </p>
          )}

          {media.description && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {media.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="w-3 h-3 text-primary-600" />
              </div>
              <span>{media.uploadedBy?.name || "Unknown"}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDate(media.createdAt)}</span>
            </div>
          </div>

          {/* Actions */}
          {mode === "librarian" && media.status === "PENDING" && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleAction("approve", onApprove)}
                disabled={loading !== null}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-emerald-200"
              >
                {loading === "approve" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Approve
              </button>
              <button
                onClick={() => handleAction("reject", onReject)}
                disabled={loading !== null}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-rose-200"
              >
                {loading === "reject" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Reject
              </button>
            </div>
          )}

          {mode === "librarian" && (
            <button
              onClick={() => handleAction("delete", onDelete)}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 mt-2 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium hover:bg-rose-50 disabled:opacity-50 transition-all"
            >
              {loading === "delete" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="max-w-5xl max-h-[90vh] w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 p-2.5 bg-white/10 backdrop-blur rounded-xl text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            {media.type === "VIDEO" ? (
              <video
                src={media.url}
                controls
                autoPlay
                className="w-full max-h-[85vh] rounded-2xl"
              />
            ) : (
              <img
                src={media.url}
                alt={media.title}
                className="w-full max-h-[85vh] object-contain rounded-2xl"
              />
            )}
            <div className="mt-3 text-center">
              <h3 className="text-white text-lg font-semibold">
                {media.title}
              </h3>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
