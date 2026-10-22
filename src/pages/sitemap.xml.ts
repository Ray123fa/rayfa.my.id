import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const GET: APIRoute = ({ site }) => {
  const origin = (
    env.PUBLIC_SITE_URL ||
    site?.origin ||
    "https://example.com"
  ).replace(/\/$/, "");
  const pages = ["/", "/about", "/projects", "/contact"];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((path) => `<url><loc>${new URL(path, origin).href}</loc></url>`).join("")}</urlset>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
