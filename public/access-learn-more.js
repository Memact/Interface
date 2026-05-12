(() => {
  const dismissedKey = "memact_help_nudge_dismissed";

  function openLearnPage() {
    window.open("/learn.html", "_blank", "noopener,noreferrer");
  }

  function wireLearnMoreButtons() {
    document.querySelectorAll(".learn-more-link").forEach((button) => {
      if (button.dataset.memactLearnMoreWired) return;
      button.dataset.memactLearnMoreWired = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        openLearnPage();
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
