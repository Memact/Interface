const BRIDGE_URL = "http://127.0.0.1:38453/session";
const EXTENSION_VERSION = chrome.runtime.getManifest().version;
const SNIPPET_MAX_LEN = 280;
const FULL_TEXT_MAX_LEN = 8000;

function detectBrowserKey() {
  const userAgent = navigator.userAgent || "";
  if (userAgent.includes("Edg/")) {
    return "edge";
  }
  if (userAgent.includes("OPR/")) {
    return "opera";
  }
  if (userAgent.includes("Vivaldi/")) {
    return "vivaldi";
  }
  if (userAgent.includes("Brave/")) {
    return "brave";
  }
  return "chrome";
}

async function snapshotFocusedWindow() {
  try {
    const currentWindow = await chrome.windows.getLastFocused({ populate: true });
    if (!currentWindow || !Array.isArray(currentWindow.tabs)) {
      return;
    }

    const browser = detectBrowserKey();
    const tabs = currentWindow.tabs
      .filter((tab) => tab && tab.url)
      .map((tab) => ({
        id: tab.id,
        title: tab.title || "",
        url: tab.url || "",
        active: Boolean(tab.active)
      }));
    const activeTab = currentWindow.tabs.find((tab) => tab && tab.active);
    const activeContext = activeTab ? await captureActiveTabContext(activeTab) : null;

    await fetch(BRIDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        browser,
        extensionVersion: EXTENSION_VERSION,
        windowId: currentWindow.id,
        tabs,
        activeContext
      })
    });
  } catch (error) {
    // Keep the extension silent when Memact is not running.
  }
}

let snapshotTimer = null;

function normalizeText(value, maxLen) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (!maxLen) return text;
  return text.length > maxLen ? `${text.slice(0, maxLen - 3)}...` : text;
}

function normalizeRichText(value, maxLen) {
  const text = String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = text
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split(/\n+/)
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .filter(Boolean)
        .join("\n")
    )
    .filter(Boolean);
  const normalized = blocks.join("\n\n").trim();
  if (!normalized) return "";
  if (!maxLen) return normalized;
  return normalized.length > maxLen ? normalized.slice(0, maxLen) : normalized;
}

