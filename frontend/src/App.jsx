import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import Background from './components/Background';
import Header from './components/Header';
import ClockWidget from './components/ClockWidget';
import ThemeToggle from './components/ThemeToggle';
import NoticeBanner from './components/NoticeBanner';
import IntroSection from './components/IntroSection';
import AuthSection from './components/AuthSection';
import ComposerForm from './components/ComposerForm';
import SendSection from './components/SendSection';
import StatusPanel from './components/StatusPanel';
import CompletionModal from './components/CompletionModal';
import Footer from './components/Footer';
import InfoSections from './components/InfoSections';
import CurrencyConverter from './components/CurrencyConverter';
import PrivacyPage from './components/PrivacyPage';
import { apiFetch } from './lib/api';
import { GA_MEASUREMENT_ID } from './lib/config';
import { loginBackendWithFirebase } from './lib/authApi';
import {
  listenForFirebaseUser,
  signInWithGoogleForGmail,
  signOutFirebase
} from './lib/firebase';

const initialAuthState = {
  isAuthenticated: false,
  userName: '',
  userEmail: '',
  userPicture: ''
};

const initialComposerState = {
  subject: '',
  emailBody: '',
  csvFile: null,
  csvFileName: ''
};

const initialSendState = {
  inProgress: false,
  statusMessage: 'Ready.',
  processed: 0,
  total: 0,
  sent: 0,
  failed: 0,
  percentage: 0
};

function getRouteFromLocation() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/privacy') {
    return 'privacy';
  }

  return window.location.hash === '#currency' ? 'currency' : 'home';
}

function isEmptyEmailBody(html) {
  const normalized = String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

  return normalized.length === 0;
}

function mapStatus(status) {
  const total = Number(status.total || 0);
  const sent = Number(status.sent || 0);
  const failed = Number(status.failed || 0);
  const processed = sent + failed;
  const percentage = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return {
    inProgress: Boolean(status.inProgress),
    statusMessage: status.message || 'Ready.',
    processed,
    total,
    sent,
    failed,
    percentage
  };
}

