/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() { return [
    { source: "/catalogue", destination: "/plans", permanent: true },
    { source: "/catalogue/:slug", destination: "/plans/:slug", permanent: true },
    { source: "/catalogue-villa", destination: "/plans?category=villa", permanent: true },
    { source: "/catalogue-duplex", destination: "/plans?category=duplex", permanent: true },
    { source: "/premium-access", destination: "/connexion", permanent: true },
  ]; },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536],
    imageSizes: [96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
