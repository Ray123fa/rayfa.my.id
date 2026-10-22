export const json = (data: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
export const problem = (status: number, error: string) =>
  json({ error }, status);
export async function bodyJson(request: Request, max = 64_000) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > max) throw new Error("BODY_TOO_LARGE");
  return request.json();
}
export function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || "unknown";
}
