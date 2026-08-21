import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker / Render image (copies .next/standalone).
  output: "standalone",
};

export default nextConfig;
