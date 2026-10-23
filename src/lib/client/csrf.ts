export function getCsrfToken(): string {
  return (
    document.cookie
      .split("; ")
      .find((value) => value.startsWith("__Host-portoku_csrf="))
      ?.split("=")
      .slice(1)
      .join("=") || ""
  );
}

export function fetchWithCsrf(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), "x-csrf-token": getCsrfToken() },
  });
}
