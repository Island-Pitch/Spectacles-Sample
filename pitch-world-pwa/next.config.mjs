/**
 * next.config.mjs — FW-01: Next.js 15 App Router
 * Custom sw.js is in /public (SW-01), no next-pwa needed.
 * PERF-01: Static export for S3+CloudFront deployment.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
