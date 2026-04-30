/**
 * @fileoverview Settings modal for the Local Excel import.
 * Reads current settings from DataEntryStore and persists changes on submit.
 * Includes per-source sheet configuration and Claude API auto-mapping.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DataEntryStore } from '../../store/data-entry.store';
import { ExcelSettings } from '../../model/data-entry.model';
import { ClaudeApiService, FIELD_DEFINITIONS } from '../../service/claude-api.service';

/**
 * Modal for configuring the local Excel file path and per-source sheet names.
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
  private readonly claudeApi = inject(ClaudeApiService);

  protected readonly form = signal<ExcelSettings>({
    filePath:             this.store.dataEntry().excel?.filePath             ?? '',
    dateColumn:           this.store.dataEntry().excel?.dateColumn           ?? '',
    selfEmploymentSheet:  this.store.dataEntry().excel?.selfEmploymentSheet  ?? 'SE-2024',
    ukPropertySheet:      this.store.dataEntry().excel?.ukPropertySheet      ?? 'UKP-2024',
    foreignPropertySheet: this.store.dataEntry().excel?.foreignPropertySheet ?? 'FORP-2024',
    fieldMappings:        this.store.dataEntry().excel?.fieldMappings        ?? {},
  });

  /** Separate signal for the Claude API key (stored in DataEntrySettings, not ExcelSettings). */
  protected readonly claudeKeyForm = signal(this.store.dataEntry().claudeApiKey ?? '');

  /** Whether the Claude auto-map request is in progress. */
  protected readonly autoMapping = signal(false);

  /** Error from the auto-map step, or null. */
  protected readonly autoMapError = signal<string | null>(null);

  /**
   * Updates a single string field in the form signal.
   * @param field - The ExcelSettings field to update.
   * @param value - The new value.
   */
  protected setField(field: keyof ExcelSettings, value: string): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  /** Saves settings and closes the modal. */
  protected async onSubmit(): Promise<void> {
    const current = this.store.dataEntry();
    await this.store.saveDataEntry({ ...current, excel: this.form(), claudeApiKey: this.claudeKeyForm() || undefined });
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
