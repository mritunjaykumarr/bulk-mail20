export default function IntroSection() {
  return (
    <section className="introSection" id="home">
      <div>
        <span className="eyebrow">Gmail bulk sending</span>
        <h1>Send Gmail campaigns from a CSV list.</h1>
        <p>
          Sign in with Google, upload recipients, compose a rich HTML message, and watch live
          send progress until the campaign completes.
        </p>
      </div>

      <div className="transparencyPanel">
        <h2>Data use transparency</h2>
        <p>
          The app uses Firebase Google sign-in to identify the account and request Gmail
          send permission. Gmail access tokens and campaign status stay in server memory
          and clear when the server restarts or you log out.
        </p>
        <a href="#privacy">Read the privacy summary</a>
      </div>
    </section>
  );
}
