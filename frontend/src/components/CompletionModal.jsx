import { X } from 'lucide-react';

export default function CompletionModal({ modal, onClose }) {
  if (!modal) {
    return null;
  }

  return (
    <div className="modalBackdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="iconButton modalClose" type="button" onClick={onClose} title="Close">
          <X size={18} aria-hidden="true" />
          <span className="srOnly">Close</span>
        </button>
        <span className="eyebrow">{modal.kind || 'Message'}</span>
        <h2 id="modal-title">{modal.title}</h2>
        <p>{modal.message}</p>
        <button className="primaryButton" type="button" onClick={onClose}>
          <span>OK</span>
        </button>
      </section>
    </div>
  );
}
