export type Role = "DISPLAY" | "STAFF" | "LIBRARIAN" | "ADMIN";
export type MediaType = "PHOTO" | "VIDEO";
export type MediaStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface MediaItem {
  id: string;
  title: string;
  description: string | null;
  type: MediaType;
  url: string;
  thumbnailUrl: string | null;
  publicId: string;
  status: MediaStatus;
  eventName: string | null;
  eventDate: string | null;
  fileSize: number | null;
  duration: number | null;
  originalFilename: string | null;
  mimeType: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
