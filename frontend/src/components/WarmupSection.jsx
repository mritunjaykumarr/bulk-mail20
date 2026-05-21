import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Flame, 
  UploadCloud, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  Pause, 
  Square, 
  Zap, 
  Activity, 
  Mail, 
  RefreshCw, 
  Trash2, 
  FileText,
  Users,
  Clock
} from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function WarmupSection({ onMessage }) {
  const [stats, setStats] = useState({
    totalConnected: 0,
    activeAccounts: 0,
    sentToday: 0,
    failedToday: 0,
    totalSent: 0,
    totalFailed: 0,
    warmupHealth: 100,
    queueSize: 0,
    isPaused: false,
    replySimulation: true
  });
  const [schedulerStatus, setSchedulerStatus] = useState({
    isStarted: false,
    isPaused: false,
    replySimulation: true
  });
  const [accounts, setAccounts] = useState([]);
  const [queue, setQueue] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState({ active: false, status: '' });
  const [settings, setSettings] = useState({
    dailyLimit: 5,
    replySimulation: true
  });
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'queue' | 'logs'
  const fileInputRef = useRef(null);

  // Poll stats, queue, accounts, and logs from backend
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Fetch stats and queue
      const res = await apiFetch('/api/warmup/stats');
      setStats(res.stats || {});
      setQueue(res.queue || []);
      setSchedulerStatus(res.schedulerStatus || {});
      setSettings(prev => ({
        ...prev,
        replySimulation: res.schedulerStatus?.replySimulation ?? prev.replySimulation
      }));

      // 2. Fetch accounts
      const accs = await apiFetch('/api/warmup/accounts');
      setAccounts(accs || []);

      // 3. Fetch logs
      const history = await apiFetch('/api/warmup/logs');
      setLogs(history || []);
    } catch (error) {
      console.error('Error fetching warmup data:', error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Poll for real-time stats updates every 4 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Scheduler control actions
  const handleSchedulerControl = async (action) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/warmup/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      onMessage(
        'Warmup Controller', 
        res.message || `Action ${action} executed successfully.`, 
        action === 'stop' ? 'Setup' : 'Complete'
      );
      fetchData();
    } catch (error) {
      onMessage('Scheduler Control Failed', error.message, 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Update Limits or Reply simulation settings
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/api/warmup/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      onMessage('Settings Saved', res.message, 'Complete');
      fetchData();
    } catch (error) {
      onMessage('Settings Save Failed', error.message, 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Reset/Delete warmup pool
  const handleResetPool = async () => {
    if (!window.confirm('Are you sure you want to delete all registered warmup accounts and stop the scheduler? This action cannot be undone.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/warmup/reset', { method: 'POST' });
      onMessage('Warmup Pool Reset', res.message, 'Complete');
      fetchData();
    } catch (error) {
      onMessage('Reset Failed', error.message, 'Error');
    } finally {
      setLoading(false);
    }
  };

  // CSV Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, active: true }));
  };

  const handleDragLeave = () => {
    setUploadState(prev => ({ ...prev, active: false }));
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setUploadState({ active: false, status: 'Parsing CSV...' });
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await processCsvUpload(files[0]);
    }
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadState({ active: false, status: 'Parsing CSV...' });
      await processCsvUpload(files[0]);
    }
  };

  const processCsvUpload = async (file) => {
    if (!file.name.endsWith('.csv')) {
      onMessage('Invalid File', 'Please upload a valid CSV file.', 'Error');
      setUploadState({ active: false, status: '' });
      return;
    }

    const formData = new FormData();
    formData.append('csvFile', file);

    setLoading(true);
    setUploadProgress(20);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return prev + 10;
      });
    }, 400);

    try {
      const res = await apiFetch('/api/warmup/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const details = `Connected Accounts: ${res.successCount}. Failed: ${res.failedCount}. ${
        res.invalidRows?.length > 0 
          ? `(${res.invalidRows.length} rows failed format checks)` 
          : ''
      }`;
      
      onMessage(
        'CSV Import Completed',
        res.message + '\n' + details,
        res.successCount > 0 ? 'Complete' : 'Error'
      );
      
      if (res.invalidRows?.length > 0) {
        console.warn('Invalid CSV Rows:', res.invalidRows);
      }

      fetchData();
    } catch (error) {
      clearInterval(progressInterval);
      onMessage('Import Failed', error.message, 'Error');
    } finally {
      setTimeout(() => {
        setUploadProgress(0);
        setUploadState({ active: false, status: '' });
        setLoading(false);
      }, 1000);
    }
  };

  return (
    <div className="warmupSection pageShell">
      <div className="introSection">
        <div>
          <span className="eyebrow"><Flame size={12} className="fireIcon" /> Dynamic Network Warmup</span>
          <h1>Email Warmup Panel</h1>
          <p>
            Avoid delivery folders like Spam. Add multiple Gmail sender accounts, verify them with 
            Gmail App Passwords, and watch the system automatically orchestrate natural pairing loops 
            and automated reply schedules.
          </p>
        </div>
        <div className="transparencyPanel">
          <h2>Pairing Logic</h2>
          <p style={{ fontSize: '0.88rem' }}>
            Our scheduler applies organic circular shuffles daily. Accounts rotate seamlessly, 
            avoiding repetitive triggers. Smart delays schedule emails hours apart to look organic.
          </p>
          <div className="schedulerBadge" data-active={schedulerStatus.isStarted}>
            <Activity size={14} />
            <span>{schedulerStatus.isStarted ? (schedulerStatus.isPaused ? 'Paused' : 'Active Engine') : 'Inactive'}</span>
          </div>
        </div>
      </div>

      {/* Analytics Counter Row */}
      <div className="analyticsGrid">
        <div className="statCard flameGlow">
          <div className="statHeader">
            <span className="statTitle">Connected Accounts</span>
            <Users className="statIcon colorTeal" size={20} />
          </div>
          <div className="statValue">{stats.totalConnected || 0}</div>
          <div className="statSubtitle">
            <span className="colorSuccess">{stats.activeAccounts || 0} Active Verified</span>
          </div>
        </div>

        <div className="statCard">
          <div className="statHeader">
            <span className="statTitle">Sends Today</span>
            <Mail className="statIcon colorCoral" size={20} />
          </div>
          <div className="statValue">{stats.sentToday || 0}</div>
          <div className="statSubtitle">
            <span>Total Sent: {stats.totalSent || 0}</span>
          </div>
        </div>

        <div className="statCard">
          <div className="statHeader">
            <span className="statTitle">Warmup Health</span>
            <Activity className="statIcon colorAmber" size={20} />
          </div>
          <div className="statValue">{stats.warmupHealth || 100}%</div>
          <div className="statSubtitle">
            <span className={stats.failedToday > 0 ? 'colorDanger' : 'colorMuted'}>
              {stats.failedToday || 0} Failed Sends Today
            </span>
          </div>
        </div>

        <div className="statCard">
          <div className="statHeader">
            <span className="statTitle">Queue Size</span>
            <Clock className="statIcon colorIndigo" size={20} />
          </div>
          <div className="statValue">{stats.queueSize || 0}</div>
          <div className="statSubtitle">
            <span>Pending Delayed Emails</span>
          </div>
        </div>
      </div>

      <div className="workspaceGrid">
        {/* Left Column: Import and Configuration */}
        <div className="leftStack">
          
          {/* CSV Import */}
          <div className="panel">
            <h2>1. Import Email Accounts CSV</h2>
            <p>Upload a CSV file containing your Gmail addresses and Gmail App Passwords to populate the warmup network pool.</p>
            
            <div 
              className={`uploadDropZone ${uploadState.active ? 'isDragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={38} className="uploadCloudIcon" />
              <span>Drag &amp; Drop CSV File here or <strong>Browse</strong></span>
              <span className="csvFormatNote">Required Headers: <code>email, appPassword, name</code></span>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept=".csv" 
                style={{ display: 'none' }} 
              />
            </div>

            {uploadProgress > 0 && (
              <div className="uploadProgressWrapper">
                <div className="progressLabel">
                  <span>{uploadState.status || 'Uploading and authenticating accounts...'}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="progressBarTrack">
                  <div className="progressBarFill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Settings Config */}
          <div className="panel">
            <h2>2. Warmup Configuration</h2>
            <p>Customize daily quotas and choose if simulated reply sequences should run automatically.</p>
            
            <form onSubmit={handleSaveSettings} className="warmupSettingsForm">
              <div className="field">
                <span>Daily Limit per Account</span>
                <select 
                  value={settings.dailyLimit} 
                  onChange={e => setSettings(prev => ({ ...prev, dailyLimit: Number(e.target.value) }))}
                >
                  <option value="3">3 Emails/day (Recommended Week 1)</option>
                  <option value="5">5 Emails/day (Default Ramp-up)</option>
                  <option value="10">10 Emails/day (Recommended Week 2)</option>
                  <option value="15">15 Emails/day (Recommended Week 3)</option>
                  <option value="25">25 Emails/day (Advanced Warmup)</option>
                </select>
              </div>

              <div className="checkboxField">
                <input 
                  type="checkbox" 
                  id="replySim"
                  checked={settings.replySimulation}
                  onChange={e => setSettings(prev => ({ ...prev, replySimulation: e.target.checked }))}
                />
                <label htmlFor="replySim">
                  <strong>Enable Reply Simulation</strong>
                  <span className="fieldDesc">Automatically schedules organic delayed replies from receivers back to senders.</span>
                </label>
              </div>

              <div className="settingsActions">
                <button type="submit" className="secondaryButton" disabled={loading}>
                  <Settings size={15} /> Save Configuration
                </button>
                <button type="button" className="dangerResetButton" onClick={handleResetPool} disabled={loading}>
                  <Trash2 size={15} /> Reset Pool
                </button>
              </div>
            </form>
          </div>

          {/* Scheduler control panel */}
          <div className="panel actionControlPanel">
            <h2>3. Scheduler Control Room</h2>
            <p>Control the state of the warmup engine. Starting the engine generates the initial network layout and schedules emails.</p>
            
            <div className="controlActions">
              {!schedulerStatus.isStarted ? (
                <button 
                  className="primaryButton btnStart" 
                  onClick={() => handleSchedulerControl('start')}
                  disabled={loading || accounts.length < 2}
                >
                  <Play size={16} /> Start Warmup
                </button>
              ) : (
                <>
                  {schedulerStatus.isPaused ? (
                    <button className="primaryButton btnResume" onClick={() => handleSchedulerControl('resume')} disabled={loading}>
                      <Play size={16} /> Resume Queue
                    </button>
                  ) : (
                    <button className="secondaryButton btnPause" onClick={() => handleSchedulerControl('pause')} disabled={loading}>
                      <Pause size={16} /> Pause Queue
                    </button>
                  )}
                  <button className="dangerButton btnStop" onClick={() => handleSchedulerControl('stop')} disabled={loading}>
                    <Square size={16} /> Stop Warmup
                  </button>
                </>
              )}

              {schedulerStatus.isStarted && !schedulerStatus.isPaused && (
                <button 
                  className="secondaryButton btnFast" 
                  onClick={() => handleSchedulerControl('fast-mode')}
                  disabled={loading}
                  title="Compress scheduled delay times for quick validation testing"
                >
                  <Zap size={14} className="colorAmber" /> Dev Fast Mode
                </button>
              )}
            </div>
            {accounts.length < 2 && (
              <p className="colorDanger noteAlert" style={{ marginTop: '12px', fontSize: '0.86rem' }}>
                * Add at least 2 verified email accounts to launch the pairing scheduler.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Status Lists, Logs, and Queue */}
        <div className="rightStack">
          <div className="panel tabbedPanel">
            <div className="panelTabs">
              <button 
                className={`tabBtn ${activeTab === 'accounts' ? 'active' : ''}`}
                onClick={() => setActiveTab('accounts')}
              >
                Accounts ({accounts.length})
              </button>
              <button 
                className={`tabBtn ${activeTab === 'queue' ? 'active' : ''}`}
                onClick={() => setActiveTab('queue')}
              >
                Queue ({queue.length})
              </button>
              <button 
                className={`tabBtn ${activeTab === 'logs' ? 'active' : ''}`}
                onClick={() => setActiveTab('logs')}
              >
                History Logs ({logs.length})
              </button>
            </div>

            <div className="tabContent">
              
              {/* Tab: Accounts */}
              {activeTab === 'accounts' && (
                <div className="accountsTabList">
                  {accounts.length === 0 ? (
                    <div className="emptyState">
                      <Users size={32} />
                      <p>No warmup accounts uploaded yet. Drag &amp; drop a CSV file on the left to begin.</p>
                    </div>
                  ) : (
                    <div className="accountsTableWrapper">
                      <table className="warmupTable">
                        <thead>
                          <tr>
                            <th>Account Details</th>
                            <th>Status</th>
                            <th>Activity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accounts.map((acc, idx) => (
                            <tr key={idx} className="accountRow">
                              <td>
                                <div className="accIdentity">
                                  <strong>{acc.name}</strong>
                                  <small>{acc.email}</small>
                                </div>
                              </td>
                              <td>
                                <span className={`statusBadge ${acc.status?.toLowerCase().replace(' ', '-')}`}>
                                  {acc.status === 'Connected' ? (
                                    <>
                                      <CheckCircle size={12} /> Connected
                                    </>
                                  ) : acc.status === 'Invalid Password' ? (
                                    <>
                                      <XCircle size={12} /> Invalid Pass
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle size={12} /> Blocked
                                    </>
                                  )}
                                </span>
                              </td>
                              <td>
                                <div className="accCounts">
                                  <span>Sent: <strong>{acc.sentToday}</strong></span>
                                  <span>Tot: <strong>{acc.totalSent}</strong></span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Queue */}
              {activeTab === 'queue' && (
                <div className="queueTabList">
                  {queue.length === 0 ? (
                    <div className="emptyState">
                      <Clock size={32} />
                      <p>Queue is empty. Start the scheduler to populate paired sending tasks.</p>
                    </div>
                  ) : (
                    <div className="queueItemsWrapper">
                      {queue.map((item, idx) => (
                        <div key={idx} className="queueItemCard" data-type={item.type}>
                          <div className="queueMeta">
                            <span className="qTypeBadge">{item.type}</span>
                            <span className="qTime">
                              {new Date(item.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="queueDetails">
                            <strong>{item.subject}</strong>
                            <span>From: <code>{item.senderEmail}</code></span>
                            <span>To: <code>{item.receiverEmail}</code></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Logs */}
              {activeTab === 'logs' && (
                <div className="logsTabList">
                  {logs.length === 0 ? (
                    <div className="emptyState">
                      <FileText size={32} />
                      <p>No historical warmup logs found. Events will appear here once tasks execute.</p>
                    </div>
                  ) : (
                    <div className="terminalLogs">
                      {logs.map((log, idx) => (
                        <div key={idx} className={`terminalLine ${log.status}`} data-type={log.type}>
                          <span className="termTime">[{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})}]</span>
                          <span className="termAction">
                            {log.type === 'reply' ? 'REPLY' : 'SEND'}
                          </span>
                          <span className="termPath">{log.sender.split('@')[0]} &rarr; {log.receiver.split('@')[0]}</span>
                          <span className="termSubject">"{log.subject}"</span>
                          {log.status === 'success' ? (
                            <span className="termStatus success">[OK]</span>
                          ) : (
                            <span className="termStatus failed" title={log.error}>[FAIL: {log.error}]</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
