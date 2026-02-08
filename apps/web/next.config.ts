import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@chiron-os/db", "@chiron-os/core", "@anthropic-ai/claude-agent-sdk"],
  webpack: (config) => {
    config.externals = [...(config.externals || []), "better-sqlite3"];
    return config;
  },
};

export default nextConfig;
