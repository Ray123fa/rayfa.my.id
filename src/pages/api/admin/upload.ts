import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { json, problem } from "@/lib/http";
import { verifyCsrf } from "@/lib/csrf";
import { randomToken } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
const signatures: [string, number[]][] = [
  ["jpg", [255, 216, 255]],
  ["png", [137, 80, 78, 71, 13, 10, 26, 10]],
  ["webp", [82, 73, 70, 70]],
];
export const POST: APIRoute = async ({ request, locals }) => {
  if (!verifyCsrf(request)) return problem(403, "CSRF");
  try {
    const form = await request.formData(),
      file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > 5 * 1024 * 1024
    )
      return problem(400, "Berkas tidak valid.");
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    let ext: string | undefined;
    for (const [type, sig] of signatures)
      if (
        sig.every((v, i) => bytes[i] === v) &&
        (type !== "webp" ||
          String.fromCharCode(...bytes.slice(8, 12)) === "WEBP")
      )
        ext = type;
    if (!ext) return problem(400, "Format gambar tidak didukung.");
    const key = `images/${randomToken(16)}.${ext}`;
    await env.BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}`,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    const db = getDb(env.DB);
    await audit(db, request, "upload", locals.admin?.email, key);
    return json({ key, url: `/media/${key}` }, 201);
  } catch {
    return problem(400, "Gagal mengunggah berkas.");
  }
};
