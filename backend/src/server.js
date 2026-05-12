const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csvParser = require('csv-parser');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const admin = require('firebase-admin');

for (const envPath of [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env')
]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const PORT = Number(process.env.PORT || 5000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';
const FRONTEND_URLS = process.env.FRONTEND_URLS || '';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
const SENDER_NAME = process.env.SENDER_NAME || '';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || '';
const FIREBASE_PRIVATE_KEY = String(process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

const app = express();
const upload = multer({
  dest: path.resolve(__dirname, '..', 'tmp')
});
const uploadFields = upload.fields([
  { name: 'csvFile', maxCount: 1 },
  { name: 'attachments', maxCount: 10 }
]);

let tokens = null;
let userProfile = null;
let sendStatus = createIdleStatus('Ready.');

function hasRealEnvValue(value, placeholderParts) {
  return Boolean(value) && !placeholderParts.some((part) => String(value).includes(part));
}

const firebaseConfigured = (
  hasRealEnvValue(FIREBASE_PROJECT_ID, ['your-firebase-project-id']) &&
  hasRealEnvValue(FIREBASE_CLIENT_EMAIL, ['your-firebase-admin-client-email']) &&
  hasRealEnvValue(FIREBASE_PRIVATE_KEY, ['YOUR_PRIVATE_KEY'])
);

if (firebaseConfigured && admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY
    })
  });
} else if (!firebaseConfigured) {
  console.warn('Firebase Admin is not configured. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
}

function getAuthedClient() {
  if (!tokens) {
    return null;
  }

  const client = new google.auth.OAuth2();
  client.setCredentials({
    access_token: tokens.googleAccessToken
  });
  return client;
}

function createIdleStatus(message) {
  return {
    total: 0,
    sent: 0,
    failed: 0,
    inProgress: false,
    message
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function encodeSubject(subject) {
  return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
}

function sanitizeHeaderValue(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function encodeHeaderValue(value) {
  const clean = sanitizeHeaderValue(value);
  if (!clean) {
    return '';
  }

  return /^[\x00-\x7F]*$/.test(clean)
    ? clean
    : `=?UTF-8?B?${Buffer.from(clean, 'utf8').toString('base64')}?=`;
}

function formatFromHeader({ name, email }) {
  const safeEmail = sanitizeHeaderValue(email);
  const safeName = encodeHeaderValue(name);

  if (safeName && safeEmail) {
    return `${safeName} <${safeEmail}>`;
  }

  return safeEmail || safeName || '';
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function chunkBase64(value) {
  const matches = String(value).match(/.{1,76}/g);
  return matches ? matches.join('\r\n') : '';
}

function sanitizeFileName(name) {
  const clean = sanitizeHeaderValue(name);
  return clean ? clean.replace(/"/g, "'") : 'attachment';
}

async function loadAttachments(files) {
  return Promise.all(
    files.map(async (file) => {
      const content = await fs.promises.readFile(file.path);
      return {
        filename: sanitizeFileName(file.originalname),
        contentType: file.mimetype || 'application/octet-stream',
        content: content.toString('base64')
      };
    })
  );
}

function cleanupFiles(files) {
  files.forEach((file) => {
    if (file?.path) {
      fs.unlink(file.path, () => {});
    }
  });
}

function buildRawEmail({ to, subject, html, fromName, fromEmail, attachments = [] }) {
  const fromHeader = formatFromHeader({ name: fromName, email: fromEmail });
  const headers = [
    fromHeader ? `From: ${fromHeader}` : null,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0'
  ].filter(Boolean);

  if (!attachments.length) {
    headers.push('Content-Type: text/html; charset="UTF-8"');
    const message = [...headers, '', html].join('\r\n');
    return toBase64Url(message);
  }

  const boundary = `bulk_mail_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

  const parts = [
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    html
  ];

  for (const attachment of attachments) {
    parts.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      '',
      chunkBase64(attachment.content)
    );
  }

  parts.push(`--${boundary}--`);

  const message = [...headers, '', ...parts].join('\r\n');
  return toBase64Url(message);
}

function getEmailFromRow(row) {
  const keys = Object.keys(row);
  if (keys.length === 0) {
    return '';
  }

  const emailKey = keys.find((key) => key.trim().toLowerCase() === 'email');
  const selectedKey = emailKey || keys[0];
  return String(row[selectedKey] || '').trim();
}

function readRecipientsFromCsv(filePath) {
  return new Promise((resolve, reject) => {
    const recipients = [];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        const email = getEmailFromRow(row);
        if (isValidEmail(email)) {
          recipients.push(email);
        }
      })
      .on('error', reject)
      .on('end', () => resolve(recipients));
  });
}

async function sendEmail({ gmail, to, subject, html, fromName, fromEmail, attachments }) {
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: buildRawEmail({ to, subject, html, fromName, fromEmail, attachments })
    }
  });
}

async function runBulkSend({ subject, emailBody, recipients, fromName, fromEmail, attachments }) {
  const auth = getAuthedClient();

  if (!auth) {
    sendStatus = createIdleStatus('Authentication expired. Please sign in again.');
    return;
  }

  const gmail = google.gmail({ version: 'v1', auth });

  for (const recipient of recipients) {
    sendStatus.message = `Sending email to ${recipient}`;

    try {
      await sendEmail({
        gmail,
        to: recipient,
        subject,
        html: emailBody,
        fromName,
        fromEmail,
        attachments
      });
      sendStatus.sent += 1;
    } catch (error) {
      sendStatus.failed += 1;
      console.error(`Failed to send to ${recipient}:`, error.message);
    }

    if (sendStatus.sent + sendStatus.failed < sendStatus.total) {
      await delay(500);
    }
  }

  sendStatus.inProgress = false;
  sendStatus.message = `Completed. Sent: ${sendStatus.sent}. Failed: ${sendStatus.failed}.`;
}

const allowedOrigins = new Set(
  [
    FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
  ]
    .concat(
      FRONTEND_URLS
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    )
);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/auth/status', (_req, res) => {
  res.json({
    isAuthenticated: Boolean(tokens),
    userEmail: userProfile?.userEmail || '',
    userName: userProfile?.userName || '',
    userPicture: userProfile?.userPicture || ''
  });
});

app.post('/api/auth/firebase-login', async (req, res) => {
  if (!firebaseConfigured) {
    return res.status(500).json({
      message: 'Firebase Admin is not configured on the backend.'
    });
  }

  const idToken = String(req.body.idToken || '');
  const googleAccessToken = String(req.body.googleAccessToken || '');

  if (!idToken || !googleAccessToken) {
    return res.status(400).json({
      message: 'Firebase ID token and Google access token are required.'
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    tokens = {
      googleAccessToken,
      firebaseUid: decodedToken.uid
    };
    userProfile = {
      userEmail: decodedToken.email || '',
      userName: decodedToken.name || '',
      userPicture: decodedToken.picture || ''
    };

    return res.json({
      isAuthenticated: true,
      ...userProfile
    });
  } catch (error) {
    console.error('Firebase login failed:', error.message);
    return res.status(401).json({
      message: 'Firebase login failed. Please sign in again.'
    });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  tokens = null;
  userProfile = null;
  sendStatus = createIdleStatus('Logged out.');
  res.json({ message: 'Logged out' });
});

app.post('/api/send-emails', uploadFields, async (req, res) => {
  if (!tokens) {
    return res.status(401).json({ message: 'Please sign in with Google first.' });
  }

  if (sendStatus.inProgress) {
    return res.status(409).json({ message: 'A send operation is already in progress.' });
  }

  const subject = String(req.body.subject || '').trim();
  const emailBody = String(req.body.emailBody || '').trim();

  if (!subject) {
    return res.status(400).json({ message: 'Subject is required.' });
  }

  if (!emailBody || emailBody === '<p><br></p>') {
    return res.status(400).json({ message: 'Email body is required.' });
  }

  const csvFile = req.files?.csvFile?.[0] || null;
  const attachmentFiles = req.files?.attachments || [];

  if (!csvFile) {
    return res.status(400).json({ message: 'CSV file is required.' });
  }

  try {
    const recipients = await readRecipientsFromCsv(csvFile.path);
    const attachments = await loadAttachments(attachmentFiles);
    cleanupFiles([csvFile, ...attachmentFiles]);

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'No valid email addresses found in CSV.' });
    }

    sendStatus = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      inProgress: true,
      message: `Starting bulk send for ${recipients.length} recipient(s).`
    };

    const senderName = SENDER_NAME || userProfile?.userName || '';
    const senderEmail = userProfile?.userEmail || '';

    runBulkSend({
      subject,
      emailBody,
      recipients,
      fromName: senderName,
      fromEmail: senderEmail,
      attachments
    }).catch((error) => {
      console.error('Bulk send failed:', error.message);
      sendStatus.inProgress = false;
      sendStatus.message = 'Bulk send stopped because of a server error.';
    });

    return res.json({ message: 'Email sending started' });
  } catch (error) {
    cleanupFiles([
      csvFile,
      ...attachmentFiles
    ].filter(Boolean));

    console.error('CSV parse failed:', error.message);
    return res.status(400).json({ message: 'Unable to parse CSV file.' });
  }
});

app.get('/api/status', (_req, res) => {
  res.json(sendStatus);
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled server error:', error);
  res.status(500).json({ message: 'Server error.' });
});

app.listen(PORT, () => {
  console.log(`Bulk Mail Sender backend listening on ${BACKEND_URL}`);
});
