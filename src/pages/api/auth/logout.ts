import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getDb } from "@/lib/db";
import {
  clearSessionCookie,
  deleteSession,
  validateSession,
} from "@/lib/session";
import { verifyCsrf } from "@/lib/csrf";
import { audit } from "@/lib/audit";
import { problem } from "@/lib/http";

export const POST: APIRoute = async ({ request }) => {
  if (!verifyCsrf(request)) return problem(403, "CSRF");
  const db = getDb(env.DB);
  const session = await validateSession(db, request);
  await deleteSession(db, request);
  await audit(db, request, "logout", session?.email);
  return new Response(null, {
    status: 204,
    headers: {
      "set-cookie": clearSessionCookie(),
      "cache-control": "no-store",
    },
  });
};
