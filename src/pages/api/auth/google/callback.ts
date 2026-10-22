import type { APIRoute } from "astro";
import * as arctic from "arctic";
import { env } from "cloudflare:workers";
import { getDb } from "@/lib/db";
import { cookie, createSession, sessionCookie } from "@/lib/session";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { equalSecret } from "@/lib/crypto";

const clear =
  "__Host-portoku_oauth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
const noStore = { "cache-control": "no-store" };

export const GET: APIRoute = async ({ request }) => {
  const db = getDb(env.DB);
  if (!(await rateLimit(db, `login-callback:${clientIp(request)}`, 20, 600))) {
    return new Response("Terlalu banyak permintaan. Silakan coba lagi nanti.", {
      status: 429,
      headers: noStore,
    });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const raw = cookie(request, "__Host-portoku_oauth");
  if (
    !code ||
    !state ||
    !raw ||
    !(await equalSecret(raw.split(".")[0], state))
  ) {
    return new Response("Akses tidak diizinkan.", {
      status: 400,
      headers: { ...noStore, "set-cookie": clear },
    });
  }

  try {
    const [, verifier] = raw.split(".");
    const google = new arctic.Google(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI,
    );
    const tokens = await google.validateAuthorizationCode(code, verifier);
    const access = tokens.accessToken();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const info = (await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { authorization: `Bearer ${access}` },
        signal: controller.signal,
      },
    )
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("userinfo")),
      )
      .finally(() => clearTimeout(timer))) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    const email = String(info.email || "")
      .trim()
      .toLowerCase();
    const defaultAdmin = String(env.DEFAULT_ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();
    if (defaultAdmin) {
      await db.adminEmail.upsert({
        where: { email: defaultAdmin },
        create: { email: defaultAdmin, isDefault: true },
        // A non-empty update lets Prisma use one atomic SQLite upsert on D1.
        update: { email: defaultAdmin },
      });
    }

    const allowed = await db.adminEmail.findUnique({ where: { email } });
    if (!allowed || info.email_verified !== true || !info.sub) {
      await audit(db, request, "login_denied", email);
      return new Response(null, {
        status: 302,
        headers: {
          ...noStore,
          location: "/admin/login?error=unauthorized",
          "set-cookie": clear,
        },
      });
    }

    const token = await createSession(db, {
      email,
      sub: info.sub,
      name: info.name,
      picture: info.picture,
    });
    await audit(db, request, "login_success", email);

    const headers = new Headers({ ...noStore, location: "/admin" });
    headers.append("set-cookie", sessionCookie(token));
    headers.append("set-cookie", clear);
    return new Response(null, { status: 302, headers });
  } catch {
    return new Response("Akses tidak diizinkan.", {
      status: 400,
      headers: { ...noStore, "set-cookie": clear },
    });
  }
};
