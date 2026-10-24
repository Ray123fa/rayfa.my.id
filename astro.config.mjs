// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Runtime pages read PUBLIC_SITE_URL from the Cloudflare environment.
// This value is only the build-time fallback used by Astro.site.
const site = process.env.PUBLIC_SITE_URL || "http://localhost:4321";

export default defineConfig({
  site,
  output: "server",
  // Remove the stylesheet round trip from the initial render path.
  build: { inlineStylesheets: "always" },
  // Sessions are implemented in D1 (see src/lib/session.ts); don't require a KV binding.
  session: false,
  adapter: cloudflare({ imageService: "passthrough" }),
  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return !pathname.startsWith("/admin") && !pathname.startsWith("/api");
      },
    }),
  ],
  vite: {
    // Keep even small processed scripts external for script-src 'self'.
    build: { assetsInlineLimit: 0 },
    plugins: [tailwindcss()],
    // Load these ESM packages directly to avoid stale SSR optimizer chunks.
    optimizeDeps: {
      exclude: ["arctic", "@prisma/adapter-d1"],
    },
  },
});
