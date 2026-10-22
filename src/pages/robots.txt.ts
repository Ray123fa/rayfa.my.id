import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const GET: APIRoute = ({ site }) => {
  const origin = (
    env.PUBLIC_SITE_URL ||
    site?.origin ||
    "https://example.com"
  ).replace(/\/$/, "");
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nSitemap: ${origin}/sitemap.xml`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
};
