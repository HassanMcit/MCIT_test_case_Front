import type { NextConfig } from "next";

const backendHostname = (() => {
  let raw = process.env.NEXT_PUBLIC_BASE_URL?.trim() || "";
  while (
    raw.length >= 2 &&
    ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'")))
  ) {
    raw = raw.slice(1, -1).trim();
  }
  if (raw) {
    try {
      return new URL(raw).hostname;
    } catch {
      // fall through to localhost when NEXT_PUBLIC_BASE_URL is invalid
    }
  }
  return "localhost";
})();

if (!process.env.NEXT_PUBLIC_BUILD_ID) {
  process.env.NEXT_PUBLIC_BUILD_ID = String(Date.now());
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  // Next traces the Node default export, while Workers selects pg-cloudflare's
  // workerd export. Retain both implementations for OpenNext's bundle stage.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/pg-cloudflare/dist/**/*",
      "./node_modules/pg-cloudflare/esm/**/*",
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 60,
      // Full, intent-prefetched workflow pages may be reused briefly in this
      // browser session. Other dynamic pages still require a fresh navigation.
      static: 180,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-3cba56bacf9f4965bbb0989e07dada12.r2.dev",
      },
      {
        protocol: "https",
        hostname: backendHostname,
      },
      {
        protocol: "http",
        hostname: backendHostname,
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
};

export default nextConfig;

// Opt in only for local binding-aware development.
if (process.env.MCIT_CLOUDFLARE_DEV === "true") {
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
}
