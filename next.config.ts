import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Configuration pour Netlify sans plugin
  output: 'standalone',
};

export default nextConfig;
