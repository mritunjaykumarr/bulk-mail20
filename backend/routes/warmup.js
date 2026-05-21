const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const csvParser = require('../services/csvParser');
const authManager = require('../services/authManager');
const warmupEngine = require('../services/warmupEngine');
const scheduler = require('../services/scheduler');

const router = express.Router();
const upload = multer({
  dest: path.resolve(__dirname, '..', 'tmp')
});

/**
 * Helper to cleanup temporary uploaded files
 */
function cleanupTempFile(file) {
  if (file && file.path) {
    fs.unlink(file.path, () => {});
  }
}

/**
 * POST /api/warmup/upload
 * Handles csv upload, parsing, validation, and Gmail SMTP authentication
 */
router.post('/upload', upload.single('csvFile'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: 'CSV file is required.' });
  }

  try {
    // 1. Parse CSV file
    const { validRows, invalidRows } = await csvParser.parseWarmupCsv(file.path);
    cleanupTempFile(file);

    if (validRows.length === 0) {
      return res.status(400).json({
        message: 'No valid rows found in CSV.',
        invalidRows
      });
    }

    // 2. Perform Nodemailer SMTP authenticate/verify check on the valid rows
    const authResults = await authManager.authenticateAccountsList(validRows);

    return res.json({
      message: `Processed ${validRows.length} account(s). Connected: ${authResults.successCount}, Failed: ${authResults.failedCount}`,
      successCount: authResults.successCount,
      failedCount: authResults.failedCount,
      results: authResults.results,
      invalidRows // Rows that failed basic CSV format checks
    });

  } catch (error) {
    cleanupTempFile(file);
    console.error('CSV Warmup parse/upload error:', error.message);
    return res.status(500).json({ message: 'Unable to parse CSV file: ' + error.message });
  }
});

/**
 * GET /api/warmup/accounts
 * Get list of all registered warmup accounts
 */
router.get('/accounts', (req, res) => {
  const accounts = authManager.loadAccounts();
  // Strip out sensitive passwords for safety
  const safeAccounts = accounts.map(({ appPassword, decodedPassword, ...safe }) => safe);
  return res.json(safeAccounts);
});

/**
 * POST /api/warmup/settings
 * Update warmup settings (daily limit, reply simulation)
 */
router.post('/settings', (req, res) => {
  const { dailyLimit, replySimulation } = req.body;

  const currentSettings = warmupEngine.getSettings();
  const updatedSettings = warmupEngine.updateSettings({
    dailyLimitCustom: dailyLimit ? Number(dailyLimit) : currentSettings.dailyLimitCustom,
    replySimulation: replySimulation !== undefined ? Boolean(replySimulation) : currentSettings.replySimulation
  });

  // If dailyLimit is customized, let's also update all accounts' default daily limit
  if (dailyLimit) {
    const accounts = authManager.loadAccounts();
    accounts.forEach(acc => {
      acc.dailyLimit = Number(dailyLimit);
    });
    authManager.saveAccounts(accounts);
  }

  return res.json({
    message: 'Warmup settings updated successfully.',
    settings: updatedSettings
  });
});

/**
 * POST /api/warmup/control
 * Start, Pause, Resume, Stop, or Fast-Mode the scheduler
 */
router.post('/control', (req, res) => {
  const { action } = req.body;

  if (!action) {
    return res.status(400).json({ message: 'Action body is required.' });
  }

  let result;
  switch (action.toLowerCase()) {
    case 'start':
      result = scheduler.start();
      break;
    case 'stop':
      result = scheduler.stop();
      break;
    case 'pause':
      result = scheduler.pause();
      break;
    case 'resume':
      result = scheduler.resume();
      break;
    case 'fast-mode':
      warmupEngine.enableFastDevMode();
      result = { success: true, message: 'Fast dev mode activated! Pending queue items compressed to run immediately.' };
      break;
    default:
      return res.status(400).json({ message: `Unknown control action: ${action}` });
  }

  const schedulerStatus = scheduler.getSchedulerStatus();

  return res.json({
    ...result,
    schedulerStatus
  });
});

/**
 * GET /api/warmup/stats
 * Retrieve analytics stats, counter values, and upcoming queue
 */
router.get('/stats', (req, res) => {
  const stats = warmupEngine.getAnalyticsStats();
  const queue = warmupEngine.getQueue();
  const schedulerStatus = scheduler.getSchedulerStatus();

  return res.json({
    stats,
    queue,
    schedulerStatus
  });
});

/**
 * GET /api/warmup/logs
 * Retrieve recent warmup execution logs
 */
router.get('/logs', (req, res) => {
  const logs = warmupEngine.loadLogs();
  return res.json(logs);
});

/**
 * POST /api/warmup/reset
 * Clear all warmup accounts and queue
 */
router.post('/reset', (req, res) => {
  scheduler.stop();
  authManager.saveAccounts([]);
  return res.json({ message: 'All registered warmup accounts cleared, and scheduler stopped.' });
});

module.exports = router;
