(() => {
  const MENU_ID = "portal-menu-button";
  const BACKDROP_ID = "portal-drawer-backdrop";

  function ensureMenu() {
    const topbar = document.querySelector(".page:not(.page-auth) .topbar");
    const tabs = topbar?.querySelector(".tabs");
    if (!topbar || !tabs) return;

    let button = document.getElementById(MENU_ID);
    if (!button) {
      button = document.createElement("button");
      button.id = MENU_ID;
      button.className = "portal-menu-button";
      button.type = "button";
      button.setAttribute("aria-label", "Open dashboard menu");
      button.setAttribute("aria-controls", "portal-tabs");
      button.setAttribute("aria-expanded", "false");
      button.innerHTML = "<span aria-hidden=\"true\"></span>";
      topbar.insertBefore(button, topbar.firstChild);
    }

    tabs.id = "portal-tabs";

    let backdrop = document.getElementById(BACKDROP_ID);
    if (!backdrop) {
      backdrop = document.createElement("button");
      backdrop.id = BACKDROP_ID;
      backdrop.className = "portal-drawer-backdrop";
      backdrop.type = "button";
      backdrop.setAttribute("aria-label", "Close dashboard menu");
      document.body.appendChild(backdrop);
    }

    const close = () => {
      document.body.classList.remove("portal-menu-open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open dashboard menu");
    };

    const open = () => {
      document.body.classList.add("portal-menu-open");
      button.setAttribute("aria-expanded", "true");
      button.setAttribute("aria-label", "Close dashboard menu");
    };

    button.onclick = () => {
      document.body.classList.contains("portal-menu-open") ? close() : open();
    };

    backdrop.onclick = close;
    tabs.querySelectorAll("button").forEach((tab) => tab.addEventListener("click", close));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    }, { once: true });
  }

  const observer = new MutationObserver(ensureMenu);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("DOMContentLoaded", ensureMenu);
  ensureMenu();
})();
