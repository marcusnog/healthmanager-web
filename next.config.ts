import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const target = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080";

    return [
      {
        source: "/backend/:path*",
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
