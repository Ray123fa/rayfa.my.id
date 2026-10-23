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
  audit: "auditLog",
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  if (!verifyCsrf(request)) return problem(403, "CSRF");
  const resource = params.resource;
  if (resource !== "messages" && resource !== "audit")
    return problem(404, "Tidak ditemukan");

  try {
    const payload = await bodyJson(request);
    if (
      !payload ||
      typeof payload !== "object" ||
      !("ids" in payload) ||
      !Array.isArray(payload.ids) ||
      payload.ids.length === 0 ||
      payload.ids.length > 100 ||
      payload.ids.some(
        (id) => typeof id !== "string" || id.length === 0 || id.length > 100,
      )
    )
      return problem(400, "Permintaan tidak valid.");

    const ids = [...new Set(payload.ids)];
    const db: any = getDb(env.DB);
    const result = await db[map[resource]].deleteMany({
      where: { id: { in: ids } },
    });
    await Promise.all(
      ids.map((id) =>
        audit(db, request, `delete:${resource}`, locals.admin?.email, id),
      ),
    );
    return json({ count: result.count });
  } catch {
    return problem(400, "Permintaan tidak valid.");
  }
};

export const GET: APIRoute = async ({ params }) => {
  const resource = params.resource || "";
  const db: any = getDb(env.DB);

  if (resource === "profile")
    return json(await db.profile.findUnique({ where: { id: "main" } }));
  if (resource === "audit")
    return json(
      await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    );

  const delegate = db[map[resource]];
  if (!delegate) return problem(404, "Tidak ditemukan");

  const orderBy =
    resource === "messages" || resource === "access"
      ? { createdAt: resource === "messages" ? "desc" : "asc" }
      : { sortOrder: "asc" };
  return json(await delegate.findMany({ orderBy }));
};

async function saveProfile(request: Request, email?: string) {
  const parsed = schemas.profile.parse(await bodyJson(request));
  const db: any = getDb(env.DB);
  const data = parsed;
  const result = await db.profile.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      name: "Portfolio",
      description: "",
      ...data,
    },
    // Keep even an empty profile save on Prisma's native SQLite upsert path.
    update: { ...data, id: "main" },
  });
  await audit(db, request, "update:profile", email, "main");
  return json(result);
}

export const POST: APIRoute = async ({ params, request, locals }) => {
  if (!verifyCsrf(request)) return problem(403, "CSRF");
  const resource = params.resource || "";
  try {
    if (resource === "profile")
      return await saveProfile(request, locals.admin?.email);
    const model = map[resource];
    const schema = (schemas as any)[resource];
    if (!model || !schema || resource === "audit")
      return problem(404, "Tidak ditemukan");

    const parsed = schema.parse(await bodyJson(request));
    const db: any = getDb(env.DB);
    const data =
      resource === "access"
        ? { ...parsed, addedBy: locals.admin?.email, isDefault: false }
        : serializeArrays(resource, parsed);
    const result = await db[model].create({ data });
    await audit(
      db,
      request,
      `create:${resource}`,
      locals.admin?.email,
      result.id,
    );
    return json(result, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return problem(
        400,
        error.issues[0]?.message || "Periksa kembali data yang dimasukkan.",
      );
    }
    if (
      resource === "access" &&
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    )
      return problem(409, "Email admin sudah terdaftar.");
    return problem(400, "Permintaan tidak valid.");
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (params.resource !== "profile")
    return problem(405, "Metode tidak diizinkan.");
  if (!verifyCsrf(request)) return problem(403, "CSRF");
  try {
    return await saveProfile(request, locals.admin?.email);
  } catch {
    return problem(400, "Permintaan tidak valid.");
  }
};
