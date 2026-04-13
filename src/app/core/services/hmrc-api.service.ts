/**
 * @fileoverview Low-level HTTP service for communicating with the HMRC MTD API.
 * All API calls are authenticated via Bearer tokens. OAuth flow and secure
 * token storage are delegated to the Electron main process via IPC.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiEnvironment, HmrcTokens } from '../models';
import { FraudPreventionService } from './fraud-prevention.service';

/** Shape of the Electron IPC bridge exposed via preload.js. */
type ElectronBridge = {
  versions: { node: () => string; chrome: () => string; electron: () => string };
  hmrc?: {
    startOAuth: () => Promise<{ code: string; state: string }>;
    storeTokens: (tokens: HmrcTokens) => Promise<void>;
    loadTokens: () => Promise<HmrcTokens | null>;
    clearTokens: () => Promise<void>;
  };
};

const eBridge = (window as unknown as ElectronBridge);

/** `true` when running inside the Electron shell. */
const isElectron = !!eBridge.versions;

/** Base URLs for each HMRC API environment. */
const BASE_URLS: Record<ApiEnvironment, string> = {
  sandbox: 'https://test-api.service.hmrc.gov.uk',
  live:    'https://api.service.hmrc.gov.uk',
};

/**
 * Provides authenticated HTTP access to the HMRC MTD REST API.
 *
 * All requests include the `Authorization: Bearer <token>` header and the
 * standard HMRC `Accept` header required by versioned endpoints.
 *
 * OAuth lifecycle methods (`startOAuthFlow`, `storeTokens`, `loadTokens`,
 * `clearTokens`) are only available in the Electron environment and proxy
 * to the main process via the preload IPC bridge.
 */
@Injectable({ providedIn: 'root' })
export class HmrcApiService {
  private readonly http = inject(HttpClient);
  private readonly fraudPrevention = inject(FraudPreventionService);

  /** The currently active API environment (sandbox or live). */
  readonly environment = signal<ApiEnvironment>('sandbox');

  /** Derives the base URL from the active environment signal. */
  private get baseUrl(): string {
    return BASE_URLS[this.environment()];
  }

  /**
   * Switches the target API environment.
   * @param env - The environment to activate (`'sandbox'` or `'live'`).
   */
  setEnvironment(env: ApiEnvironment): void {
    this.environment.set(env);
  }

  /**
   * Makes an authenticated GET request to an HMRC API endpoint.
   * @param path - The API path, e.g. `'/obligations/details/AB123456C'`.
   * @param accessToken - A valid HMRC OAuth access token.
   * @returns The parsed JSON response body.
   */
  async get<T>(path: string, accessToken: string, apiVersion = '1.0'): Promise<T> {
    const fraudHeaders = await this.fraudPrevention.getHeaders();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`,
      Accept: `application/vnd.hmrc.${apiVersion}+json`,
      ...fraudHeaders,
    });
    return firstValueFrom(
      this.http.get<T>(`${this.baseUrl}${path}`, { headers })
    );
  }

  /**
   * Makes an authenticated POST request to an HMRC API endpoint.
   * @param path - The API path to post to.
   * @param body - The request payload (will be JSON-serialised).
   * @param accessToken - A valid HMRC OAuth access token.
   * @returns The parsed JSON response body.
   */
  async post<T>(path: string, body: unknown, accessToken: string, apiVersion = '1.0'): Promise<T> {
    const fraudHeaders = await this.fraudPrevention.getHeaders();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`,
      Accept: `application/vnd.hmrc.${apiVersion}+json`,
      'Content-Type': 'application/json',
      ...fraudHeaders,
    });
    return firstValueFrom(
      this.http.post<T>(`${this.baseUrl}${path}`, body, { headers })
    );
  }

  /**
   * Initiates the HMRC OAuth 2.0 Authorization Code flow via the Electron
   * IPC bridge. Opens the system browser; resolves when HMRC redirects back
   * to the `mtd-app://` custom protocol URI.
   * @returns The auth code and state string from the HMRC redirect.
   * @throws If called outside the Electron environment.
   */
  async startOAuthFlow(): Promise<{ code: string; state: string }> {
    if (!isElectron || !eBridge.hmrc) {
      throw new Error('OAuth only available in Electron');
    }
    return eBridge.hmrc.startOAuth();
  }

  /**
   * Persists tokens securely via the Electron main process (safeStorage).
   * No-op when running in a browser context.
   * @param tokens - The access/refresh token pair to store.
   */
  async storeTokens(tokens: HmrcTokens): Promise<void> {
    if (isElectron && eBridge.hmrc) {
      await eBridge.hmrc.storeTokens(tokens);
    }
  }

  /**
   * Loads previously stored tokens from the Electron main process.
   * @returns The stored tokens, or `null` if none exist or in browser context.
   */
  async loadTokens(): Promise<HmrcTokens | null> {
    if (!isElectron || !eBridge.hmrc) return null;
    return eBridge.hmrc.loadTokens();
  }

  /**
   * Removes stored tokens via the Electron main process.
   * No-op when running in a browser context.
   */
  async clearTokens(): Promise<void> {
    if (isElectron && eBridge.hmrc) {
      await eBridge.hmrc.clearTokens();
    }
  }
}
