import { env } from "cloudflare:workers";
import { getDb } from "@/lib/db";
export const db = () => getDb(env.DB);
export function strings(value: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}
export function safeUrl(value: string | null | undefined): string | undefined {
  try {
    const url = new URL(value || "");
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export const media = (key: string) =>
  `/media/${key.split("/").map(encodeURIComponent).join("/")}`;
export async function profileData() {
  try {
    return await db().profile.findUnique({ where: { id: "main" } });
  } catch {
    return null;
  }
}
