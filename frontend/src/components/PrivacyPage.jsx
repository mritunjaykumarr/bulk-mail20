import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <main className="pageShell policyPage">
      <section className="panel policyHeader">
        <a className="backLink" href="/#home">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to home</span>
        </a>
        <span className="eyebrow">Privacy Policy</span>
        <h1>Privacy Policy</h1>
        <p className="policyMeta">Last updated: May 12, 2026</p>
      </section>

      <section className="panel policyPanel">
        <h2>Overview</h2>
        <p>
          mail-sender uses Google OAuth to send email through your Gmail account. The app
          processes CSV recipient lists and sends messages one recipient at a time through the
          Gmail API.
        </p>
      </section>

      <section className="panel policyPanel">
        <h2>Data we handle</h2>
        <ul className="policyList">
          <li>OAuth tokens are stored in server memory only and are cleared on logout or restart.</li>
          <li>CSV uploads are parsed for email addresses and deleted immediately after parsing.</li>
          <li>Send status (counts and progress) is stored only in memory during a send session.</li>
        </ul>
      </section>

      <section className="panel policyPanel">
        <h2>Data sharing</h2>
        <p>
          The app does not sell or share your data with third parties. Email delivery is performed
          directly through Google Gmail APIs using your authenticated account.
        </p>
      </section>

      <section className="panel policyPanel">
        <h2>Contact</h2>
        <p>
          If you have questions about this policy, use the contact form on the home page or email
          the site owner.
        </p>
      </section>
    </main>
  );
}
