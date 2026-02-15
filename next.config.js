/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Skip static generation for client components
  experimental: {
    serverComponentsExternalPackages: ["lucide-react"],
  },
};

module.exports = nextConfig;
