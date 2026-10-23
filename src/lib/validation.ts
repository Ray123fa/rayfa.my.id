import { z } from "zod";
const requiredText = (n = 200) => z.string().trim().min(1).max(n);
const optionalText = (n = 500) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(n).nullable().optional(),
  );
const httpUrl = z
  .url()
  .max(2048)
  .refine((v) => /^https?:\/\//.test(v));
const imageKey = z
  .string()
  .regex(/^images\/[a-f0-9]{32}\.(jpg|png|webp)$/)
  .nullable()
  .optional();
const stringArray = z.preprocess(
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
  z.array(requiredText(64)).max(30),
);
export const schemas = {
  profile: z
    .object({
      name: requiredText(),
      description: requiredText(4000),
      location: optionalText(),
      education: optionalText(),
      currentRole: optionalText(),
      hobbies: optionalText(),
      ogImageKey: imageKey,
    })
    .partial(),
  projects: z.object({
    title: requiredText(),
    description: requiredText(5000),
    year: z.number().int().min(1900).max(2200),
    techStack: stringArray,
    githubUrl: httpUrl.nullable().optional(),
    demoUrl: httpUrl.nullable().optional(),
    thumbnailKey: imageKey,
    sortOrder: z.number().int().min(-10000).max(10000),
    featured: z.boolean(),
    published: z.boolean(),
  }),
  categories: z.object({
    name: requiredText(100),
    sortOrder: z.number().int(),
  }),
  skills: z.object({
    name: requiredText(100),
    categoryId: requiredText(100),
    sortOrder: z.number().int(),
  }),
  educations: z.object({
    title: requiredText(),
    institution: requiredText(),
    startYear: z.number().int().min(1900).max(2200),
    endYear: z.number().int().min(1900).max(2200).nullable().default(null),
    logoKey: imageKey,
    sortOrder: z.number().int().default(0),
  }).refine((data) => data.endYear == null || data.endYear >= data.startYear, {
    message: "Tahun selesai tidak boleh sebelum tahun mulai.",
    path: ["endYear"],
  }),
  experiences: z.object({
    title: requiredText(),
    organization: requiredText(),
    startDate: requiredText(40),
    endDate: optionalText(40),
    description: optionalText(4000),
    sortOrder: z.number().int(),
  }),
  certifications: z.object({
    kind: z.enum(["competition", "certification"]),
    title: requiredText(),
    issuer: requiredText(),
    year: z.number().int().min(1900).max(2200),
    sortOrder: z.number().int(),
  }),
  socials: z.object({
    platform: requiredText(100),
    url: httpUrl,
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
