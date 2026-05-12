(() => {
  const PANEL_ID = "memact-learn-more-panel";
  const dismissedKey = "memact_help_nudge_dismissed";

  function openHelpPanel() {
    if (document.getElementById(PANEL_ID)) return;
    const backdrop = document.createElement("div");
    backdrop.className = "memact-learn-more-backdrop";
    backdrop.id = PANEL_ID;
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.innerHTML = `
      <section class="memact-learn-more-panel" aria-label="Memact access notes">
        <div class="memact-learn-more-head">
          <div>
            <p class="eyebrow">Learn More</p>
            <h2>How Memact access works</h2>
          </div>
          <button type="button" class="memact-learn-more-close" aria-label="Close">×</button>
        </div>
        <section class="memact-learn-more-section">
          <h3>Where does Memact run?</h3>
          <p>Apps use a small Memact client SDK. Capture runs locally through the Memact browser extension and, when enabled, an optional local helper. The extension captures allowed activity; apps only consume the memory output you approved.</p>
        </section>
        <section class="memact-learn-more-section">
          <h3>What does Capture collect?</h3>
          <p>Capture records useful activity evidence such as page titles, URLs, domains, timestamps, navigation events, selected text, useful webpage text, PDF text, captions or transcripts when available, image alt text or nearby context, and optional active app/window context from the local helper.</p>
        </section>
        <section class="memact-learn-more-section">
          <h3>What does it become?</h3>
          <p>Capture records evidence. Inference filters it. Schema finds repeated patterns. Memory stores what survives. Allowed activity can become events, sessions, content units, graph packets, schema packet candidates, retained evidence, schema memories, and retrievable memory.</p>
        </section>
        <section class="memact-learn-more-section">
          <h3>What does an app receive?</h3>
          <p>Only scoped output allowed by the app key, your consent, selected scopes, activity categories, and authorized origin. That can include counts, capture status, compact summaries, evidence cards if approved, or graph objects only when graph-read permission is approved.</p>
        </section>
        <section class="memact-learn-more-section">
          <h3>What is blocked?</h3>
          <p>Memact skips sensitive pages like banking, payments, checkout, billing, passwords, logins, OTPs, private inboxes, direct messages, medical portals, and private account/admin pages before they become memory evidence.</p>
        </section>
      </section>
    `;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.querySelector(".memact-learn-more-close")?.addEventListener("click", close);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });
    document.addEventListener("keydown", function closeOnEscape(event) {
      if (event.key === "Escape") {
        close();
        document.removeEventListener("keydown", closeOnEscape);
      }
    });
  }

  function wireLearnMoreButtons() {
    document.querySelectorAll(".learn-more-link").forEach((button) => {
      if (button.dataset.memactLearnMoreWired) return;
      button.dataset.memactLearnMoreWired = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const helpTab = Array.from(document.querySelectorAll(".tabs .tab")).find((tab) => tab.textContent.trim().toLowerCase() === "help");
        if (helpTab) {
          helpTab.click();
          return;
        }
        openHelpPanel();
      });
    });
  }

  function addAccessNudge() {
    if (localStorage.getItem(dismissedKey) === "1") return;
    if (document.querySelector(".memact-help-nudge")) return;
    const accessPanel = document.querySelector("#app-panel") || document.querySelector(".dashboard-head");
    if (!accessPanel) return;
    const nudge = document.createElement("section");
    nudge.className = "memact-help-nudge";
    nudge.innerHTML = `
      <div>
        <strong>New to Memact?</strong>
        <p>Read how Capture, scopes, and app permissions work before creating keys.</p>
      </div>
      <div class="memact-help-nudge-actions">
        <button type="button" class="learn-more-link">Learn More</button>
        <button type="button" class="memact-help-nudge-dismiss">Dismiss</button>
      </div>
    `;
    accessPanel.parentElement?.insertBefore(nudge, accessPanel);
    nudge.querySelector(".memact-help-nudge-dismiss")?.addEventListener("click", () => {
      localStorage.setItem(dismissedKey, "1");
      nudge.remove();
    });
    wireLearnMoreButtons();
  }

  const observer = new MutationObserver(() => {
    wireLearnMoreButtons();
    addAccessNudge();
  });

  function init() {
    wireLearnMoreButtons();
    addAccessNudge();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
