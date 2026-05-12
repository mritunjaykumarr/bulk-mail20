import { useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

export default function ComposerForm({ composer, onComposerChange, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const attachments = composer.attachments || [];

  function setCsvFile(file) {
    onComposerChange({
      csvFile: file,
      csvFileName: file?.name || ''
    });
  }

  function handleCsvChange(event) {
    const file = event.target.files?.[0] || null;
    setCsvFile(file);
  }

  function handleAttachmentsChange(event) {
    const files = Array.from(event.target.files || []);
    onComposerChange({ attachments: files });
  }

  function removeAttachment(index) {
    const next = attachments.filter((_, fileIndex) => fileIndex !== index);
    onComposerChange({ attachments: next });
  }

  function handleDragEnter(event) {
    event.preventDefault();
    if (disabled) {
      return;
    }

    dragCounter.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(event) {
    event.preventDefault();
    if (disabled) {
      return;
    }

    event.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(event) {
    event.preventDefault();
    if (disabled) {
      return;
    }

    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    if (disabled) {
      return;
    }

    dragCounter.current = 0;
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0] || null;
    if (file) {
      setCsvFile(file);
    }
  }

  return (
    <section className={`panel composerPanel ${disabled ? 'isLocked' : ''}`} aria-label="Email composer">
      <div className="panelHeader">
        <div>
          <span className="eyebrow">Step 2</span>
          <h2>Compose message</h2>
        </div>
        {disabled && <span className="lockNote">Sign in to unlock</span>}
      </div>

      <label className="field">
        <span>Subject</span>
        <input
          type="text"
          value={composer.subject}
          onChange={(event) => onComposerChange({ subject: event.target.value })}
          placeholder="Enter email subject"
          disabled={disabled}
        />
      </label>

      <label className="field">
        <span>Email body</span>
        <RichTextEditor
          value={composer.emailBody}
          onChange={(emailBody) => onComposerChange({ emailBody })}
          disabled={disabled}
        />
      </label>

      <div
        className={`uploadDropZone ${disabled ? 'disabled' : ''} ${isDragging ? 'isDragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-disabled={disabled}
      >
        <div className="uploadRow">
          <label className={`uploadControl ${disabled ? 'disabled' : ''}`}>
            <Upload size={18} aria-hidden="true" />
            <span>Upload CSV</span>
            <input type="file" accept=".csv,text/csv" onChange={handleCsvChange} disabled={disabled} />
          </label>
          <div className="fileIndicator">
            <FileText size={18} aria-hidden="true" />
            <span>{composer.csvFileName || 'No CSV selected'}</span>
          </div>
        </div>
        <p className="dropHint">Or drag and drop a CSV file here</p>
      </div>

      <div className="attachmentBlock">
        <div className="uploadRow">
          <label className={`uploadControl ${disabled ? 'disabled' : ''}`}>
            <Upload size={18} aria-hidden="true" />
            <span>Attach files</span>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
              onChange={handleAttachmentsChange}
              disabled={disabled}
            />
          </label>
          <div className="fileIndicator">
            <FileText size={18} aria-hidden="true" />
            <span>{attachments.length ? `${attachments.length} attachment(s)` : 'No attachments'}</span>
          </div>
        </div>

        {attachments.length > 0 && (
          <div className="attachmentList" aria-label="Selected attachments">
            {attachments.map((file, index) => (
              <div className="attachmentItem" key={`${file.name}-${index}`}>
                <span>{file.name}</span>
                <button
                  className="attachmentRemove"
                  type="button"
                  onClick={() => removeAttachment(index)}
                  disabled={disabled}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
