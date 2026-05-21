const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const ACCOUNTS_FILE = path.resolve(__dirname, '..', 'database', 'warmupAccounts.json');

// Simple encoding helper so passwords aren't stored in plain-text
function encodePassword(password) {
  return Buffer.from(password).toString('base64');
}

function decodePassword(encoded) {
  return Buffer.from(encoded, 'base64').toString('utf8');
}

/**
 * Load all warmup accounts from the database
 */
function loadAccounts() {
  try {
    if (!fs.existsSync(ACCOUNTS_FILE)) {
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify([]));
      return [];
    }
    const content = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
    const parsed = JSON.parse(content || '[]');
    // Add decoded passwords on load
    return parsed.map(acc => ({
      ...acc,
      decodedPassword: decodePassword(acc.appPassword)
    }));
  } catch (error) {
    console.error('Error loading accounts:', error.message);
    return [];
  }
}

/**
 * Save warmup accounts to the database
 */
function saveAccounts(accounts) {
  try {
    const cleanAccounts = accounts.map(acc => {
      // Remove any temporary decoded properties
      const { decodedPassword, ...clean } = acc;
      return clean;
    });
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(cleanAccounts, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving accounts:', error.message);
    return false;
  }
}

/**
 * Verify account credentials using Nodemailer SMTP verify
 * @param {string} email 
 * @param {string} appPassword 
 * @returns {Promise<{success: boolean, status: string, error: string|null}>}
 */
async function verifyAccountCredentials(email, appPassword) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: email,
      pass: appPassword
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter.verify();
    return {
      success: true,
      status: 'Connected',
      error: null
    };
  } catch (error) {
    console.error(`SMTP verification failed for ${email}:`, error.message);
    const errMessage = String(error.message).toLowerCase();
    
    let status = 'Gmail Blocked';
    if (errMessage.includes('accepted') || errMessage.includes('auth') || errMessage.includes('login') || errMessage.includes('credential')) {
      status = 'Invalid Password';
    } else if (errMessage.includes('timeout') || errMessage.includes('econnrefused') || errMessage.includes('network')) {
      status = 'Gmail Blocked';
    }

    return {
      success: false,
      status: status,
      error: error.message
    };
  }
}

/**
 * Process and authenticate multiple CSV-parsed accounts
 * @param {Array} accountsList 
 * @returns {Promise<{successCount: number, failedCount: number, accounts: Array}>}
 */
async function authenticateAccountsList(accountsList) {
  const existingAccounts = loadAccounts();
  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (const account of accountsList) {
    const { email, appPassword, name } = account;
    const cleanEmail = String(email).trim().toLowerCase();

    // Verify SMTP connection
    const check = await verifyAccountCredentials(cleanEmail, appPassword);
    
    const existingIndex = existingAccounts.findIndex(acc => acc.email === cleanEmail);

    const accountData = {
      email: cleanEmail,
      appPassword: encodePassword(appPassword),
      name: name || email.split('@')[0],
      status: check.status,
      lastChecked: new Date().toISOString(),
      dailyLimit: 5, // Default start limit
      sentToday: 0,
      failedToday: 0,
      totalSent: 0,
      totalFailed: 0,
      errorLog: check.error
    };

    if (check.success) {
      successCount++;
      accountData.sentToday = existingIndex >= 0 ? (existingAccounts[existingIndex].sentToday || 0) : 0;
      accountData.failedToday = existingIndex >= 0 ? (existingAccounts[existingIndex].failedToday || 0) : 0;
      accountData.totalSent = existingIndex >= 0 ? (existingAccounts[existingIndex].totalSent || 0) : 0;
      accountData.totalFailed = existingIndex >= 0 ? (existingAccounts[existingIndex].totalFailed || 0) : 0;
    } else {
      failedCount++;
    }

    if (existingIndex >= 0) {
      // Update existing account
      existingAccounts[existingIndex] = {
        ...existingAccounts[existingIndex],
        ...accountData,
        // Keep their current limit and historic counts
        dailyLimit: existingAccounts[existingIndex].dailyLimit || 5
      };
    } else {
      // Add new account
      existingAccounts.push(accountData);
    }

    results.push({
      email: cleanEmail,
      name: name,
      status: check.status,
      success: check.success
    });
  }

  saveAccounts(existingAccounts);

  return {
    successCount,
    failedCount,
    results
  };
}

module.exports = {
  loadAccounts,
  saveAccounts,
  verifyAccountCredentials,
  authenticateAccountsList
};
