import React from "react"
import "../ui-fixes.css"
import "../faq-chevron.css"

const BASIC_FAQS = [
  {
    question: "What is Memact?",
    answer: "Infrastructure that lets apps create permissioned memory from your digital activity."
  },
  {
    question: "Does an app get my whole memory graph?",
    answer: "No. Apps only get the permissions and activity categories you approve. Raw graph access is separate and sensitive."
  },
  {
    question: "What does Connect App do?",
    answer: "It shows what an app wants before anything is connected. You approve or cancel."
  },
  {
    question: "What are activity categories?",
    answer: "They limit where an app can work, like research pages, news, AI conversations, or developer activity."
  }
]

const ADVANCED_FAQS = [
  {
    question: "What is a schema packet?",
    answer: "A schema packet is Memact’s internal memory unit: evidence, content, nodes, edges, and a short summary."
  },
  {
    question: "What is not allowed?",
    answer: "Apps should only request what they need. Hidden monitoring, selling raw memory, manipulation, and sensitive decision-making are not allowed."
  }
]

const QUICKSTART_STEPS = [
  "Create an app in Access.",
  "Choose activity categories and save permissions.",
  "Create an API key and copy it once.",
  "Send users through the Connect flow.",
  "Verify the API key, connection, scopes, and categories before using memory."
]

function FaqItem({ faq, open = false }) {
  return (
    <details className="faq-item" open={open}>
      <summary className="faq-trigger">
        <span className="faq-question">{faq.question}</span>
        <span className="faq-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="faq-answer">
        <p>{faq.answer}</p>
      </div>
    </details>
  )
}

export function HelpPanel() {
  return (
    <section className="panel help-panel">
      <div>
        <p className="eyebrow">Help</p>
        <h2>Memact Access, explained</h2>
      </div>
      <p className="muted help-intro">Apps ask for memory access. You choose what they get.</p>

      <div className="faq-section">
        <p className="faq-section-title">Basics</p>
        {BASIC_FAQS.map((faq, index) => (
          <FaqItem faq={faq} key={faq.question} open={index === 0} />
        ))}
      </div>

      <div className="faq-section faq-section-advanced">
        <p className="faq-section-title">Advanced</p>
        {ADVANCED_FAQS.map((faq) => (
          <FaqItem faq={faq} key={faq.question} />
        ))}
      </div>

      <div className="docs-section">
        <div>
          <p className="eyebrow">Docs</p>
          <h2>Developer quickstart</h2>
          <p className="muted">The shortest path from app registration to a working Memact integration.</p>
        </div>
        <ol className="docs-steps-list">
          {QUICKSTART_STEPS.map((step) => <li key={step}>{step}</li>)}
        </ol>
        <div className="docs-code-card">
          <p className="eyebrow">Verify access</p>
          <pre><code>{`const response = await fetch("/rest/v1/rpc/memact_verify_api_key", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    api_key_input: "mka_...",
    required_scopes_input: ["memory:read_summary"],
    consent_id_input: "connection_id"
  })
});`}</code></pre>
        </div>
      </div>
    </section>
  )
}
