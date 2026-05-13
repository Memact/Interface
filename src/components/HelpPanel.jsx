import React from "react"
import "../memact-ui.css"
import "../faq-chevron.css"

const BASIC_FAQS = [
  {
    question: "What is Memact?",
    answer: "Infrastructure that lets apps create permissioned memory from your digital activity."
  },
  {
    question: "Where does Memact run?",
    answer: "Apps use a small Memact client SDK. Capture runs locally through the Memact browser extension and, when enabled, an optional local helper. The extension captures allowed activity; apps only consume the memory output you approved."
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
    answer: "They limit where an app can work, like research pages, news, AI conversations, developer activity, or media."
  }
]

const CAPTURE_FAQS = [
  {
    question: "What does Capture collect?",
    answer: "Capture records useful activity evidence such as page titles, URLs, domains, timestamps, navigation events, selected text, useful webpage text, PDF text, captions or transcripts when available, image alt text or nearby context, and optional active app/window context from the local helper. It does not give apps raw browsing history by default."
  },
  {
    question: "What does Memact turn captured activity into?",
    answer: "Capture records evidence. Inference filters it. Schema finds repeated patterns. Memory stores what survives. In practice, allowed activity can become events, sessions, content units, graph packets, schema packet candidates, retained evidence, schema memories, and retrievable memory."
  },
  {
    question: "What does an app receive?",
    answer: "Only scoped output allowed by the app key, your consent, selected scopes, activity categories, and authorized origin. That can include counts, capture status, compact summaries, evidence cards if approved, or graph objects only when graph-read permission is approved."
  },
  {
    question: "What is blocked?",
    answer: "Memact skips sensitive pages like banking, payments, checkout, billing, passwords, logins, OTPs, private inboxes, direct messages, medical portals, and private account/admin pages before they become memory evidence."
  }
]

const ADVANCED_FAQS = [
  {
    question: "What is a schema packet?",
    answer: "A schema packet is Memact's memory envelope: evidence, content units, nodes, edges, and a short summary that later layers can decide to keep."
  },
  {
    question: "What is not allowed?",
    answer: "Apps should only request what they need. Hidden monitoring, selling raw memory, manipulation, and sensitive decision-making are not allowed."
  }
]

const LEGAL_FAQS = [
  {
    question: "Who runs Memact?",
    answer: (
      <>
        Memact is a project by{" "}
        <a className="inline-help-link" href="https://github.com/keepsloading" target="_blank" rel="noreferrer">Keeps Loading</a>.
        Some code may be viewable through the{" "}
        <a className="inline-help-link" href="https://github.com/Memact" target="_blank" rel="noreferrer">Memact GitHub organization</a>,
        but it remains proprietary. You may not edit, redistribute, or modify it without permission.
      </>
    )
  },
  {
    question: "How can I contact Memact?",
    answer: (
      <>
        For access, security, or project questions, contact{" "}
        <a className="inline-help-link" href="mailto:keepsloading@gmail.com">keepsloading@gmail.com</a>.
        Do not send secrets, raw memory exports, or API keys by email.
      </>
    )
  }
]

function FaqItem({ faq, open = false }) {
  return (
    <details className="faq-item" open={open}>
      <summary className="faq-trigger">
        <span className="faq-question">{faq.question}</span>
        <span className="faq-chevron" aria-hidden="true">v</span>
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
        <h2>Frequently asked questions</h2>
      </div>
      <p className="muted help-intro">Apps ask for memory access. You choose what they get.</p>

      <div className="faq-section">
        <p className="faq-section-title">Basics</p>
        {BASIC_FAQS.map((faq, index) => (
          <FaqItem faq={faq} key={faq.question} open={index === 0} />
        ))}
      </div>

      <div className="faq-section faq-section-advanced">
        <p className="faq-section-title">Capture and memory</p>
        {CAPTURE_FAQS.map((faq) => (
          <FaqItem faq={faq} key={faq.question} />
        ))}
      </div>

      <div className="faq-section faq-section-advanced">
        <p className="faq-section-title">Advanced</p>
        {ADVANCED_FAQS.map((faq) => (
          <FaqItem faq={faq} key={faq.question} />
        ))}
      </div>

      <div className="faq-section faq-section-advanced">
        <p className="faq-section-title">Legal and contact</p>
        {LEGAL_FAQS.map((faq) => (
          <FaqItem faq={faq} key={faq.question} />
        ))}
      </div>
    </section>
  )
}
