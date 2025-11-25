import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    globalNotFound: true,
  },
  // Pas besoin de 'standalone' - le plugin Netlify gère automatiquement
};

export default nextConfig;
