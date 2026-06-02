import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so the parent-directory lockfile doesn't confuse
  // Turbopack's root inference.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
