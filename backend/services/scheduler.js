const cron = require('node-cron');
const warmupEngine = require('./warmupEngine');

let dailyPairingCronJob = null;
let queueTickInterval = null;
let isStarted = false;

/**
 * Initializes the background scheduler and interval workers
 */
function initScheduler() {
  if (isStarted) {
    return;
  }

  console.log('[Scheduler] Initializing Warmup System Scheduler...');

  // 1. Set up a daily cron job to run at midnight (00:00) to reshuffle network and schedule day's warmup tasks
  dailyPairingCronJob = cron.schedule('0 0 * * *', () => {
    console.log('[Scheduler] Cron triggered: Reshuffling warmup pairings for the new day...');
    warmupEngine.generateDailyWarmupQueue();
  });

  // 2. Set up periodic queue processing tick (every 30 seconds)
  // This executes pending sends whose scheduleTime is past current time
  queueTickInterval = setInterval(() => {
    warmupEngine.processQueueTick().catch(err => {
      console.error('[Scheduler] Queue tick error:', err.message);
    });
  }, 30000); // 30 seconds

  isStarted = true;
  console.log('[Scheduler] Warmup Scheduler started successfully.');
}

/**
 * Starts the engine, creates initial pairings, and populates the queue immediately
 */
function start() {
  initScheduler();
  warmupEngine.updateSettings({ isPaused: false });
  
  // Instantly generate the first set of pairings for the day
  const result = warmupEngine.generateDailyWarmupQueue();
  console.log('[Scheduler] Primary pairings generated:', result.message);
  return result;
}

/**
 * Completely stops and disables the warmup scheduler, wiping any queued emails
 */
function stop() {
  console.log('[Scheduler] Stopping Warmup Scheduler and clearing queue...');
  
  if (dailyPairingCronJob) {
    dailyPairingCronJob.stop();
    dailyPairingCronJob = null;
  }

  if (queueTickInterval) {
    clearInterval(queueTickInterval);
    queueTickInterval = null;
  }

  warmupEngine.clearQueue();
  warmupEngine.updateSettings({ isPaused: true });
  isStarted = false;
  
  return { success: true, message: 'Warmup system stopped. Queue cleared.' };
}

/**
 * Pauses queue processing without wiping pending tasks
 */
function pause() {
  warmupEngine.updateSettings({ isPaused: true });
  console.log('[Scheduler] Warmup processing paused.');
  return { success: true, isPaused: true, message: 'Warmup queue paused.' };
}

/**
 * Resumes queue processing
 */
function resume() {
  warmupEngine.updateSettings({ isPaused: false });
  console.log('[Scheduler] Warmup processing resumed.');
  // Trigger a check immediately
  warmupEngine.processQueueTick();
  return { success: true, isPaused: false, message: 'Warmup queue resumed.' };
}

/**
 * Get current scheduler status
 */
function getSchedulerStatus() {
  return {
    isStarted,
    isPaused: warmupEngine.getSettings().isPaused,
    replySimulation: warmupEngine.getSettings().replySimulation
  };
}

module.exports = {
  initScheduler,
  start,
  stop,
  pause,
  resume,
  getSchedulerStatus
};
