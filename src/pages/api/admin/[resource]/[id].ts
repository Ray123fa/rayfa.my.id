import type { APIRoute } from "astro";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { getDb } from "@/lib/db";
import { bodyJson, json, problem } from "@/lib/http";
import { schemas, serializeArrays } from "@/lib/validation";
import { verifyCsrf } from "@/lib/csrf";
import { audit } from "@/lib/audit";

const map: Record<string, string> = {
  projects: "project",
  categories: "skillCategory",
  skills: "skill",
  experiences: "experience",
  educations: "education",
  certifications: "certification",
  socials: "socialLink",
  messages: "message",
  access: "adminEmail",
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (!verifyCsrf(request)) return problem(403, "CSRF");
  const r = params.resource || "";
  const id = params.id || "";
  const model = map[r];
  const schema = (schemas as any)[r];
  if (!model || !schema || id.length > 100)
    return problem(404, "Tidak ditemukan");
  try {
    const db: any = getDb(env.DB);
    const payload = await bodyJson(request);
    // Validate education years together, including when only one year changes.
    let parsed;
    if (r === "educations") {
      if (!payload || typeof payload !== "object" || Array.isArray(payload))
        return problem(400, "Permintaan tidak valid.");
      const existing = await db[model].findUnique({ where: { id } });
      if (!existing) return problem(404, "Tidak ditemukan");
      parsed = schema.parse({ ...existing, ...payload });
    } else {
      parsed = schema.partial().parse(payload);
    }
    const data = serializeArrays(r, parsed);
    const result = await db[model].update({ where: { id }, data });
    await audit(db, request, `update:${r}`, locals.admin?.email, id);
    return json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return problem(
        400,
        error.issues[0]?.message || "Periksa kembali data yang dimasukkan.",
      );
    }
    return problem(400, "Permintaan tidak valid.");
  }
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  if (!verifyCsrf(request)) return problem(403, "CSRF");
  const r = params.resource || "";
  const id = params.id || "";
  const model = map[r];
  if (!model || id.length > 100) return problem(404, "Tidak ditemukan");
  try {
    const db: any = getDb(env.DB);
    const item = await db[model].findUnique({ where: { id } });
    if (!item) return problem(404, "Tidak ditemukan");
    if (r === "access") {
      if (
        item.email === locals.admin?.email ||
        item.isDefault ||
        (await db.adminEmail.count()) <= 1
      )
        return problem(409, "Email tidak dapat dihapus.");
    }
    await db[model].delete({ where: { id } });
    const keys = [item.thumbnailKey, item.ogImageKey, item.logoKey].filter(
      Boolean,
    );
    // The record is already gone; a bucket hiccup must not turn the delete into a retry.
    await Promise.allSettled(keys.map((key: string) => env.BUCKET.delete(key)));
    await audit(db, request, `delete:${r}`, locals.admin?.email, id);
    return new Response(null, { status: 204 });
  } catch {
    return problem(400, "Permintaan tidak valid.");
  }
};
