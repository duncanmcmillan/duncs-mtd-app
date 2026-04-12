/**
 * @fileoverview Bridges the Angular privacy feature to the Electron GDPR IPC handlers.
 * Provides consent checking, consent recording, and full data deletion.
 */
import { Injectable } from '@angular/core';

/** Shape of the GDPR IPC bridge exposed by `preload.js`. */
type GdprBridge = {
  /** Returns the stored consent state. */
  checkConsent: () => Promise<{ consented: boolean }>;
  /** Persists the user's consent record. */
  setConsent: () => Promise<void>;
  /** Deletes all locally stored personal data files. */
  deleteAllData: () => Promise<void>;
};

/** The IPC bridge instance; `null` when running in a plain browser. */
const bridge = (window as unknown as { gdpr?: GdprBridge }).gdpr ?? null;

/**
 * Service for GDPR consent management and data deletion.
 * Delegates all file-system operations to the Electron main process via the
 * `window.gdpr` IPC bridge exposed by `preload.js`.
 */
@Injectable({ providedIn: 'root' })
export class PrivacyService {
  /** `true` when running inside the Electron shell with the IPC bridge available. */
  readonly isElectron = !!bridge;

  /**
   * Checks whether the user has previously accepted the privacy notice.
   * Always returns `false` in a browser context.
   * @returns `true` if consent has been recorded, otherwise `false`.
   */
  async checkConsent(): Promise<boolean> {
    if (!bridge) return false;
    const { consented } = await bridge.checkConsent();
    return consented;
  }

  /**
   * Persists the user's consent to the privacy notice.
   * No-op in a browser context.
   */
  async setConsent(): Promise<void> {
    if (!bridge) return;
    await bridge.setConsent();
  }

  /**
   * Deletes all locally stored personal data (tokens, config, consent record).
   * No-op in a browser context.
   */
  async deleteAllData(): Promise<void> {
    if (!bridge) return;
    await bridge.deleteAllData();
  }
}
