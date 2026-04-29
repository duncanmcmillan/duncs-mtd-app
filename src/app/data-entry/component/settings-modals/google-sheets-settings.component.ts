/**
 * @fileoverview Settings modal for the Google Sheets integration.
 * Reads current settings from DataEntryStore and persists changes on submit.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DataEntryStore } from '../../store/data-entry.store';
import { GoogleSheetsSettings } from '../../model/data-entry.model';

/**
 * Modal for configuring the Google Sheets spreadsheet ID, sheet name, and API key.
 * Visibility is controlled by DataEntryStore.activeModal.
 */
@Component({
  selector: 'app-google-sheets-settings',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './google-sheets-settings.component.html',
  styleUrl: './settings-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleSheetsSettingsComponent {
  protected readonly store = inject(DataEntryStore);

  protected readonly form = signal<GoogleSheetsSettings>({
    spreadsheetId: this.store.dataEntry().googleSheets?.spreadsheetId ?? '',
    sheetName:     this.store.dataEntry().googleSheets?.sheetName     ?? '',
    apiKey:        this.store.dataEntry().googleSheets?.apiKey        ?? '',
  });

  /** Updates a single field in the form signal. */
  protected setField(field: keyof GoogleSheetsSettings, value: string): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  /** Saves settings and closes the modal. */
  protected async onSubmit(): Promise<void> {
    const current = this.store.dataEntry();
    await this.store.saveDataEntry({ ...current, googleSheets: this.form() });
  }

  /** Closes the modal without saving. */
  protected onCancel(): void {
    this.store.closeModal();
  }
}
