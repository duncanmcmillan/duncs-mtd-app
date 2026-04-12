/**
 * @fileoverview Domain models and constants for the HMRC OAuth authentication feature.
 */
import { ApiEnvironment } from '../../core';

/**
 * Represents the current authentication lifecycle stage.
 * - `'unauthenticated'` — no tokens; user must sign in.
 * - `'authenticating'`  — OAuth flow is in progress.
 * - `'authenticated'`   — valid tokens are held in the store.
 * - `'error'`           — the last auth attempt failed.
 */
export type AuthStatus = 'unauthenticated' | 'authenticating' | 'authenticated' | 'error';

/**
 * Credentials and environment selection provided by the user at sign-in.
 * The client secret is forwarded to the Electron main process and never
 * persisted in the renderer.
 */
export interface AuthConfig {
  /** HMRC developer application client ID. */
  clientId: string;
  /** HMRC developer application client secret. */
  clientSecret: string;
  /** Which HMRC environment to authenticate against. */
  environment: ApiEnvironment;
}

/**
 * The state slice managed by {@link AuthStore}.
 */
export interface AuthState {
  /** Current authentication lifecycle stage. */
  status: AuthStatus;
  /** The stored HMRC client ID (never the secret). */
  clientId: string;
  /** The active API environment for this session. */
  environment: ApiEnvironment;
  /** Whether an async auth operation is in progress. */
  isLoading: boolean;
  /** Last error message; `null` when no error. */
  error: string | null;
}

/**
 * The OAuth redirect URI registered in the HMRC Developer Hub.
 * Must be added as a redirect URI for the application in the hub.
 */
export const REDIRECT_URI = 'mtd-app://oauth/callback';

/**
 * Space-separated OAuth scopes required for MTD ITSA.
 * Grants read and write access to self assessment data.
 */
export const SCOPES = [
  'read:self-assessment',
  'write:self-assessment',
].join('+');

/**
 * Base URLs for each HMRC API environment.
 * Switch by toggling `ApiEnvironment` in the auth config.
 */
export const HMRC_BASE: Record<ApiEnvironment, string> = {
  sandbox: 'https://test-api.service.hmrc.gov.uk',
  live:    'https://api.service.hmrc.gov.uk',
};
