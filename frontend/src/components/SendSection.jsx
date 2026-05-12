import { Send } from 'lucide-react';

export default function SendSection({ disabled, inProgress, onSend }) {
  return (
    <section className="sendSection" aria-label="Send controls">
      <button className="sendButton" type="button" onClick={onSend} disabled={disabled || inProgress}>
        <Send size={20} aria-hidden="true" />
        <span>{inProgress ? 'Sending...' : 'Send Bulk Mail'}</span>
      </button>
    </section>
  );
}
