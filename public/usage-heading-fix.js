(() => {
  const updateUsageHeading = () => {
    document.querySelectorAll(".usage-overview h3").forEach((heading) => {
      if (heading.textContent.trim() === "Real key activity for this app.") {
        heading.textContent = "Key activity"
      }
    })
  }

  updateUsageHeading()
  new MutationObserver(updateUsageHeading).observe(document.documentElement, {
    childList: true,
    subtree: true
  })
})()
