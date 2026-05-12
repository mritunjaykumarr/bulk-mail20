import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <main className="pageShell policyPage">
      <section className="panel policyHeader">
        <a className="backLink" href="/#home">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to home</span>
        </a>
        <span className="eyebrow">Terms</span>
        <h1>Terms of Service</h1>
        <p className="policyMeta">Last updated: May 12, 2026</p>
      </section>

      <section className="panel policyPanel">
        <h2>Acceptable use</h2>
        <p>
          Use mail-sender only with recipient lists you are authorized to contact. You are
          responsible for complying with Gmail sending limits and applicable laws.
        </p>
      </section>

      <section className="panel policyPanel">
        <h2>Account responsibility</h2>
        <p>
          You are responsible for the security of your Google account and for all activity
          performed through the app while authenticated.
        </p>
      </section>

      <section className="panel policyPanel">
        <h2>Service availability</h2>
        <p>
          The service is provided as-is and may be modified or discontinued at any time without
          notice.
        </p>
      </section>
    </main>
  );
}
