import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getDb } from "@/lib/db";

export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key;
  if (!key || !/^images\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(key)) {
    return new Response("Tidak ditemukan", { status: 404 });
  }

  try {
    const db = getDb(env.DB);
    // Keep D1 lookups sequential and stop once a public owner is found.
    const project = await db.project.findFirst({
      where: { thumbnailKey: key, published: true },
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
    if (!project && !profile && !education) return new Response("Tidak ditemukan", { status: 404 });

    const object = await env.BUCKET.get(key);
    if (!object) return new Response("Tidak ditemukan", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "public, max-age=0, must-revalidate");
    headers.set("etag", object.httpEtag);
    headers.set("x-content-type-options", "nosniff");

    if (request.headers.get("if-none-match") === object.httpEtag) {
      return new Response(null, { status: 304, headers });
    }
    return new Response(object.body, { headers });
  } catch {
    return new Response("Tidak tersedia.", { status: 503 });
  }
};
