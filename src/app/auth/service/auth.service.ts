/**
 * @fileoverview Orchestrates the HMRC OAuth 2.0 Authorization Code flow.
 * This service communicates with the Electron main process via the preload
 * IPC bridge (`window.hmrc`) for all operations that require system-level
 * access (opening the browser, secure token storage, etc.).
 */
import { Injectable, inject } from '@angular/core';
import { AppStore, HmrcTokens, ApiEnvironment } from '../../core';
import { AuthConfig, HMRC_BASE, REDIRECT_URI, SCOPES } from '../model/auth.model';

/** Shape of the HMRC IPC bridge exposed by `preload.js`. */
type HmrcBridge = {
  startOAuth: (url: string) => Promise<{ code: string; state: string }>;
  exchangeToken: (tokenUrl: string, code: string, redirectUri: string) => Promise<{
    access_token: string; refresh_token: string; expires_in: number;
  }>;
  loadTokens: () => Promise<HmrcTokens | null>;
  clearTokens: () => Promise<void>;
  saveConfig: (clientId: string, clientSecret: string) => Promise<void>;
  loadConfig: () => Promise<{ clientId: string } | null>;
  clearConfig: () => Promise<void>;
};

/** The IPC bridge instance; `null` when running in a plain browser. */
const bridge = (window as unknown as { hmrc?: HmrcBridge }).hmrc ?? null;

/**
 * Handles the full HMRC OAuth lifecycle: sign-in, session restore, and sign-out.
 *
 * The OAuth Authorization Code flow requires the Electron shell because:
 * - The system browser must be opened programmatically.
 * - The `mtd-app://` custom protocol must be intercepted.
 * - The client secret must never be exposed to the renderer.
 * - Tokens must be encrypted at rest using `safeStorage`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly appStore = inject(AppStore);

  /** `true` when running inside the Electron shell with the IPC bridge available. */
  readonly isElectron = !!bridge;

  /**
   * Attempts to restore a previous session from secure storage.
   * Loads stored tokens and hydrates the {@link AppStore} if they have not expired.
   * No-op in browser context.
   */
  async restoreSession(): Promise<void> {
    if (!bridge) return;
    const tokens = await bridge.loadTokens();
    if (tokens && tokens.expiresAt > Date.now()) {
      this.appStore.setTokens(tokens);
    }
  }

  /**
   * Loads the previously stored HMRC client ID from the main process.
   * The client secret is never returned to the renderer.
   * @returns The stored client ID, or `null` if not set or in browser context.
   */
  async loadStoredClientId(): Promise<string | null> {
    if (!bridge) return null;
    const config = await bridge.loadConfig();
    return config?.clientId ?? null;
  }

  /**
   * Performs the full HMRC OAuth 2.0 Authorization Code flow.
   *
   * Steps:
   * 1. Stores client credentials securely in the Electron main process.
   * 2. Builds the HMRC authorization URL with a random CSRF `state` value.
   * 3. Calls the IPC bridge to open the system browser and await the redirect.
   * 4. Validates the returned `state` to prevent CSRF attacks.
   * 5. Exchanges the authorization code for access/refresh tokens.
   * 6. Updates {@link AppStore} with the new tokens and environment.
   *
   * @param config - Client credentials and target environment from the UI.
   * @throws If called outside the Electron environment.
   * @throws If the returned OAuth `state` does not match (CSRF protection).
   */
  async signIn(config: AuthConfig): Promise<void> {
    if (!bridge) throw new Error('Auth only available in Electron');

    await bridge.saveConfig(config.clientId, config.clientSecret);

    const base    = HMRC_BASE[config.environment];
    const state   = crypto.randomUUID();
    const authUrl =
      `${base}/oauth/authorize` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(config.clientId)}` +
      `&scope=${SCOPES}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&state=${state}`;

    const { code, state: returnedState } = await bridge.startOAuth(authUrl);

    if (returnedState !== state) {
      throw new Error('OAuth state mismatch — possible CSRF attack');
    }

    const tokenUrl = `${base}/oauth/token`;
    const result   = await bridge.exchangeToken(tokenUrl, code, REDIRECT_URI);

    const tokens: HmrcTokens = {
      accessToken:  result.access_token,
      refreshToken: result.refresh_token,
      expiresAt:    Date.now() + result.expires_in * 1000,
    };

    this.appStore.setTokens(tokens);
    this.appStore.setEnvironment(config.environment);
  }

  /**
   * Signs out the current user: removes tokens from secure storage and clears
   * the application session in {@link AppStore}.
   */
  async signOut(): Promise<void> {
    if (bridge) await bridge.clearTokens();
    this.appStore.clearSession();
  }

  /**
   * Removes the stored HMRC client credentials (client ID and secret) from
   * the Electron main process secure storage. No-op in browser context.
   */
  async clearCredentials(): Promise<void> {
    if (bridge) await bridge.clearConfig();
  }
}
