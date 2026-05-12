import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';

export default function StatusPanel({ sendState }) {
  const hasRun = sendState.total > 0 || sendState.statusMessage !== 'Ready.';
  const complete = hasRun && !sendState.inProgress && sendState.total > 0;

  return (
    <section className="panel statusPanel" aria-live="polite" aria-label="Send status">
      <div className="panelHeader">
        <div>
          <span className="eyebrow">Step 3</span>
          <h2>Status</h2>
        </div>
        {sendState.inProgress && <Loader2 className="spin" size={22} aria-hidden="true" />}
        {complete && <CheckCircle2 className="successIcon" size={22} aria-hidden="true" />}
      </div>

      <div className="progressBlock">
        <div className="progressLabel">
          <span>{sendState.percentage}%</span>
          <span>{sendState.processed} / {sendState.total}</span>
        </div>
        <div className="progressTrack">
          <span style={{ width: `${sendState.percentage}%` }} />
        </div>
      </div>

      <p className="statusMessage">
        {sendState.failed > 0 && !sendState.inProgress ? (
          <CircleAlert size={17} aria-hidden="true" />
        ) : null}
        <span>{sendState.statusMessage}</span>
      </p>

      <div className="statusGrid">
        <StatusMetric label="Processed" value={sendState.processed} />
        <StatusMetric label="Sent" value={sendState.sent} />
        <StatusMetric label="Failed" value={sendState.failed} />
        <StatusMetric label="Total" value={sendState.total} />
      </div>

      {complete && (
        <div className="successMessage">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>Bulk mail send complete.</span>
        </div>
      )}
    </section>
  );
}

function StatusMetric({ label, value }) {
  return (
    <div className="statusMetric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
