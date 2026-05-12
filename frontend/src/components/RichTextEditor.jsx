import { useEffect, useRef } from 'react';
import Quill from 'quill';

const toolbarOptions = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link'],
  ['clean']
];

export default function RichTextEditor({ value, onChange, disabled }) {
  const hostRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current || quillRef.current) {
      return;
    }

    const quill = new Quill(hostRef.current, {
      theme: 'snow',
      modules: {
        toolbar: toolbarOptions
      },
      placeholder: 'Write your email body here...'
    });

    quill.on('text-change', () => {
      onChange(quill.root.innerHTML);
    });

    quillRef.current = quill;
  }, [onChange]);

  useEffect(() => {
    if (!quillRef.current) {
      return;
    }

    quillRef.current.enable(!disabled);
  }, [disabled]);

  useEffect(() => {
    if (!quillRef.current) {
      return;
    }

    if (!value && quillRef.current.getText().trim()) {
      quillRef.current.setText('');
    }
  }, [value]);

  return <div className="editorHost" ref={hostRef} />;
}
