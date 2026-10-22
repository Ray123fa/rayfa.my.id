// Manual React roots need the same initialization as Astro's hydrated islands.
import "astro:scripts/before-hydration.js";

export interface AdminDialogOptions {
  title: string;
  description: string;
  confirm?: boolean;
}

let queue: Promise<unknown> = Promise.resolve();

function showDialog(options: AdminDialogOptions): Promise<boolean> {
  const origin =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const next = queue.then(async () => {
    const [{ createRoot }, { createElement }, { default: AdminAlertDialog }] =
      await Promise.all([
        import("react-dom/client"),
        import("react"),
        import("@/components/AdminAlertDialog"),
      ]);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    return new Promise<boolean>((resolve) => {
      root.render(
        createElement(AdminAlertDialog, {
          options,
          origin,
          resolve(value) {
            // Let Base UI finish restoring focus before removing the React root.
            setTimeout(() => {
              root.unmount();
              host.remove();
              resolve(value);
            }, 0);
          },
        }),
      );
    });
  });
  queue = next.catch(() => undefined);
  return next;
}

export const confirmAction = (description: string) =>
  showDialog({ title: "Konfirmasi penghapusan", description, confirm: true });
export const showAlert = (description: string) =>
  showDialog({ title: "Tindakan gagal", description });
