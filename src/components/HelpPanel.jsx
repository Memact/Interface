import React from "react"

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

function FaqItem({ faq, open = false }) {
  return (
    <details className="faq-item" open={open}>
      <summary>{faq.question}</summary>
      <p>{faq.answer}</p>
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
    </section>
  )
}
