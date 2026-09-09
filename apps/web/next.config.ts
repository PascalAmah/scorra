import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let Vercel handle the output — no need for `output: 'standalone'` on Vercel.
  // If you ever self-host (Docker / Render), switch to 'standalone'.

  // Expose the API URL to the browser bundle at build time.
  // Set NEXT_PUBLIC_API_URL in your Vercel project environment variables.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1",
  },

  // Allow images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
