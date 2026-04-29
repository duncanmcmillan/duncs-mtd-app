/**
 * @fileoverview Root component for the Data Entry & Notifications feature.
 * Renders sub-tab navigation, method cards, and inline settings modals.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DataEntryStore } from '../store/data-entry.store';
import { DataEntryTab } from '../model/data-entry.model';
import { MethodCardComponent } from './method-card/method-card.component';
import { AirtableSettingsComponent } from './settings-modals/airtable-settings.component';
import { ExcelSettingsComponent } from './settings-modals/excel-settings.component';
import { GoogleSheetsSettingsComponent } from './settings-modals/google-sheets-settings.component';
import { TelegramSettingsComponent } from './settings-modals/telegram-settings.component';
import { WhatsAppSettingsComponent } from './settings-modals/whatsapp-settings.component';

/**
 * Root component for the Data Entry & Notifications hub.
 * Calls store.init() on first render to load persisted settings.
 */
@Component({
  selector: 'app-data-entry',
  standalone: true,
  imports: [
    MethodCardComponent,
    AirtableSettingsComponent,
    ExcelSettingsComponent,
    GoogleSheetsSettingsComponent,
    TelegramSettingsComponent,
    WhatsAppSettingsComponent,
  ],
  templateUrl: './data-entry.component.html',
  styleUrl: './data-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataEntryComponent implements OnInit {
  protected readonly store = inject(DataEntryStore);

  ngOnInit(): void {
    this.store.init();
  }

  /**
   * Switches the active sub-tab.
   * @param tab The tab to activate.
   */
  protected selectTab(tab: DataEntryTab): void {
    this.store.setTab(tab);
  }

  /**
   * Enables the given data-entry method and disables all others (single-select).
   * @param method The method key to enable or disable.
   * @param enabled Whether to enable (true) or disable (false) the method.
   */
  protected selectDataEntryMethod(
    method: 'manual' | 'airtable' | 'excel' | 'googleSheets',
    enabled: boolean,
  ): void {
    this.store.saveDataEntry({
      ...this.store.dataEntry(),
      manualEnabled: false,
      airtableEnabled: false,
      excelEnabled: false,
      googleSheetsEnabled: false,
      [`${method}Enabled`]: enabled,
    });
  }

  /**
   * Enables the given notification channel and disables all others (single-select).
   * @param channel The channel key to enable or disable.
   * @param enabled Whether to enable (true) or disable (false) the channel.
   */
  protected selectNotificationMethod(
    channel: 'telegram' | 'whatsapp',
    enabled: boolean,
  ): void {
    this.store.saveNotifications({
      ...this.store.notifications(),
      telegramEnabled: false,
      whatsappEnabled: false,
      [`${channel}Enabled`]: enabled,
    });
  }
}
