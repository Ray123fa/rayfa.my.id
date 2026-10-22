import { z } from "zod";
const text = (n = 200) => z.string().trim().min(1).max(n);
const optional = (n = 500) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(n).nullable().optional(),
  );
const url = z
  .url()
  .max(2048)
  .refine((v) => /^https?:\/\//.test(v))
  .nullable()
  .optional();
const requiredUrl = z
  .url()
  .max(2048)
  .refine((v) => /^https?:\/\//.test(v));
const key = z
  .string()
  .regex(/^images\/[a-f0-9]{32}\.(jpg|png|webp)$/)
  .nullable()
  .optional();
const array = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }
  },
  z.array(text(64)).max(30),
);
export const schemas = {
  profile: z
    .object({
      name: text(),
      description: text(4000),
      location: optional(),
      education: optional(),
      currentRole: optional(),
      hobbies: optional(),
      ogImageKey: key,
    })
    .partial(),
  projects: z.object({
    title: text(),
    description: text(5000),
    year: z.number().int().min(1900).max(2200),
    techStack: array,
    githubUrl: url,
    demoUrl: url,
    thumbnailKey: key,
    sortOrder: z.number().int().min(-10000).max(10000),
    featured: z.boolean(),
    published: z.boolean(),
  }),
  categories: z.object({ name: text(100), sortOrder: z.number().int() }),
  skills: z.object({
    name: text(100),
    categoryId: text(100),
    sortOrder: z.number().int(),
  }),
  educations: z.object({
    title: text(),
    institution: text(),
    period: text(100),
    logoKey: key,
    sortOrder: z.number().int().default(0),
  }),
  experiences: z.object({
    title: text(),
    organization: text(),
    startDate: text(40),
    endDate: optional(40),
    description: optional(4000),
    sortOrder: z.number().int(),
  }),
  certifications: z.object({
    kind: z.enum(["competition", "certification"]),
    title: text(),
    issuer: text(),
    year: z.number().int().min(1900).max(2200),
    sortOrder: z.number().int(),
  }),
  socials: z.object({
    platform: text(100),
    url: requiredUrl,
    sortOrder: z.number().int(),
  }),
  messages: z.object({ isRead: z.boolean() }),
  access: z.object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  }),
} as const;
export type Resource = keyof typeof schemas;

/** Columns stored as JSON strings in SQLite but validated as arrays. */
export const stringArrayColumns: Record<string, string[]> = {
  projects: ["techStack"],
};

export function serializeArrays(
  resource: string,
  data: Record<string, unknown>,
) {
  const columns = stringArrayColumns[resource];
  if (!columns) return data;
  const result = { ...data };
  for (const column of columns) {
    if (Array.isArray(result[column]))
      result[column] = JSON.stringify(result[column]);
  }
  return result;
}
