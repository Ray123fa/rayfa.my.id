import type { Db } from "./db";
export async function rateLimit(
  db: Db,
  key: string,
  limit: number,
  seconds: number,
) {
  const now = new Date();
  const current = await db.rateLimit.findUnique({ where: { key } });
  if (!current || current.resetAt <= now) {
    await db.rateLimit.upsert({
      where: { key },
      create: {
        key,
        count: 1,
        resetAt: new Date(now.getTime() + seconds * 1000),
      },
      update: { count: 1, resetAt: new Date(now.getTime() + seconds * 1000) },
    });
    return true;
  }
  if (current.count >= limit) return false;
  await db.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
  return true;
}
