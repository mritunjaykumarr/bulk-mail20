const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const authManager = require('./authManager');
const emailTemplates = require('./emailTemplates');

const LOGS_FILE = path.resolve(__dirname, '..', 'database', 'logs.json');

// In-memory queue for scheduling warmup emails
let warmupQueue = [];
let isProcessingQueue = false;

// Global settings
let engineSettings = {
  isPaused: false,
  replySimulation: true,
  dailyLimitCustom: null // If set, overrides account-level limits
};

/**
 * Loads logs from database
 */
function loadLogs() {
  try {
    if (!fs.existsSync(LOGS_FILE)) {
      fs.writeFileSync(LOGS_FILE, JSON.stringify([]));
      return [];
    }
    const content = fs.readFileSync(LOGS_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch (error) {
    console.error('Error loading logs:', error.message);
    return [];
  }
}

/**
 * Saves a new log entry
 */
function addLogEntry(sender, receiver, subject, status, error = null, type = 'warmup') {
  try {
    const logs = loadLogs();
    const newLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      timestamp: new Date().toISOString(),
      sender,
      receiver,
      subject,
      status,
      error,
      type
    };
    logs.unshift(newLog); // Prepend so latest shows first
    // Cap at 1000 logs to prevent file bloat
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(0, 1000), null, 2));
    return newLog;
  } catch (err) {
    console.error('Error saving log:', err.message);
  }
}

/**
 * Shuffles an array in place (Fisher-Yates)
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Returns the currently active scheduled queue (excluding sensitive passwords)
 */
function getQueueState() {
  return warmupQueue.map(item => ({
    id: item.id,
    senderEmail: item.senderEmail,
    senderName: item.senderName,
    receiverEmail: item.receiverEmail,
    receiverName: item.receiverName,
    subject: item.subject,
    scheduledTime: item.scheduledTime,
    type: item.type
  }));
}

/**
 * Updates settings
 */
function updateSettings(settings) {
  engineSettings = {
    ...engineSettings,
    ...settings
  };
  return engineSettings;
}

function getSettings() {
  return engineSettings;
}

/**
 * Generates pairing network and populates warmup queue for the day
 */
function generateDailyWarmupQueue() {
  const accounts = authManager.loadAccounts().filter(acc => acc.status === 'Connected');
  if (accounts.length < 2) {
    console.warn('Need at least 2 connected accounts to run warmup.');
    return { success: false, message: 'Need at least 2 connected accounts to create pairings.' };
  }

  // Clear existing warmup tasks (but preserve pending replies)
  warmupQueue = warmupQueue.filter(task => task.type === 'reply');

  const now = Date.now();
  
  // To simulate daily sending, we'll schedule sending tasks spread over a timeframe.
  // For production: spread over 8 hours (28800000 ms)
  // For testing: spread over shorter durations if they want, but default to spread over hours.
  // We'll create custom scheduling spacing out tasks organically.
  
  // Shuffling the accounts list ensures random circular pairings:
  // shuffled[0] sends to shuffled[1], shuffled[1] to shuffled[2], etc.
  const shuffled = shuffle(accounts);
  const totalAccs = shuffled.length;

  let totalScheduled = 0;

  for (let i = 0; i < totalAccs; i++) {
    const sender = shuffled[i];
    const dailyLimit = engineSettings.dailyLimitCustom || sender.dailyLimit || 5;

    // Reset daily counts for this account
    sender.sentToday = 0;
    sender.failedToday = 0;
    sender.lastChecked = new Date().toISOString();

    // Determine receiver pool (all connected accounts except the sender)
    const receivers = shuffled.filter(acc => acc.email !== sender.email);

    for (let count = 0; count < dailyLimit; count++) {
      // Pick a random receiver from the pool
      const receiver = receivers[Math.floor(Math.random() * receivers.length)];
      const emailContent = emailTemplates.generateWarmupEmail(receiver.name, sender.name);

      // Distribute tasks organically over the day:
      // Spreads sends between 5 minutes and 8 hours from now
      const minOffsetMs = 1 * 60 * 1000; // 1 minute minimum delay
      const maxOffsetMs = 8 * 60 * 60 * 1000; // 8 hours max delay
      const randomOffset = minOffsetMs + Math.random() * (maxOffsetMs - minOffsetMs);
      
      const scheduledTime = now + randomOffset;

      const task = {
        id: 'warmup_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        senderEmail: sender.email,
        senderPassword: sender.decodedPassword,
        senderName: sender.name,
        receiverEmail: receiver.email,
        receiverName: receiver.name,
        subject: emailContent.subject,
        html: emailContent.html,
        scheduledTime: new Date(scheduledTime).toISOString(),
        type: 'warmup'
      };

      warmupQueue.push(task);
      totalScheduled++;
    }
  }

  // Sort queue by scheduled time
  warmupQueue.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  
  // Save reset counters for accounts
  authManager.saveAccounts(shuffled);

  return { 
    success: true, 
    message: `Successfully scheduled ${totalScheduled} warmup emails between ${totalAccs} accounts.`,
    scheduledCount: totalScheduled
  };
}

/**
 * Fast-forward schedules (for testing/development purposes)
 * Reschedules all pending tasks to run within next 1-5 minutes
 */
function enableFastDevMode() {
  const now = Date.now();
  warmupQueue.forEach((task, index) => {
    // Space out tasks by 10-30 seconds each for quick visual confirmation
    const offset = (index + 1) * (15 + Math.random() * 15) * 1000;
    task.scheduledTime = new Date(now + offset).toISOString();
  });
  warmupQueue.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
}

/**
 * Core SMTP Mail Sender
 */
