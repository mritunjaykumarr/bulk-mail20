import { Mail, SendHorizonal } from 'lucide-react';
import { useState } from 'react';
import { WEB3FORMS_ACCESS_KEY } from '../lib/config';

export default function InfoSections({ onMessage }) {
  return (
    <div className="infoSections">
      <section className="infoBand" id="about">
        <span className="eyebrow">About</span>
        <h2>Built for simple Gmail CSV sends</h2>
        <p>
          mail-sender connects to one Google account, reads valid email addresses from a
          CSV file, and sends the composed HTML message through Gmail one recipient at a time.
        </p>
      </section>

      <section className="infoBand" id="privacy">
        <span className="eyebrow">Privacy Policy</span>
        <h2>Minimal memory-only handling</h2>
        <p>
          OAuth tokens and send progress are held in backend memory. The app does not include
          persistent storage, campaign history, or multi-user account separation. Uploaded CSV
          files are parsed for recipient addresses and removed after parsing.
        </p>
      </section>

      <section className="infoBand" id="terms">
        <span className="eyebrow">Terms</span>
        <h2>Use responsibly</h2>
        <p>
          Use the app only with recipient lists you are allowed to contact. Gmail sending limits,
          account policies, and Google API rules still apply.
        </p>
      </section>

      <section className="contactBand" id="contact">
        <div>
          <span className="eyebrow">Contact</span>
          <h2>Send a message</h2>
          <p>Contact form submissions use Web3Forms when an access key is configured.</p>
        </div>
        <ContactForm onMessage={onMessage} />
      </section>
    </div>
  );
}

function ContactForm({ onMessage }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!WEB3FORMS_ACCESS_KEY) {
      onMessage('Contact is not configured', 'Add VITE_WEB3FORMS_ACCESS_KEY to enable contact form submissions.', 'Setup');
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.append('access_key', WEB3FORMS_ACCESS_KEY);

    setLoading(true);
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Contact form submission failed.');
      }

      event.currentTarget.reset();
      onMessage('Message sent', 'Your contact message was submitted successfully.', 'Complete');
    } catch (error) {
      onMessage('Message failed', error.message, 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="contactForm" onSubmit={handleSubmit}>
      <label className="field">
        <span>Name</span>
        <input name="name" type="text" placeholder="Your name" required />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" placeholder="you@example.com" required />
      </label>
      <label className="field">
        <span>Message</span>
        <textarea name="message" rows="4" placeholder="How can we help?" required />
      </label>
      <button className="primaryButton" type="submit" disabled={loading}>
        {loading ? <Mail size={18} aria-hidden="true" /> : <SendHorizonal size={18} aria-hidden="true" />}
        <span>{loading ? 'Sending...' : 'Submit'}</span>
      </button>
    </form>
  );
}
