import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "makeshop-multi-images.akamaized.net",
        pathname: "/taketani/**",
      },
    ],
  },
};

export default nextConfig;
