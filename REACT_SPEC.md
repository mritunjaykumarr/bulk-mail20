# Bulk Mail Sender React Specification

## Purpose

- Rebuild the existing Bulk Mail Sender behavior as a React application.
- Bulk send Gmail emails using Firebase Google login, a CSV recipient list, and a rich text editor.
- Preserve the existing static HTML/JS frontend behavior and Express backend contracts.
- Provide real-time status updates while a send operation is running.
- Do not add new product features beyond the current app.

## User Flows

- Sign in with Google:
  - Render `AuthSection` with a Google sign-in button when unauthenticated.
  - Navigate the browser to `GET /auth/google`.
  - Let the backend complete OAuth through `GET /oauth2callback`.
  - Redirect back to the frontend root after OAuth.
  - Fetch `GET /api/auth/status` after page load or OAuth redirect.
  - Show user name/email and profile picture when authenticated.
  - Unlock `ComposerForm` and `SendSection`.

- Compose bulk email:
  - Require authentication before allowing send.
  - Enter email subject.
  - Compose rich HTML body in the Quill editor.
  - Upload a CSV recipient file.
  - Show the selected CSV filename.

- Send bulk email:
  - Submit `subject`, `emailBody`, and `csvFile` as multipart form data to `POST /api/send-emails`.
  - Disable the send button while sending.
  - Start status polling only after `POST /api/send-emails` succeeds.
  - Poll `GET /api/status` while the backend reports `inProgress: true`.
  - Show live percentage, current status text, processed count, sent count, and failed count.
  - Stop polling when `inProgress` becomes false.
  - Show success animation and completion message/modal.

- Logout:
  - Call `POST /api/auth/logout`.
  - Clear local auth state.
  - Reset composer state.
  - Reset status/progress state.
  - Stop status polling.
  - Return the UI to the signed-out state.

- Theme:
  - Load the initial theme from `localStorage`.
  - Apply the theme to `body[data-theme]`.
  - Toggle between light and dark mode from `ThemeToggle`.
  - Persist theme changes in `localStorage`.

- Clock:
  - Start a one-second interval when `ClockWidget` mounts.
  - Update the analog and digital clock every second.
  - Clear the interval when `ClockWidget` unmounts.

## UI & Components

- `App`:
  - Compose `Background`, `Header`, `ClockWidget`, `ThemeToggle`, `NoticeBanner`, `IntroSection`, `AuthSection`, `ComposerForm`, `SendSection`, `StatusPanel`, and `Footer`.
  - Fetch authentication status on mount.
  - Own shared auth, composer, theme, and send state.
  - Pass only required state and handlers to child components.

- `Background`:
  - Render the animated gradient background.
  - Keep background animation decorative and non-interactive.

- `Header`:
  - Render the logo and site name.
  - Render nav links for Home, About, Privacy Policy, Terms, Contact, and Currency Converter.
  - Preserve existing static link destinations.

- `ClockWidget`:
  - Render the analog clock face and hands.
  - Render the digital clock value.
  - Update once per second.

- `ThemeToggle`:
  - Render a light/dark mode toggle.
  - Change the icon based on the active theme.
  - Persist the active theme in `localStorage`.
  - Apply the active theme through `body[data-theme]`.

- `NoticeBanner`:
  - Render the warning text: "Please log out after use".
  - Keep visible independently of authentication state.

- `IntroSection`:
  - Render the app description.
  - Render data usage transparency content.
  - Render inline privacy summary and a privacy policy link.

- `AuthSection`:
  - Render Google sign-in when signed out.
  - Render user name/email, profile picture, and logout button when signed in.
  - Prefer `userName` when available.
  - Fall back to `userEmail` when `userName` is unavailable.

- `ComposerForm`:
  - Render subject input.
  - Render Quill rich text editor.
  - Store editor HTML as `emailBody`.
  - Render CSV file input.
  - Show selected CSV filename.
  - Disable or visually lock composer controls until authenticated.

- `SendSection`:
  - Render the "Send Bulk Mail" button.
  - Disable the button while `sendState.inProgress` is true.
  - Trigger the send request with multipart form data.

- `StatusPanel`:
  - Render loader while sending.
  - Render percentage progress.
  - Render current status message.
  - Render processed, sent, failed, and total counts.
  - Render success animation/confetti when complete.
  - Use a custom modal when available.
  - Fall back to `alert` when no custom modal exists.

- `Footer`:
  - Render published date.
  - Render copyright text.
  - Render footer links matching the existing static site.

## State & Side Effects

- `authState`:
  - Store `isAuthenticated`.
  - Store `userName`.
  - Store `userEmail`.
  - Store `userPicture`.

- `theme`:
  - Store `light` or `dark`.
  - Initialize from `localStorage`.
  - Write changes to `localStorage`.
  - Apply changes to `document.body.dataset.theme`.

- `composer`:
  - Store `subject`.
  - Store `emailBody` as an HTML string from Quill.
  - Store `csvFile`.
  - Store `csvFileName`.

- `sendState`:
  - Store `inProgress`.
  - Store `statusMessage`.
  - Store `processed`.
  - Store `total`.
  - Store `sent`.
  - Store `failed`.
  - Store `percentage`.

