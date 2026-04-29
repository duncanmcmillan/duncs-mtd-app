/**
 * @fileoverview Settings modal for the Local Excel import.
 * Reads current settings from DataEntryStore and persists changes on submit.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DataEntryStore } from '../../store/data-entry.store';
import { ExcelSettings } from '../../model/data-entry.model';

/**
 * Modal for configuring the local Excel file path and sheet name.
 * Visibility is controlled by DataEntryStore.activeModal.
 */
@Component({
  selector: 'app-excel-settings',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './excel-settings.component.html',
  styleUrl: './settings-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExcelSettingsComponent {
  protected readonly store = inject(DataEntryStore);

  protected readonly form = signal<ExcelSettings>({
    filePath:      this.store.dataEntry().excel?.filePath      ?? '',
    sheetName:     this.store.dataEntry().excel?.sheetName     ?? '',
    dateColumn:    this.store.dataEntry().excel?.dateColumn    ?? '',
    fieldMappings: this.store.dataEntry().excel?.fieldMappings ?? {},
  });

  /** Updates a single field in the form signal. */
  protected setField(field: keyof ExcelSettings, value: string): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  /** Saves settings and closes the modal. */
  protected async onSubmit(): Promise<void> {
    const current = this.store.dataEntry();
    await this.store.saveDataEntry({ ...current, excel: this.form() });
  }

  /** Closes the modal without saving. */
  protected onCancel(): void {
    this.store.closeModal();
  }
}
