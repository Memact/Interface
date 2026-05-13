import React from "react"
import "../memact-ui.css"
import "../faq-chevron.css"

const BASIC_FAQS = [
  {
    question: "What is Memact?",
    answer: "Memact lets apps remember useful context from your activity, but only inside the permissions you approve."
  },
  {
    question: "Where does Memact run?",
    answer: "Apps use a small Memact client SDK. Activity capture happens locally through the browser extension and, if you enable it, a local helper. Apps only receive the approved output, not a blanket feed of your activity."
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

const ACTIVITY_FAQS = [
  {
    question: "What activity can be used?",
    answer: "Memact can use useful evidence like page titles, URLs, domains, timestamps, selected text, page text, PDF text, captions, transcripts, image context, and optional app/window context from the local helper. Sensitive pages and raw browsing history are not handed to apps by default."
  },
  {
    question: "What does Memact turn activity into?",
    answer: "Memact turns approved activity into smaller memory objects: events, sessions, evidence cards, summaries, graph links, and patterns that can be retrieved later. The important part is the boundary: an app only sees what its saved permissions allow."
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
      <p className="muted help-intro">Built to clear your doubts with transparent, user-controlled answers.</p>

      <div className="faq-section">
        <p className="faq-section-title">Basics</p>
        {BASIC_FAQS.map((faq, index) => (
          <FaqItem faq={faq} key={faq.question} open={index === 0} />
        ))}
      </div>

      <div className="faq-section faq-section-advanced">
        <p className="faq-section-title">Activity and memory</p>
        {ACTIVITY_FAQS.map((faq) => (
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