export default function App() {
  const [route, setRoute] = useState(getRouteFromLocation);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [authState, setAuthState] = useState(initialAuthState);
  const [authLoading, setAuthLoading] = useState(true);
  const [composer, setComposer] = useState(initialComposerState);
  const [sendState, setSendState] = useState(initialSendState);
  const [modal, setModal] = useState(null);
  const pollingRef = useRef(null);
  const completionAnnouncedRef = useRef(false);

  const showMessage = useCallback((title, message, kind = 'Message') => {
    setModal({ title, message, kind });
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const applyStatus = useCallback((status) => {
    const nextState = mapStatus(status);
    setSendState(nextState);

    if (!nextState.inProgress) {
      stopPolling();

      if (nextState.total > 0 && !completionAnnouncedRef.current) {
        completionAnnouncedRef.current = true;
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.72 }
        });
        showMessage('Bulk send complete', nextState.statusMessage, 'Complete');
      }
    }
  }, [showMessage, stopPolling]);

  const fetchStatus = useCallback(async () => {
    try {
      const status = await apiFetch('/api/status');
      applyStatus(status);
    } catch (error) {
      stopPolling();
      setSendState((current) => ({
        ...current,
        inProgress: false,
        statusMessage: error.message || 'Status polling stopped.'
      }));
      showMessage('Status polling stopped', error.message || 'Unable to fetch send status.', 'Error');
    }
  }, [applyStatus, showMessage, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    fetchStatus();
    pollingRef.current = window.setInterval(fetchStatus, 1200);
  }, [fetchStatus, stopPolling]);

  const fetchAuthStatus = useCallback(async () => {
    setAuthLoading(true);
    try {
      const status = await apiFetch('/api/auth/status');
      setAuthState({
        isAuthenticated: Boolean(status.isAuthenticated),
        userName: status.userName || '',
        userEmail: status.userEmail || '',
        userPicture: status.userPicture || ''
      });
    } catch {
      setAuthState(initialAuthState);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    function handleHashChange() {
      setRoute(getRouteFromLocation());
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchAuthStatus();

    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'failed') {
      showMessage('Google sign-in failed', 'Please check the OAuth configuration and try again.', 'Error');
    }
  }, [fetchAuthStatus, showMessage]);

  useEffect(() => {
    return listenForFirebaseUser((user) => {
      if (!user) {
        setAuthLoading(false);
        return;
      }

      setAuthState((current) => ({
        ...current,
        userName: current.userName || user.displayName || '',
        userEmail: current.userEmail || user.email || '',
        userPicture: current.userPicture || user.photoURL || ''
      }));
    });
  }, []);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) {
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);

    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const handleComposerChange = useCallback((patch) => {
    setComposer((current) => ({ ...current, ...patch }));
  }, []);

  async function handleLogin() {
    setAuthLoading(true);
    try {
      const firebaseLogin = await signInWithGoogleForGmail();
      const backendLogin = await loginBackendWithFirebase(firebaseLogin);
      setAuthState({
        isAuthenticated: true,
        userName: backendLogin.userName || firebaseLogin.user.displayName || '',
        userEmail: backendLogin.userEmail || firebaseLogin.user.email || '',
        userPicture: backendLogin.userPicture || firebaseLogin.user.photoURL || ''
      });
      showMessage('Signed in', 'Firebase Google login is connected to Gmail sending.', 'Complete');
    } catch (error) {
      setAuthState(initialAuthState);
      showMessage('Firebase sign-in failed', error.message, 'Error');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await signOutFirebase();
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      stopPolling();
      completionAnnouncedRef.current = false;
      setAuthState(initialAuthState);
      setComposer(initialComposerState);
      setSendState(initialSendState);
      showMessage('Logged out', 'Authentication state and composer fields were cleared.', 'Complete');
    }
  }

  async function handleSend() {
    if (!authState.isAuthenticated) {
      showMessage('Sign in required', 'Please sign in with Google before sending bulk mail.', 'Setup');
      return;
    }

    if (!composer.subject.trim()) {
      showMessage('Subject required', 'Enter an email subject before sending.', 'Setup');
      return;
    }

    if (isEmptyEmailBody(composer.emailBody)) {
      showMessage('Email body required', 'Write the email body before sending.', 'Setup');
      return;
    }

    if (!composer.csvFile) {
      showMessage('CSV required', 'Upload a CSV recipient file before sending.', 'Setup');
      return;
    }

    const formData = new FormData();
    formData.append('subject', composer.subject);
    formData.append('emailBody', composer.emailBody);
    formData.append('csvFile', composer.csvFile);

    completionAnnouncedRef.current = false;
    setSendState({
      ...initialSendState,
      inProgress: true,
      statusMessage: 'Starting bulk send...'
    });

    try {
      await apiFetch('/api/send-emails', {
        method: 'POST',
        body: formData
      });
      startPolling();
    } catch (error) {
      stopPolling();
      setSendState({
        ...initialSendState,
        statusMessage: error.message
      });
      showMessage('Send failed', error.message, 'Error');
    }
  }

  return (
    <>
      <Background />
      <div className="appFrame">
        <Header route={route} />
        <div className="topTools">
          <ClockWidget />
          <ThemeToggle
            theme={theme}
            onToggle={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          />
        </div>
        <NoticeBanner />

        {route === 'currency' ? (
          <CurrencyConverter onMessage={showMessage} />
        ) : route === 'privacy' ? (
          <PrivacyPage />
        ) : (
          <main className="pageShell">
            <IntroSection />
            <div className="workspaceGrid">
              <div className="leftStack">
                <AuthSection
                  authState={authState}
                  authLoading={authLoading}
                  onLogin={handleLogin}
                  onLogout={handleLogout}
                />
                <ComposerForm
                  composer={composer}
                  onComposerChange={handleComposerChange}
                  disabled={!authState.isAuthenticated || sendState.inProgress}
                />
                <SendSection
                  disabled={!authState.isAuthenticated}
                  inProgress={sendState.inProgress}
                  onSend={handleSend}
                />
              </div>
              <StatusPanel sendState={sendState} />
            </div>
            <InfoSections onMessage={showMessage} />
          </main>
        )}

        <Footer route={route} />
      </div>
      <CompletionModal modal={modal} onClose={() => setModal(null)} />
    </>
  );
}
