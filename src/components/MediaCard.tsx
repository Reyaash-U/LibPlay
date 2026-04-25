"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
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
  GripVertical,
  XCircle,
} from "lucide-react";
import { MediaItem } from "@/lib/types";

interface MediaCardProps {
  media: MediaItem;
  mode: "staff" | "librarian" | "display";
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<MediaItem>) => Promise<void>;
  dragHandleProps?: any;
  rank?: number;
}

export default function MediaCard({
  media,
  mode,
  onApprove,
  onReject,
  onDelete,
  onUpdate,
  dragHandleProps,
  rank,
}: MediaCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [duration, setDuration] = useState(media.displayDuration || 5);
  const [isSavingDuration, setIsSavingDuration] = useState(false);

  const handleDurationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseInt(e.target.value);
    setDuration(newVal);
    if (onUpdate) {
      setIsSavingDuration(true);
      try {
        await onUpdate(media.id, { displayDuration: newVal });
      } finally {
        setIsSavingDuration(false);
      }
    }
  };

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
      <div className="group/card relative bg-white rounded-3xl border border-slate-100 shadow-[0_2px_4px_rgba(0,0,0,0.01),0_8px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-all duration-500 hover:-translate-y-1.5 overflow-hidden">
        {/* Thumbnail Container */}
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
          {media.status === "REJECTED" ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              <XCircle className="w-12 h-12 text-slate-200" />
            </div>
          ) : media.type === "VIDEO" ? (
            media.thumbnailUrl && !imageError ? (
              <img
                src={media.thumbnailUrl}
                alt={media.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110 opacity-90 group-hover/card:opacity-100"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileVideo className="w-12 h-12 text-slate-700/50" />
              </div>
            )
          ) : !imageError ? (
            <img
              src={media.thumbnailUrl || media.url}
              alt={media.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110 opacity-90 group-hover/card:opacity-100"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              <FileImage className="w-12 h-12 text-slate-200" />
            </div>
          )}

          {/* Absolute Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
          
          {/* Quick Preview Button */}
          {media.status !== "REJECTED" && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-500 translate-y-4 group-hover/card:translate-y-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPreview(true);
                }}
                className="px-6 py-2.5 bg-white/95 backdrop-blur-md text-slate-900 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-white hover:scale-110 active:scale-95 transition-all"
              >
                Quick View
              </button>
            </div>
          )}

          {/* Status & Type Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${
              media.type === "VIDEO" ? "bg-rose-500/90 text-white border-rose-400/30" : "bg-indigo-500/90 text-white border-indigo-400/30"
            }`}>
              {media.type}
            </span>
          </div>

          <div className="absolute top-4 right-4">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${
              media.status === "APPROVED" ? "bg-emerald-500/90 text-white border-emerald-400/30" :
              media.status === "PENDING" ? "bg-amber-500/90 text-white border-amber-400/30" :
              "bg-slate-500/90 text-white border-slate-400/30"
            }`}>
              {media.status}
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 relative">
          {/* Drag Handle */}
          {mode === "librarian" && dragHandleProps && (
            <div 
              {...dragHandleProps} 
              className="absolute top-6 right-6 p-1.5 text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing hover:bg-slate-50 rounded-lg transition-all"
              title="Drag to reorder"
            >
              <GripVertical className="w-5 h-5" />
            </div>
          )}

          <div className="flex items-start justify-between mb-2">
            <h3 className="text-base font-black text-slate-900 truncate flex-1 tracking-tight pr-8">
              {media.title}
            </h3>
          </div>

          {media.eventName ? (
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              {media.eventName} {media.eventDate && ` \u2022 ${media.eventDate}`}
            </p>
          ) : (
             <div className="h-4 mb-4" /> 
          )}

          <div className="flex items-center justify-between pt-5 border-t border-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 leading-tight">
                  {media.uploadedBy?.name || "Unknown"}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Contributor
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-900 leading-tight">
                {formatDate(media.createdAt)}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {formatFileSize(media.fileSize)}
              </p>
            </div>
          </div>

          {/* Duration Setting (Photos Only) */}
          {mode === "librarian" && media.type === "PHOTO" && media.status === "APPROVED" && (
            <div className="mt-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group/duration">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                  {isSavingDuration ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-400 group-hover/duration:text-slate-600 transition-colors" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 leading-none">Display Timing</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Seconds</p>
                </div>
              </div>
              <input
                type="number"
                min="1"
                max="60"
                value={duration}
                onChange={handleDurationChange}
                disabled={isSavingDuration}
                className="w-14 px-2 py-1.5 bg-white border border-slate-100 rounded-lg text-xs font-black text-center outline-none focus:ring-2 focus:ring-slate-100 transition-all shadow-sm"
              />
            </div>
          )}

          {/* Actions */}
          {mode === "librarian" && media.status === "PENDING" && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleAction("approve", onApprove)}
                disabled={loading !== null}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 bg-emerald-600 text-white rounded-xl text-[13px] font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
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
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 bg-rose-600 text-white rounded-xl text-[13px] font-bold hover:bg-rose-700 disabled:opacity-50 transition-all shadow-sm"
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

          {onDelete && (
            confirmDelete ? (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={async () => {
                    setConfirmDelete(false);
                    await handleAction("delete", onDelete);
                  }}
                  disabled={loading !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 disabled:opacity-50 transition-all uppercase tracking-wider"
                >
                  {loading === "delete" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 mt-2 border border-rose-200 text-rose-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-50 disabled:opacity-50 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Delete Post
              </button>
            )
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPreview(false)}
              className="absolute -top-14 right-0 z-[60] p-2.5 bg-white/10 backdrop-blur rounded-xl text-white hover:bg-white/20 transition-colors shadow-lg"
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
        </div>,
        document.body
      )}
    </>
  );
}
