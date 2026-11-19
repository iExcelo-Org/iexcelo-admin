// file: site-b/next.config.ts
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const isPreview = process.env.PREVIEW_BUILD === "1";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value:
      "default-src 'self'; " +
      "img-src 'self' data: blob: https://iexcelo.com https://*.iexcelo.com https://imagedelivery.net; " +
      "connect-src 'self' https://api.iexcelo.com https://api-staging.iexcelo.com; " +
      "frame-ancestors 'none'",
  },
  ...(isPreview ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:5555",
        "admin.iexcelo.com",
        "*.admin.iexcelo.com", // branch previews
      ],
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "files.iexcelo.com" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
