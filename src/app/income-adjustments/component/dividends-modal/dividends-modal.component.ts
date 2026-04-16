/**
 * @fileoverview Modal component for editing dividend income declarations.
 * Covers UK dividends, other UK dividends, and a dynamic list of foreign dividends.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IncomeAdjustmentsStore } from '../../store/income-adjustments.store';
import { ForeignDividend } from '../../model/income-adjustments.model';

/**
 * Overlay modal for declaring annual dividend income.
 * Reads from and writes to {@link IncomeAdjustmentsStore}.
 */
@Component({
  selector: 'app-dividends-modal',
  templateUrl: './dividends-modal.component.html',
  styleUrl: './dividends-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividendsModalComponent {
  protected readonly store = inject(IncomeAdjustmentsStore);

  /**
   * Handles a change to the UK dividends or other UK dividends amount.
   * @param field - The dividend field to update.
   * @param event - The DOM input event.
   */
  protected onUkInput(field: 'ukDividends' | 'otherUkDividends', event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = raw === '' ? undefined : parseFloat(raw);
    this.store.patchDividends({ [field]: value });
  }

  /**
   * Handles a change to a field within a foreign dividend row.
   * @param index - Zero-based index into the foreign dividends array.
   * @param field - The field on {@link ForeignDividend} to update.
   * @param event - The DOM input event.
   */
  protected onForeignInput(index: number, field: keyof ForeignDividend, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = field === 'countryCode'
      ? raw.toUpperCase()
      : (raw === '' ? undefined : parseFloat(raw));
    this.store.patchForeignDividend(index, { [field]: value } as Partial<ForeignDividend>);
  }

  /** Appends a blank foreign dividend row. */
  protected addRow(): void {
    this.store.addForeignDividend();
  }

  /**
   * Removes a foreign dividend row.
   * @param index - Zero-based index to remove.
   */
  protected removeRow(index: number): void {
    this.store.removeForeignDividend(index);
  }

  /** Closes the modal. */
  protected close(): void {
    this.store.closeDividendsModal();
  }
}
