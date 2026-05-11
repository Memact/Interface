(() => {
  const tabsToAdd = [
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
    document.body.classList.remove("portal-menu-open");
    document.getElementById("portal-menu-button")?.setAttribute("aria-expanded", "false");
  }

  function clearPanels() {
    delete document.body.dataset.platformSection;
    document.querySelectorAll(".platform-runtime-panel").forEach((panel) => {
      panel.hidden = true;
    });
  }

  function init() {
    const tabs = document.querySelector(".topbar .tabs");
    if (!tabs) return;

    makePanel("usage", "Usage statistics", "Track request volume, allowed requests, denied requests, and recent activity.");
    makePanel("logs", "Request logs", "Debug API calls by action, result, key prefix, and error reason.");
    makePanel("connections", "Connection management", "See connected apps, approved permissions, consent state, and revoked connections.");

    tabsToAdd.forEach(([key, label]) => {
      if (tabs.querySelector(`[data-platform-tab="${key}"]`)) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tab";
      button.dataset.platformTab = key;
      button.textContent = label;
      button.addEventListener("click", () => showPanel(key));
      const help = Array.from(tabs.children).find((item) => item.textContent.trim() === "Help");
      tabs.insertBefore(button, help || null);
    });

    tabs.querySelectorAll("button:not([data-platform-tab])").forEach((button) => {
      if (button.dataset.platformClear === "1") return;
      button.dataset.platformClear = "1";
      button.addEventListener("click", clearPanels);
    });
  }

  new MutationObserver(init).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("DOMContentLoaded", init);
  init();
})();
