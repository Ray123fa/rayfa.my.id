import { confirmAction } from "@/lib/adminDialog";
import { fetchWithCsrf } from "@/lib/client/csrf";

export async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    detail?: string;
  } | null;
  if (payload?.error === "CSRF")
    return "Sesi tidak valid. Muat ulang halaman dan coba lagi.";
  return payload?.error || payload?.detail || fallback;
}

export function adminRequest(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetchWithCsrf(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      "Content-Type": "application/json",
    },
  });
}

export async function uploadImage(file: File): Promise<string> {
  const upload = new FormData();
  upload.set("file", file);
  const response = await fetchWithCsrf("/api/admin/upload", {
    method: "POST",
    body: upload,
  });
  if (!response.ok) {
    const error = await getErrorMessage(response, "Gagal mengunggah gambar.");
    throw new Error(error);
  }
  return ((await response.json()) as { key: string }).key;
}

export async function deleteResource(
  url: string,
  confirmMessage: string,
): Promise<boolean> {
  if (!(await confirmAction(confirmMessage))) return false;
  const response = await fetchWithCsrf(url, { method: "DELETE" });
  if (response.ok) {
    location.href = location.pathname + "?status=berhasil&action=hapus";
    return true;
  }
  alert(await getErrorMessage(response, "Gagal menghapus data."));
  return false;
}
