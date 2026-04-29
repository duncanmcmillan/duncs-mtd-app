/**
 * @fileoverview Settings modal for the AirTable integration.
 * Reads current settings from DataEntryStore and persists changes on submit.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DataEntryStore } from '../../store/data-entry.store';
import { AirtableSettings } from '../../model/data-entry.model';

/**
 * Modal for configuring AirTable API key, Base ID, and Table ID.
 * Visibility is controlled by DataEntryStore.activeModal.
 */
@Component({
  selector: 'app-airtable-settings',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './airtable-settings.component.html',
  styleUrl: './settings-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirtableSettingsComponent {
  protected readonly store = inject(DataEntryStore);

  protected readonly form = signal<AirtableSettings>({
    apiKey:        this.store.dataEntry().airtable?.apiKey        ?? '',
    baseId:        this.store.dataEntry().airtable?.baseId        ?? '',
    tableId:       this.store.dataEntry().airtable?.tableId       ?? '',
    dateColumn:    this.store.dataEntry().airtable?.dateColumn    ?? '',
    fieldMappings: this.store.dataEntry().airtable?.fieldMappings ?? {},
  });

  /** Updates a single field in the form signal. */
  protected setField(field: keyof AirtableSettings, value: string): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  /** Saves settings and closes the modal. */
  protected async onSubmit(): Promise<void> {
    const current = this.store.dataEntry();
    await this.store.saveDataEntry({ ...current, airtable: this.form() });
  }

  /** Closes the modal without saving. */
  protected onCancel(): void {
    this.store.closeModal();
  }
}
