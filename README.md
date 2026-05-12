# Bulk Mail Sender

React + Express rebuild of the Bulk Mail Sender app with Firebase Google login.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env files:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

3. Fill in the required keys in both `.env` files.

4. Run the app:

```bash
npm run dev
```

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:5000`

## Required Keys

- Firebase web app config
- Firebase Admin service account values
- Frontend URL
- Backend URL
- ExchangeRate-API key
- Web3Forms access key
- Google Analytics tag, if used

## Notes

- Firebase login happens in the React app.
- The backend verifies Firebase ID tokens with Firebase Admin.
- Gmail access tokens and send status are stored in memory.
- The backend is intentionally single-user, matching the existing behavior.
- Restarting the backend clears auth and send status.
- The Firebase Google provider requests the `gmail.send` scope for Gmail API sending.

## Firebase Setup

1. In Firebase Console, create or open a project.
2. Enable Authentication -> Sign-in method -> Google.
3. Add `localhost` to Authentication -> Settings -> Authorized domains.
4. Create a web app and copy its config into `frontend/.env`.
5. In Google Cloud Console for the same project, make sure Gmail API is enabled.
6. Create a Firebase Admin service account key and copy values into `backend/.env`.

For `FIREBASE_PRIVATE_KEY`, keep the quotes and escaped newlines:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
