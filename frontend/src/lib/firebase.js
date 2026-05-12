import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { FIREBASE_CONFIG } from './config';

const missingFirebaseConfig = Object.entries(FIREBASE_CONFIG)
  .filter(([, value]) => !value)
  .map(([key]) => key);

let app = null;
let auth = null;

if (missingFirebaseConfig.length === 0) {
  app = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(app);
}

export const firebaseAuth = auth;
export const isFirebaseConfigured = Boolean(auth);

export function listenForFirebaseUser(callback) {
  if (!firebaseAuth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(firebaseAuth, callback);
}

export async function signInWithGoogleForGmail() {
  if (!firebaseAuth) {
    throw new Error('Firebase is not configured. Add Firebase web app keys to frontend/.env.');
  }

  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  provider.addScope('https://www.googleapis.com/auth/gmail.send');
  provider.setCustomParameters({
    prompt: 'consent'
  });

  const result = await signInWithPopup(firebaseAuth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);

  if (!credential?.accessToken) {
    throw new Error('Google did not return a Gmail access token. Check Firebase Google provider configuration.');
  }

  return {
    user: result.user,
    idToken: await result.user.getIdToken(),
    googleAccessToken: credential.accessToken
  };
}

export async function signOutFirebase() {
  if (firebaseAuth) {
    await signOut(firebaseAuth);
  }
}
