export default function Footer({ route }) {
  const linkBase = route === 'privacy' ? '/' : '';

  return (
    <footer className="footer">
      <p>Published: May 12, 2026</p>
      <p>Copyright 2026 mail-sender. All rights reserved.</p>
      <nav aria-label="Footer navigation">
        <a href="/privacy">Privacy Policy</a>
        <a href={`${linkBase}#terms`}>Terms</a>
        <a href={`${linkBase}#contact`}>Contact</a>
      </nav>
    </footer>
  );
}
