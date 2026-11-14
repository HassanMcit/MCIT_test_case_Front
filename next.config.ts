import type { NextConfig } from "next";

if (!process.env.NEXT_PUBLIC_BUILD_ID) {
  process.env.NEXT_PUBLIC_BUILD_ID = String(Date.now());
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID,
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
        hostname: "mcit-test-case-backend.onrender.com",
      },
      {
        protocol: "http",
        hostname: "mcit-test-case-backend.onrender.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
};

export default nextConfig;
