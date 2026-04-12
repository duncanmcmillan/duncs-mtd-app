const { contextBridge, ipcRenderer } = require('electron');

// ── Electron version info ──────────────────────────────────────────────────
contextBridge.exposeInMainWorld('versions', {
  node:      () => process.versions.node,
  chrome:    () => process.versions.chrome,
  electron:  () => process.versions.electron,
  ping:      () => ipcRenderer.invoke('ping'),
});

// ── HMRC API bridge ────────────────────────────────────────────────────────
contextBridge.exposeInMainWorld('hmrc', {
  /** Open system browser with HMRC auth URL, resolves with { code, state } */
  startOAuth: (authUrl) =>
    ipcRenderer.invoke('hmrc:start-oauth', { authUrl }),

  /** Exchange auth code for tokens (reads stored credentials from main) */
  exchangeToken: (tokenUrl, code, redirectUri) =>
    ipcRenderer.invoke('hmrc:exchange-token', { tokenUrl, code, redirectUri }),

  /** Load previously stored tokens */
  loadTokens: () =>
    ipcRenderer.invoke('hmrc:load-tokens'),

  /** Clear stored tokens (sign out) */
  clearTokens: () =>
    ipcRenderer.invoke('hmrc:clear-tokens'),

  /** Save HMRC client credentials securely (encrypted at rest) */
  saveConfig: (clientId, clientSecret) =>
    ipcRenderer.invoke('hmrc:save-config', { clientId, clientSecret }),

  /** Load stored client ID (secret is never returned to renderer) */
  loadConfig: () =>
    ipcRenderer.invoke('hmrc:load-config'),

  /** Clear stored client credentials */
  clearConfig: () =>
    ipcRenderer.invoke('hmrc:clear-config'),
});
