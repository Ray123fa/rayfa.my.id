import type { APIRoute } from "astro";
import * as arctic from "arctic";
import { env } from "cloudflare:workers";
import { randomToken } from "@/lib/crypto";
import { csrfCookie } from "@/lib/csrf";
import { getDb } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, problem } from "@/lib/http";

export const GET: APIRoute = async ({ request }) => {
  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.GOOGLE_REDIRECT_URI
  ) {
    return problem(503, "Autentikasi belum dikonfigurasi.");
  }
  if (
    !(await rateLimit(getDb(env.DB), `login:${clientIp(request)}`, 20, 600))
  ) {
    return problem(429, "Terlalu banyak permintaan. Silakan coba lagi nanti.");
  }

  const state = randomToken(24);
  const verifier = arctic.generateCodeVerifier();
  const google = new arctic.Google(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
  const url = google.createAuthorizationURL(state, verifier, [
    "openid",
    "email",
    "profile",
  ]);

  const headers = new Headers({
    location: url.toString(),
    "cache-control": "no-store",
  });
  headers.append(
    "set-cookie",
    `__Host-portoku_oauth=${state}.${verifier}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );
  headers.append("set-cookie", csrfCookie());
  return new Response(null, { status: 302, headers });
};
