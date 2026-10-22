import { randomToken } from "./crypto";
const NAME = "__Host-portoku_csrf";
export function csrfCookie(token = randomToken(24)) {
  return `${NAME}=${token}; Path=/; Secure; SameSite=Strict; Max-Age=604800`;
}
export function csrfToken(request: Request) {
  return request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((x) => x.startsWith(NAME + "="))
    ?.slice(NAME.length + 1);
}
export function verifyCsrf(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const token = request.headers.get("x-csrf-token");
  try {
    return (
      !!origin &&
      new URL(origin).host === host &&
      !!token &&
      token === csrfToken(request)
    );
  } catch {
    return false;
  }
}
