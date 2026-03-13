/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      // Allow ngrok tunnel domains for self-hosted media
      {
        protocol: "https",
        hostname: "*.ngrok-free.app",
      },
      {
        protocol: "https",
        hostname: "*.ngrok-free.dev",
      },
      {
        protocol: "https",
        hostname: "resedaceous-jeanelle-simply.ngrok-free.dev",
      },
    ],
    // Don't optimize external images — let them load as-is from college server
    unoptimized: true,
  },
};

module.exports = nextConfig;
