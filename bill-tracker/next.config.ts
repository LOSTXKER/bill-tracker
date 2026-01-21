import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dovdfnsvggqejhjzfnvv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    // Cache client-side navigations for faster page transitions
    staleTimes: {
      dynamic: 300, // Cache dynamic pages for 5 minutes
      static: 600, // Cache static pages for 10 minutes
    },
  },
};

export default nextConfig;
