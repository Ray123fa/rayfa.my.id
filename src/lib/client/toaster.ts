// Astro hydrates islands with inline bootstrap scripts, which the strict
// `script-src` policy blocks. Mount the Toaster from an external module instead.
import "astro:scripts/before-hydration.js";

let mounted = false;

export async function mountToaster() {
  if (mounted) return;
  mounted = true;

  const [{ createRoot }, { createElement }, { Toaster }] = await Promise.all([
    import("react-dom/client"),
    import("react"),
    import("@/components/ui/toast"),
  ]);

  const host = document.createElement("div");
  document.body.appendChild(host);
  createRoot(host).render(createElement(Toaster));

  // Handle URL param toasts
  const params = new URLSearchParams(location.search);
  const status = params.get("status");
  const action = params.get("action");
  const messages: Record<string, { success: string; error: string }> = {
    tambah: {
      success: "Data berhasil ditambahkan",
      error: "Data gagal ditambahkan",
    },
    edit: {
      success: "Data berhasil diperbarui",
      error: "Data gagal diperbarui",
    },
    hapus: {
      success: "Data berhasil dihapus",
      error: "Data gagal dihapus",
    },
    status_msg: {
      success: "Status pesan berhasil diperbarui",
      error: "Status pesan gagal diperbarui",
    },
    profile: {
      success: "Profil berhasil diperbarui",
      error: "Profil gagal diperbarui",
    },
  };

  if (status === "berhasil" || status === "gagal") {
    const { toast } = await import("@/components/ui/toast");
    const success = status === "berhasil";
    const message = messages[action || ""];

    toast.add({
      type: success ? "success" : "error",
      title: message
        ? message[success ? "success" : "error"]
        : success
          ? "Berhasil disimpan"
          : "Operasi gagal",
    });
    history.replaceState(null, "", location.pathname);
  }
}
