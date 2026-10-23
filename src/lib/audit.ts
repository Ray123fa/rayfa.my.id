import type { Db } from "./db";

export async function audit(
  db: Db,
  request: Request,
  action: string,
  actorEmail?: string,
  target?: string,
) {
  await db.auditLog.create({
    data: {
      action,
      actorEmail,
      target,
      ip: request.headers.get("cf-connecting-ip"),
      userAgent: request.headers.get("user-agent")?.slice(0, 500),
    },
  });
}
