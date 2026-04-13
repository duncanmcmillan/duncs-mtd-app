const { app, BrowserWindow, ipcMain, shell, safeStorage, nativeTheme } = require('electron/main');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { URL } = require('node:url');

// ── Paths ──────────────────────────────────────────────────────────────────
const TOKEN_PATH     = () => path.join(app.getPath('userData'), 'hmrc-tokens.enc');
const CONFIG_PATH    = () => path.join(app.getPath('userData'), 'hmrc-config.enc');
const CONSENT_PATH   = () => path.join(app.getPath('userData'), 'gdpr-consent.json');
const DEVICE_ID_PATH = () => path.join(app.getPath('userData'), 'hmrc-device-id.txt');

// ── OAuth callback state ───────────────────────────────────────────────────
let oauthResolve = null;
let oauthReject  = null;
let oauthTimeout = null;

// ── Custom protocol (OAuth redirect URI: mtd-app://oauth/callback) ─────────
// Must be called before app is ready
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('mtd-app', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('mtd-app');
}

function handleOAuthCallback(url) {
  try {
    const parsed = new URL(url);
    const code  = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');
    const error = parsed.searchParams.get('error');

    clearTimeout(oauthTimeout);

    if (error) {
      oauthReject?.(new Error(`HMRC OAuth error: ${error}`));
    } else if (code) {
      oauthResolve?.({ code, state });
    } else {
      oauthReject?.(new Error('OAuth callback missing code'));
    }
  } catch (e) {
    oauthReject?.(e);
  } finally {
    oauthResolve = null;
    oauthReject  = null;
  }
}

// macOS (packaged app): protocol fires via Apple Event → open-url on running instance
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log('[main] open-url fired:', url);
  handleOAuthCallback(url);
});

// Windows/Linux: app is re-launched with URL as argv.
// Also handles macOS dev mode where macOS can't route via Apple Events to the running
// electron binary (no .app bundle), so it launches a second instance instead.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // We are the second instance — extract URL from argv and quit immediately.
  // On macOS, open-url may also fire; both paths call handleOAuthCallback which
  // is a no-op here since oauthResolve is null (first instance owns the promise).
  app.quit();
}

// ── Accessibility helpers ───────────────────────────────────────────────────

/** Builds the current accessibility preference snapshot from Electron APIs. */
function getA11yPreferences() {
  return {
    accessibilitySupport: app.accessibilitySupportEnabled,
    highContrast:         nativeTheme.shouldUseHighContrastColors,
    invertedColors:       nativeTheme.shouldUseInvertedColorScheme,
  };
}

/** Pushes the current accessibility preferences to all renderer windows. */
function pushA11yPreferences() {
  const prefs = getA11yPreferences();
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('a11y:preferences-changed', prefs);
  });
}

// ── Fraud prevention helpers ───────────────────────────────────────────────

/** Returns a persistent device UUID, creating one on first run. */
function getOrCreateDeviceId() {
  const p = DEVICE_ID_PATH();
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  const id = randomUUID();
  fs.writeFileSync(p, id, 'utf8');
  return id;
}

/** Collects non-loopback IPs and MAC addresses from all network interfaces. */
function getNetworkInfo() {
  const ips = new Set();
  const macs = new Set();
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs) {
      if (addr.internal) continue;
      if (addr.family === 'IPv4') ips.add(addr.address);
      if (addr.mac && addr.mac !== '00:00:00:00:00:00') macs.add(addr.mac.toLowerCase());
    }
  }
  return { ips: [...ips], macs: [...macs] };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function safeWrite(filePath, data) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Encryption not available');
  const encrypted = safeStorage.encryptString(typeof data === 'string' ? data : JSON.stringify(data));
  fs.writeFileSync(filePath, encrypted);
}

function safeRead(filePath) {
  if (!safeStorage.isEncryptionAvailable()) return null;
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return safeStorage.decryptString(buf);
}

function safeDelete(filePath) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// ── Window ─────────────────────────────────────────────────────────────────
const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  win.loadFile('dist/duncs-mtd-app/browser/index.html');
  win.webContents.openDevTools();
};

// ── IPC Handlers ───────────────────────────────────────────────────────────
if (gotLock) app.on('second-instance', (_event, argv) => {
  // macOS dev mode: macOS launches a new electron process with the URL in argv.
  // That process quits immediately above; we receive its argv here.
  console.log('[main] second-instance fired, argv:', argv);
  const url = argv.find(a => a.startsWith('mtd-app://'));
  if (url) handleOAuthCallback(url);

  const win = BrowserWindow.getAllWindows()[0];
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});

