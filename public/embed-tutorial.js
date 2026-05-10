function enhanceEmbedCode() {
  document.querySelectorAll(".embed-code").forEach((details) => {
    if (details.dataset.memactTutorial === "ready") return
    const summary = details.querySelector("summary")
    const pre = details.querySelector("pre")
    if (!summary || !pre) return

    details.dataset.memactTutorial = "ready"
    summary.textContent = "Connect tutorial"

    const tutorial = document.createElement("div")
    tutorial.className = "embed-tutorial"
    tutorial.innerHTML = `
      <p class="embed-tutorial-lead">Use this like a beginner wiring guide, not a copy-paste wall.</p>
      <ol>
        <li><strong>Send the user to Connect App.</strong><span>Your app opens the Memact approval screen.</span></li>
        <li><strong>Wait for approval.</strong><span>Memact redirects back with a connection id.</span></li>
        <li><strong>Verify access.</strong><span>Check the API key, connection id, and required scopes before doing work.</span></li>
        <li><strong>Use only approved access.</strong><span>Call Memact using the scopes and categories the user allowed.</span></li>
      </ol>
      <p class="embed-tutorial-label">Technical snippet</p>
    `

    pre.before(tutorial)
  })
}

enhanceEmbedCode()
new MutationObserver(enhanceEmbedCode).observe(document.documentElement, {
  childList: true,
  subtree: true
})
