import type { APIRoute } from "astro";
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
    resource === "messages" ? { createdAt: "desc" } : { sortOrder: "asc" };
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
      return saveProfile(request, locals.admin?.email);
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
  } catch {
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
