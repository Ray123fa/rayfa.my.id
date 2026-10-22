export function setupAdminSidebar() {
  const layout = document.querySelector<HTMLElement>(".admin-layout");
  const sidebar = document.querySelector<HTMLElement>("#admin-sidebar");
  const main = document.querySelector<HTMLElement>(".admin-main");
  const toggle = document.querySelector<HTMLButtonElement>("[data-sidebar-toggle]");
  const close = document.querySelector<HTMLButtonElement>("[data-sidebar-close]");
  const backdrop = document.querySelector<HTMLElement>("[data-sidebar-backdrop]");
  const skip = document.querySelector<HTMLElement>(".skip");
  if (!layout || !sidebar || !main || !toggle || !close || !backdrop) return;

  const mobile = matchMedia("(max-width: 800px)");
  const storageKey = "portoku.admin.sidebarCollapsed";
  let collapsed = false;
  let drawerOpen = false;
  const previousOverflow = document.body.style.overflow;
  try { collapsed = localStorage.getItem(storageKey) === "true"; } catch {}

  function render() {
    const open = mobile.matches ? drawerOpen : !collapsed;
    const modal = mobile.matches && open;
    layout!.dataset.sidebarReady = "true";
    layout!.dataset.sidebarOpen = String(open);
    sidebar!.inert = !open;
    toggle!.hidden = false;
    toggle!.setAttribute("aria-expanded", String(open));
    toggle!.setAttribute("aria-label", open ? "Tutup panel samping" : "Buka panel samping");
    backdrop!.hidden = !modal;
    main!.inert = modal;
    if (skip) skip.inert = modal;
    document.body.style.overflow = modal ? "hidden" : previousOverflow;
    if (modal) {
      sidebar!.setAttribute("role", "dialog");
      sidebar!.setAttribute("aria-modal", "true");
    } else {
      sidebar!.removeAttribute("role");
      sidebar!.removeAttribute("aria-modal");
    }
  }

  function closeDrawer(restoreFocus = true) {
    drawerOpen = false;
    render();
    if (restoreFocus) toggle!.focus();
  }
  toggle.addEventListener("click", () => {
    if (mobile.matches) {
      drawerOpen = !drawerOpen;
      render();
      if (drawerOpen) close.focus();
    } else {
      collapsed = !collapsed;
      try { localStorage.setItem(storageKey, String(collapsed)); } catch {}
      render();
    }
  });
  close.addEventListener("click", () => closeDrawer());
  backdrop.addEventListener("click", () => closeDrawer());
  sidebar.addEventListener("click", (event) => {
    if (mobile.matches && (event.target as Element).closest("a[href]")) closeDrawer(false);
  });
  document.addEventListener("keydown", (event) => {
    if (!mobile.matches || !drawerOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer();
    } else if (event.key === "Tab") {
      const controls = sidebar.querySelectorAll<HTMLElement>("button, a[href]");
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  mobile.addEventListener("change", () => {
    const focusInside = sidebar.contains(document.activeElement);
    drawerOpen = false;
    render();
    if (focusInside) toggle.focus();
  });
  render();
}
