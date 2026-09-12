import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow opening the Next.js dev app via this machine's LAN IP
  allowedDevOrigins: ["10.110.110.77"],
};

export default nextConfig;
