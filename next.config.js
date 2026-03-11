/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      // Allow ngrok tunnel domain for self-hosted media
      {
        protocol: "https",
        hostname: "*.ngrok-free.app",
      },
      {
        protocol: "https",
        hostname: "resedaceous-jeanelle-simply.ngrok-free.dev",
      },
    ],
  },
};

module.exports = nextConfig;
