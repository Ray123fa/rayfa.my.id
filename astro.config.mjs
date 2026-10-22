// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// Runtime pages read PUBLIC_SITE_URL from the Cloudflare environment.
// This value is only the build-time fallback used by Astro.site.
const site = process.env.PUBLIC_SITE_URL || "http://localhost:4321";

export default defineConfig({
  site,
  output: "server",
  // Sessions are implemented in D1 (see src/lib/session.ts); don't require a KV binding.
  session: false,
  adapter: cloudflare({ imageService: "passthrough" }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // Arctic is native ESM; load it directly instead of caching an SSR prebundle.
    optimizeDeps: {
      exclude: ["arctic"],
    },
  },
});
