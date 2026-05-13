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
    question: "How does consent work?",
    answer: "It shows what an app wants before anything is connected. You approve or cancel. Apps should link Data Transparency beside consent so you can review the actual data and memory objects they plan to use."
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
    question: "How do I use the Memact API in an app?",
    answer: (
      <>
        <p>Use Memact as a permissioned memory layer, not as a raw data feed.</p>
        <ol>
          <li>Register your app in Memact and choose the smallest scopes and activity categories your feature needs.</li>
          <li>Add a <strong>Connect Memact</strong> button in your app. Send users to <code>/connect?app_id=...&amp;scopes=...&amp;categories=...&amp;redirect_uri=...</code>.</li>
          <li>Put a Data Transparency link beside that consent flow. Explain the actual captured fields, evidence cards, summaries, graph packets, retention, and revocation path.</li>
          <li>After approval, Memact redirects back to your <code>redirect_uri</code> with a <code>connection_id</code>. Store that id for the signed-in user in your app.</li>
          <li>Keep the raw Memact API key in server environment config, such as <code>MEMACT_API_KEY</code> in <code>.env</code> locally and a secret manager in production. Do not ask users to paste it into UI.</li>
          <li>Before using Memact output, your backend verifies <code>api_key + connection_id + required_scopes</code>. If verification fails, do not collect or read anything.</li>
          <li>Use only the approved result: summaries, evidence snippets, graph objects, schema writes, or capture status that match the returned scopes and categories.</li>
        </ol>
      </>
    )
  },
  {
    question: "Where should the Memact API key live in code?",
    answer: (
      <>
        Treat the raw Memact API key like a server-side secret. This is the private app key that starts with <code>mka_</code> and is created in Memact Access. In local development, put it in <code>.env</code> as something like <code>MEMACT_API_KEY=mka_...</code>. In production, put the same value in your host's secret manager. Do not hard-code it into browser bundles, mobile apps, public repos, README examples, logs, shared prompts, or manual user-facing settings panels.
      </>
    )
  },
  {
    question: "Do I need a Supabase public key?",
    answer: (
      <>
        No. App developers should only configure the private Memact app key, usually <code>MEMACT_API_KEY=mka_...</code>. Any public transport key used by Memact's own verification infrastructure is Memact's responsibility and should be hidden inside the Memact SDK, generated snippet, or hosted endpoint. Do not ask users or app developers to manage a Supabase key.
      </>
    )
  },
  {
    question: "What code should I embed?",
    answer: (
      <>
        Embed only the user-facing connection pieces in the client: the Connect button, the Data Transparency link, and your callback handling. Put verification and Memact API calls on your server. A typical server step is: receive <code>connection_id</code>, load <code>process.env.MEMACT_API_KEY</code> or your platform's equivalent secret, call the verification endpoint with required scopes, then run the feature only with the approved scopes and categories returned by Memact.
      </>
    )
  },
  {
    question: "Is a Data Transparency page required?",
    answer: (
      <>
        Yes. Any app asking users to consent through Memact should expose Data Transparency next to the consent flow. It must explain the actual captured fields, evidence cards, summaries, graph packets, retention, and revocation path. Categories alone are not enough.
      </>
    )
  },
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
        <a className="inline-help-link" href="mailto:keepsloading@gmail.com">keepsloading@gmail.com.</a>
        {" "}For safety, do not send secrets, raw memory exports, or API keys by email.
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
        {typeof faq.answer === "string" ? <p>{faq.answer}</p> : <div className="faq-answer-content">{faq.answer}</div>}
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
