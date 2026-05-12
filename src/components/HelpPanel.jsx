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

const LEGAL_FAQS = [
  {
    question: "Who runs Memact Access?",
    answer: (
      <>
        Memact Access is part of the Memact project by{" "}
        <a className="inline-help-link" href="https://github.com/keepsloading" target="_blank" rel="noreferrer">Keeps Loading</a>.
        Some code may be viewable through the{" "}
        <a className="inline-help-link" href="https://github.com/Memact" target="_blank" rel="noreferrer">Memact GitHub organization</a>,
        but it remains proprietary. You may not edit, redistribute, or modify it without permission.
      </>
    )
  },
  {
    question: "How can I contact Memact?",
    answer: "For access, security, or project questions, contact keepsloading@gmail.com. Do not send secrets, raw memory exports, or API keys by email."
  }
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
        <h2>Access notes</h2>
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

      <div className="faq-section faq-section-advanced">
        <p className="faq-section-title">Legal and contact</p>
        {LEGAL_FAQS.map((faq) => (
          <FaqItem faq={faq} key={faq.question} />
        ))}
      </div>
    </section>
  )
}
