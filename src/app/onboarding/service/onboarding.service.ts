/**
 * @fileoverview Bridges the Angular onboarding feature to the Electron IPC
 * handlers that persist onboarding progress per HMRC ClientID.
 * All file-system operations are delegated to the main process via the
 * `window.onboarding` IPC bridge exposed by `preload.js`.
 */
import { Injectable } from '@angular/core';
import { OnboardingProgress, OnboardingStepId } from '../model/onboarding.model';

/** Shape of the onboarding IPC bridge exposed by `preload.js`. */
type OnboardingBridge = {
  /** Loads the full progress map from disk. */
  loadProgress: () => Promise<OnboardingProgress>;
  /** Persists completed steps for the given client ID. */
  saveProgress: (clientId: string, completedSteps: OnboardingStepId[]) => Promise<void>;
  /** Removes the progress entry for the given client ID. */
  resetProgress: (clientId: string) => Promise<void>;
};

/** The IPC bridge instance; `null` when running in a plain browser. */
const bridge = (window as unknown as { onboarding?: OnboardingBridge }).onboarding ?? null;

/**
 * Service for persisting per-client onboarding progress via Electron IPC.
 * All methods are safe no-ops when running outside the Electron shell.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  /** `true` when running inside the Electron shell with the IPC bridge available. */
  readonly isElectron = !!bridge;

  /**
   * Loads the full onboarding progress map from disk.
   * Returns an empty object in the browser context.
   * @returns A map of ClientID → completed step IDs.
   */
  async loadProgress(): Promise<OnboardingProgress> {
    return bridge ? await bridge.loadProgress() : {};
  }

  /**
   * Persists the completed steps for a specific client ID.
   * No-op in the browser context.
   * @param clientId - The HMRC ClientID to save progress for.
   * @param completedSteps - The list of completed step IDs.
   */
  async saveProgress(clientId: string, completedSteps: OnboardingStepId[]): Promise<void> {
    if (!bridge) return;
    await bridge.saveProgress(clientId, completedSteps);
  }

  /**
   * Removes all persisted progress for a specific client ID.
   * No-op in the browser context.
   * @param clientId - The HMRC ClientID whose progress should be reset.
   */
  async resetProgress(clientId: string): Promise<void> {
    if (!bridge) return;
    await bridge.resetProgress(clientId);
  }
}
