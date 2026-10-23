import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const pages = [
  {
    path: "/",
    changefreq: "weekly",
    priority: "1.0",
  },
  {
    path: "/about",
    changefreq: "monthly",
    priority: "0.8",
  },
  {
    path: "/projects",
    changefreq: "weekly",
    priority: "0.9",
  },
  {
    path: "/contact",
    changefreq: "yearly",
    priority: "0.6",
  },
] as const;

export const GET: APIRoute = ({ site }) => {
  const origin = (
    env.PUBLIC_SITE_URL ||
    site?.origin ||
    "https://example.com"
  ).replace(/\/$/, "");
  const lastmod = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(({ path, changefreq, priority }) => {
    const loc = escapeXml(new URL(path, origin).href);

    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
