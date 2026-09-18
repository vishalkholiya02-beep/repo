import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native Node addon — keep it external to the bundle.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
