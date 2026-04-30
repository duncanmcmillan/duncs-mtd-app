/**
 * @fileoverview NgRx Signal Store for the Data Entry & Notifications feature.
 * Manages active sub-tab, modal visibility, and persisted settings for all
 * data-entry methods and notification channels.
 */
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { extractErrorMessage } from '../../core';
import { SettingsService } from '../service/settings.service';
import { ExcelService } from '../service/data-entry/excel.service';
import { AirtableService } from '../service/data-entry/airtable.service';
import {
  ColumnHeaders,
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

const emptyColumnHeaders: ColumnHeaders = { selfEmployment: [], ukProperty: [], foreignProperty: [] };

const initialState: DataEntryState = {
  activeTab: 'data-entry',
  activeModal: null,
  dataEntry: defaultDataEntry,
  notifications: defaultNotifications,
  columnHeaders: emptyColumnHeaders,
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
  withMethods((store,
    settingsService = inject(SettingsService),
    excelService = inject(ExcelService),
    airtableService = inject(AirtableService),
  ) => {
    /**
     * Reads column headers from the active spreadsheet source and patches state.
     * Uses Promise.allSettled so a failure for one income type does not block others.
     */
    async function loadColumnHeaders(): Promise<void> {
      const de = store.dataEntry();
      const result: ColumnHeaders = { selfEmployment: [], ukProperty: [], foreignProperty: [] };

      if (de.excelEnabled && de.excel) {
        const { filePath, selfEmploymentSheet, ukPropertySheet, foreignPropertySheet } = de.excel;
        if (filePath) {
          const tasks = await Promise.allSettled([
            selfEmploymentSheet  ? excelService.readHeaders(filePath, selfEmploymentSheet)  : Promise.resolve([]),
            ukPropertySheet      ? excelService.readHeaders(filePath, ukPropertySheet)      : Promise.resolve([]),
            foreignPropertySheet ? excelService.readHeaders(filePath, foreignPropertySheet) : Promise.resolve([]),
          ]);
          if (tasks[0].status === 'fulfilled') result.selfEmployment = tasks[0].value;
          if (tasks[1].status === 'fulfilled') result.ukProperty     = tasks[1].value;
          if (tasks[2].status === 'fulfilled') result.foreignProperty = tasks[2].value;
        }
      } else if (de.airtableEnabled && de.airtable) {
        const { apiKey, baseId, selfEmploymentTable, ukPropertyTable, foreignPropertyTable } = de.airtable;
        if (apiKey && baseId) {
          const tasks = await Promise.allSettled([
            selfEmploymentTable  ? airtableService.readHeaders(apiKey, baseId, selfEmploymentTable)  : Promise.resolve([]),
            ukPropertyTable      ? airtableService.readHeaders(apiKey, baseId, ukPropertyTable)      : Promise.resolve([]),
            foreignPropertyTable ? airtableService.readHeaders(apiKey, baseId, foreignPropertyTable) : Promise.resolve([]),
          ]);
          if (tasks[0].status === 'fulfilled') result.selfEmployment = tasks[0].value;
          if (tasks[1].status === 'fulfilled') result.ukProperty     = tasks[1].value;
          if (tasks[2].status === 'fulfilled') result.foreignProperty = tasks[2].value;
        }
      }

      patchState(store, { columnHeaders: result });
    }

    return {
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
       * Reads column headers from the active spreadsheet source and stores them in state.
       * Uses Promise.allSettled so a failure for one income type does not block others.
       */
      loadColumnHeaders,

      /**
       * Persists updated data-entry settings via safeStorage, then reloads column headers.
       * @param settings Updated data-entry settings to save.
       */
      async saveDataEntry(settings: DataEntrySettings): Promise<void> {
        patchState(store, { isLoading: true, error: null });
        try {
          await settingsService.saveDataEntry(settings);
          patchState(store, { dataEntry: settings, isLoading: false, activeModal: null });
          void loadColumnHeaders();
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
       * Loads persisted settings from safeStorage on app startup, then reloads column headers.
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
          void loadColumnHeaders();
        } catch (e: unknown) {
          patchState(store, {
            error: extractErrorMessage(e, 'Failed to load settings'),
            isLoading: false,
          });
        }
      },
    };
  }),
);
