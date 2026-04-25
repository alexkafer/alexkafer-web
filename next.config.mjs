/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
