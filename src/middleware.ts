import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { getDb } from "@/lib/db";
import { validateSession } from "@/lib/session";
import { csrfCookie, csrfToken } from "@/lib/csrf";

const securityHeaders: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "content-security-policy":
    "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com",
};

function applyHeaders(response: Response, headers: Headers) {
  headers.forEach((value, key) => {
    // Never overwrite cookies set by the route itself.
    if (key.toLowerCase() !== "set-cookie") response.headers.set(key, value);
  });
  for (const value of headers.getSetCookie())
    response.headers.append("set-cookie", value);
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const headers = new Headers(securityHeaders);
  // Cloudflare copies this per-response nonce onto its injected bot-detection scripts.
  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
  );
  headers.set(
    "content-security-policy",
    securityHeaders["content-security-policy"].replace(
      "script-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
    ),
  );
  const path = context.url.pathname;
  const adminPage = path.startsWith("/admin") && path !== "/admin/login";
  const adminApi = path.startsWith("/api/admin");

  if (adminPage || adminApi) {
    headers.set("cache-control", "no-store");
    try {
      const session = await validateSession(getDb(env.DB), context.request);
      if (!session) {
        const unauthorized = adminApi
          ? new Response(JSON.stringify({ error: "Akses tidak diizinkan." }), {
              status: 401,
              headers: { "content-type": "application/json; charset=utf-8" },
            })
          : new Response(null, {
              status: 302,
              headers: { location: "/admin/login" },
            });
        return applyHeaders(unauthorized, headers);
      }

      context.locals.admin = {
        email: session.email,
        name: session.name,
        picture: session.picture,
      };
      const token = csrfToken(context.request) || undefined;
      if (token) {
        context.locals.csrf = token;
      } else {
        const value = csrfCookie();
        context.locals.csrf = value.split("=")[1].split(";")[0];
        headers.append("set-cookie", value);
      }
    } catch {
      const failClosed = adminApi
        ? new Response(JSON.stringify({ error: "Akses tidak diizinkan." }), {
            status: 401,
            headers: { "content-type": "application/json; charset=utf-8" },
          })
        : new Response("Akses tidak diizinkan.", {
            status: 401,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
      return applyHeaders(failClosed, headers);
    }
  }

  try {
    const response = await next();
    return applyHeaders(response, headers);
  } catch {
    return applyHeaders(
      new Response("Terjadi gangguan server.", {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      }),
      headers,
    );
  }
});
