/**
 * @fileoverview Settings modal for the Google Sheets integration.
 * Reads current settings from DataEntryStore and persists changes on submit.
 * Includes per-source sheet configuration and Claude API auto-mapping.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DataEntryStore } from '../../store/data-entry.store';
import { GoogleSheetsSettings } from '../../model/data-entry.model';
import { ClaudeApiService, FIELD_DEFINITIONS } from '../../service/claude-api.service';

/**
 * Modal for configuring the Google Sheets spreadsheet ID, API key, date column,
 * per-source sheet tab names, and Claude auto-mapping.
 * Visibility is controlled by DataEntryStore.activeModal.
 */
@Component({
  selector: 'app-google-sheets-settings',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './google-sheets-settings.component.html',
  styleUrl: './settings-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleSheetsSettingsComponent {
  protected readonly store = inject(DataEntryStore);
  private readonly claudeApi = inject(ClaudeApiService);

  protected readonly form = signal<GoogleSheetsSettings>({
    spreadsheetId:       this.store.dataEntry().googleSheets?.spreadsheetId       ?? '',
    apiKey:              this.store.dataEntry().googleSheets?.apiKey              ?? '',
    dateColumn:          this.store.dataEntry().googleSheets?.dateColumn          ?? '',
    selfEmploymentSheet: this.store.dataEntry().googleSheets?.selfEmploymentSheet ?? 'SE-2024',
    ukPropertySheet:     this.store.dataEntry().googleSheets?.ukPropertySheet     ?? 'UKP-2024',
    foreignPropertySheet: this.store.dataEntry().googleSheets?.foreignPropertySheet ?? 'FORP-2024',
    fieldMappings:       this.store.dataEntry().googleSheets?.fieldMappings       ?? {},
  });

  /** Separate signal for the Claude API key (stored in DataEntrySettings, not GoogleSheetsSettings). */
  protected readonly claudeKeyForm = signal(this.store.dataEntry().claudeApiKey ?? '');

  /** Whether the Claude auto-map request is in progress. */
  protected readonly autoMapping = signal(false);

  /** Error from the auto-map step, or null. */
  protected readonly autoMapError = signal<string | null>(null);

  /**
   * Updates a single string field in the form signal.
   * @param field - The GoogleSheetsSettings field to update.
   * @param value - The new value.
   */
  protected setField(field: keyof GoogleSheetsSettings, value: string): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  /** Saves settings and closes the modal. */
  protected async onSubmit(): Promise<void> {
    const current = this.store.dataEntry();
    await this.store.saveDataEntry({ ...current, googleSheets: this.form(), claudeApiKey: this.claudeKeyForm() || undefined });
  }

  /** Closes the modal without saving. */
  protected onCancel(): void {
    this.store.closeModal();
  }

  /**
   * Uses Claude to auto-suggest column → MTD field mappings from the loaded headers.
   * Only available when a Claude API key is entered and column headers are loaded.
   */
  protected async onAutoMap(): Promise<void> {
    const apiKey = this.claudeKeyForm().trim();
    if (!apiKey) return;
    const h = this.store.columnHeaders();
    const allHeaders = [...new Set([...h.selfEmployment, ...h.ukProperty, ...h.foreignProperty])];
    if (!allHeaders.length) {
      this.autoMapError.set('No column headers loaded — save settings first to load headers.');
      return;
    }
    this.autoMapping.set(true);
    this.autoMapError.set(null);
    try {
      const suggested = await this.claudeApi.suggestMappings(apiKey, allHeaders, FIELD_DEFINITIONS);
      this.form.update(f => ({ ...f, fieldMappings: { ...f.fieldMappings, ...suggested } }));
    } catch {
      this.autoMapError.set('Auto-map failed — check your Claude API key and try again.');
    } finally {
      this.autoMapping.set(false);
    }
  }
}
