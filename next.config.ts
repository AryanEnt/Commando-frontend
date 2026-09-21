import type { NextConfig } from "next";

const backend = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow opening the Next.js dev app via this machine's LAN IP
  allowedDevOrigins: ["10.110.110.77", "10.80.80.225"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