- `pollingInterval`:
  - Start only after a successful `POST /api/send-emails`.
  - Poll `GET /api/status`.
  - Stop when the backend reports `inProgress: false`.
  - Stop on polling error.
  - Stop on logout.
  - Stop on component unmount.

- Clock interval:
  - Start in `ClockWidget`.
  - Update time every second.
  - Clear on unmount.

- Modal messaging:
  - Use the existing custom modal behavior if available.
  - Use `alert` as the fallback.

## API Contracts

- `GET /api/auth/status`:
  - Purpose: check current authentication state.
  - Response:

```json
{
  "isAuthenticated": true,
  "userEmail": "user@example.com",
  "userName": "Optional Name",
  "userPicture": "https://example.com/profile.jpg"
}
```

  - Current backend may return only `userEmail` in addition to `isAuthenticated`.
  - React must tolerate missing `userName` and `userPicture`.

- `POST /api/auth/logout`:
  - Purpose: clear backend authentication state.
  - Response:

```json
{
  "message": "Logged out"
}
```

- `GET /auth/google`:
  - Purpose: start Google OAuth.
  - Behavior: redirect browser to Google consent flow.
  - Call style: direct browser navigation, not `fetch`.

- `GET /oauth2callback`:
  - Purpose: receive Google OAuth callback.
  - Behavior: backend exchanges code for tokens.
  - Completion: backend redirects to frontend root.

- `POST /api/send-emails`:
  - Purpose: start the bulk email send process.
  - Request type: `multipart/form-data`.
  - Fields:
    - `subject`: email subject string.
    - `emailBody`: HTML email body string.
    - `csvFile`: uploaded CSV file.
  - Response:

```json
{
  "message": "Email sending started"
}
```

- `GET /api/status`:
  - Purpose: return current campaign progress.
  - Response:

```json
{
  "total": 100,
  "sent": 80,
  "failed": 2,
  "inProgress": true,
  "message": "Sending emails..."
}
```

  - React mapping:
    - Set `processed` to `sent + failed`.
    - Set `percentage` to `Math.round((processed / total) * 100)` when `total > 0`.
    - Set `percentage` to `0` when `total` is `0`.

## Data Handling & Security

- Use Google OAuth scopes:
  - `userinfo.email`
  - `userinfo.profile`
  - `gmail.send`

- Keep Google OAuth client secret server-side.
- Keep Gmail API tokens server-side.
- Store OAuth tokens in backend memory only.
- Store campaign status in backend memory only.
- Treat backend memory storage as single-user behavior.
- Clear auth token state on logout.
- Expect server restart to clear tokens and status.

- Parse CSV on the backend.
- Use the `email` column when present.
- Fall back to the first column when `email` is absent.
- Validate email addresses using the existing regex.
- Send only valid recipient addresses.

- Send mail through Gmail API `users.messages.send`.
- Send the Quill output as HTML email body.
- Send emails sequentially.
- Preserve the existing 500ms delay between sends.
- Track successful and failed sends.

- Restrict CORS to `FRONTEND_URL`.
- Keep frontend `API_BASE_URL` environment-specific.
- Do not expose backend secrets in the React bundle.
- Treat README session timeout as a claim only because timeout is not enforced in code.

## Dependencies & External Services

- Frontend:
  - React.
  - Quill.js for rich text editing.
  - Confetti library for success animation.
  - Google Analytics scripts.
  - Static fonts.
  - Tailwind for the separate currency converter page when preserving that page.

- Backend:
  - Express.
  - `googleapis`.
  - `multer`.
  - `csv-parser`.
  - `dotenv`.
  - `cors`.

- External services:
  - Google OAuth.
  - Gmail API.
  - Google Analytics.
  - Web3Forms for the contact form.
  - ExchangeRate-API for the currency converter.
  - Flags API for currency UI.

- Deployment:
  - Use Vercel for frontend deployment.
  - Use Render for backend deployment.

- Required configuration:
  - Google OAuth client ID.
  - Google OAuth client secret.
  - OAuth callback URL.
  - `FRONTEND_URL`.
  - Backend base URL or frontend `API_BASE_URL`.
  - ExchangeRate-API key.
  - Web3Forms access key.
  - Google Analytics or site verification tags.

## Limitations & Assumptions

- Preserve the current single-user token store.
- Do not treat the backend as multi-user safe.
- Do not add persistent storage.
- Do not add campaign history.
- Do not add server-side queueing.
- Do not add server-side rate limiting.
- Do not add scheduled sends.
- Do not add retry management.
- Keep sending sequential.
- Keep status polling active only while sending.
- Keep the session timeout unimplemented unless backend code changes.
- Keep `API_BASE_URL` deployment-specific.
- Keep Google Analytics and verification tags static.
- Keep the currency converter as a separate page outside the mail flow.
- Assume a custom modal may exist.
- Fall back to `alert` when a custom modal is unavailable.
- Assume current implementation is static HTML/JS with an Express backend.
- Assume the React rebuild must preserve behavior rather than redesign product scope.
