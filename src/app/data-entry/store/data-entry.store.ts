/**
 * @fileoverview NgRx Signal Store for the Data Entry & Notifications feature.
 * Manages active sub-tab, modal visibility, and persisted settings for all
 * data-entry methods and notification channels.
 */
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { extractErrorMessage } from '../../core';
import { SettingsService } from '../service/settings.service';
import {
  DataEntryState,
  DataEntryTab,
  SettingsModal,
  DataEntrySettings,
  NotificationSettings,
} from '../model/data-entry.model';

const defaultDataEntry: DataEntrySettings = {
  manualEnabled: false,
  airtableEnabled: false,
  excelEnabled: false,
  googleSheetsEnabled: false,
};

const defaultNotifications: NotificationSettings = {
  telegramEnabled: false,
  whatsappEnabled: false,
};

const initialState: DataEntryState = {
  activeTab: 'data-entry',
  activeModal: null,
  dataEntry: defaultDataEntry,
  notifications: defaultNotifications,
  isLoading: false,
  error: null,
};

/**
 * Signal store for the Data Entry & Notifications hub.
 * Settings are loaded from and persisted to encrypted safeStorage via SettingsService.
 */
export const DataEntryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /** True when there is an active error message. */
    hasError: computed(() => !!store.error()),
  })),
  withMethods((store, settingsService = inject(SettingsService)) => ({
    /**
     * Switches the active sub-tab.
     * @param tab The tab to activate.
     */
    setTab(tab: DataEntryTab): void {
      patchState(store, { activeTab: tab, error: null });
    },

    /**
     * Opens the settings modal for the given method.
     * @param modal The modal identifier to open.
     */
    openModal(modal: SettingsModal): void {
      patchState(store, { activeModal: modal });
    },

    /** Closes any open settings modal. */
    closeModal(): void {
      patchState(store, { activeModal: null });
    },

    /**
     * Persists updated data-entry settings via safeStorage.
     * @param settings Updated data-entry settings to save.
     */
    async saveDataEntry(settings: DataEntrySettings): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        await settingsService.saveDataEntry(settings);
        patchState(store, { dataEntry: settings, isLoading: false, activeModal: null });
      } catch (e: unknown) {
        patchState(store, {
          status: 'error',
          error: extractErrorMessage(e, 'Failed to save data-entry settings'),
          isLoading: false,
        } as Partial<DataEntryState>);
      }
    },

    /**
     * Persists updated notification settings via safeStorage.
     * @param settings Updated notification settings to save.
     */
    async saveNotifications(settings: NotificationSettings): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        await settingsService.saveNotifications(settings);
        patchState(store, { notifications: settings, isLoading: false, activeModal: null });
      } catch (e: unknown) {
        patchState(store, {
          error: extractErrorMessage(e, 'Failed to save notification settings'),
          isLoading: false,
        });
      }
    },

    /**
     * Loads persisted settings from safeStorage on app startup.
     * When the service returns `null` (browser / no Electron bridge), the
     * existing in-memory state is preserved so in-session changes survive
     * subsequent route activations that call `init()` again.
     */
    async init(): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const [dataEntry, notifications] = await Promise.all([
          settingsService.loadDataEntry(),
          settingsService.loadNotifications(),
        ]);
        patchState(store, {
          dataEntry: dataEntry ?? store.dataEntry(),
          notifications: notifications ?? store.notifications(),
          isLoading: false,
        });
      } catch (e: unknown) {
        patchState(store, {
          error: extractErrorMessage(e, 'Failed to load settings'),
          isLoading: false,
        });
      }
    },
  }))
);
