(() => {
  const tabOrder = ["access", "usage", "logs", "connections", "help", "account"];
  const platformTabs = [
    ["usage", "Usage"],
    ["logs", "Logs"],
    ["connections", "Connections"]
  ];

  function text(parent, tag, value, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = value;
    parent.appendChild(el);
    return el;
  }

  function setActive(key) {
    document.querySelectorAll(".topbar .tab").forEach((tab) => {
      const normalKey = tab.textContent.trim().toLowerCase();
      const platformKey = tab.dataset.platformTab || "";
      tab.classList.toggle("is-active", platformKey === key || normalKey === key);
    });
  }

  function closeMenu() {
    document.body.classList.remove("portal-menu-open");
    const button = document.getElementById("portal-menu-button");
    if (button) button.setAttribute("aria-expanded", "false");
  }

  function makePanel(key, title, intro) {
    const dashboard = document.querySelector(".dashboard");
    if (!dashboard || dashboard.querySelector(`[data-platform-panel="${key}"]`)) return;

    const panel = document.createElement("section");
    panel.className = "panel platform-runtime-panel";
    panel.dataset.platformPanel = key;
    panel.hidden = true;

    text(panel, "p", key, "eyebrow");
    text(panel, "h2", title);
    text(panel, "p", intro, "muted");

    const grid = document.createElement("div");
    grid.className = "runtime-grid";

    const cards = key === "logs"
      ? [["verify_api_key", "allowed"], ["memory:read_summary", "denied: missing_scope"], ["connect", "cancelled"]]
      : key === "connections"
        ? [["Active connections", "—"], ["Approvals", "—"], ["Cancellations", "—"], ["Revoked", "—"]]
        : [["Requests today", "—"], ["Requests this month", "—"], ["Allowed / denied", "—"], ["Last request", "—"]];

    cards.forEach(([label, value]) => {
      const card = document.createElement("article");
      card.className = "runtime-card";
      text(card, "span", label);
      text(card, "strong", value);
      grid.appendChild(card);
    });

    panel.appendChild(grid);
    dashboard.prepend(panel);
  }

  function showPanel(key) {
    document.body.dataset.platformSection = key;
    document.querySelectorAll(".platform-runtime-panel").forEach((panel) => {
      panel.hidden = panel.dataset.platformPanel !== key;
    });
    setActive(key);
    closeMenu();
  }

  function clearPanels(key) {
    delete document.body.dataset.platformSection;
    document.querySelectorAll(".platform-runtime-panel").forEach((panel) => {
      panel.hidden = true;
    });
    setActive(key);
    closeMenu();
  }

  function sortTabs(tabs) {
    const buttons = Array.from(tabs.querySelectorAll("button.tab"));
    buttons
      .sort((a, b) => {
        const aKey = a.dataset.platformTab || a.textContent.trim().toLowerCase();
        const bKey = b.dataset.platformTab || b.textContent.trim().toLowerCase();
        return tabOrder.indexOf(aKey) - tabOrder.indexOf(bKey);
      })
      .forEach((button) => tabs.appendChild(button));
  }

  function init() {
    const tabs = document.querySelector(".topbar .tabs");
    if (!tabs) return;

    makePanel("usage", "Usage statistics", "Track request volume, allowed requests, denied requests, and recent activity.");
    makePanel("logs", "Request logs", "Debug API calls by action, result, key prefix, and error reason.");
    makePanel("connections", "Connection management", "See connected apps, approved permissions, consent state, and revoked connections.");

    platformTabs.forEach(([key, label]) => {
      if (tabs.querySelector(`[data-platform-tab="${key}"]`)) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tab";
      button.dataset.platformTab = key;
      button.textContent = label;
      button.addEventListener("click", () => showPanel(key));
      tabs.appendChild(button);
    });

    tabs.querySelectorAll("button.tab:not([data-platform-tab])").forEach((button) => {
      if (button.dataset.platformClear === "1") return;
      button.dataset.platformClear = "1";
      button.addEventListener("click", () => clearPanels(button.textContent.trim().toLowerCase()));
    });

    sortTabs(tabs);
  }

  new MutationObserver(init).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("DOMContentLoaded", init);
  init();
})();
