function enhanceEmbedCode() {
  document.querySelectorAll(".embed-code").forEach((details) => {
    if (details.dataset.memactTutorial === "ready") return
    const summary = details.querySelector("summary")
    const originalPre = details.querySelector("pre")
    const originalCode = originalPre?.querySelector("code")
    if (!summary || !originalPre || !originalCode) return

    const fullCode = originalCode.textContent || ""
    const steps = splitEmbedSteps(fullCode)

    details.dataset.memactTutorial = "ready"
    summary.textContent = "Connect tutorial"

    const tutorial = document.createElement("div")
    tutorial.className = "embed-tutorial"

    const lead = document.createElement("p")
    lead.className = "embed-tutorial-lead"
    lead.textContent = "Follow the flow in order. Each step has the code it needs."
    tutorial.appendChild(lead)

    steps.forEach((step, index) => {
      const section = document.createElement("section")
      section.className = "embed-step"

      const heading = document.createElement("h3")
      heading.textContent = `${index + 1}. ${step.title}`
      section.appendChild(heading)

      const body = document.createElement("p")
      body.textContent = step.body
      section.appendChild(body)

      if (step.code.trim()) {
        const pre = document.createElement("pre")
        const code = document.createElement("code")
        code.textContent = step.code.trim()
        pre.appendChild(code)
        section.appendChild(pre)
      }

      tutorial.appendChild(section)
    })

    originalPre.replaceWith(tutorial)
  })
}

function splitEmbedSteps(code) {
  const markerPattern = /^\/\/\s*(\d+)\.\s*(.+)$/gm
  const matches = [...code.matchAll(markerPattern)]
  if (!matches.length) {
    return [{
      title: "Use the starter snippet",
      body: "Start with this code, then move each piece into the right place in your app.",
      code
    }]
  }

  return matches.map((match, index) => {
    const next = matches[index + 1]
    const start = match.index + match[0].length
    const end = next ? next.index : code.length
    const rawTitle = match[2].replace(/\.$/, "").trim()
    const rawCode = code.slice(start, end).trim()
    const body = describeStep(rawTitle, index)
    return {
      title: titleForStep(rawTitle, index),
      body,
      code: rawCode
    }
  }).filter((step) => step.title || step.code)
}

function titleForStep(title, index) {
  const titles = [
    "Send the user to Connect App",
    "Read the connection id after approval",
    "Verify access before doing work",
    "Use only approved access"
  ]
  return titles[index] || title
}

function describeStep(title, index) {
  const descriptions = [
    "Put this URL behind your own Connect Memact button. It opens the approval screen for this app.",
    "After the user approves, Memact redirects back to your app with a connection id.",
    "Before your app uses Memact, verify the API key, connection id, and required scopes.",
    "Use the verified scopes and categories as the boundary for what your app does next."
  ]
  return descriptions[index] || title
}

enhanceEmbedCode()
new MutationObserver(enhanceEmbedCode).observe(document.documentElement, {
  childList: true,
  subtree: true
})
