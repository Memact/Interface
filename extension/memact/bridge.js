function normalizeHostname(hostname) {
  return String(hostname || "")
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "");
}

function isLocalMemactHost(hostname) {
  const normalized = normalizeHostname(hostname);
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized === "::1"
  );
}

function isMemactOrigin() {
  return (
    /(^|\.)memact\.com$/i.test(location.hostname) ||
    isLocalMemactHost(location.hostname)
  );
}

function forwardToPage(message) {
  window.postMessage(message, "*");
}

function announceReady() {
  try {
    document.documentElement.dataset.memactBridge = "ready";
  } catch (_) {
    // Ignore DOM marker failures.
  }
  forwardToPage({ type: "MEMACT_EXTENSION_READY" });
}

window.addEventListener("message", async (event) => {
  if (!isMemactOrigin()) {
    return;
  }
  if (event.source !== window) {
    return;
  }
  if (!event.data?.type?.startsWith("MEMACT_")) {
    return;
  }

  const { type, payload, requestId } = event.data;

  try {
    if (type === "MEMACT_SEARCH") {
      const results = await chrome.runtime.sendMessage({
        type: "search",
        query: payload?.query || "",
        limit: payload?.limit || 20
      });
      forwardToPage({
        type: "MEMACT_SEARCH_RESULT",
        results,
        requestId
      });
    } else if (type === "MEMACT_SUGGESTIONS") {
      const results = await chrome.runtime.sendMessage({
        type: "suggestions",
        query: payload?.query || "",
        timeFilter: payload?.timeFilter || null,
        limit: payload?.limit || 6
      });
      forwardToPage({
        type: "MEMACT_SUGGESTIONS_RESULT",
        results,
        requestId
      });
    } else if (type === "MEMACT_STATUS") {
      const status = await chrome.runtime.sendMessage({ type: "status" });
      forwardToPage({
        type: "MEMACT_STATUS_RESULT",
        status,
        requestId
      });
    } else if (type === "MEMACT_STATS") {
      const stats = await chrome.runtime.sendMessage({ type: "stats" });
      forwardToPage({
        type: "MEMACT_STATS_RESULT",
        stats,
        requestId
      });
    } else if (type === "MEMACT_CLEAR_ALL_DATA") {
      const response = await chrome.runtime.sendMessage({ type: "clearAllData" });
      forwardToPage({
        type: "MEMACT_CLEAR_ALL_DATA_RESULT",
        response,
        requestId
      });
    }
  } catch (error) {
    forwardToPage({
      type: "MEMACT_ERROR",
      error: String(error?.message || error || "bridge failed"),
      requestId
    });
  }
});

announceReady();
window.addEventListener("DOMContentLoaded", announceReady, { once: true });
setTimeout(announceReady, 150);
setTimeout(announceReady, 500);
setTimeout(announceReady, 1200);
setTimeout(announceReady, 2500);
