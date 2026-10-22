import { db } from "./content";

const jsonArrays = new Set(["techStack"]);

/**
 * Rows arrive with JSON-string columns (SQLite has no array type).
 * Convert them back to arrays so the admin editor renders comma-separated
 * values instead of raw JSON, and so edits round-trip correctly.
 */
function normalize(row: Record<string, unknown>) {
  const copy: Record<string, unknown> = { ...row };
  for (const key of jsonArrays) {
    if (typeof copy[key] !== "string") continue;
    try {
      const value = JSON.parse(copy[key] as string);
      if (Array.isArray(value)) copy[key] = value;
    } catch {
      // Keep legacy values as-is.
    }
  }
  return copy;
}

export async function list(
  model: string,
  orderBy: Record<string, string> | Record<string, string>[] = { createdAt: "desc" },
) {
  try {
    const client: any = db();
    const rows = await client[model].findMany({ orderBy });
    return rows.map(normalize);
  } catch {
    return [];
  }
}
