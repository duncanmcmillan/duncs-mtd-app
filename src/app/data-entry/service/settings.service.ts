/**
 * @fileoverview IPC bridge service for persisting Data Entry & Notifications settings
 * via Electron's safeStorage encryption. No-ops gracefully in browser / test environments.
 */
import { Injectable } from '@angular/core';
import { DataEntrySettings, NotificationSettings } from '../model/data-entry.model';

/** Shape of the settings IPC bridge exposed by `preload.js`. */
type SettingsBridge = {
  /** Loads persisted data-entry settings, or null if none saved. */
  loadDataEntry: () => Promise<DataEntrySettings | null>;
  /** Persists data-entry settings via safeStorage. */
  saveDataEntry: (s: DataEntrySettings) => Promise<void>;
  /** Loads persisted notification settings, or null if none saved. */
  loadNotifications: () => Promise<NotificationSettings | null>;
  /** Persists notification settings via safeStorage. */
  saveNotifications: (s: NotificationSettings) => Promise<void>;
};

const bridge = (window as unknown as { settings?: SettingsBridge }).settings ?? null;

/**
 * Service for loading and saving Data Entry & Notifications settings
 * through the Electron IPC bridge. All methods are no-ops in browser / test mode.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  /** True when running inside Electron (safeStorage available). */
  readonly isElectron = !!bridge;

  /**
   * Loads persisted data-entry settings from encrypted storage.
   * @returns The saved settings, or null if none exist or not in Electron.
   */
  async loadDataEntry(): Promise<DataEntrySettings | null> {
    if (!bridge) return null;
    return bridge.loadDataEntry();
  }

  /**
   * Saves data-entry settings to encrypted storage.
   * @param settings The settings to persist.
   */
  async saveDataEntry(settings: DataEntrySettings): Promise<void> {
    if (!bridge) return;
    await bridge.saveDataEntry(settings);
  }

  /**
   * Loads persisted notification settings from encrypted storage.
   * @returns The saved settings, or null if none exist or not in Electron.
   */
  async loadNotifications(): Promise<NotificationSettings | null> {
    if (!bridge) return null;
    return bridge.loadNotifications();
  }

  /**
   * Saves notification settings to encrypted storage.
   * @param settings The settings to persist.
   */
  async saveNotifications(settings: NotificationSettings): Promise<void> {
    if (!bridge) return;
    await bridge.saveNotifications(settings);
  }
}
