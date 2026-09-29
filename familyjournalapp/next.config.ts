import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:5092";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Photos are served by the API at signed, expiring URLs (/api/media/{id}?expires=…&sig=…).
  // Passing them through here keeps them on this site's origin, so the API needn't be public.
  async rewrites() {
    return [{ source: "/api/media/:path*", destination: `${apiUrl}/api/media/:path*` }];
  },
  images: {
    // Resized per screen by next/image. The API checks each signature, so only signed URLs load.
    localPatterns: [{ pathname: "/api/media/**" }],
  },
};

export default nextConfig;
