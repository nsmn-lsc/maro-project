import type { NextConfig } from "next";

const allowedOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(',')
  : ['localhost:3000'];

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: allowedOrigins,
};

export default nextConfig;