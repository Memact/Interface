import React from "react"
import "../memact-ui.css"
import "../faq-chevron.css"

const BASIC_FAQS = [
  {
    question: "What is Memact?",
    answer: "Memact helps apps understand what users are trying to do, using only the activity and memory permissions they approve."
  },
  {
    question: "Where does Memact run?",
    answer: "Apps use a small Memact client SDK. Evidence can come from the browser extension and, if enabled, a local helper. Memact turns approved evidence into context, schemas, and memory; apps do not receive a blanket activity feed."
  },
  {
    question: "Does an app get my whole memory graph?",
    answer: "No. Apps only get the context, summaries, evidence, or graph objects allowed by the permissions and categories you approve. Raw graph access is separate and sensitive."
  },
  {
    question: "How does consent work?",
    answer: "It shows what an app wants Memact to understand before anything is connected. You approve or cancel. Apps should link Data Transparency beside consent so you can review the evidence, schemas, memory objects, and context they plan to use."
  },
  {
    question: "What are activity categories?",
    answer: "They limit which part of your activity Memact can understand for that app, like research pages, news, AI conversations, developer activity, or media."
  }
]

const ACTIVITY_FAQS = [
  {
    question: "What activity can be used?",
    answer: "Memact can use evidence like page titles, URLs, domains, timestamps, selected text, page text, PDF text, captions, transcripts, image context, and optional app/window context from the local helper. That evidence exists to produce understanding, not to sell a raw capture feed."
  },
  {
    question: "What does Memact turn activity into?",
    answer: "Memact turns approved activity into context objects: events, sessions, evidence cards, summaries, schema packets, graph links, and patterns that can become memory. The important part is the boundary: an app only sees what its saved permissions allow."
  },
  {
    question: "What does an app receive?",
    answer: "Only scoped understanding allowed by the app key, your consent, selected scopes, activity categories, and authorized origin. That can include compact summaries, evidence cards, schema packets, memory objects, graph objects when approved, and status signals."
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
        <p>Use Memact as a permissioned understanding and memory layer, not as a raw capture feed.</p>
        <ol>
          <li>Register your app in Memact and choose the smallest scopes and activity categories your feature needs.</li>
          <li>Add a <strong>Connect Memact</strong> button in your app. Send users to <code>/connect?app_id=...&amp;scopes=...&amp;categories=...&amp;redirect_uri=...</code>.</li>
          <li>Put a Data Transparency link beside that consent flow. Explain the evidence fields, schema packets, summaries, memory objects, graph packets, retention, and revocation path.</li>
          <li>After approval, Memact redirects back to your <code>redirect_uri</code> with a <code>connection_id</code>. Store that id for the signed-in user in your app.</li>
          <li>Keep the raw Memact API key in server environment config, such as <code>MEMACT_API_KEY</code> in <code>.env</code> locally and a secret manager in production. Do not ask users to paste it into UI.</li>
          <li>Your backend calls Memact's verification endpoint with <code>Authorization: Bearer process.env.MEMACT_API_KEY</code>, the stored <code>connection_id</code>, required scopes, and activity categories. If verification fails, do not request context or memory.</li>
          <li>Use only the approved understanding: summaries, evidence snippets, graph objects, schema writes, memory objects, or status signals that match the returned scopes and categories.</li>
        </ol>
      </>
    )
  },
  {
    question: "Where should the Memact API key live in code?",
    answer: (
      <>
        Treat the raw Memact API key like a server-side secret. This is the private app key that starts with <code>mka_</code> and is created in the Memact portal. In local development, put it in <code>.env</code> as something like <code>MEMACT_API_KEY=mka_...</code>. In production, put the same value in your host's secret manager. Do not hard-code it into browser bundles, mobile apps, public repos, README examples, logs, shared prompts, or manual user-facing settings panels.
      </>
    )
  },
  {
    question: "Do I need a Supabase public key?",
    answer: (
      <>
        No. App developers configure only the private Memact app key, usually <code>MEMACT_API_KEY=mka_...</code>, on their own backend. Supabase keys belong to Memact's access infrastructure, not customer apps. If a guide asks your app to set a Supabase key for Memact verification, that guide is wrong or outdated.
      </>
    )
  },
  {
    question: "What code should I embed?",
    answer: (
      <>
        Embed only the user-facing connection pieces in the client: the Connect button, the Data Transparency link, and your callback handling. Put verification on your server. The server loads <code>process.env.MEMACT_API_KEY</code>, then sends <code>connection_id</code>, <code>required_scopes</code>, and <code>activity_categories</code> to Memact's verify endpoint. You normally do not set a verify URL; use the default Memact endpoint shown in the generated tutorial. Add <code>MEMACT_VERIFY_URL</code> only if Memact gives you a different verification host. Run your feature only when Memact returns <code>allowed: true</code>, then request only the context, memory, and understanding allowed by the returned scopes and categories.
      </>
    )
  },
  {
    question: "Is a Data Transparency page required?",
    answer: (
      <>
        Yes. Any app asking users to consent through Memact should expose Data Transparency next to the consent flow. It must explain the evidence fields, schema packets, summaries, memory objects, graph packets, retention, and revocation path. Categories alone are not enough.
      </>
    )
  },
  {
    question: "What is a schema packet?",
    answer: "A schema packet is Memact's understanding envelope: evidence, content units, nodes, edges, inferred structure, and a short summary that later layers can decide to keep as memory."
  },
  {
    question: "What is not allowed?",
    answer: "Apps should only request what they need. Hidden monitoring, selling raw capture or memory, manipulation, and sensitive decision-making are not allowed."
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
