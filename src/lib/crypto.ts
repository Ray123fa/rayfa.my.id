export function randomToken(bytes = 32) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
export async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
export async function equalSecret(a: string, b: string) {
  const key = await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(a),
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(b),
  );
}