app.whenReady().then(() => {
  // Bail out if we somehow reach this in the secondary instance (shouldn't happen
  // after the gotLock guard above, but be safe).
  if (!gotLock) return;

  // Legacy ping
  ipcMain.handle('ping', () => 'pong');

  // ── Accessibility: query platform AT and theme preferences ────────────
  ipcMain.handle('a11y:get-preferences', () => getA11yPreferences());

  // Push updated preferences to all renderers when OS settings change
  nativeTheme.on('updated', pushA11yPreferences);
  app.on('accessibility-support-changed', pushA11yPreferences);

  // ── OAuth: open system browser and wait for callback ──────────────────
  ipcMain.handle('hmrc:start-oauth', (_event, { authUrl }) => {
    return new Promise((resolve, reject) => {
      oauthResolve = resolve;
      oauthReject  = reject;

      shell.openExternal(authUrl);

      oauthTimeout = setTimeout(() => {
        oauthReject?.(new Error('OAuth timed out after 5 minutes'));
        oauthResolve = null;
        oauthReject  = null;
      }, 5 * 60 * 1000);
    });
  });

  // ── OAuth: exchange auth code for tokens ──────────────────────────────
  ipcMain.handle('hmrc:exchange-token', async (_event, { tokenUrl, code, redirectUri }) => {
    const configJson = safeRead(CONFIG_PATH());
    if (!configJson) throw new Error('No HMRC credentials stored. Set up credentials first.');
    const { clientId, clientSecret } = JSON.parse(configJson);

    const params = new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     clientId,
      client_secret: clientSecret,
      code,
      redirect_uri:  redirectUri,
    });

    const response = await fetch(tokenUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Token exchange failed (${response.status}): ${text}`);
    }

    const tokens = await response.json();

    // Persist tokens
    safeWrite(TOKEN_PATH(), {
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt:    Date.now() + tokens.expires_in * 1000,
    });

    return tokens;
  });

  // ── Tokens: load stored tokens ────────────────────────────────────────
  ipcMain.handle('hmrc:load-tokens', () => {
    const json = safeRead(TOKEN_PATH());
    return json ? JSON.parse(json) : null;
  });

  // ── Tokens: clear stored tokens ───────────────────────────────────────
  ipcMain.handle('hmrc:clear-tokens', () => {
    safeDelete(TOKEN_PATH());
  });

  // ── Config: save client credentials ──────────────────────────────────
  ipcMain.handle('hmrc:save-config', (_event, { clientId, clientSecret }) => {
    safeWrite(CONFIG_PATH(), { clientId, clientSecret });
  });

  // ── Config: load client ID (never expose secret to renderer) ─────────
  ipcMain.handle('hmrc:load-config', () => {
    const json = safeRead(CONFIG_PATH());
    if (!json) return null;
    const { clientId } = JSON.parse(json);
    return { clientId };
  });

  // ── Config: clear stored credentials ─────────────────────────────────
  ipcMain.handle('hmrc:clear-config', () => {
    safeDelete(CONFIG_PATH());
  });

  // ── GDPR: check whether the user has accepted the privacy notice ──────
  ipcMain.handle('gdpr:check-consent', () => {
    const consentPath = CONSENT_PATH();
    if (!fs.existsSync(consentPath)) return { consented: false };
    try {
      const data = JSON.parse(fs.readFileSync(consentPath, 'utf8'));
      return { consented: !!data.consented };
    } catch {
      return { consented: false };
    }
  });

  // ── GDPR: record the user's consent ──────────────────────────────────
  ipcMain.handle('gdpr:set-consent', () => {
    fs.writeFileSync(CONSENT_PATH(), JSON.stringify({
      consented: true,
      version: '1.0',
      date: new Date().toISOString(),
    }), 'utf8');
  });

  // ── Fraud prevention: collect device/OS info for HMRC headers ────────
  ipcMain.handle('hmrc:fraud-prevention-info', () => {
    const { ips, macs } = getNetworkInfo();
    const userInfo = os.userInfo();
    const type = os.type(); // 'Darwin' | 'Windows_NT' | 'Linux'
    return {
      deviceId: getOrCreateDeviceId(),
      ips,
      macs,
      userId:    userInfo.username,
      osFamily:  type === 'Darwin' ? 'Mac OS X' : type === 'Windows_NT' ? 'Windows' : type,
      osVersion: os.release(),
    };
  });

  // ── GDPR: delete all locally stored personal data ─────────────────────
  ipcMain.handle('gdpr:delete-all-data', () => {
    safeDelete(TOKEN_PATH());
    safeDelete(CONFIG_PATH());
    safeDelete(CONSENT_PATH());
    // Device ID is a pseudonymous identifier — delete on full data erasure
    safeDelete(DEVICE_ID_PATH());
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
