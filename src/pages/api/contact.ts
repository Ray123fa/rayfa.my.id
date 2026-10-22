import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getDb } from "@/lib/db";
import { json, problem, clientIp } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { isContactForm, readContact } from "@/lib/contact";
import { sha256 } from "@/lib/crypto";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = isContactForm(request);
  try {
    const db = getDb(env.DB);
    const ip = await sha256(clientIp(request));
    if (!(await rateLimit(db, `contact:${ip}`, 5, 3600))) {
      return form
        ? redirect("/contact?error=rate", 303)
        : problem(429, "Terlalu banyak permintaan. Silakan coba lagi nanti.");
    }

    const data = await readContact(request);

    // Honeypot: real users never fill this field. Pretend success for bots.
    if (data.website?.trim()) {
      return form ? redirect("/contact?sent=1", 303) : json({ ok: true });
    }

    await db.message.create({
      data: { name: data.name, email: data.email, body: data.body, ipHash: ip },
    });
    return form ? redirect("/contact?sent=1", 303) : json({ ok: true }, 201);
  } catch {
    return form
      ? redirect("/contact?error=invalid", 303)
      : problem(400, "Permintaan tidak valid.");
  }
};
