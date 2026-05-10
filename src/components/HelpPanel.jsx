import React from "react"

const HELP_ITEMS = [
  {
    question: "What is Memact?",
    answer: "Memact is infrastructure for turning allowed digital activity into useful schema memory: evidence, nodes, edges, and summaries that apps can use with permission."
  },
  {
    question: "Does an app get my whole memory graph?",
    answer: "No. Apps get only the permissions and activity categories you approve. Raw graph access is a separate sensitive permission."
  },
  {
    question: "What are activity categories?",
    answer: "They narrow where an app can work. A propaganda detector can ask for news articles. A study app can ask for research pages. An AI-conversation app can ask for AI assistant activity."
  },
  {
    question: "What does Connect App do?",
    answer: "It works like Discord authorization. The app sends you to Memact, you review permissions, and Memact creates a connection only if you approve."
  },
  {
    question: "What is a schema packet?",
    answer: "A schema packet is a small knowledge-graph memory bundle: evidence, content units, nodes, edges, and a summary of what the activity seems to represent."
  },
  {
    question: "What is not allowed?",
    answer: "Apps should not sell raw memory, watch users without permission, manipulate people, or use Memact for credit, employment, insurance, housing, or sensitive targeting decisions."
  }
]

export function HelpPanel() {
  return (
    <section className="panel help-panel">
      <p className="eyebrow">Help</p>
      <h2>Memact in plain words.</h2>
      <p className="muted">
        Memact gives apps a permissioned way to create useful memory from activity. The user stays in control of what the app can ask Memact to do.
      </p>
      <div className="faq-grid">
        {HELP_ITEMS.map((faq) => (
          <article className="mini-row" key={faq.question}>
            <strong>{faq.question}</strong>
            <small>{faq.answer}</small>
          </article>
        ))}
      </div>
    </section>
  )
}
