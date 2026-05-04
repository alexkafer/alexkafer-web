/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/labs/lunar-lander/:path*",
        destination: "/labs",
        permanent: false,
      },
    ];
  },
  // Isolate dev's build artifacts from production's so running `npm run build`
  // (or `cf:build`) while the portless dev server is up doesn't clobber the
  // dev server's webpack chunks — which would leave the browser fetching 404'd
  // chunks and rendering only the SSR shell ("Skip to content").
  // OpenNext / `cf:build` still expects the default `.next/`.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

// Hook OpenNext into `next dev` so route handlers can lazily access
// Cloudflare bindings (D1, Durable Objects) via `getCloudflareContext({ async: true })`.
// Safe to call here — it no-ops in production builds.
if (process.env.NODE_ENV !== "production") {
  try {
    const { initOpenNextCloudflareForDev } = await import(
      "@opennextjs/cloudflare"
    );
    await initOpenNextCloudflareForDev();
  } catch {
    // Adapter not available (e.g. minimal install) — fall back to libsql for local dev.
  }
}

export default nextConfig;
