import { Mail, ShieldCheck } from 'lucide-react';

export default function Header({ route }) {
  const isCurrency = route === 'currency';

  return (
    <header className="header">
      <a className="brand" href="#home" aria-label="Bulk Mail Sender home">
        <span className="brandMark">
          <Mail size={22} aria-hidden="true" />
        </span>
        <span>
          <strong>Bulk Mail Sender</strong>
          <small>Gmail CSV campaigns</small>
        </span>
      </a>

      <nav className="nav" aria-label="Primary navigation">
        <a href="#home" aria-current={!isCurrency ? 'page' : undefined}>Home</a>
        <a href="#about">About</a>
        <a href="#privacy">Privacy Policy</a>
        <a href="#terms">Terms</a>
        <a href="#contact">Contact</a>
        <a href="#currency" aria-current={isCurrency ? 'page' : undefined}>Currency Converter</a>
      </nav>

      <div className="headerBadge">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>OAuth protected</span>
      </div>
    </header>
  );
}
