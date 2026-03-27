import StatusBadge from '../components/StatusBadge'

import iconLogo from '../../memact_branding/logos/icon_logo_nobg.png'
import textLogo from '../../memact_branding/logos/text_logo_nobg.png'

function PreviewShot({ query, title, snippet }) {
  return (
    <article className="preview-shot">
      <div className="preview-shot__toolbar">
        <img className="preview-shot__mark" src={iconLogo} alt="" />
        <div className="preview-shot__search">{query}</div>
      </div>
      <div className="preview-shot__card">
        <div className="eyebrow">Matched memory</div>
        <h3 className="preview-shot__title">{title}</h3>
        <p className="preview-shot__snippet">{snippet}</p>
      </div>
    </article>
  )
}

export default function Landing() {
  return (
    <main className="landing-shell">
      <header className="landing-topbar">
        <div className="brand-lockup">
          <img className="brand-mark brand-mark--small" src={iconLogo} alt="" />
          <img className="brand-wordmark" src={textLogo} alt="Memact" />
        </div>
        <StatusBadge tone="neutral">Browser memory only</StatusBadge>
      </header>

      <section className="landing-hero">
        <div className="eyebrow">Memact Web</div>
        <h1 className="hero-title hero-title--landing">Search your browser memory locally.</h1>
        <p className="hero-subtitle landing-subtitle">
          Memact quietly captures what you read and browse. Find it later - privately, locally,
          instantly.
        </p>

        <div className="cta-row cta-row--center">
          <a
            className="primary-button"
            href="https://chromewebstore.google.com/"
            target="_blank"
            rel="noreferrer"
          >
            Add to Chrome - It&apos;s Free
          </a>
        </div>

        <div className="feature-row feature-row--center">
          <StatusBadge tone="neutral">No account</StatusBadge>
          <StatusBadge tone="neutral">No cloud</StatusBadge>
          <StatusBadge tone="neutral">Works offline</StatusBadge>
        </div>
      </section>

      <section className="preview-grid">
        <PreviewShot
          query="What was that thing I read about async Python?"
          title="I found a strong match about async Python."
          snippet="A captured article on async patterns, tasks, and concurrency showed up as the strongest local memory."
        />
        <PreviewShot
          query="The ChatGPT answer about chunking"
          title="The ChatGPT answer about chunking."
          snippet="Memact surfaced the local answer, plus the exact snippet where chunk size and overlap were discussed."
        />
      </section>

      <footer className="footer-copy">Everything stays on your device. Always.</footer>
    </main>
  )
}
