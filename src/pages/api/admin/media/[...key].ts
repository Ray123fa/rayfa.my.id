import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getDb } from "@/lib/db";

/**
 * Admin-only image access. The public /media route only serves published
 * projects, so the editor needs this to preview images of drafts as well.
 */
export const GET: APIRoute = async ({ params }) => {
  const key = params.key;
  if (!key || !/^images\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(key)) {
    return new Response("Tidak ditemukan", { status: 404 });
  }

  try {
    const db = getDb(env.DB);
    // Keep D1 lookups sequential. Local Miniflare can hang when Prisma D1
    // receives concurrent queries on one reused client.
    const project = await db.project.findFirst({
      where: { thumbnailKey: key },
      select: { id: true },
    });
    const profile = project
      ? null
      : await db.profile.findFirst({
          where: { ogImageKey: key },
          select: { id: true },
        });
    const education = project || profile
      ? null
      : await db.education.findFirst({
          where: { logoKey: key },
          select: { id: true },
        });
    if (!project && !profile && !education)
      return new Response("Tidak ditemukan", { status: 404 });

    const object = await env.BUCKET.get(key);
    if (!object) return new Response("Tidak ditemukan", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "no-store");
    headers.set("x-content-type-options", "nosniff");
    return new Response(object.body, { headers });
  } catch {
    return new Response("Tidak tersedia.", { status: 503 });
  }
};
