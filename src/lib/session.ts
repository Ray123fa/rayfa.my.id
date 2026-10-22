import { env } from "cloudflare:workers";
import type { Db } from "./db";
import { randomToken, sha256 } from "./crypto";

const NAME = "__Host-portoku_session";
const WEEK = 604800;
const DEFAULT_IDLE = 86400;

function idleSeconds() {
  const hours = Number(env.SESSION_IDLE_HOURS);
  return Number.isFinite(hours) && hours > 0 ? hours * 3600 : DEFAULT_IDLE;
}

export function sessionCookie(token: string, maxAge = WEEK) {
  return `${NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return sessionCookie("", 0);
}

export function cookie(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((x) => x.startsWith(name + "="))
    ?.slice(name.length + 1);
}

export async function createSession(
  db: Db,
  user: { email: string; sub: string; name?: string; picture?: string },
) {
  const token = randomToken();
  const now = new Date();
  // Opportunistic cleanup keeps the session table from growing forever.
  await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.session.create({
    data: {
      tokenHash: await sha256(token),
      email: user.email,
      googleSub: user.sub,
      name: user.name,
      picture: user.picture,
      expiresAt: new Date(now.getTime() + WEEK * 1000),
    },
  });
  return token;
}

export async function validateSession(db: Db, request: Request) {
  const token = cookie(request, NAME);
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: await sha256(token) },
  });
  const now = Date.now();
  const expired =
    !session ||
    session.expiresAt.getTime() < now ||
    session.lastSeenAt.getTime() + idleSeconds() * 1000 < now;
  if (expired) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }
  const allowed = await db.adminEmail.findUnique({
    where: { email: session.email },
  });
  if (!allowed) {
    await db.session.delete({ where: { id: session.id } });
    return null;
  }
  await db.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });
  return session;
}

export async function deleteSession(db: Db, request: Request) {
  const token = cookie(request, NAME);
  if (token)
    await db.session.deleteMany({ where: { tokenHash: await sha256(token) } });
}
