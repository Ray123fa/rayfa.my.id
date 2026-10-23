import type { Prisma, Project } from "@prisma/client";
import { db } from "./content";

type OrderBy<T> = T | T[];

// SQLite stores arrays as JSON strings; retain legacy values the editor can still display.
function normalizeProject(
  row: Project,
): Omit<Project, "techStack"> & { techStack: string | unknown[] } {
  try {
    const value: unknown = JSON.parse(row.techStack);
    if (Array.isArray(value)) return { ...row, techStack: value };
  } catch {
    // Keep legacy comma-separated values as-is.
  }
  return row;
}

const queries = {
  project: async (orderBy: OrderBy<Prisma.ProjectOrderByWithRelationInput>) =>
    (await db().project.findMany({ orderBy })).map(normalizeProject),
  skillCategory: (
    orderBy: OrderBy<Prisma.SkillCategoryOrderByWithRelationInput>,
  ) => db().skillCategory.findMany({ orderBy }),
  skill: (orderBy: OrderBy<Prisma.SkillOrderByWithRelationInput>) =>
    db().skill.findMany({ orderBy }),
  education: (orderBy: OrderBy<Prisma.EducationOrderByWithRelationInput>) =>
    db().education.findMany({ orderBy }),
  experience: (orderBy: OrderBy<Prisma.ExperienceOrderByWithRelationInput>) =>
    db().experience.findMany({ orderBy }),
  certification: (
    orderBy: OrderBy<Prisma.CertificationOrderByWithRelationInput>,
  ) => db().certification.findMany({ orderBy }),
  socialLink: (orderBy: OrderBy<Prisma.SocialLinkOrderByWithRelationInput>) =>
    db().socialLink.findMany({ orderBy }),
  message: (orderBy: OrderBy<Prisma.MessageOrderByWithRelationInput>) =>
    db().message.findMany({ orderBy }),
  adminEmail: (orderBy: OrderBy<Prisma.AdminEmailOrderByWithRelationInput>) =>
    db().adminEmail.findMany({ orderBy }),
  auditLog: (orderBy: OrderBy<Prisma.AuditLogOrderByWithRelationInput>) =>
    db().auditLog.findMany({ orderBy }),
};

type Model = keyof typeof queries;
type DatedModel = "message" | "adminEmail" | "auditLog" | "project";

export function list<M extends DatedModel>(
  model: M,
): Promise<Awaited<ReturnType<(typeof queries)[M]>>>;
export function list<M extends Model>(
  model: M,
  orderBy: Parameters<(typeof queries)[M]>[0],
): Promise<Awaited<ReturnType<(typeof queries)[M]>>>;
export async function list(
  model: Model,
  orderBy: unknown = { createdAt: "desc" },
): Promise<unknown> {
  // The overloads enforce model/order pairing; indexed functions lose that correlation.
  const query = queries[model] as (sort: unknown) => Promise<unknown>;
  // Let database failures reach the server-error handler instead of showing an empty table.
  return query(orderBy);
}
