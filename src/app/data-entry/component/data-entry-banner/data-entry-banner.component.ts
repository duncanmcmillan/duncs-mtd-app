/**
 * @fileoverview Banner strip displayed when a mappable data-entry method
 * (Local Excel or AirTable) is active. Shows the method name, connection
 * detail, and a "Refresh from source" action.
 */
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { DataEntryStore } from '../../store/data-entry.store';

/**
 * Indigo left-border banner that appears above the quarterly form when an
 * automated data-entry method is enabled. Only rendered when `activeMethod()`
 * is non-null.
 */
@Component({
  selector: 'app-data-entry-banner',
  imports: [],
  templateUrl: './data-entry-banner.component.html',
  styleUrl: './data-entry-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataEntryBannerComponent {
  /** @internal */
  protected readonly store = inject(DataEntryStore);

  /** Emitted when the user clicks "Refresh from source". */
  readonly refreshClick = output<void>();

  /** Which data-entry method is currently active, or `null` if none. */
  protected readonly activeMethod = computed((): 'excel' | 'airtable' | null => {
    const de = this.store.dataEntry();
    if (de.excelEnabled) return 'excel';
    if (de.airtableEnabled) return 'airtable';
    return null;
  });

  /** Human-readable label for the active method. */
  protected readonly activeLabel = computed((): string => {
    switch (this.activeMethod()) {
      case 'excel':    return 'Local Excel';
      case 'airtable': return 'AirTable';
      default:         return '';
    }
  });

  /** Connection detail string for the active method. */
  protected readonly activeDetail = computed((): string => {
    const de = this.store.dataEntry();
    if (de.excelEnabled && de.excel) {
      return [de.excel.filePath, de.excel.sheetName].filter(Boolean).join(' · ');
    }
    if (de.airtableEnabled && de.airtable) {
      return `Base: ${de.airtable.baseId}`;
    }
    return '';
  });
}
