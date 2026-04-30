/**
 * @fileoverview Domain model types for the Data Entry & Notifications feature.
 * Covers sub-tab navigation, settings interfaces for each data-entry method,
 * and notification channel configuration.
 */

/** Active sub-tab within the Data Entry & Notifications view. */
export type DataEntryTab = 'data-entry' | 'notifications';

/** Identifier for the currently open settings modal. */
export type SettingsModal =
  | 'airtable'
  | 'excel'
  | 'google-sheets'
  | 'telegram'
  | 'whatsapp';

/** Settings for the AirTable integration. */
export interface AirtableSettings {
  /** AirTable personal access token or API key. */
  apiKey: string;
  /** ID of the AirTable base (e.g. `appXXXXXXXXXXXXXX`). */
  baseId: string;
  /** Column header used to identify the period row (e.g. `"Quarter End Date"`). */
  dateColumn: string;
  /** Table name for self-employment income data. */
  selfEmploymentTable?: string;
  /** Table name for UK property income data. */
  ukPropertyTable?: string;
  /** Table name for foreign property income data. */
  foreignPropertyTable?: string;
  /** Maps dotted MTD field paths (e.g. `"se.income.turnover"`) to column header names. */
  fieldMappings: Record<string, string>;
}

/** Settings for importing data from a local Excel file. */
export interface ExcelSettings {
  /** Absolute path to the `.xlsx` file on disk. */
  filePath: string;
  /** Column header used to identify the period row (e.g. `"Quarter End Date"`). */
  dateColumn: string;
  /** Worksheet name for self-employment income data (default `'SE-2024'`). */
  selfEmploymentSheet?: string;
  /** Worksheet name for UK property income data (default `'UKP-2024'`). */
  ukPropertySheet?: string;
  /** Worksheet name for foreign property income data (default `'FORP-2024'`). */
  foreignPropertySheet?: string;
  /** Maps dotted MTD field paths (e.g. `"se.income.turnover"`) to column header names. */
  fieldMappings: Record<string, string>;
}

/** Settings for the Google Sheets integration. */
export interface GoogleSheetsSettings {
  /** The unique identifier of the Google Spreadsheet. */
  spreadsheetId: string;
  /** Name of the sheet tab to read from. */
  sheetName: string;
  /** Google API key with Sheets read access. */
  apiKey: string;
}

/** Settings for the Telegram Bot notification channel. */
export interface TelegramSettings {
  /** Telegram Bot API token (from @BotFather). */
  botToken: string;
  /** Chat ID of the target channel or user. */
  chatId: string;
}

/** Settings for the WhatsApp (Meta Cloud API) notification channel. */
export interface WhatsAppSettings {
  /** Meta Cloud API access token. */
  accessToken: string;
  /** Phone number ID registered in Meta Business. */
  phoneNumberId: string;
  /** Recipient's WhatsApp phone number (E.164 format). */
  recipientNumber: string;
}

/** Persisted settings for all data-entry methods. */
export interface DataEntrySettings {
  /** Whether manual entry is enabled. */
  manualEnabled: boolean;
  /** Whether AirTable integration is enabled. */
  airtableEnabled: boolean;
  /** AirTable connection details (present when airtableEnabled is true). */
  airtable?: AirtableSettings;
  /** Whether Local Excel import is enabled. */
  excelEnabled: boolean;
  /** Excel file details (present when excelEnabled is true). */
  excel?: ExcelSettings;
  /** Whether Google Sheets integration is enabled. */
  googleSheetsEnabled: boolean;
  /** Google Sheets connection details (present when googleSheetsEnabled is true). */
  googleSheets?: GoogleSheetsSettings;
  /** Anthropic API key used by the Claude auto-mapping feature. */
  claudeApiKey?: string;
}

/** Persisted settings for all notification channels. */
export interface NotificationSettings {
  /** Whether Telegram notifications are enabled. */
  telegramEnabled: boolean;
  /** Telegram bot details (present when telegramEnabled is true). */
  telegram?: TelegramSettings;
  /** Whether WhatsApp notifications are enabled. */
  whatsappEnabled: boolean;
  /** WhatsApp channel details (present when whatsappEnabled is true). */
  whatsapp?: WhatsAppSettings;
}

/** Column headers loaded from the active spreadsheet source, grouped by income type. */
export interface ColumnHeaders {
  /** Column headers from the self-employment sheet/table. */
  selfEmployment: string[];
  /** Column headers from the UK property sheet/table. */
  ukProperty: string[];
  /** Column headers from the foreign property sheet/table. */
  foreignProperty: string[];
}

/** Full NgRx Signal Store state for the Data Entry & Notifications feature. */
export interface DataEntryState {
  /** Which sub-tab is currently shown. */
  activeTab: DataEntryTab;
  /** Which settings modal is open, or null if none. */
  activeModal: SettingsModal | null;
  /** Data-entry method settings (loaded from / persisted to safeStorage). */
  dataEntry: DataEntrySettings;
  /** Notification channel settings (loaded from / persisted to safeStorage). */
  notifications: NotificationSettings;
  /** Column headers loaded from the active spreadsheet source. */
  columnHeaders: ColumnHeaders;
  /** Whether an async operation is in progress. */
  isLoading: boolean;
  /** Current error message, or null if there is no error. */
  error: string | null;
}
