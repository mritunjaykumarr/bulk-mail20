import { AlertTriangle } from 'lucide-react';

export default function NoticeBanner() {
  return (
    <aside className="noticeBanner" role="note">
      <AlertTriangle size={18} aria-hidden="true" />
      <span>Please log out after use</span>
    </aside>
  );
}
