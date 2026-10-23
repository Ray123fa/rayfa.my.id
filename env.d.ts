/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

// Astro resolves this virtual module through Vite for client initialization.
declare module "astro:scripts/before-hydration.js" {}

interface AppEnv {
  DB: D1Database;
  BUCKET: R2Bucket;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  DEFAULT_ADMIN_EMAIL: string;
  PUBLIC_SITE_URL: string;
  SESSION_IDLE_HOURS?: string;
}
declare namespace Cloudflare {
  interface Env extends AppEnv {}
}
declare namespace App {
  interface Locals {
    admin?: { email: string; name: string | null; picture: string | null };
    csrf?: string;
  }
}
