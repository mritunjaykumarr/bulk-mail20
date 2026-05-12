import { apiFetch } from './api';

export async function loginBackendWithFirebase({ idToken, googleAccessToken }) {
  return apiFetch('/api/auth/firebase-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idToken,
      googleAccessToken
    })
  });
}
