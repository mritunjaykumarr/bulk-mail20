import { Mail, ShieldCheck } from 'lucide-react';

export default function Header({ route }) {
  const isCurrency = route === 'currency';
  const isPrivacy = route === 'privacy';
  const isTerms = route === 'terms';
  const linkBase = isPrivacy || isTerms ? '/' : '';

  return (
    <header className="header">
      <a className="brand" href={`${linkBase}#home`} aria-label="mail-sender home">
        <span className="brandMark">
          <Mail size={22} aria-hidden="true" />
        </span>
        <span>
          <strong>mail-sender</strong>
          <small>Gmail CSV campaigns</small>
        </span>
      </a>

      <nav className="nav" aria-label="Primary navigation">
        <a href={`${linkBase}#home`} aria-current={!isCurrency && !isPrivacy && !isTerms ? 'page' : undefined}>Home</a>
        <a href={`${linkBase}#about`}>About</a>
        <a href="/privacy" aria-current={isPrivacy ? 'page' : undefined}>Privacy Policy</a>
        <a href="/terms" aria-current={isTerms ? 'page' : undefined}>Terms</a>
        <a href={`${linkBase}#contact`}>Contact</a>
        <a href={`${linkBase}#currency`} aria-current={isCurrency ? 'page' : undefined}>Currency Converter</a>
      </nav>

      <div className="headerBadge">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>OAuth protected</span>
      </div>
    </header>
  );
}