async function sendWarmupSmtp(senderEmail, senderPassword, senderName, receiverEmail, subject, html) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: senderEmail,
      pass: senderPassword
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: receiverEmail,
    subject: subject,
    html: html
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Periodic tick checking the queue and processing scheduled warmup events
 */
async function processQueueTick() {
  if (isProcessingQueue || engineSettings.isPaused) {
    return;
  }

  isProcessingQueue = true;
  const now = new Date();

  // Find due tasks
  const dueTasks = warmupQueue.filter(task => new Date(task.scheduledTime) <= now);
  
  if (dueTasks.length === 0) {
    isProcessingQueue = false;
    return;
  }

  console.log(`[Warmup Engine] Processing ${dueTasks.length} pending warmup tasks...`);

  // Load active accounts database to update stats
  const accounts = authManager.loadAccounts();

  for (const task of dueTasks) {
    // Remove task from active queue
    warmupQueue = warmupQueue.filter(t => t.id !== task.id);

    const senderAcc = accounts.find(acc => acc.email === task.senderEmail);

    try {
      console.log(`[Warmup Engine] Sending from ${task.senderEmail} -> ${task.receiverEmail} (${task.type})`);
      
      await sendWarmupSmtp(
        task.senderEmail,
        task.senderPassword,
        task.senderName,
        task.receiverEmail,
        task.subject,
        task.html
      );

      // Log success
      addLogEntry(task.senderEmail, task.receiverEmail, task.subject, 'success', null, task.type);

      // Update counters
      if (senderAcc) {
        senderAcc.sentToday = (senderAcc.sentToday || 0) + 1;
        senderAcc.totalSent = (senderAcc.totalSent || 0) + 1;
        senderAcc.status = 'Connected';
      }

      // If reply simulation is active and this is a primary warmup mail, queue a simulated reply!
      if (task.type === 'warmup' && engineSettings.replySimulation) {
        const receiverAcc = accounts.find(acc => acc.email === task.receiverEmail);
        
        if (receiverAcc && receiverAcc.status === 'Connected') {
          // Schedule a reply from receiver back to sender
          const replyBody = emailTemplates.generateReply(receiverAcc.name);
          
          // Random delay for reply: 1 minute to 15 minutes in the future (or 20-40 seconds in fast-mode/testing)
          const isTesting = dueTasks.length > 2; // Simple heuristic for testing speed
          const replyOffsetMs = isTesting 
            ? (30 + Math.random() * 30) * 1000  // 30-60s delay
            : (3 + Math.random() * 12) * 60 * 1000; // 3-15m delay

          const replyTime = new Date(Date.now() + replyOffsetMs).toISOString();

          const replyTask = {
            id: 'reply_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            senderEmail: receiverAcc.email,
            senderPassword: receiverAcc.decodedPassword,
            senderName: receiverAcc.name,
            receiverEmail: senderAcc.email,
            receiverName: senderAcc.name,
            subject: `Re: ${task.subject}`,
            html: replyBody,
            scheduledTime: replyTime,
            type: 'reply'
          };

          warmupQueue.push(replyTask);
          // Sort queue after adding reply
          warmupQueue.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
          console.log(`[Warmup Engine] Queued reply simulation from ${receiverAcc.email} -> ${senderAcc.email} scheduled for ${replyTime}`);
        }
      }

    } catch (error) {
      console.error(`[Warmup Engine] Failed to send warmup mail:`, error.message);
      
      // Log failure
      addLogEntry(task.senderEmail, task.receiverEmail, task.subject, 'failed', error.message, task.type);

      // Update counters
      if (senderAcc) {
        senderAcc.failedToday = (senderAcc.failedToday || 0) + 1;
        senderAcc.totalFailed = (senderAcc.totalFailed || 0) + 1;
        
        // Update connection status on auth failures
        const errStr = String(error.message).toLowerCase();
        if (errStr.includes('accepted') || errStr.includes('auth') || errStr.includes('login') || errStr.includes('credential')) {
          senderAcc.status = 'Invalid Password';
        } else {
          senderAcc.status = 'Gmail Blocked';
        }
        senderAcc.errorLog = error.message;
      }
    }
  }

  // Save updated counters and statuses
  authManager.saveAccounts(accounts);
  isProcessingQueue = false;
}

/**
 * Fetches dashboard analytics counters
 */
function getAnalyticsStats() {
  const accounts = authManager.loadAccounts();
  const logs = loadLogs();

  const totalConnected = accounts.length;
  const activeAccounts = accounts.filter(acc => acc.status === 'Connected').length;
  
  let sentToday = 0;
  let failedToday = 0;
  let totalSent = 0;
  let totalFailed = 0;

  accounts.forEach(acc => {
    sentToday += (acc.sentToday || 0);
    failedToday += (acc.failedToday || 0);
    totalSent += (acc.totalSent || 0);
    totalFailed += (acc.totalFailed || 0);
  });

  // Calculate warmup health (successful sends ratio)
  const totalSends = totalSent + totalFailed;
  const warmupHealth = totalSends > 0 ? Math.round((totalSent / totalSends) * 100) : 100;

  return {
    totalConnected,
    activeAccounts,
    sentToday,
    failedToday,
    totalSent,
    totalFailed,
    warmupHealth,
    queueSize: warmupQueue.length,
    isPaused: engineSettings.isPaused,
    replySimulation: engineSettings.replySimulation
  };
}

module.exports = {
  getQueue: getQueueState,
  updateSettings,
  getSettings,
  generateDailyWarmupQueue,
  enableFastDevMode,
  processQueueTick,
  getAnalyticsStats,
  loadLogs,
  clearQueue: () => { warmupQueue = []; }
};