function truncateText(value, maxLen) {
  const text = String(value || "");
  if (!text || !maxLen) {
    return text;
  }
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

async function injectReadability(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["Readability.js"]
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function captureActiveTabContext(tab) {
  if (!tab || !tab.id || !tab.url) {
    return null;
  }
  if (!/^https?:|^file:/i.test(tab.url)) {
    return null;
  }
  try {
    const readabilityReady = await injectReadability(tab.id);
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [SNIPPET_MAX_LEN, FULL_TEXT_MAX_LEN, readabilityReady],
      func: async (snippetMaxLen, fullTextMaxLen, canUseReadability) => {
        if (!window.__memactCaptureInstalled) {
          window.__memactCaptureInstalled = true;
          window.__memactLastInputAt = 0;
          window.__memactLastScrollAt = 0;
          window.addEventListener(
            "input",
            () => {
              window.__memactLastInputAt = Date.now();
            },
            true
          );
          window.addEventListener(
            "scroll",
            () => {
              window.__memactLastScrollAt = Date.now();
            },
            true
          );
        }
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const normalizeVisibleText = (value) =>
          String(value || "")
            .replace(/\s+/g, " ")
            .trim();
        const normalizeStructuredText = (value) =>
          String(value || "")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split(/\n{2,}/)
            .map((block) =>
              block
                .split(/\n+/)
                .map((line) => line.replace(/[ \t]+/g, " ").trim())
                .filter(Boolean)
                .join("\n")
            )
            .filter(Boolean)
            .join("\n\n")
            .trim();
        const hostname = location.hostname.replace(/^www\./, "");
        const isVisible = (node) => {
          if (!node || !(node instanceof Element)) {
            return false;
          }
          const style = window.getComputedStyle(node);
          if (style.display === "none" || style.visibility === "hidden") {
            return false;
          }
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };
        const isNoiseNode = (node) => {
          if (!node || !(node instanceof Element)) {
            return false;
          }
          if (
            node.closest(
              "nav, header, footer, aside, [role='navigation'], [role='complementary'], [aria-label*='navigation' i], [class*='sidebar' i], [class*='nav' i], [class*='menu' i], [class*='footer' i], [class*='header' i], [class*='ad' i], [id*='ad' i]"
            )
          ) {
            return true;
          }
          return false;
        };
        const collectRoots = () => {
          const roots = [document];
          const queue = [document.documentElement];
          const seen = new Set([document]);
          while (queue.length) {
            const node = queue.shift();
            if (!node || !(node instanceof Element)) {
              continue;
            }
            if (node.shadowRoot && !seen.has(node.shadowRoot)) {
              roots.push(node.shadowRoot);
              seen.add(node.shadowRoot);
              queue.push(node.shadowRoot);
            }
            for (const child of node.children || []) {
              queue.push(child);
            }
          }
          return roots;
        };
        const queryAllDeep = (selectors) => {
          const roots = collectRoots();
          const found = [];
          const seen = new Set();
          for (const root of roots) {
            for (const selector of selectors) {
              let nodes = [];
              try {
                nodes = Array.from(root.querySelectorAll(selector));
              } catch (error) {
                nodes = [];
              }
              for (const node of nodes) {
                if (seen.has(node)) {
                  continue;
                }
                seen.add(node);
                found.push(node);
              }
            }
          }
          return found;
        };
        const scrapeNodeText = (node) => {
          if (!node || !isVisible(node) || isNoiseNode(node)) {
            return "";
          }
          return normalizeStructuredText(node.innerText || node.textContent || "");
        };
        const siteSelectors = [];
        if (hostname.includes("github.com")) {
          siteSelectors.push(".markdown-body");
        }
        if (hostname.includes("youtube.com")) {
          siteSelectors.push("ytd-watch-metadata", "#description-inner");
        }
        if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
          siteSelectors.push("[data-testid='tweetText']");
        }
        if (hostname.includes("reddit.com")) {
          siteSelectors.push("[data-testid='post-content']", ".md.feed-link-description");
        }
        if (hostname.includes("discord.com")) {
          siteSelectors.push("[class*='messageContent']");
        }
        const generalSelectors = [
          "article",
          "main",
          "[role='main']",
          "[role='article']",
          ".content",
          ".post-body",
          ".article-body",
          "[class*='content']",
          "[class*='article']",
          "[class*='post-body']",
          "[class*='messageContent']",
          "[class*='message-content']",
          "[class*='messages']",
          "[class*='thread']",
          "[class*='conversation']",
          "[data-testid*='message']",
          "[data-testid*='conversation']",
          "[aria-live='polite']",
          "[aria-live='assertive']"
        ];
        const pickContentText = () => {
          const candidates = [];
          const seen = new Set();
          for (const node of queryAllDeep([...siteSelectors, ...generalSelectors])) {
            const text = scrapeNodeText(node);
            if (!text || text.length < 100) {
              continue;
            }
            const key = text.slice(0, 800);
            if (seen.has(key)) {
              continue;
            }
            seen.add(key);
            candidates.push(text);
          }
          candidates.sort((left, right) => right.length - left.length);
          return candidates[0] || "";
        };
        const visibleBodyText = () => {
          const text = normalizeStructuredText(document.body?.innerText || "");
          if (text.length < 200) {
            return "";
          }
          return text.slice(0, 3000);
        };
        const extractReadabilityText = async () => {
          if (!(canUseReadability && typeof Readability === "function")) {
            return "";
          }
          const parseArticle = () => {
            try {
              const articleData = new Readability(document.cloneNode(true)).parse();
              if (articleData?.content) {
                const container = document.createElement("div");
                container.innerHTML = articleData.content;
                const htmlText = normalizeStructuredText(container.innerText || container.textContent || "");
                if (htmlText) {
                  return htmlText;
                }
              }
              return normalizeStructuredText(articleData?.textContent || "");
            } catch (error) {
              return "";
            }
          };
          let articleText = parseArticle();
          if (articleText) {
            return articleText.slice(0, fullTextMaxLen);
          }
          await wait(800);
          articleText = parseArticle();
          return articleText ? articleText.slice(0, fullTextMaxLen) : "";
        };
        const readMeta = (key, attr = "name") => {
          const selector = `meta[${attr}="${key}"]`;
          const el = document.querySelector(selector);
          return el ? el.getAttribute("content") || "" : "";
        };
        const ogTitle = readMeta("og:title", "property");
        const ogDescription = readMeta("og:description", "property");
        const description = readMeta("description") || ogDescription;
        const pageTitle = document.title || ogTitle || "";
        const h1 = document.querySelector("h1")?.innerText || "";
        const selection = window.getSelection()?.toString() || "";
        const pageContent = pickContentText();
        let fullText = await extractReadabilityText();
        if (!fullText || fullText.length < 100) {
          const scraped = pageContent;
          if (scraped && scraped.length >= 100) {
            fullText = scraped.slice(0, fullTextMaxLen);
          }
        }
        if (!fullText || fullText.length < 100) {
          const fallbackText = visibleBodyText();
          if (fallbackText) {
            fullText = fallbackText.slice(0, fullTextMaxLen);
          }
        }
        fullText = normalizeStructuredText(fullText).slice(0, fullTextMaxLen);
        const snippetSource = fullText || pageContent || visibleBodyText() || "";
        const snippet = normalizeVisibleText(snippetSource).slice(0, snippetMaxLen);
        const now = Date.now();
        const activeEl = document.activeElement;
        const activeTag = activeEl?.tagName || "";
        const activeType = activeEl?.type || "";
        const isEditable = Boolean(activeEl?.isContentEditable);
        const typingActive =
          window.__memactLastInputAt &&
          now - window.__memactLastInputAt < 5000 &&
          (activeTag === "INPUT" || activeTag === "TEXTAREA" || isEditable);
        const scrollingActive =
          window.__memactLastScrollAt && now - window.__memactLastScrollAt < 4000;
        return {
          pageTitle,
          description,
          h1,
          selection,
          snippet,
          fullText,
          activeTag,
          activeType,
          typingActive,
          scrollingActive
        };
      }
    });
    const result = injected && injected.result ? injected.result : null;
    if (!result) {
      return null;
    }
    return {
      pageTitle: normalizeText(result.pageTitle, 140),
      description: normalizeText(result.description, 200),
      h1: normalizeText(result.h1, 120),
      selection: normalizeText(result.selection, 200),
      snippet: normalizeText(result.snippet, SNIPPET_MAX_LEN),
      fullText: normalizeRichText(result.fullText, FULL_TEXT_MAX_LEN),
      activeTag: normalizeText(result.activeTag, 40),
      activeType: normalizeText(result.activeType, 40),
      typingActive: Boolean(result.typingActive),
      scrollingActive: Boolean(result.scrollingActive)
    };
  } catch (error) {
    return null;
  }
}

function queueSnapshot() {
  clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    snapshotFocusedWindow();
  }, 250);
}

chrome.runtime.onInstalled.addListener(queueSnapshot);
chrome.runtime.onStartup.addListener(queueSnapshot);
chrome.tabs.onActivated.addListener(queueSnapshot);
chrome.tabs.onUpdated.addListener(queueSnapshot);
chrome.tabs.onCreated.addListener(queueSnapshot);
chrome.tabs.onRemoved.addListener(queueSnapshot);
chrome.windows.onFocusChanged.addListener(queueSnapshot);
