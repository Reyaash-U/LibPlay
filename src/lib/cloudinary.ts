import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export async function uploadToCloudinary(
  file: Buffer,
  options: {
    folder?: string;
    resourceType?: "image" | "video" | "auto";
  } = {}
): Promise<{
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  format: string;
  bytes: number;
  duration?: number;
  width?: number;
  height?: number;
}> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || "lib-play",
        resource_type: options.resourceType || "auto",
        chunk_size: 6000000, // 6MB chunks for large video uploads
        eager:
          options.resourceType === "video"
            ? [{ format: "jpg", transformation: [{ width: 400, crop: "scale" }] }]
            : undefined,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error("No result from Cloudinary"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          thumbnailUrl:
            result.eager?.[0]?.secure_url ||
            (result.resource_type === "image"
              ? cloudinary.url(result.public_id, {
                  width: 400,
                  crop: "scale",
                  format: "jpg",
                })
              : undefined),
          format: result.format,
          bytes: result.bytes,
          duration: result.duration,
          width: result.width,
          height: result.height,
        });
      }
    );

    uploadStream.end(file);
  });
}

export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video" = "image"
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
}
