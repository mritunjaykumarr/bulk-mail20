import { LogIn, LogOut, UserRound } from 'lucide-react';

export default function AuthSection({ authState, onLogin, onLogout, authLoading }) {
  if (!authState.isAuthenticated) {
    return (
      <section className="panel authPanel" data-state="signed-out" aria-label="Authentication">
        <div>
          <span className="eyebrow">Step 1</span>
          <h2>Connect Gmail</h2>
          <p>Use Firebase Google sign-in before composing or sending bulk mail.</p>
        </div>
        <button className="primaryButton" type="button" onClick={onLogin} disabled={authLoading}>
          <LogIn size={18} aria-hidden="true" />
          <span>{authLoading ? 'Checking...' : 'Sign in with Firebase'}</span>
        </button>
      </section>
    );
  }

  const displayName = authState.userName || authState.userEmail || 'Google user';

  return (
    <section className="panel authPanel signedIn" data-state="signed-in" aria-label="Authenticated user">
      <div className="userIdentity">
        {authState.userPicture ? (
          <img src={authState.userPicture} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="avatarFallback">
            <UserRound size={22} aria-hidden="true" />
          </span>
        )}
        <div>
          <span className="eyebrow">Signed in</span>
          <h2>{displayName}</h2>
          {authState.userEmail && <p>{authState.userEmail}</p>}
        </div>
      </div>
      <button className="secondaryButton" type="button" onClick={onLogout}>
        <LogOut size={18} aria-hidden="true" />
        <span>Logout</span>
      </button>
    </section>
  );
}
