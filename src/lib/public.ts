import { env } from "cloudflare:workers";
import { getDb } from "./db";
export async function publicProfile() {
  return getDb(env.DB).profile.findUnique({ where: { id: "main" } });
}
export async function publicProjects(limit?: number) {
  return getDb(env.DB).project.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
}
export async function publicAbout() {
  const db = getDb(env.DB);
  return Promise.all([
    db.skillCategory.findMany({
      include: { skills: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
    db.experience.findMany({ orderBy: { sortOrder: "asc" } }),
    db.certification.findMany({ orderBy: { sortOrder: "asc" } }),
    db.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
}
