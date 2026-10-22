import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  body: z.string().trim().min(1).max(5000),
  website: z.string().max(200).optional(),
});

export function isContactForm(request: Request) {
  const type = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  return (
    type === "application/x-www-form-urlencoded" ||
    type === "multipart/form-data"
  );
}

export async function readContact(request: Request) {
  const type = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (type !== "application/json" && !isContactForm(request))
    throw new Error("UNSUPPORTED_CONTENT_TYPE");

  // Enforce the limit on actual bytes, even without a Content-Length header.
  const max = 64_000;
  if (Number(request.headers.get("content-length") || 0) > max)
    throw new Error("BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("EMPTY_BODY");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new Error("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const bounded = new Response(bytes, { headers: request.headers });
  let raw: unknown;
  if (isContactForm(request)) {
    const entries = [...(await bounded.formData()).entries()];
    if (new Set(entries.map(([key]) => key)).size !== entries.length)
      throw new Error("DUPLICATE_FIELD");
    raw = Object.fromEntries(entries);
  } else {
    raw = await bounded.json();
  }
  const input = z
    .object({
      name: z.string(),
      email: z.string(),
      body: z.string().optional(),
      message: z.string().optional(),
      website: z.string().optional(),
    })
    .strict()
    .parse(raw);
  if (input.body !== undefined && input.message !== undefined)
    throw new Error("AMBIGUOUS_MESSAGE");
  // Keep user content as plain text. Escape at rendering, never execute or decode it.
  return contactSchema.parse({ ...input, body: input.body ?? input.message });
}
