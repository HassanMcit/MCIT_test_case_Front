import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
