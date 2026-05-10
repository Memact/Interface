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
        const codeWrap = document.createElement("div")
        codeWrap.className = "embed-code-wrap"

        const copyButton = document.createElement("button")
        copyButton.type = "button"
        copyButton.className = "embed-copy-button"
        copyButton.textContent = "Copy"
        copyButton.setAttribute("aria-label", `Copy code for step ${index + 1}`)
        copyButton.addEventListener("click", () => copyCode(copyButton, step.code.trim()))

        const pre = document.createElement("pre")
        const code = document.createElement("code")
        code.textContent = step.code.trim()
        pre.appendChild(code)
        codeWrap.appendChild(copyButton)
        codeWrap.appendChild(pre)
        section.appendChild(codeWrap)
      }

      tutorial.appendChild(section)
    })

    originalPre.replaceWith(tutorial)
  })
}

function simplifyDashboardLabel() {
  document.querySelectorAll(".dashboard-head .eyebrow").forEach((label) => {
    if (label.textContent.trim() === "Access / API Keys") {
      label.textContent = "Access"
    }
  })
}

async function copyCode(button, text) {
  try {
    await navigator.clipboard.writeText(text)
    const previous = button.textContent
    button.textContent = "Copied"
    button.dataset.copied = "true"
    window.setTimeout(() => {
      button.textContent = previous || "Copy"
      delete button.dataset.copied
    }, 1400)
  } catch {
    button.textContent = "Copy failed"
    window.setTimeout(() => {
      button.textContent = "Copy"
    }, 1400)
  }
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

function enhanceMemactUi() {
  enhanceEmbedCode()
  simplifyDashboardLabel()
}

enhanceMemactUi()
new MutationObserver(enhanceMemactUi).observe(document.documentElement, {
  childList: true,
  subtree: true
})
